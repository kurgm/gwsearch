// @ts-check

import 'regenerator-runtime/runtime';

import { DAG } from './dag';

// @ts-ignore
import graphURL from '../graph/dag.txt';

document.addEventListener('DOMContentLoaded', () => {
  const form = /** @type {HTMLFormElement} */(document.getElementById('search_form'));
  const input = /** @type {HTMLInputElement} */(document.getElementById('search_query'));
  const resultDiv = /** @type {HTMLDivElement} */(document.getElementById('result'));

  /** @param {string} queryStr */
  function parseQuery(queryStr) {
    const tokens = queryStr.match(/[a-z][a-z0-9_-]{4,}|&CDP-[\dA-F]{4};|\S/gu) || [];
    return tokens.map((token) => {
      if (token.startsWith('&CDP-')) {
        return `abst:cdp-${token.substr('&CDP-'.length, 4).toLowerCase()}`;
      }
      if (token.length >= 5) {
        return token;
      }
      let codepoint = token.codePointAt(0).toString(16);
      if (codepoint.length < 4) {
        codepoint = `000${codepoint}`.slice(-4);
      }
      return `abst:u${codepoint}`;
    });
  }

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

  let currentQuery = null;
  /** @param {string} queryStr */
  function doSearch(queryStr) {
    const query = parseQuery(queryStr);
    currentQuery = query;
    processQuery(query)
      .then((result) => {
        if (currentQuery !== query) {
          return;
        }
        showResult(result);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const query = input.value;
    doSearch(query);
  });

  /** @param {Desc[]} result */
  function showResult(result) {
    while (resultDiv.firstChild) {
      resultDiv.removeChild(resultDiv.firstChild);
    }
    if (!result.length) {
      resultDiv.appendChild(document.createTextNode('(該当結果なし)'));
      return;
    }
    const resultUl = generateUl(result);
    resultDiv.appendChild(resultUl);
  }
  /** @param {Desc[]} descs */
  function generateUl(descs) {
    const ul = document.createElement('ul');
    for (const { name, children } of descs) {
      const li = document.createElement('li');
      if (children.length) {
        li.dataset.children = children.join(',');
        const btn = document.createElement('button');
        btn.appendChild(document.createTextNode('+'));
        li.appendChild(btn);
      }
      if (name.startsWith('abst:')) {
        let text = name.substring('abst:'.length);
        if (/^abst:cdp-[0-9a-f]{4}$/.test(name)) {
          text = `&CDP-${name.substring('abst:cdp-'.length).toUpperCase()};`;
        } else if (/^abst:u[0-9a-f]{4,}$/.test(name)) {
          const codepointHex = name.substring('abst:u'.length);
          const char = String.fromCodePoint(parseInt(codepointHex, 16));
          text = `U+${codepointHex.toUpperCase()}: ${char}`
        }
        li.appendChild(document.createTextNode(text));
      } else {
        const link = document.createElement('a');
        link.href = `https://glyphwiki.org/wiki/${name}`;
        const img = document.createElement('img');
        img.src = `https://glyphwiki.org/glyph/${name}.50px.png`;
        img.alt = img.title = link.title = name;
        img.className = 'thumb';
        link.appendChild(img);
        link.appendChild(document.createTextNode(name));
        li.appendChild(link);
      }
      ul.appendChild(li);
    }
    return ul;
  }

  resultDiv.addEventListener('click', (evt) => {
    if (!(
      evt.target instanceof HTMLButtonElement &&
      evt.target.parentNode instanceof HTMLLIElement &&
      evt.target.parentNode.dataset.children
    )) {
      return;
    }
    const btn = evt.target;
    const li = evt.target.parentNode;
    if (li.lastChild instanceof HTMLUListElement) {
      btn.textContent = '+';
      li.removeChild(li.lastChild);
      return;
    }
    btn.textContent = '...';
    const items = li.dataset.children.split(',');
    getChildren(items).then((children) => {
      if (!resultDiv.contains(li)) {
        return;
      }
      const ul = generateUl(children);
      btn.textContent = '-';
      li.appendChild(ul);
    });
  })
});
