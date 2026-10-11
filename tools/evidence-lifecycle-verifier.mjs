#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSchemaPath = path.resolve(here, '../schemas/aksi-evidence-lifecycle-v1.schema.json');

function isType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  return false;
}

function resolveLocalRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error('Only local JSON Schema refs are supported: ' + ref);
  return ref.slice(2).split('/').reduce((node, part) => {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    return node == null ? undefined : node[key];
  }, root);
}

/** Dependency-free validator for the JSON Schema keywords used by the AKSI v1 contract. */
export function validateAgainstSchema(value, schema, rootSchema = schema, location = '$', issues = []) {
  if (schema.$ref) {
    const target = resolveLocalRef(rootSchema, schema.$ref);
    if (!target) {
      issues.push({ code: 'SCHEMA_REF_UNRESOLVED', path: location, message: 'Unresolved schema reference: ' + schema.$ref });
      return issues;
    }
    return validateAgainstSchema(value, target, rootSchema, location, issues);
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    issues.push({ code: 'CONST_MISMATCH', path: location, message: 'Value must equal ' + JSON.stringify(schema.const) });
  }
  if (schema.enum && !schema.enum.some(item => Object.is(item, value))) {
    issues.push({ code: 'ENUM_MISMATCH', path: location, message: 'Value is not an allowed enum member' });
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(type => isType(value, type))) {
      issues.push({ code: 'TYPE_MISMATCH', path: location, message: 'Expected type ' + types.join(' or ') });
      return issues;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength)
      issues.push({ code: 'STRING_TOO_SHORT', path: location, message: 'String is shorter than minLength' });
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value))
      issues.push({ code: 'PATTERN_MISMATCH', path: location, message: 'String does not match required pattern' });
    if (schema.format === 'date-time' && (!/^\d{4}-\d\d-\d\dT/.test(value) || Number.isNaN(Date.parse(value))))
      issues.push({ code: 'FORMAT_DATE_TIME', path: location, message: 'Expected an ISO date-time string' });
    if (schema.format === 'date' && (!/^\d{4}-\d\d-\d\d$/.test(value) || Number.isNaN(Date.parse(value))))
      issues.push({ code: 'FORMAT_DATE', path: location, message: 'Expected an ISO date string' });
    if (schema.format === 'uri') {
      try { new URL(value); } catch { issues.push({ code: 'FORMAT_URI', path: location, message: 'Expected an absolute URI' }); }
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      issues.push({ code: 'ARRAY_TOO_SHORT', path: location, message: 'Array has fewer than minItems' });
    if (schema.uniqueItems) {
      const serialized = value.map(item => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length)
        issues.push({ code: 'ARRAY_NOT_UNIQUE', path: location, message: 'Array items must be unique' });
    }
    if (schema.items) value.forEach((item, index) => validateAgainstSchema(item, schema.items, rootSchema, location + '[' + index + ']', issues));
  }
  if (isType(value, 'object')) {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) issues.push({ code: 'REQUIRED_MISSING', path: location + '.' + key, message: 'Required property is missing' });
    }
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) {
        validateAgainstSchema(child, schema.properties[key], rootSchema, location + '.' + key, issues);
      } else if (schema.additionalProperties === false) {
        issues.push({ code: 'ADDITIONAL_PROPERTY', path: location + '.' + key, message: 'Additional property is not allowed' });
      }
    }
  }
  return issues;
}

export function validateEvidenceRecord(record, schema) {
  const schemaIssues = validateAgainstSchema(record, schema);
  const semanticIssues = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { valid: false, schemaIssues, semanticIssues: [{ code: 'ROOT_NOT_OBJECT', path: '$', message: 'Record root must be an object' }] };
  }
  const arrays = [
    ['sources', record.sources], ['claims', record.claims], ['hypotheses', record.hypotheses],
    ['outcomes', record.outcomes], ['revisions', record.revisions],
    ['context.items', record.context?.items], ['decision.alternatives', record.decision?.alternatives]
  ];
  const idSets = new Map();
  for (const [label, items] of arrays) {
    if (!Array.isArray(items)) continue;
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object' || typeof item.id !== 'string') continue;
      if (seen.has(item.id)) semanticIssues.push({ code: 'DUPLICATE_ID', path: label + '[' + i + '].id', message: 'Duplicate id within ' + label + ': ' + item.id });
      seen.add(item.id);
    }
    idSets.set(label, seen);
  }
  const sourceIds = idSets.get('sources') || new Set();
  function checkRefs(items, label) {
    if (!Array.isArray(items)) return;
    items.forEach((item, i) => {
      if (!item || typeof item !== 'object' || item.source_ids === undefined) return;
      if (!Array.isArray(item.source_ids)) return; // Shape error is already reported by the schema.
      item.source_ids.forEach((id, j) => {
        if (!sourceIds.has(id)) semanticIssues.push({ code: 'SOURCE_REF_UNRESOLVED', path: label + '[' + i + '].source_ids[' + j + ']', message: 'Source id does not resolve: ' + id });
      });
    });
  }
  checkRefs(record.context?.items, 'context.items');
  checkRefs(record.claims, 'claims');
  checkRefs(record.outcomes, 'outcomes');
  if (Array.isArray(record.hypotheses)) {
    record.hypotheses.forEach((hypothesis, i) => {
      if (Array.isArray(hypothesis?.tests)) checkRefs(hypothesis.tests, 'hypotheses[' + i + '].tests');
    });
  }
  if (record.decision && Array.isArray(record.decision.alternatives)) {
    const selected = record.decision.selected_alternative_id;
    const alternativeIds = new Set(record.decision.alternatives.map(item => item?.id).filter(id => typeof id === 'string'));
    if (selected !== null && !alternativeIds.has(selected)) {
      semanticIssues.push({ code: 'ALTERNATIVE_REF_UNRESOLVED', path: 'decision.selected_alternative_id', message: 'Selected alternative does not resolve to an alternative id' });
    }
  }
  if (Array.isArray(record.claims)) {
    record.claims.forEach((claim, i) => {
      if (claim?.status === 'verified' && (!Array.isArray(claim.source_ids) || claim.source_ids.length === 0)) {
        semanticIssues.push({ code: 'VERIFIED_WITHOUT_SOURCE', path: 'claims[' + i + '].status', message: 'A verified claim must reference at least one source in this draft profile' });
      }
    });
  }
  const issues = [...schemaIssues, ...semanticIssues];
  return { valid: issues.length === 0, schemaIssues, semanticIssues };
}

function printUsage() {
  process.stderr.write('Usage: node tools/evidence-lifecycle-verifier.mjs <record.json> [schema.json]\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath === '--help') { printUsage(); process.exit(inputPath ? 0 : 2); }
  try {
    const record = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const schemaPath = process.argv[3] ? path.resolve(process.argv[3]) : defaultSchemaPath;
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const result = validateEvidenceRecord(record, schema);
    process.stdout.write(JSON.stringify({ protocol: 'AKSI-EVIDENCE-LIFECYCLE-VERIFIER/1', valid: result.valid, schemaIssues: result.schemaIssues, semanticIssues: result.semanticIssues }, null, 2) + '\n');
    if (!result.valid) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(JSON.stringify({ valid: false, code: 'INPUT_ERROR', message: error.message }, null, 2) + '\n');
    process.exitCode = 2;
  }
}
