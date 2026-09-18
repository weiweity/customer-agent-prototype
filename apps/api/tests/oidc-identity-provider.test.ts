import { describe, expect, it, vi } from 'vitest';
import { createOidcIdentityProvider } from '../src/oidc-identity-provider.js';

const config = Object.freeze({
  issuer: 'http://127.0.0.1:3001/oidc',
  clientId: 'logto_client_1',
  clientSecret: 'test-oidc-secret-material-0001',
  redirectUri: 'http://127.0.0.1:43100/v1/auth/callback',
});

describe('oidc identity provider', () => {
  it('builds the broker authorize URL without leaking the client secret', () => {
    const provider = createOidcIdentityProvider(config);
    const url = new URL(provider.authorizeUrl('opaque-state'));
    expect(`${url.origin}${url.pathname}`).toBe('http://127.0.0.1:3001/oidc/auth');
    expect(url.searchParams.get('client_id')).toBe(config.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('scope')).toBe('openid profile');
    expect(url.href).not.toContain(config.clientSecret);
    provider.close();
  });

  it('exchanges a code for the OIDC sub used as binding_id', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'http://127.0.0.1:3001/oidc/token') {
        return Response.json({ access_token: 'tok', token_type: 'Bearer' });
      }
      if (url === 'http://127.0.0.1:3001/oidc/me') {
        return Response.json({ sub: 'user_contractor_1' });
      }
      return new Response('missing', { status: 500 });
    });
    const provider = createOidcIdentityProvider(config, fetchImpl);
    expect(await provider.exchange('code-1')).toBe('user_contractor_1');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://127.0.0.1:3001/oidc/token');
    provider.close();
  });
});
