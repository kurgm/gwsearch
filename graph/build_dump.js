#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const { DAG } = require('./dag');

const [srcpath, dstpath] = require('yargs')
  .check((argv) => argv._.length === 2)
  .argv._;

/** @param {string} path */
async function* readDump(path) {
  const inputStream = fs.createReadStream(path);

  const inputRL = readline.createInterface({
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

(async () => {
  for await (const { name, related, data } of readDump(srcpath)) {
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
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
