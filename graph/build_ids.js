#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const { DAG } = require('./dag');

const [srcpath, dstpath] = require('yargs')
  .check((argv) => argv._.length === 2)
  .argv._;


/** @param {string} ids */
function parseIDS(ids) {
  const idcOrDc = /[^\s&\[\]]|&CDP-[0-9A-F]{4};/gu;

  const idsRe = new RegExp(`^(${idcOrDc.source})+(\\[[A-Z]+\\])?$`, 'u');
  const match = idsRe.exec(ids);
  if (!match) {
    return [];
  }

  const result = [];
  for (const token of match[1].match(idcOrDc)) {
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
  const inputStream = fs.createReadStream(path);

  const inputRL = readline.createInterface({
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
    const targets_ = parseIDS(targetStr);
    if (targets_.length !== 1) {
      console.warn(`invalid target: ${targetStr}`);
      continue;
    }
    const [target] = targets_;
    const idses = idsStrs.map(parseIDS);
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

(async () => {
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
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
