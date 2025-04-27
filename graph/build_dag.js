#!/usr/bin/env node

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

const graph = new DAG();

await graph.undump(srcpath);
await graph.save(dstpath);
