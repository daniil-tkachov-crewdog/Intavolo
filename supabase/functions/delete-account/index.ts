// Deletes the caller's account. For Sign in with Apple users it first revokes the app's
// access to their Apple ID (App Store Guideline 5.1.1(v)), using a fresh authorization code
// the app gets by asking the user to confirm with Apple right before deletion.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

const CLIENT_ID = 'com.intavolo.app';
const APPLE = 'https://appleid.apple.com';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Short-lived client secret signed with the Sign in with Apple key. */
async function appleClientSecret() {
  const pem = Deno.env.get('APPLE_PRIVATE_KEY')!.replace(/\\n/g, '\n');
  const key = await importPKCS8(pem, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: Deno.env.get('APPLE_KEY_ID')! })
    .setIssuer(Deno.env.get('APPLE_TEAM_ID')!)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience(APPLE)
    .setSubject(CLIENT_ID)
    .sign(key);
}

const form = (data: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(data),
});

async function revokeApple(code: string) {
  const client_secret = await appleClientSecret();
  const res = await fetch(`${APPLE}/auth/token`, form({ client_id: CLIENT_ID, client_secret, code, grant_type: 'authorization_code' }));
  const tokens = await res.json();
  if (!res.ok) throw new Error(`Apple token exchange failed: ${tokens.error ?? res.status}`);
  const [token, hint] = tokens.refresh_token ? [tokens.refresh_token, 'refresh_token'] : [tokens.access_token, 'access_token'];
  const revoke = await fetch(`${APPLE}/auth/revoke`, form({ client_id: CLIENT_ID, client_secret, token, token_type_hint: hint }));
  if (!revoke.ok) throw new Error(`Apple revoke failed: ${revoke.status}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data, error } = await admin.auth.getUser(jwt);
  const user = data?.user;
  if (error || !user) return json({ error: 'unauthorized' }, 401);

  const { appleAuthorizationCode } = (await req.json().catch(() => ({}))) as { appleAuthorizationCode?: string };
  const providers: string[] = user.app_metadata?.providers ?? [user.app_metadata?.provider];

  try {
    if (providers.includes('apple')) {
      if (!appleAuthorizationCode) return json({ error: 'apple_code_required' }, 400);
      await revokeApple(appleAuthorizationCode);
    }
    // Progress and daily activity rows go with the user (ON DELETE CASCADE).
    const del = await admin.auth.admin.deleteUser(user.id);
    if (del.error) throw del.error;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'delete_failed' }, 500);
  }
});
