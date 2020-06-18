#!/usr/bin/env node

const { DAG } = require('./dag');

const [srcpath, dstpath] = require('yargs')
  .check((argv) => argv._.length === 2)
  .argv._;


const graph = new DAG();

(async () => {
  await graph.undump(srcpath);
  await graph.save(dstpath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
