const fs = require('fs');
const readline = require('readline');

/** @param {string[]} arr */
function makeInv(arr) {
  /** @type {Record<string, number>} */
  const result = Object.create(null);
  for (let i = 0; i < arr.length; i++) {
    result[arr[i]] = i;
  }
  return result;
}

class DAG {
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
    const stream = fs.createWriteStream(filename);
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

  /** @param {string} filename */
  async undump(filename) {
    const inputStream = fs.createReadStream(filename);
    const inputRL = readline.createInterface({
      input: inputStream,
      crlfDelay: Infinity,
    });

    for await (const line of inputRL) {
      const columns = line.trim().split(' ');
      if (columns.length !== 2) {
        continue;
      }
      const [source, targetsStr] = columns;
      for (const target of targetsStr.split(',')) {
        this.addEdge(source, target);
      }
    }
  }

  /** @param {string} filename */
  async save(filename) {
    const stream = fs.createWriteStream(filename);
    stream.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });

    const sortedVertices = this.toposort();
    const sInv = makeInv(sortedVertices);
    for (const source of sortedVertices) {
      const targets = this.edges.get(source);

      const targetNums = targets ? Array.from(targets, (target) => sInv[target]) : [];
      const line = `${source} ${[...targetNums].join(',')}\n`;
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

  toposort() {
    this.breakCycles();

    /** @type {string[]} */
    const result = [];

    /** @type {Set<string>} */
    const visited = new Set();

    /** @param {string} v */
    const dfs = (v) => {
      if (visited.has(v)) {
        return;
      }
      visited.add(v);
      const targets = this.edges.get(v);
      if (targets) {
        for (const w of targets) {
          dfs(w);
        }
      }
      result.push(v);
    };

    for (const source of this.edges.keys()) {
      dfs(source);
    }
    result.reverse();
    return result;
  }
}

module.exports = {
  DAG
};
