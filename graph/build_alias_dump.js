#!/usr/bin/env node

import { parseArgs } from 'util';
import { Union } from './lib/union.js';
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

const union = new Union();

for await (const { name, data } of readDump(srcpath)) {
  if (name.includes('_')) {
    // Skip merging user-owned glyphs with its entity glyph.
    // User-owned glyphs sometimes have unreliable or wrong related (kanrenji) data.
    // Merging them with commonly used entity glyphs would cause unwanted search results.
    continue;
  }
  const match = /^99:0:0:0:0:200:200:([^@:$]+)$/.exec(data);
  if (!match) {
    continue;
  }
  const entity = match[1];
  union.union(entity, name);
}
await union.save(dstpath);
