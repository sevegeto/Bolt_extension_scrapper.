if (!globalThis.TableExtract) {
  const IGNORE = '[data-table-extract-ignore]';
  let panel = null;
  let datasets = [];
  let selected = 0;
  let hidden = new Set();

  globalThis.TableExtract = {
    open() {
      ensureStyle();
      datasets = detectDatasets();
      selected = 0;
      hidden = new Set();
      renderPanel();
    },
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action !== 'openTableExtractor') return false;
    try {
      globalThis.TableExtract.open();
      sendResponse({ success: true, count: datasets.length });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  });

  function ensureStyle() {
    if (document.getElementById('table-extract-style')) return;
    const style = document.createElement('style');
    style.id = 'table-extract-style';
    style.textContent = `
      #table-extract-panel { position: fixed; top: 16px; right: 16px; z-index: 2147483646; width: 420px; max-height: calc(100vh - 32px); overflow: auto; background: #fff; color: #1f2937; border-radius: 12px; box-shadow: 0 16px 50px rgba(15, 23, 42, .28); font-family: "Segoe UI", sans-serif; font-size: 13px; }
      #table-extract-panel * { box-sizing: border-box; }
      #table-extract-panel header { display: flex; justify-content: space-between; gap: 12px; padding: 14px 14px 8px; }
      #table-extract-panel h2 { margin: 0; font-size: 16px; }
      #table-extract-panel p { margin: 4px 0 0; color: #64748b; }
      #table-extract-panel .table-extract-actions, #table-extract-panel .table-extract-body { padding: 0 14px 14px; }
      #table-extract-panel .table-extract-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      #table-extract-panel button { border: 0; border-radius: 8px; padding: 8px 10px; background: #0f172a; color: white; cursor: pointer; font: inherit; }
      #table-extract-panel button.secondary { background: #e2e8f0; color: #0f172a; }
      #table-extract-panel select { width: 100%; margin-bottom: 10px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; }
      #table-extract-panel .table-extract-scroll { overflow: auto; max-height: 280px; border: 1px solid #e2e8f0; border-radius: 8px; }
      #table-extract-panel table { border-collapse: collapse; width: 100%; }
      #table-extract-panel th, #table-extract-panel td { border-bottom: 1px solid #e2e8f0; padding: 6px; text-align: left; vertical-align: top; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #table-extract-panel th input[type="text"] { width: 110px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 4px; }
      #table-extract-panel .table-extract-status { margin-top: 8px; color: #166534; }
      .table-extract-highlight { outline: 3px solid #7c3aed !important; outline-offset: 2px; }
    `;
    document.documentElement.appendChild(style);
  }

  function detectDatasets() {
    const found = [];

    document.querySelectorAll('table').forEach((table) => {
      if (table.closest(IGNORE) || table.parentElement?.closest('table')) return;
      const matrix = tableToMatrix(table);
      if (!matrix) return;
      found.push({
        label: `Table · ${Math.max(matrix.length - 1, 0)} rows × ${matrix[0].length} columns`,
        matrix,
        elements: [table],
        score: matrix.length * matrix[0].length + 1000,
      });
    });

    let checked = 0;
    document.querySelectorAll('body *').forEach((parent) => {
      if (checked > 5000 || parent.closest(IGNORE) || parent.closest('table')) return;
      checked += 1;
      const children = [...parent.children].filter((child) => !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(child.tagName));
      if (children.length < 3 || children.length > 400) return;

      const groups = new Map();
      children.forEach((child) => {
        const key = signature(child);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(child);
      });

      groups.forEach((group) => {
        if (group.length < 3) return;
        const matrix = listToMatrix(group);
        if (!matrix || matrix.length < 4 || matrix[0].length < 2) return;
        found.push({
          label: `Repeating list · ${matrix.length - 1} rows × ${matrix[0].length} columns`,
          matrix,
          elements: group,
          score: (matrix.length - 1) * matrix[0].length,
        });
      });
    });

    found.sort((a, b) => b.score - a.score);
    const kept = [];
    found.forEach((candidate) => {
      const overlaps = kept.some((existing) => candidate.elements.some((element) => (
        existing.elements.some((other) => other === element || other.contains(element) || element.contains(other))
      )));
      if (!overlaps && kept.length < 8) kept.push(candidate);
    });
    return kept;
  }

  function signature(element) {
    const tags = [element.tagName];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node && tags.length < 8) {
      tags.push(node.tagName);
      node = walker.nextNode();
    }
    return tags.join('>');
  }

  function tableToMatrix(table) {
    const grid = [];
    [...table.rows].forEach((row, rowIndex) => {
      grid[rowIndex] = grid[rowIndex] || [];
      let column = 0;
      [...row.cells].forEach((cell) => {
        while (grid[rowIndex][column] !== undefined) column += 1;
        const text = cellText(cell);
        const colspan = cell.colSpan || 1;
        const rowspan = cell.rowSpan || 1;
        for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
          grid[rowIndex + rowOffset] = grid[rowIndex + rowOffset] || [];
          for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
            grid[rowIndex + rowOffset][column + columnOffset] = rowOffset === 0 && columnOffset === 0 ? text : '';
          }
        }
        column += colspan;
      });
    });

    const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
    const matrix = grid.map((row) => Array.from({ length: width }, (_, index) => row[index] || ''))
      .filter((row) => row.some(Boolean));
    if (matrix.length < 2 || width < 1) return null;
    return matrix;
  }

  function listToMatrix(group) {
    const template = fieldsOf(group[0]);
    if (template.length < 2) return null;
    const paths = template.map((field) => pathFrom(group[0], field));
    const widths = template.map((field) => fieldCells(field).length);
    const header = [];
    widths.forEach((width, fieldIndex) => {
      for (let cellIndex = 0; cellIndex < width; cellIndex += 1) {
        const linkColumn = width > 1 && cellIndex === width - 1 && template[fieldIndex].tagName === 'A';
        header.push(linkColumn ? `Link ${header.length + 1}` : `Column ${header.length + 1}`);
      }
    });

    const rows = group.map((row) => {
      const values = [];
      paths.forEach((path, fieldIndex) => {
        const found = path ? row.querySelector(path) : row;
        const cells = found ? fieldCells(found) : [];
        for (let cellIndex = 0; cellIndex < widths[fieldIndex]; cellIndex += 1) {
          values.push(cells[cellIndex] || '');
        }
      });
      const link = row.querySelector('a[href]');
      if (link && /^https?:/i.test(link.href) && !values.includes(link.href)) values.push(link.href);
      return values;
    });

    const width = Math.max(header.length, ...rows.map((row) => row.length));
    if (header.length < width) header.push('Link');
    return [header, ...rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ''))]
      .filter((row, index) => index === 0 || row.some(Boolean));
  }

  function fieldsOf(row) {
    const candidates = [...row.querySelectorAll('a, img, h1, h2, h3, h4, p, span, li, strong, button')];
    return candidates.filter((element) => {
      if (!fieldCells(element).length) return false;
      return !candidates.some((other) => other !== element && element.contains(other) && fieldCells(other).length);
    }).slice(0, 12);
  }

  function fieldCells(element) {
    if (element.tagName === 'IMG') {
      const source = element.currentSrc || element.getAttribute('src') || '';
      if (!source || source.startsWith('data:')) return [];
      try {
        return [new URL(source, location.href).href];
      } catch {
        return [];
      }
    }

    const text = directText(element);
    if (element.tagName === 'A') {
      const cells = [];
      if (text) cells.push(text);
      if (/^https?:/i.test(element.href)) cells.push(element.href);
      return cells;
    }
    return text ? [text] : [];
  }

  function directText(element) {
    const ownText = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (ownText) return ownText;
    if (element.children.length === 0) return (element.textContent || '').replace(/\s+/g, ' ').trim();
    return '';
  }

  function pathFrom(root, element) {
    const parts = [];
    let node = element;
    while (node && node !== root) {
      const parent = node.parentElement;
      if (!parent) return '';
      const index = [...parent.children].filter((child) => child.tagName === node.tagName).indexOf(node) + 1;
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${index})`);
      node = parent;
    }
    return parts.join(' > ');
  }

  function cellText(cell) {
    return (cell.innerText || cell.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function renderPanel() {
    clearHighlights();
    if (panel) panel.remove();
    panel = document.createElement('aside');
    panel.id = 'table-extract-panel';
    panel.setAttribute('data-table-extract-ignore', 'true');

    const dataset = datasets[selected];
    const header = document.createElement('header');
    const titleWrap = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = 'Copy table data';
    const note = document.createElement('p');
    note.textContent = dataset
      ? 'Paste into Excel or Google Sheets with Ctrl+V. The columns stay in place.'
      : 'No table or repeating list was found on this page.';
    titleWrap.append(title, note);
    const close = document.createElement('button');
    close.className = 'secondary';
    close.textContent = 'Close';
    close.addEventListener('click', closePanel);
    header.append(titleWrap, close);
    panel.appendChild(header);

    const actions = document.createElement('div');
    actions.className = 'table-extract-actions';
    actions.append(
      actionButton('Copy for Excel / Sheets', () => copyCurrent()),
      actionButton('Download CSV', () => downloadCurrent(), 'secondary'),
      actionButton('Rescan', () => {
        datasets = detectDatasets();
        selected = 0;
        hidden = new Set();
        renderPanel();
      }, 'secondary'),
    );
    panel.appendChild(actions);

    const body = document.createElement('div');
    body.className = 'table-extract-body';
    if (dataset) {
      const picker = document.createElement('select');
      datasets.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = item.label;
        option.selected = index === selected;
        picker.appendChild(option);
      });
      picker.addEventListener('change', () => {
        selected = Number(picker.value);
        hidden = new Set();
        renderPanel();
      });
      body.appendChild(picker);
      body.appendChild(previewTable(dataset.matrix));
      highlight(dataset.elements);
    }
    const status = document.createElement('div');
    status.className = 'table-extract-status';
    status.id = 'table-extract-status';
    body.appendChild(status);
    panel.appendChild(body);
    document.documentElement.appendChild(panel);
  }

  function actionButton(label, onClick, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener('click', onClick);
    return button;
  }

  function previewTable(matrix) {
    const scroll = document.createElement('div');
    scroll.className = 'table-extract-scroll';
    const table = document.createElement('table');
    const head = document.createElement('tr');
    matrix[0].forEach((name, index) => {
      const cell = document.createElement('th');
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = !hidden.has(index);
      toggle.title = 'Include this column';
      toggle.addEventListener('change', () => {
        if (toggle.checked) hidden.delete(index);
        else hidden.add(index);
      });
      const input = document.createElement('input');
      input.type = 'text';
      input.value = name;
      input.addEventListener('input', () => {
        matrix[0][index] = input.value;
      });
      cell.append(toggle, input);
      head.appendChild(cell);
    });
    table.appendChild(head);

    matrix.slice(1, 9).forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        td.title = value;
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    scroll.appendChild(table);
    return scroll;
  }

  function currentMatrix() {
    const dataset = datasets[selected];
    if (!dataset) return [];
    return dataset.matrix.map((row) => row.filter((_, index) => !hidden.has(index)));
  }

  async function copyCurrent() {
    const matrix = currentMatrix();
    if (!matrix.length) return setStatus('Nothing to copy.');
    const tsv = matrix.map((row) => row.map(plainCell).join('\t')).join('\n');
    const html = `<table>${matrix.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
    } catch {
      const area = document.createElement('textarea');
      area.value = tsv;
      panel.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setStatus(`Copied ${matrix.length - 1} rows. Paste into Excel or Google Sheets.`);
  }

  function downloadCurrent() {
    const matrix = currentMatrix();
    if (!matrix.length) return setStatus('Nothing to download.');
    const csv = `\uFEFF${matrix.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'table-data.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('CSV downloaded. Excel and Google Sheets can open it.');
  }

  function plainCell(value) {
    return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  }

  function csvCell(value) {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    }[character]));
  }

  function setStatus(message) {
    const status = document.getElementById('table-extract-status');
    if (status) status.textContent = message;
  }

  function highlight(elements) {
    elements.forEach((element) => element.classList.add('table-extract-highlight'));
  }

  function clearHighlights() {
    document.querySelectorAll('.table-extract-highlight').forEach((element) => {
      element.classList.remove('table-extract-highlight');
    });
  }

  function closePanel() {
    clearHighlights();
    if (panel) panel.remove();
    panel = null;
  }
}
