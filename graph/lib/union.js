import { createWriteStream, createReadStream } from 'fs';
import { createInterface } from 'readline';

export class Union {
  /** @typedef {string[]} Group */

  /**
   * @type {Map<string, Group>}
   * @private
   */
  groups = new Map();

  /**
   * @param {string} name
   * @returns {string[]}
   */
  getGroup(name) {
    return this.groups.get(name)?.slice() ?? [name];
  }

  /**
   * @param {string} a
   * @param {string} b
   */
  union(a, b) {
    if (a === b) {
      return;
    }
    const aGroup = this.groups.get(a);
    const bGroup = this.groups.get(b);
    if (!aGroup) {
      if (!bGroup) {
        /** @type {Group} */
        const group = [a, b];
        this.groups.set(a, group);
        this.groups.set(b, group);
        return;
      }
      this.groups.set(a, bGroup);
      bGroup.unshift(a);
      return;
    }
    if (!bGroup) {
      this.groups.set(b, aGroup);
      aGroup.push(b);
      return;
    }
    if (aGroup === bGroup) {
      // `b` might come before `a` in the group...
      return;
    }
    if (aGroup.length < bGroup.length) {
      bGroup.unshift(...aGroup);
      for (const name of aGroup) {
        this.groups.set(name, bGroup);
      }
      return;
    }
    aGroup.push(...bGroup);
    for (const name of bGroup) {
      this.groups.set(name, aGroup);
    }
  }

  /**
   * @param {string} filename
   */
  async save(filename) {
    const stream = createWriteStream(filename);
    stream.on('error', (err) => {
      console.error(err);
      process.exit(1);
    });

    const uniqueGroups = new Set(this.groups.values());
    for (const group of uniqueGroups) {
      const line = `${group.join(' ')}\n`;
      stream.write(line);
    }
    await new Promise((resolve) => {
      stream.end(resolve);
    });
  }

  /**
   * @param {string} filename
   */
  async load(filename) {
    const inputStream = createReadStream(filename);
    const inputRL = createInterface({
      input: inputStream,
      crlfDelay: Infinity,
    });

    for await (const line of inputRL) {
      if (line.startsWith('#')) continue;
      const columns = line.trim().split(' ');
      if (columns.length < 2) {
        continue;
      }
      const [first, ...rest] = columns;
      for (const name of rest) {
        this.union(first, name);
      }
    }
  }
}
