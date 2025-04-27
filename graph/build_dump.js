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

/** @param {string} path */
async function* readDump(path) {
  const inputStream = createReadStream(path);

  const inputRL = createInterface({
    input: inputStream,
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of inputRL) {
    count++;
    if (count <= 2) {
      continue; // skip header
    }
    const columns = (line.match(/[^|]+/g) || []).map((cell) => cell.trim());
    if (columns.length !== 3) {
      continue; // ignore footer
    }

    const [name, related, data] = columns;
    yield { name, related, data };
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

for await (const { name, related, data } of readDump(srcpath)) {
  for (const m of name.match(/(^|-)(u[0-9a-f]{4,}|cdp-[0-9a-f]{4})(?=-|$)/g) || []) {
    const subname = m.startsWith('-') ? m.substring(1) : m;
    refer(name, `abst:${subname}`);
  }
  if (related !== 'u3013') {
    refer(name, `abst:${related}`);
  }
  for (const kline of data.split('$')) {
    const kdata = kline.split(':');
    if (kdata[0] === '99') {
      refer(name, kdata[7].split('@')[0]);
    }
  }
}
await graph.dump(dstpath);
