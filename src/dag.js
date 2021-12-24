export class DAG {
  /**
   * @param {ReadonlyArray<string>} names
   * @param {ReadonlyArray<ReadonlyArray<number>>} edges
   */
  constructor(names, edges) {
    /** @readonly */
    this.names = names;
    /** @readonly */
    this.edges = edges;

    /** @type {Map<string, number>} */
    const namesInv = new Map();
    for (let i = 0; i < names.length; i++) {
      namesInv.set(names[i], i);
    }
    /** @readonly @type {Map<string, number>} */
    this.namesInv = namesInv;

  }

  /** @param {string} source */
  get(source) {
    const sourceNum = this.namesInv.get(source);
    if (typeof sourceNum === 'undefined') {
      return [];
    }
    return this.edges[sourceNum].map((num) => this.names[num]);
  }

  /** @param {string[]} vertexNames */
  hcd(vertexNames) {
    if (vertexNames.length === 0) {
      return [];
    }
    const vertices = vertexNames.map((name) => this.namesInv.get(name));
    if (vertices.some((vertex) => typeof vertex === 'undefined')) {
      return [];
    }

    const visitedSets = vertices.map((vertex) => new Set([vertex]));
    const queues = vertices.map((vertex) => [vertex]);

    let queuesTotalSize = vertices.length;

    for (let index = 0; queuesTotalSize > 0; index = (index + 1) % vertices.length) {
      if (queues[index].length === 0) {
        continue;
      }
      const source = queues[index].shift();
      queuesTotalSize--;
      if (visitedSets.every((visitedSet) => visitedSet.has(source))) {
        continue;
      }
      for (const target of this.edges[source]) {
        if (!visitedSets[index].has(target)) {
          queues[index].push(target);
          queuesTotalSize++;
          visitedSets[index].add(target);
        }
      }
    }

    const minSizeSet = visitedSets.reduce((aSet, bSet) => aSet.size < bSet.size ? aSet : bSet);
    const intersection = [...minSizeSet].filter((item) => visitedSets.every((set) => set.has(item)));

    const result = new Set(intersection);
    for (const source of intersection) {
      for (const target of this.edges[source]) {
        result.delete(target);
      }
    }
    return [...result].map((vertex) => this.names[vertex]);
  }

  /** @param {string} text */
  static load(text) {
    const names = [];
    const edges = [];
    for (let lineRe = /^(\S+) (.*)$/gmu, m; (m = lineRe.exec(text)); ) {
      const source = m[1];
      const targetNums = m[2] ? m[2].split(",").map((s) => parseInt(s)) : [];

      names.push(source);
      edges.push(targetNums);
    }
    const dag = new DAG(names, edges);
    return dag;
  }
}
