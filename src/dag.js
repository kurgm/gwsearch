import { decode as decodeVLQ } from "vlq";

export class DAG {
  /**
   * @param {ReadonlyArray<ReadonlyArray<number>>} edges
   */
  constructor(edges) {
    /** @readonly */
    this.edges = edges;
  }

  /**
   * @param {number} source
   * @returns {readonly number[]}
   */
  get(source) {
    return this.edges[source] ?? [];
  }

  /**
   * @param {number[]} vertices
   * @returns {number[]}
   */
  hcd(vertices) {
    if (vertices.length === 0) {
      return [];
    }
    if (vertices.some((vertex) => this.edges[vertex] === undefined)) {
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
    return [...result];
  }
}

export class NamedDAG {
  /**
   * @param {ReadonlyArray<string>} names
   * @param {ReadonlyArray<ReadonlyArray<number>>} edges
   */
  constructor(names, edges) {
    /**
     * @readonly
     * @private
     */
    this.names = names;

    /** @type {Map<string, number>} */
    const namesInv = new Map();
    for (let i = 0; i < names.length; i++) {
      for (const alias of names[i].split('=')) {
        namesInv.set(alias, i);
      }
    }
    /**
     * @type {Map<string, number>}
     * @readonly
     * @private
     */
    this.namesInv = namesInv;

    /**
     * @readonly
     * @private
     */
    this.dag = new DAG(edges);
  }

  /**
   * @param {string} name
   * @returns {string[]}
   */
  getNames(name) {
    const index = this.namesInv.get(name);
    if (index === undefined) {
      return [];
    }
    return this.getNamesByIndex(index);
  }

  /**
   * @param {number} index
   * @returns {string[]}
   * @private
   */
  getNamesByIndex(index) {
    return this.names[index].split('=');
  }

  /**
   * @param {string} source 
   * @returns {string[][]}
   */
  get(source) {
    const sourceNum = this.namesInv.get(source);
    if (sourceNum === undefined) {
      return [];
    }
    const result = this.dag.get(sourceNum);
    return result.map((targetNum) => this.getNamesByIndex(targetNum));
  }

  /**
   * @param {string[]} vertexNames
   * @returns {string[][]}
   */
  hcd(vertexNames) {
    const vertexNumbers = vertexNames.map((name) => this.namesInv.get(name));
    if (vertexNumbers.some((num) => num === undefined)) {
      return [];
    }
    return this.dag.hcd(vertexNumbers).map((num) => this.getNamesByIndex(num));
  }

  /** @param {string} text */
  static load(text) {
    const names = [];
    const edges = [];
    for (let lineRe = /^(\S+) (.*)$/gmu, m; (m = lineRe.exec(text)); ) {
      const source = m[1];
      const targetNums = m[2] ? decodeVLQ(m[2]) : [];

      names.push(source);
      edges.push(targetNums);
    }
    return new NamedDAG(names, edges);
  }
}
