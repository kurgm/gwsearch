#!/usr/bin/env node

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parseArgs } from 'util';
import { DAG } from './lib/dag.js';

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
  const charRe = /[^&]|&CDP-[0-9A-F]{4};/gu;

  const charsRe = new RegExp(`^(?:${charRe.source})+$`, 'u');
  if (!charsRe.test(text)) {
    return [];
  }

  const result = [];
  for (const token of text.match(charRe)) {
    if (token.startsWith('&CDP-')) {
      result.push(`cdp-${token.substr('&CDP-'.length, 4).toLowerCase()}`);
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
    if (line.startsWith('#') || line.startsWith(';;')) {
      continue;
    }
    const columns = line.split('\t');
    if (columns.length < 3) {
      continue;
    }

    const [, targetStr, ...idsStrs] = columns;
    const targets_ = tokenize(targetStr);
    if (targets_.length !== 1) {
      console.warn(`invalid target: ${targetStr}`);
      continue;
    }
    const [target] = targets_;
    const idses = idsStrs.map((idsStr) => {
      const m = /^([^\[]+)\[[^\]]*\]$/.exec(idsStr);
      return tokenize(m ? m[1] : idsStr);
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
    const idc = /^u2ff[0-9ab]$/;
    const specialDc = /^u(246[0-9a-f]|247[0-3]|ff1f)$/; // encircled numerics and wildcard
    const dcs = ids.filter((idcOrDc) => !idc.test(idcOrDc) && !specialDc.test(idcOrDc));

    for (const dc of dcs) {
      refer(`abst:${target}`, `abst:${dc}`);
    }
  }
}
await graph.dump(dstpath);
