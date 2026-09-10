import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DEFAULT_RETRIEVAL_PREFERENCE,
  parseRetrievalPreference,
  type RetrievalPreference,
} from '../shared/retrieval-preference';

export type RetrievalPreferenceStore = Readonly<{
  read(): RetrievalPreference;
  write(next: RetrievalPreference): RetrievalPreference;
}>;

export function loadRetrievalPreferenceStore(filePath: string): RetrievalPreferenceStore {
  const read = (): RetrievalPreference => {
    if (!existsSync(filePath)) return DEFAULT_RETRIEVAL_PREFERENCE;
    try {
      return parseRetrievalPreference(JSON.parse(readFileSync(filePath, 'utf8'))) ?? DEFAULT_RETRIEVAL_PREFERENCE;
    } catch {
      return DEFAULT_RETRIEVAL_PREFERENCE;
    }
  };
  return Object.freeze({
    read,
    write(next: RetrievalPreference) {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, `${JSON.stringify(next)}\n`);
      return next;
    },
  });
}
