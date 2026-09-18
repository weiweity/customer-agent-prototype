import { IdentityFailure, type SyntheticIdentityProvider } from './product-auth-service.js';

const MAX_BODY_BYTES = 4096;
const SUB_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export type OidcIdentityProviderConfig = Readonly<{
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;

type FetchLike = typeof fetch;

/** OIDC authorization-code client. Issuer must already be allowlisted at config parse. */
export function createOidcIdentityProvider(
  config: OidcIdentityProviderConfig,
  fetchImpl: FetchLike = fetch,
): SyntheticIdentityProvider {
  const issuer = new URL(config.issuer);
  const pending = new Set<AbortController>();
  let closed = false;

  function endpoint(name: 'auth' | 'token' | 'me'): URL {
    return new URL(`${issuer.pathname.replace(/\/$/, '')}/${name}`, issuer.origin);
  }

  async function readJson(response: Response): Promise<unknown> {
    if (!response.body) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BODY_BYTES) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
    }
  }

  return Object.freeze({
    authorizeUrl(state: string) {
      const url = endpoint('auth');
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('scope', 'openid profile');
      url.searchParams.set('state', state);
      return url.href;
    },
    async exchange(code: string) {
      if (closed) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
      const controller = new AbortController();
      pending.add(controller);
      const timeout = setTimeout(() => controller.abort(), 5_000);
      try {
        const tokenResponse = await fetchImpl(endpoint('token'), {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: config.redirectUri,
          }).toString(),
        });
        if (tokenResponse.status === 400 || tokenResponse.status === 401) throw new IdentityFailure('LOGIN_INVALID');
        if (!tokenResponse.ok) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
        const tokenBody = await readJson(tokenResponse);
        const accessToken = tokenBody && typeof tokenBody === 'object'
          ? Reflect.get(tokenBody, 'access_token') : undefined;
        if (typeof accessToken !== 'string' || accessToken.length < 1) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
        const userResponse = await fetchImpl(endpoint('me'), {
          method: 'GET',
          redirect: 'error',
          signal: controller.signal,
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (userResponse.status === 400 || userResponse.status === 401) throw new IdentityFailure('LOGIN_INVALID');
        if (!userResponse.ok) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
        const userBody = await readJson(userResponse);
        const sub = userBody && typeof userBody === 'object' ? Reflect.get(userBody, 'sub') : undefined;
        if (typeof sub !== 'string' || !SUB_PATTERN.test(sub)) throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
        return sub;
      } catch (error) {
        if (error instanceof IdentityFailure) throw error;
        throw new IdentityFailure('DEPENDENCY_UNAVAILABLE');
      } finally {
        clearTimeout(timeout);
        controller.abort();
        pending.delete(controller);
      }
    },
    close() {
      closed = true;
      for (const controller of pending) controller.abort();
      pending.clear();
    },
  });
}
