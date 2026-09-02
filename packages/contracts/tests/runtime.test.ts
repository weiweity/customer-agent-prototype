import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CONTRACT_PROVENANCE,
  ContractValidationError,
  contractSchemaNames,
  parseContractSchema,
  validateContractSchema,
} from '../src/index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validSearchRequest = Object.freeze({
  query_id: '5a5d8ff9-a23e-4c04-b902-64d0e33502cf',
  parent_query_id: null,
  interaction_reason: 'original',
  query_text: '退款进度',
  collection_mode: 'synthetic',
  detected_platform: 'qianniu',
  platform: 'qianniu',
  platform_source: 'manual',
  product_context_type: null,
  product_context_ref: null,
  top_k: 3,
});

describe('generated customer-agent runtime contracts', () => {
  it('keeps generated artifacts byte-for-byte reproducible', () => {
    expect(() => execFileSync(
      process.execPath,
      ['scripts/generate-contracts.mjs', '--check'],
      { cwd: packageRoot, stdio: ['ignore', 'pipe', 'pipe'] },
    )).not.toThrow();
  });

  it('binds validators to the verified inactive contract set', () => {
    expect(CONTRACT_PROVENANCE).toMatchObject({
      contract_set_id: 'cs-ai-c11-openapi-1.11.0-schema-1.12-1d62e2c85c3c',
      source_git_sha: '1d62e2c85c3c77dbb7a2fecc1d24a2002cb0ed38',
      openapi_sha256: '06698f233702591c8f981c7b08ebac4b7d5bc5cc2d69d36014ef2a9f5a6802e4',
      database_sha256: '47b667958e522a28df1c04d7c79a56c930bfe0ac04598321824b55744ac4a801',
      intake_status: 'VERIFIED_NOT_ACTIVATED',
      runtime_activated: false,
    });
    expect(contractSchemaNames).toContain('SearchRequest');
    expect(contractSchemaNames.length).toBeGreaterThan(100);
  });

  it('accepts a contract-valid search request', () => {
    expect(validateContractSchema('SearchRequest', validSearchRequest)).toEqual({
      ok: true,
      value: validSearchRequest,
    });
  });

  it.each([
    ['unknown fields', { ...validSearchRequest, unexpected: 'forbidden' }],
    ['an original request with a parent', {
      ...validSearchRequest,
      parent_query_id: '68cc44fb-3d14-4860-a765-e882754d66d7',
    }],
    ['an unpaired product context', {
      ...validSearchRequest,
      product_context_type: 'category',
      product_context_ref: null,
    }],
  ])('rejects %s without mutating the payload', (_label, payload) => {
    const before = structuredClone(payload);
    const result = validateContractSchema('SearchRequest', payload);

    expect(result.ok).toBe(false);
    expect(payload).toEqual(before);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(result.issues)).not.toContain('退款进度');
    }
  });

  it('enforces the adoption discriminated union', () => {
    expect(validateContractSchema('AdoptionEventRequest', {
      query_id: validSearchRequest.query_id,
      outcome: 'adopted',
      chosen_rank: 1,
      chosen_script_id: 'script-001',
      push_method: 'clipboard',
    }).ok).toBe(true);

    expect(validateContractSchema('AdoptionEventRequest', {
      query_id: validSearchRequest.query_id,
      outcome: 'adopted',
      chosen_rank: null,
      chosen_script_id: null,
      push_method: null,
    }).ok).toBe(false);
  });

  it('throws a scrubbed typed error at strict parse boundaries', () => {
    expect(() => parseContractSchema('SearchRequest', {
      ...validSearchRequest,
      query_text: '',
    })).toThrow(ContractValidationError);

    let caught: unknown;
    try {
      parseContractSchema('SearchRequest', {
        ...validSearchRequest,
        query_text: 'secret-body',
        unexpected: 'secret-body',
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ContractValidationError);
    expect(JSON.stringify(caught)).not.toContain('secret-body');
  });
});
