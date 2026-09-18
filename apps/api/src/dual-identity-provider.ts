import { createFeishuIdentityProvider, type FeishuIdentityProviderConfig } from './feishu-identity-provider.js';
import { createSyntheticIdentityProvider } from './synthetic-identity-provider.js';
import type { SyntheticIdentityProvider } from './product-auth-service.js';

const SYNTHETIC_CODE = /^synthetic_[A-Za-z0-9_-]{1,100}$/;

/** Feishu owns authorize_url; account passwords still exchange via the loopback synthetic provider. */
export function createDualIdentityProvider(
  feishu: FeishuIdentityProviderConfig,
  syntheticOrigin: string,
  callbackUrl: string,
): SyntheticIdentityProvider {
  const feishuProvider = createFeishuIdentityProvider(feishu);
  const syntheticProvider = createSyntheticIdentityProvider(syntheticOrigin, callbackUrl);
  return Object.freeze({
    authorizeUrl: (state: string) => feishuProvider.authorizeUrl(state),
    exchange: (code: string) => SYNTHETIC_CODE.test(code)
      ? syntheticProvider.exchange(code)
      : feishuProvider.exchange(code),
    close() {
      feishuProvider.close();
      syntheticProvider.close();
    },
  });
}
