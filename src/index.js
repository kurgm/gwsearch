/** @typedef {import("./worker").Desc} Desc */
/** @typedef {import("./worker").WRequest} WRequest */
/** @typedef {import("./worker").WResponse} WResponse */
/** @typedef {import("./worker").WorkerRequest} WorkerRequest */
/** @typedef {import("./worker").WorkerResponse} WorkerResponse */

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

  const worker = new Worker(new URL('worker.js', import.meta.url), { type: 'module' });
  /** @type {{ resolve: (dat: WResponse) => void; reject: (err: any) => void; }[]} */
  const promises = [];
  worker.addEventListener('message', (evt) => {
    if (!(evt.data instanceof Object)) {
      return;
    }
    const res = /** @type {WorkerResponse} */(evt.data);
    const promise = promises[res.id];
    if (!promise) {
      return;
    }
    if ("error" in res) {
      promise.reject(res.error);
      return;
    }
    promise.resolve(res);
  });
  /**
   * @param {WRequest} req
   * @returns {Promise<WResponse>}
   */
  function requestWorker(req) {
    return new Promise((resolve, reject) => {
      const id = promises.push({ resolve, reject }) - 1;
      worker.postMessage(/** @type {WorkerRequest} */({
        ...req,
        id,
      }));
    });
  }

  /**
   * @param {string[]} query
   * @returns {Promise<Desc[]>}
   */
  async function processQuery(query) {
    const res = await requestWorker({
      type: "query",
      query,
    });
    return /** @type {import('./worker').ProcessQueryResponse} */(res).value;
  }

  /**
   * @param {string[]} items
   * @returns {Promise<Desc[]>}
   */
  async function getChildren(items) {
    const res = await requestWorker({
      type: "children",
      items,
    });
    return /** @type {import('./worker').ChildrenResponse} */(res).value;
  }

  /** @type {string[] | null} */
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

    while (resultDiv.firstChild) {
      resultDiv.removeChild(resultDiv.firstChild);
    }
    resultDiv.appendChild(document.createTextNode('(検索中)'));

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
    for (const { names, children } of descs) {
      const li = document.createElement('li');
      if (children.length) {
        li.dataset.children = children.map((child) => child[0]).join(',');
        const btn = document.createElement('button');
        btn.appendChild(document.createTextNode('+'));
        li.appendChild(btn);
      }
      for (const [index, name] of names.entries()) {
        if (index !== 0) {
          li.appendChild(document.createTextNode(' = '));
        }
        const node = generateRepresentationNode(name, index !== 0);
        li.appendChild(node);
      }
      ul.appendChild(li);
    }
    return ul;
  }
  /**
   * @param {string} name 
   * @param {boolean=} simpler
   */
  function generateRepresentationNode(name, simpler) {
    if (name.startsWith('abst:')) {
      let text = name.substring('abst:'.length);
      if (/^abst:cdp-[0-9a-f]{4}$/.test(name)) {
        text = `&CDP-${name.substring('abst:cdp-'.length).toUpperCase()};`;
      } else if (/^abst:u[0-9a-f]{4,}$/.test(name)) {
        const codepointHex = name.substring('abst:u'.length);
        const char = String.fromCodePoint(parseInt(codepointHex, 16));
        text = `U+${codepointHex.toUpperCase()}: ${char}`
      }
      return document.createTextNode(text);
    }
    const link = document.createElement('a');
    link.href = `https://glyphwiki.org/wiki/${name}`;
    link.title = name;
    if (!simpler) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = `https://glyphwiki.org/glyph/${name}.50px.png`;
      img.alt = img.title = name;
      img.className = 'thumb';
      link.appendChild(img);
    }
    link.appendChild(document.createTextNode(name));
    return link;
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
    btn.disabled = true;
    const items = li.dataset.children.split(',');
    getChildren(items).then((children) => {
      if (!resultDiv.contains(li)) {
        return;
      }
      const ul = generateUl(children);
      btn.disabled = false;
      btn.textContent = '-';
      li.appendChild(ul);
    });
  })
});
