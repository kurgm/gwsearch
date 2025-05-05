#!/usr/bin/env node

import { parseArgs } from 'util';
import { Union } from './lib/union.js';

const { positionals } = parseArgs({
  strict: true,
  allowPositionals: true,
});
if (positionals.length !== 1) {
  console.error('Error: invalid number of arguments');
  process.exit(1);
}
const [outpath] = positionals;

/**
 * @param {string} groupname
 * @returns {Promise<string[]>}
 */
async function getGlyphsInGroup(groupname) {
  const url = `https://glyphwiki.org/wiki/Group:${encodeURIComponent(
    groupname
  )}?action=edit`;
  const response = await fetch(url);
  const text = await response.text();
  const [, content] = text.split(/<\/?textarea(?: [^>]*)?>/);
  return [
    ...content.matchAll(/\[\[(?:[^\]]+\s)?([0-9a-z_-]+(?:@\d+)?)\]\]/g),
  ].map((m) => m[1]);
}

/**
 * @returns {Promise<Map<string, string>>}
 */
async function fetchCdpUcsAlias() {
  const glyphs = await getGlyphsInGroup('UCSで符号化されたCDP外字');
  if (glyphs.length % 2 !== 0) {
    throw new Error('Invalid number of glyphs');
  }
  /** @type {Map<string, string>} */
  const result = new Map();
  for (let i = 0; i < glyphs.length; i += 2) {
    const cdpGlyphName = glyphs[i];
    const ucsGlyphName = glyphs[i + 1];

    if (
      !/^cdp-[0-9a-f]{4}$/.test(cdpGlyphName) ||
      !/^u[0-9a-f]{4,5}($|-)/.test(ucsGlyphName)
    ) {
      continue;
    }

    const cdpAbst = `abst:${cdpGlyphName}`;
    const ucsAbst = `abst:${ucsGlyphName.split('-', 1)[0]}`;

    if (result.has(cdpAbst)) {
      throw new Error(`Duplicate entry: ${cdpAbst}`);
    }
    result.set(cdpAbst, ucsAbst);
  }
  return result;
}

const union = new Union();
for (const [cdp, ucs] of await fetchCdpUcsAlias()) {
  union.union(ucs, cdp);
}
await union.save(outpath);
