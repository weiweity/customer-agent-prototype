import { existsSync, readFileSync } from 'node:fs';
import type { ProductCandidate } from '../shared/product-search';
import type { RankedRetrieval } from '../shared/hybrid-retrieve';

export type HydrateCatalog = Readonly<{
  releaseId: string;
  candidate(scriptId: string): ProductCandidate | null;
  hydrate(ranked: readonly RankedRetrieval[]): ProductCandidate[];
}>;

type SnapshotRow = Readonly<{
  releaseId: string;
  scriptId: string;
  scriptVersion: number;
  contentHash: string;
  title: string;
  category: string;
  answerText: string;
  platformScope: readonly string[];
  productScopeType: string;
  productScopeRefs: readonly string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  intentTaxonomyVersion: string;
  intentId: string;
  riskLevel: string;
  riskCategories: readonly string[];
  hasConflict: boolean;
  placeholderKeys: readonly string[];
}>;

function asCandidate(row: SnapshotRow, rank: 1 | 2 | 3): ProductCandidate {
  return {
    rank,
    release_id: row.releaseId,
    script_id: row.scriptId,
    script_version: row.scriptVersion,
    content_hash: row.contentHash,
    title: row.title,
    category: row.category,
    answer_text: row.answerText,
    platform_scope: [...row.platformScope] as ProductCandidate['platform_scope'],
    product_scope_type: row.productScopeType,
    product_scope_refs: [...row.productScopeRefs],
    effective_from: row.effectiveFrom,
    effective_to: row.effectiveTo,
    intent_taxonomy_version: row.intentTaxonomyVersion,
    intent_id: row.intentId,
    risk_level: row.riskLevel as ProductCandidate['risk_level'],
    risk_categories: [...row.riskCategories],
    has_conflict: row.hasConflict,
    placeholder_keys: [...row.placeholderKeys] as ProductCandidate['placeholder_keys'],
  };
}

export function loadHydrateCatalog(indexPath = process.env.CUSTOMER_AGENT_HYDRATE_INDEX): HydrateCatalog | null {
  if (!indexPath || indexPath.trim().length === 0 || !existsSync(indexPath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(indexPath, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    const releaseId = Reflect.get(raw, 'releaseId');
    const scripts = Reflect.get(raw, 'scripts');
    if (typeof releaseId !== 'string' || releaseId.length < 1 || !Array.isArray(scripts)) return null;
    const byId = new Map<string, SnapshotRow>();
    for (const item of scripts) {
      if (!item || typeof item !== 'object') continue;
      const scriptId = Reflect.get(item, 'scriptId');
      const contentHash = Reflect.get(item, 'contentHash');
      const title = Reflect.get(item, 'title');
      const answerText = Reflect.get(item, 'answerText');
      if (typeof scriptId !== 'string' || typeof contentHash !== 'string' || typeof title !== 'string' || typeof answerText !== 'string') continue;
      byId.set(scriptId, item as SnapshotRow);
    }
    if (byId.size === 0) return null;
    return Object.freeze({
      releaseId,
      candidate(scriptId: string) {
        const row = byId.get(scriptId);
        return row ? asCandidate(row, 1) : null;
      },
      hydrate(ranked: readonly RankedRetrieval[]) {
        const out: ProductCandidate[] = [];
        for (const row of ranked) {
          const found = byId.get(row.scriptId);
          if (!found) continue;
          out.push(asCandidate(found, (out.length + 1) as 1 | 2 | 3));
          if (out.length === 3) break;
        }
        return out;
      },
    });
  } catch {
    return null;
  }
}
