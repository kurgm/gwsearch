// @ts-check
/// <reference lib="webworker" />

import 'regenerator-runtime/runtime';

import { DAG } from './dag';

// @ts-ignore
import graphURL from '../graph/dag.txt';

/**
 * @typedef {object} Desc
 * @property {string} name
 * @property {string[]} children
 */

const graphPromise = fetch(graphURL).then(async (response) => {
  const text = await response.text();
  return DAG.load(text);
});

/**
 * @param {string[]} query
 * @returns {Promise<Desc[]>}
 */
async function processQuery(query) {
  const graph = await graphPromise;
  return graph.hcd(query).sort(nameCompar).map((name) => ({
    name,
    children: graph.get(name).sort(nameCompar),
  }));
}

/**
 * @param {string[]} items
 * @returns {Promise<Desc[]>}
 */
async function getChildren(items) {
  const graph = await graphPromise;
  return items.map((name) => ({
    name,
    children: graph.get(name).sort(nameCompar),
  }));
}

/**
 * @param {string} a
 * @param {string} b
 */
function nameCompar(a, b) {
  const ucsRe = /^(?:abst:)?u([0-9a-f]{4,})/;
  const ma = ucsRe.exec(a);
  const mb = ucsRe.exec(b);
  const ownedRe = /_/;
  const idsRe = /^u2ff[0-9ab]-/;
  return (
    (-a.startsWith('abst:') - -b.startsWith('abst:')) ||
    (+ownedRe.test(a) - +ownedRe.test(b)) ||
    (+idsRe.test(a) - +idsRe.test(b)) ||
    (+!ma - +!mb) ||
    (ma && mb && (parseInt(ma[1], 16) - parseInt(mb[1], 16))) ||
    (a > b ? 1 : a < b ? -1 : 0)
  );
}

/**
 * @typedef {object} ProcessQueryRequest
 * @property {"query"} type
 * @property {string[]} query
 */
/**
 * @typedef {object} ProcessQueryResponse
 * @property {Desc[]} value
 */

/**
 * @typedef {object} ChildrenRequest
 * @property {"children"} type
 * @property {string[]} items
 */
/**
 * @typedef {object} ChildrenResponse
 * @property {Desc[]} value
 */

/** @typedef {ProcessQueryRequest | ChildrenRequest} WRequest */
/** @typedef {ProcessQueryResponse | ChildrenResponse} WResponse */
/** @typedef {{ error: any; }} WError */

/** @typedef {{ id: number; } & WRequest} WorkerRequest */
/** @typedef {{ id: number; } & (WResponse | WError)} WorkerResponse */

self.addEventListener('message', (evt) => {
  if (!(evt.data instanceof Object)) {
    return;
  }
  const req = /** @type WorkerRequest */(evt.data);
  handleRequest(req)
    .then((res) => {
      self.postMessage(/** @type {WorkerResponse} */({
        ...res,
        id: req.id,
      }));
    })
    .catch((err) => {
      self.postMessage(/** @type {WorkerResponse} */({
        id: req.id,
        type: "error",
        error: err,
      }));
    });
});

/**
 * @param {WRequest} req
 * @returns {Promise<WResponse>}
 */
async function handleRequest(req) {
  switch (req.type) {
    case "query": {
      const result = await processQuery(req.query);
      return {
        value: result,
      };
    }
    case "children": {
      const result = await getChildren(req.items);
      return {
        value: result,
      };
    }
  }
}
