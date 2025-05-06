#!/usr/bin/env node

import { parseArgs } from 'util';
import { DAG } from './lib/dag.js';
import { readDump } from './lib/dump.js';

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
});
if (positionals.length !== 2) {
  console.error('Error: invalid number of arguments');
  process.exit(1);
}
const [srcpath, dstpath] = positionals;

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
  if (!name.includes('_')) {
    for (const subname of name.match(
      /(?<=^|-)(u[0-9a-f]{4,}|cdp-[0-9a-f]{4})(?=-|$)/g
    ) || []) {
      refer(name, `abst:${subname}`);
    }
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
