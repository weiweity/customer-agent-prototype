export type RetrievalPreference = Readonly<{
  smartEnabled: boolean;
}>;

export const DEFAULT_RETRIEVAL_PREFERENCE: RetrievalPreference = Object.freeze({
  smartEnabled: true,
});

export function parseRetrievalPreference(raw: unknown): RetrievalPreference {
  if (!raw || typeof raw !== 'object') return DEFAULT_RETRIEVAL_PREFERENCE;
  const smartEnabled = Reflect.get(raw, 'smartEnabled');
  if (typeof smartEnabled !== 'boolean') return DEFAULT_RETRIEVAL_PREFERENCE;
  return Object.freeze({ smartEnabled });
}
