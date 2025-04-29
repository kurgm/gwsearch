#!/usr/bin/env node

import { parseArgs } from 'util';
import { DAG } from './lib/dag.js';
import { Union } from './lib/union.js';

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
});
if (positionals.length !== 3) {
  console.error('Error: invalid number of arguments');
  process.exit(1);
}
const [graphpath, aliaspath, dstpath] = positionals;

const union = new Union();
await union.load(aliaspath);

/** @param {string} name */
function normalizeName(name) {
  const group = union.getGroup(name);
  return group.join('=');
}

const graph = new DAG();

await graph.undump(graphpath, normalizeName);
await graph.save(dstpath);
