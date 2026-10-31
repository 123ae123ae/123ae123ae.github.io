export function readRecoveryMaterial(search = '', hash = '', kind = 'recovery') {
  const query = new URLSearchParams(search.replace(/^\?/, ''));
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  if (query.has('error') || query.has('error_code') || fragment.has('error') || fragment.has('error_code')) return null;
  const expected = kind === 'confirmation' ? 'email' : 'recovery';
  if (fragment.get('type') !== expected) return null;
  const tokenHash = fragment.get('token_hash');
  if (tokenHash && /^[a-zA-Z0-9_-]{20,512}$/.test(tokenHash)) return { token_hash: tokenHash, type: expected };
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (kind === 'recovery' && accessToken?.length > 20 && refreshToken?.length > 10) {
    return { access_token: accessToken, refresh_token: refreshToken };
  }
  return null;
}

export function validNewPassword(password, confirmation) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128 && password === confirmation;
}

export async function authRequest(config, path, body, token, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl(`${config.supabaseUrl}/auth/v1/${path}`, {
      method: path === 'user' ? 'PUT' : 'POST', signal: controller.signal,
      headers: { apikey: config.publicKey, 'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('AUTH_REQUEST_FAILED'), { code: data.code || data.error_code });
    return data;
  } finally { clearTimeout(timer); }
}

export async function verifyMaterial(config, material, fetchImpl = fetch) {
  if (!material) throw new Error('MISSING_RECOVERY_LINK');
  if (material.token_hash) return authRequest(config, 'verify', material, null, fetchImpl);
  return authRequest(config, 'token?grant_type=refresh_token', { refresh_token: material.refresh_token }, null, fetchImpl);
}
