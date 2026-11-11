#!/usr/bin/env node
/**
 * Curriculum Health, Schema & Freshness Validator
 * Inspects all TypeScript curriculum modules in src/data/*.ts, verifies non-empty exports,
 * checks global ID uniqueness and required fields, and prints a Curriculum Health Report.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

const MODULE_SPECS = [
  {
    file: 'softwarePatterns.ts',
    exportName: 'SOFTWARE_PATTERNS',
    domain: 'Classic GoF Software Patterns',
    minExpected: 15,
    requiredFields: ['id', 'title', 'category', 'difficulty', 'summary', 'group', 'whenToUse', 'antiPatterns'],
  },
  {
    file: 'distributedPatterns.ts',
    exportName: 'DISTRIBUTED_PATTERNS',
    domain: 'Distributed & Cloud Patterns',
    minExpected: 12,
    requiredFields: ['id', 'title', 'category', 'difficulty', 'summary', 'problem', 'solutionMechanics', 'failureModes'],
  },
  {
    file: 'systemTradeoffs.ts',
    exportName: 'SYSTEM_TRADEOFFS',
    domain: 'Core System Trade-Offs',
    minExpected: 6,
    requiredFields: ['id', 'title', 'category', 'difficulty', 'summary', 'coreTension', 'spectrumOrStrategies'],
  },
  {
    file: 'frameworkMatrices.ts',
    exportName: 'FRAMEWORK_MATRICES',
    domain: 'Framework Comparison Matrices',
    minExpected: 6,
    requiredFields: ['id', 'title', 'category', 'difficulty', 'summary', 'axes', 'contenders', 'dimensions'],
  },
  {
    file: 'caseStudies.ts',
    exportName: 'CASE_STUDIES',
    domain: 'End-to-End Case Studies',
    minExpected: 6,
    requiredFields: ['id', 'title', 'category', 'difficulty', 'summary', 'nodes', 'edges', 'deepDives'],
  },
  {
    file: 'flashcardsQuizzes.ts',
    exportName: 'FLASHCARDS',
    domain: 'Active-Recall Flashcards',
    minExpected: 20,
    requiredFields: ['id', 'category', 'difficulty', 'front', 'back', 'keyTakeaway', 'tags'],
  },
  {
    file: 'flashcardsQuizzes.ts',
    exportName: 'QUIZ_QUESTIONS',
    domain: 'Diagnostic Quiz Scenarios',
    minExpected: 15,
    requiredFields: ['id', 'category', 'difficulty', 'scenarioTitle', 'prompt', 'options', 'correctIndex', 'explanation'],
  },
];

function loadTsModuleExports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  const exportsObj = {};
  const moduleObj = { exports: exportsObj };
  const sandbox = {
    exports: exportsObj,
    module: moduleObj,
    require: () => ({}),
  };

  vm.runInNewContext(transpiled.outputText, sandbox, { filename: filePath });
  return moduleObj.exports;
}

function padRight(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function padLeft(str, len) {
  const s = String(str);
  return s.length >= len ? s.slice(0, len) : ' '.repeat(len - s.length) + s;
}

function runValidation() {
  const startTime = Date.now();
  const moduleCache = new Map();
  const globalIds = new Map();
  const errors = [];
  const reportRows = [];

  let totalItems = 0;
  const difficultyTotals = {
    Fundamental: 0,
    Intermediate: 0,
    Advanced: 0,
    'Staff+': 0,
  };

  for (const spec of MODULE_SPECS) {
    const fullPath = path.join(DATA_DIR, spec.file);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing curriculum file: src/data/${spec.file}`);
      continue;
    }

    let modExports = moduleCache.get(spec.file);
    if (!modExports) {
      try {
        modExports = loadTsModuleExports(fullPath);
        moduleCache.set(spec.file, modExports);
      } catch (err) {
        errors.push(`Failed to evaluate src/data/${spec.file}: ${err.message}`);
        continue;
      }
    }

    const items = modExports[spec.exportName];
    if (!Array.isArray(items) || items.length === 0) {
      errors.push(`Export ${spec.exportName} in src/data/${spec.file} is missing or empty.`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    const localIds = new Set();
    let schemaIssues = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const itemLabel = item?.id || `${spec.exportName}[${idx}]`;

      for (const field of spec.requiredFields) {
        const val = item?.[field];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === 'string' && val.trim() === '') ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          schemaIssues++;
          errors.push(`[${spec.exportName}] Item "${itemLabel}" is missing required field "${field}".`);
        }
      }

      if (item?.id) {
        if (localIds.has(item.id)) {
          errors.push(`Duplicate ID "${item.id}" within ${spec.exportName} (${spec.file}).`);
        }
        localIds.add(item.id);

        if (globalIds.has(item.id)) {
          errors.push(
            `Global ID collision for "${item.id}" between ${spec.exportName} and ${globalIds.get(item.id)}.`
          );
        } else {
          globalIds.set(item.id, spec.exportName);
        }
      }

      if (item?.difficulty && item.difficulty in difficultyTotals) {
        difficultyTotals[item.difficulty]++;
      }
    }

    const meetsMin = items.length >= spec.minExpected;
    if (!meetsMin) {
      errors.push(
        `Export ${spec.exportName} has ${items.length} items, below minimum threshold (${spec.minExpected}).`
      );
    }

    // Domain-specific referential integrity & deep structural checks
    if (spec.exportName === 'SOFTWARE_PATTERNS') {
      for (const pattern of items) {
        if (!Array.isArray(pattern.relatedPatternIds) || pattern.relatedPatternIds.length === 0) {
          schemaIssues++;
          errors.push(`[SOFTWARE_PATTERNS] "${pattern.id}" has empty relatedPatternIds.`);
          continue;
        }
        for (const relId of pattern.relatedPatternIds) {
          if (relId === pattern.id) {
            schemaIssues++;
            errors.push(`[SOFTWARE_PATTERNS] "${pattern.id}" self-references "${relId}" in relatedPatternIds.`);
          } else if (!localIds.has(relId)) {
            schemaIssues++;
            errors.push(
              `[SOFTWARE_PATTERNS] "${pattern.id}" references unknown relatedPatternId "${relId}".`
            );
          }
        }
      }
    }

    if (spec.exportName === 'DISTRIBUTED_PATTERNS') {
      const validSimulators = new Set(['circuit-breaker', 'rate-limiter', 'consistent-hashing']);
      for (const pattern of items) {
        if (pattern.simulatorId !== undefined && !validSimulators.has(pattern.simulatorId)) {
          schemaIssues++;
          errors.push(
            `[DISTRIBUTED_PATTERNS] "${pattern.id}" has invalid simulatorId "${pattern.simulatorId}".`
          );
        }
      }
    }

    if (spec.exportName === 'SYSTEM_TRADEOFFS') {
      const validSimTypes = new Set([
        'cap-pacelc',
        'latency-throughput',
        'consistency-isolation',
        'caching',
        'replication-quorum',
        'sharding-lb',
      ]);
      for (const tradeoff of items) {
        if (!validSimTypes.has(tradeoff.simulatorType)) {
          schemaIssues++;
          errors.push(
            `[SYSTEM_TRADEOFFS] "${tradeoff.id}" has invalid simulatorType "${tradeoff.simulatorType}".`
          );
        }
      }
    }

    if (spec.exportName === 'FRAMEWORK_MATRICES') {
      for (const matrix of items) {
        const axes = Array.isArray(matrix.axes) ? matrix.axes : [];
        const contenders = Array.isArray(matrix.contenders) ? matrix.contenders : [];
        const contenderIds = new Set();

        for (const contender of contenders) {
          if (!contender?.id) {
            schemaIssues++;
            errors.push(`[FRAMEWORK_MATRICES] Matrix "${matrix.id}" has a contender without an id.`);
            continue;
          }
          if (contenderIds.has(contender.id)) {
            schemaIssues++;
            errors.push(
              `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" has duplicate contender id "${contender.id}".`
            );
          }
          contenderIds.add(contender.id);

          for (const axis of axes) {
            const score = contender.scores?.[axis];
            if (typeof score !== 'number' || Number.isNaN(score) || score < 0 || score > 100) {
              schemaIssues++;
              errors.push(
                `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" contender "${contender.id}" is missing valid 0-100 score for axis "${axis}".`
              );
            }
          }
        }

        const dimensions = Array.isArray(matrix.dimensions) ? matrix.dimensions : [];
        for (const dim of dimensions) {
          for (const cId of contenderIds) {
            const cell = dim.values?.[cId];
            if (typeof cell !== 'string' || cell.trim() === '') {
              schemaIssues++;
              errors.push(
                `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" dimension "${dim.attributeName}" is missing value for contender "${cId}".`
              );
            }
          }
        }

        const scenarios = Array.isArray(matrix.decisionScenarios) ? matrix.decisionScenarios : [];
        if (scenarios.length === 0) {
          schemaIssues++;
          errors.push(`[FRAMEWORK_MATRICES] Matrix "${matrix.id}" has no decisionScenarios.`);
        }
        for (const sc of scenarios) {
          if (!contenderIds.has(sc.recommendedId)) {
            schemaIssues++;
            errors.push(
              `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" decisionScenario references unknown recommendedId "${sc.recommendedId}".`
            );
          }
          if (!contenderIds.has(sc.runnerUpId)) {
            schemaIssues++;
            errors.push(
              `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" decisionScenario references unknown runnerUpId "${sc.runnerUpId}".`
            );
          }
          if (sc.recommendedId === sc.runnerUpId) {
            schemaIssues++;
            errors.push(
              `[FRAMEWORK_MATRICES] Matrix "${matrix.id}" decisionScenario has identical recommendedId and runnerUpId "${sc.recommendedId}".`
            );
          }
        }
      }
    }

    if (spec.exportName === 'CASE_STUDIES') {
      const validTiers = new Set(['client', 'edge', 'compute', 'messaging', 'storage']);
      const validPathTypes = new Set(['read', 'write', 'both', 'async']);
      for (const cs of items) {
        const nodes = Array.isArray(cs.nodes) ? cs.nodes : [];
        const edges = Array.isArray(cs.edges) ? cs.edges : [];
        const nodeIds = new Set();

        for (const node of nodes) {
          if (!node?.id) {
            schemaIssues++;
            errors.push(`[CASE_STUDIES] Case study "${cs.id}" has a node without an id.`);
            continue;
          }
          if (nodeIds.has(node.id)) {
            schemaIssues++;
            errors.push(`[CASE_STUDIES] Case study "${cs.id}" has duplicate node id "${node.id}".`);
          }
          nodeIds.add(node.id);

          if (!validTiers.has(node.tier)) {
            schemaIssues++;
            errors.push(
              `[CASE_STUDIES] Case study "${cs.id}" node "${node.id}" has invalid tier "${node.tier}".`
            );
          }
        }

        for (const edge of edges) {
          if (!nodeIds.has(edge.from)) {
            schemaIssues++;
            errors.push(
              `[CASE_STUDIES] Case study "${cs.id}" edge (${edge.from} -> ${edge.to}) references unknown source node "${edge.from}".`
            );
          }
          if (!nodeIds.has(edge.to)) {
            schemaIssues++;
            errors.push(
              `[CASE_STUDIES] Case study "${cs.id}" edge (${edge.from} -> ${edge.to}) references unknown target node "${edge.to}".`
            );
          }
          if (edge.from === edge.to) {
            schemaIssues++;
            errors.push(
              `[CASE_STUDIES] Case study "${cs.id}" edge (${edge.from} -> ${edge.to}) is a self-loop.`
            );
          }
          if (!validPathTypes.has(edge.pathType)) {
            schemaIssues++;
            errors.push(
              `[CASE_STUDIES] Case study "${cs.id}" edge (${edge.from} -> ${edge.to}) has invalid pathType "${edge.pathType}".`
            );
          }
        }
      }
    }

    if (spec.exportName === 'QUIZ_QUESTIONS') {
      for (const q of items) {
        const opts = Array.isArray(q.options) ? q.options : [];
        if (
          typeof q.correctIndex !== 'number' ||
          !Number.isInteger(q.correctIndex) ||
          q.correctIndex < 0 ||
          q.correctIndex >= opts.length
        ) {
          schemaIssues++;
          errors.push(
            `[QUIZ_QUESTIONS] Question "${q.id}" has out-of-bounds correctIndex ${q.correctIndex} (options length: ${opts.length}).`
          );
        }
      }
    }

    totalItems += items.length;
    reportRows.push({
      exportName: spec.exportName,
      domain: spec.domain,
      count: items.length,
      minExpected: spec.minExpected,
      updatedAt: stat.mtime.toISOString().slice(0, 10),
      status: schemaIssues === 0 && meetsMin ? 'PASS' : 'FAIL',
    });
  }

  console.log('\n=========================================================================================');
  console.log('  SYSTEMS DESIGN WORKBENCH — CURRICULUM HEALTH & FRESHNESS REPORT');
  console.log('=========================================================================================');
  console.log(
    `${padRight('Export Symbol', 23)} | ${padRight('Curriculum Domain', 31)} | ${padLeft('Items', 6)} | ${padLeft('Min', 4)} | ${padRight('Updated', 10)} | Status`
  );
  console.log('-----------------------------------------------------------------------------------------');

  for (const row of reportRows) {
    console.log(
      `${padRight(row.exportName, 23)} | ${padRight(row.domain, 31)} | ${padLeft(row.count, 6)} | ${padLeft(row.minExpected, 4)} | ${padRight(row.updatedAt, 10)} | ${row.status}`
    );
  }

  console.log('-----------------------------------------------------------------------------------------');
  console.log(
    `Total Validated Curriculum Entities : ${totalItems} (${globalIds.size} unique IDs across ${MODULE_SPECS.length} exports)`
  );
  console.log(
    `Difficulty Distribution             : Fundamental=${difficultyTotals.Fundamental} | Intermediate=${difficultyTotals.Intermediate} | Advanced=${difficultyTotals.Advanced} | Staff+=${difficultyTotals['Staff+']}`
  );
  console.log(`Validation Elapsed Time             : ${Date.now() - startTime}ms`);
  console.log('=========================================================================================\n');

  if (errors.length > 0) {
    console.error('Curriculum validation failed with errors:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('All curriculum exports, schema invariants, and global ID uniqueness checks PASSED.');
}

runValidation();
