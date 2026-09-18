import { describe, expect, it, vi } from 'vitest';
import { createDualIdentityProvider } from '../src/dual-identity-provider.js';
import { FEISHU_AUTHORIZE_URL, FEISHU_TOKEN_URL } from '../src/feishu-identity-provider.js';

describe('dual identity provider', () => {
  it('uses Feishu for authorize_url and synthetic codes for the account form', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'http://127.0.0.1:43101/exchange') {
        return Response.json({ provider: 'synthetic', binding_id: 'synthetic_agent' });
      }
      if (url === FEISHU_TOKEN_URL) {
        return Response.json({ code: 0, access_token: 'u-token', token_type: 'Bearer' });
      }
      if (url.includes('user_info')) {
        return Response.json({ code: 0, data: { open_id: 'ou_8f5c2a0000000001' } });
      }
      return new Response('missing', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchImpl);
    const provider = createDualIdentityProvider(
      {
        clientId: 'cli_aaaaaaaaaaaaaaaa',
        clientSecret: 'test-feishu-secret-material-0001',
        redirectUri: 'https://oauth.test.invalid/v1/auth/callback',
      },
      'http://127.0.0.1:43101',
      'http://127.0.0.1:43100/v1/auth/callback',
    );
    const authorize = new URL(provider.authorizeUrl('state-1'));
    expect(`${authorize.origin}${authorize.pathname}`).toBe(FEISHU_AUTHORIZE_URL);
    expect(await provider.exchange('synthetic_agent')).toBe('synthetic_agent');
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe('http://127.0.0.1:43101/exchange');
    provider.close();
    vi.unstubAllGlobals();
  });
});
