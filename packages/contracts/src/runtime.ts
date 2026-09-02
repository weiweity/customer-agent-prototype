import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import * as formatsModule from 'ajv-formats';
import type { FormatsPlugin } from 'ajv-formats';
import type { components } from './generated/openapi.generated.js';
import {
  COMPONENT_SCHEMA_NAMES,
  OPENAPI_RUNTIME_SCHEMA_DOCUMENT,
  OPENAPI_RUNTIME_SCHEMA_ID,
  type GeneratedComponentSchemaName,
} from './generated/runtime-schema.generated.js';

export type ContractSchemaName = keyof components['schemas'] & GeneratedComponentSchemaName;
export type ContractSchemaValue<Name extends ContractSchemaName> = components['schemas'][Name];

export type ContractValidationIssue = Readonly<{
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
}>;

export type ContractValidationResult<Name extends ContractSchemaName> =
  | Readonly<{ ok: true; value: ContractSchemaValue<Name> }>
  | Readonly<{ ok: false; issues: readonly ContractValidationIssue[] }>;

const addFormats = (formatsModule.default ?? formatsModule) as unknown as FormatsPlugin;

function toIssue(error: ErrorObject): ContractValidationIssue {
  return Object.freeze({
    instancePath: error.instancePath,
    schemaPath: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? 'contract validation failed',
  });
}

function jsonPointerSegment(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function buildValidators(): ReadonlyMap<string, ValidateFunction> {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: false,
    validateFormats: true,
  });
  addFormats(ajv);
  ajv.addFormat('binary', { type: 'string', validate: () => true });
  ajv.addFormat('double', { type: 'number', validate: Number.isFinite });
  ajv.addSchema(OPENAPI_RUNTIME_SCHEMA_DOCUMENT);

  return new Map(
    COMPONENT_SCHEMA_NAMES.map((name) => [
      name,
      ajv.compile({ $ref: `${OPENAPI_RUNTIME_SCHEMA_ID}#/$defs/${jsonPointerSegment(name)}` }),
    ]),
  );
}

const validators = buildValidators();

export const contractSchemaNames: readonly ContractSchemaName[] = Object.freeze(
  [...COMPONENT_SCHEMA_NAMES] as ContractSchemaName[],
);

export function validateContractSchema<Name extends ContractSchemaName>(
  name: Name,
  value: unknown,
): ContractValidationResult<Name> {
  const validator = validators.get(name);
  if (!validator) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([
        Object.freeze({
          instancePath: '',
          schemaPath: '',
          keyword: 'schema',
          message: 'unknown contract component schema',
        }),
      ]),
    });
  }
  if (validator(value)) {
    return Object.freeze({ ok: true, value: value as ContractSchemaValue<Name> });
  }
  return Object.freeze({
    ok: false,
    issues: Object.freeze((validator.errors ?? []).map(toIssue)),
  });
}

export class ContractValidationError extends Error {
  readonly code = 'CONTRACT_VALIDATION_FAILED';
  readonly schemaName: ContractSchemaName;
  readonly issues: readonly ContractValidationIssue[];

  constructor(schemaName: ContractSchemaName, issues: readonly ContractValidationIssue[]) {
    super(`Contract validation failed for ${schemaName}`);
    this.name = 'ContractValidationError';
    this.schemaName = schemaName;
    this.issues = Object.freeze([...issues]);
  }
}

export function parseContractSchema<Name extends ContractSchemaName>(
  name: Name,
  value: unknown,
): ContractSchemaValue<Name> {
  const result = validateContractSchema(name, value);
  if (!result.ok) {
    throw new ContractValidationError(name, result.issues);
  }
  return result.value;
}
