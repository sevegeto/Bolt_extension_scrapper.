var SupabaseClient = {
  async signIn(email, password) {
    const data = await authRequest('token?grant_type=password', { email, password });
    const session = normalizeSession(data);
    await chrome.storage.local.set({ supabaseSession: session });
    return session;
  },

  async signOut() {
    const session = await this.getSession();
    if (session?.access_token) {
      await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      }).catch(() => {});
    }
    await chrome.storage.local.remove('supabaseSession');
  },

  async getSession() {
    const stored = await chrome.storage.local.get('supabaseSession');
    const session = stored.supabaseSession;
    if (!session?.access_token) return null;
    if (session.expires_at * 1000 - Date.now() > 60000) return session;

    const data = await authRequest('token?grant_type=refresh_token', {
      refresh_token: session.refresh_token,
    });
    const next = normalizeSession(data);
    await chrome.storage.local.set({ supabaseSession: next });
    return next;
  },

  async saveProduct(record) {
    const session = await this.getSession();
    if (!session) throw new Error('Not authenticated');

    const saved = await postProduct(session.access_token, record, true);
    if (saved.ok) return;
    if (!/on_conflict|unique|constraint/i.test(saved.message)) {
      throw new Error(saved.message);
    }

    const inserted = await postProduct(session.access_token, record, false);
    if (!inserted.ok) throw new Error(inserted.message);
  },
};

function normalizeSession(data) {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: {
      id: data.user.id,
      email: data.user.email || '',
    },
  };
}

async function authRequest(path, body) {
  const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || data.error || 'Authentication failed');
  }
  return data;
}

async function postProduct(accessToken, record, upsert) {
  const url = upsert
    ? `${CONFIG.SUPABASE_URL}/rest/v1/products?on_conflict=user_id,source_url`
    : `${CONFIG.SUPABASE_URL}/rest/v1/products`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Prefer: upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: JSON.stringify(record),
  });
  if (response.ok) return { ok: true, message: '' };
  const data = await response.json().catch(() => ({}));
  return { ok: false, message: data.message || data.error || data.hint || 'Could not save the product' };
}
