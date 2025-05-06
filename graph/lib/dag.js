import { createWriteStream, createReadStream } from 'fs';
import { createInterface } from 'readline';

import { encode as encodeVLQ } from 'vlq';

/** @param {string[]} arr */
function makeInv(arr) {
  /** @type {Record<string, number>} */
  const result = Object.create(null);
  for (let i = 0; i < arr.length; i++) {
    result[arr[i]] = i;
  }
  return result;
}

export class DAG {
  /** @type {Map<string, Set<string>>} */
  edges = new Map();

  /**
   * @param {string} src
   * @param {string} dest
   */
  addEdge(src, dest) {
    let s = this.edges.get(src);
    if (!s) {
      this.edges.set(src, s = new Set());
    }
    s.add(dest);
  }

  /** @param {string} filename */
  async dump(filename) {
    const stream = createWriteStream(filename);
    stream.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });

    for (const [source, targets] of this.edges) {
      if (targets.size === 0) {
        continue;
      }

      const line = `${source} ${[...targets].join(',')}\n`;
      stream.write(line);
    }
    await new Promise((resolve) => {
      stream.end(resolve);
    });
  }

  /**
   * @param {string} filename
   * @param {(name: string) => string=} normalize
   */
  async undump(filename, normalize = (x) => x) {
    const inputStream = createReadStream(filename);
    const inputRL = createInterface({
      input: inputStream,
      crlfDelay: Infinity,
    });

    for await (const line of inputRL) {
      const columns = line.trim().split(' ');
      if (columns.length !== 2) {
        continue;
      }
      const [source_, targetsStr] = columns;
      const source = normalize(source_);
      for (const target_ of targetsStr.split(',')) {
        const target = normalize(target_);
        if (source === target) {
          continue;
        }
        this.addEdge(source, target);
      }
    }
  }

  /** @param {string} filename */
  async save(filename) {
    const stream = createWriteStream(filename);
    stream.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });

    this.breakCycles();

    const sortedVertices = this.sortByInDegDesc();
    const sInv = makeInv(sortedVertices);
    for (const source of sortedVertices) {
      const targets = this.edges.get(source);

      const targetNums = targets ? Array.from(targets, (target) => sInv[target]) : [];
      const line = `${source} ${encodeVLQ(targetNums)}\n`;
      stream.write(line);
    }
    await new Promise((resolve) => {
      stream.end(resolve);
    });
  }

  breakCycles() {
    /** @type {Set<string>} */
    const visited = new Set();

    /** @type {Set<string>} */
    const behind = new Set();

    /** @param {string} v */
    const dfs = (v) => {
      if (visited.has(v)) {
        return;
      }
      visited.add(v);
      behind.add(v);
      const targets = this.edges.get(v);
      if (targets) {
        for (const w of [...targets]) {
          if (behind.has(w)) {
            console.warn(`removing edge to break cycle: ${v} => ${w}`);
            targets.delete(w);
          } else {
            dfs(w);
          }
        }
      }
      behind.delete(v);
    };

    for (const source of this.edges.keys()) {
      dfs(source);
    }
  }

  sortByInDegDesc() {
    const vertices = new Set(this.edges.keys());
    /** @type {Map<string, number>} */
    const inDeg = new Map();

    for (const targets of this.edges.values()) {
      for (const target of targets) {
        vertices.add(target);
        inDeg.set(target, (inDeg.get(target) ?? 0) + 1);
      }
    }
    return [...vertices].sort((a, b) => {
      const aDeg = inDeg.get(a) ?? 0;
      const bDeg = inDeg.get(b) ?? 0;
      return bDeg - aDeg;
    });
  }
}
