#!/usr/bin/env node

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parseArgs } from 'util';
import { DAG } from './lib/dag.js';
import { isIDC, parseIDS, UNREPRESENTABLE } from './lib/ids.js';

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
});
if (positionals.length !== 2) {
  console.error('Error: invalid number of arguments');
  process.exit(1);
}
const [srcpath, dstpath] = positionals;

/** @param {string} text */
function tokenize(text) {
  if (!text) return [];
  const charRe = /[^&{}]|\{\d{1,3}\}|&CDP-[0-9A-F]{4};/gu;

  const charsRe = new RegExp(`^(?:${charRe.source})+$`, 'u');
  if (!charsRe.test(text)) {
    console.warn(`invalid text: ${text}`);
    return [];
  }

  const result = [];
  for (const token of text.match(charRe)) {
    if (token.startsWith('&CDP-')) {
      result.push(`cdp-${token.substr('&CDP-'.length, 4).toLowerCase()}`);
    } else if (token.startsWith('{')) {
      const number = token.slice(1, -1).padStart(4, '0');
      result.push(`_bs-uc-${number}`); // BabelStone Unencoded Component
    } else {
      const codepoint = token.codePointAt(0).toString(16).padStart(4, '0');
      result.push(`u${codepoint}`);
    }
  }
  return result;
}

/** @param {string} path */
async function* readIdsFile(path) {
  const inputStream = createReadStream(path);

  const inputRL = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  for await (const line of inputRL) {
    if (line.startsWith('#') || line.startsWith('\ufeff#')) {
      if (!/^#\t\{\d+\}\t/.test(line)) continue;
      // the description of Unencoded Components
      const columns = line.split('\t');
      if (columns.length !== 4) continue;
      const [, targetStr, , idsStr] = columns;
      if (!idsStr) continue;
      const targets_ = tokenize(targetStr);
      if (targets_.length !== 1) {
        throw new Error(`invalid target: ${targetStr}`);
      }
      const [target] = targets_;
      yield { target, idses: [tokenize(idsStr)] };
      continue;
    }

    const columns = line.split('\t');
    if (columns.length < 3) {
      continue;
    }

    const [, targetStr, ...rest] = columns;
    const targets_ = tokenize(targetStr);
    if (targets_.length !== 1) {
      console.warn(`invalid target: ${targetStr}`);
      continue;
    }
    const [target] = targets_;
    const idses = rest.flatMap((column) => {
      if (column.startsWith('*')) return []; // comment

      const m = /^\^([^$()]+)\$(?:\([^\)]*\))?$/.exec(column);
      if (!m) {
        console.warn(`invalid IDS: ${column}`);
        return [];
      }
      return [tokenize(m[1])];
    });
    yield { target, idses };
  }
}

const graph = new DAG();
/**
 * @param {string} referrer
 * @param {string} target
 */
function refer(referrer, target) {
  if (referrer === target) {
    return;
  }
  graph.addEdge(target, referrer);
}

for await (const { target, idses } of readIdsFile(srcpath)) {
  for (const ids of idses) {
    if (ids.length === 1 && ids[0] === target) {
      continue;
    }

    let idsTokens = ids;
    if (ids.includes('u31ef')) {
      // subtraction
      // Prevent X → ㇯XY and Y → ㇯XY from appearing in the graph
      // since neither X nor Y is part of ㇯XY
      try {
        const parsed = parseIDS(ids);
        idsTokens = [parsed]
          .map(
            /** @returns {string | string[]} */
            function rec(subtree) {
              if (typeof subtree === 'string') {
                return subtree;
              }
              if (subtree[0] === 'u31ef') {
                // Replace ㇯XY with ？
                return UNREPRESENTABLE;
              }
              return subtree.map(rec).flat();
            }
          )
          .flat();
      } catch (e) {
        console.warn('IDS error', target, ids);
        continue;
      }
    }

    const dcs = idsTokens.filter(
      (idcOrDc) => !isIDC(idcOrDc) && idcOrDc !== UNREPRESENTABLE
    );

    for (const dc of dcs) {
      refer(`abst:${target}`, `abst:${dc}`);
    }
  }
}
await graph.dump(dstpath);
