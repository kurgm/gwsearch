const idcArity = /** @type {const} */ ({
  u2ff0: 2,
  u2ff1: 2,
  u2ff2: 3,
  u2ff3: 3,
  u2ff4: 2,
  u2ff5: 2,
  u2ff6: 2,
  u2ff7: 2,
  u2ff8: 2,
  u2ff9: 2,
  u2ffa: 2,
  u2ffb: 2,
  u2ffc: 2,
  u2ffd: 2,
  u2ffe: 1,
  u2fff: 1,
  u303e: 1,
  u31ef: 2,
});

/** @typedef {keyof typeof idcArity} IDC */

/**
 * @param {string} token
 * @returns {token is IDC}
 */
export function isIDC(token) {
  return /^u(2ff[0-9a-f]|303e|31ef)$/.test(token);
}

/** @typedef {string | IDSTree} IDSTreeNode */
/** @typedef {[IDC, ...IDSTreeNode[]]} IDSTree */

/**
 * @param {string[]} tokens
 * @returns {IDSTreeNode}
 */
export function parseIDS(tokens) {
  /** @type {IDSTreeNode[]} */
  const stack = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    if (!isIDC(token)) {
      stack.push(token);
      continue;
    }
    const arity = idcArity[token];
    if (stack.length < arity) {
      throw new Error('invalid IDS');
    }
    /** @type {IDSTree} */
    const subtree = [token];
    subtree.push(
      ...stack.splice(stack.length - arity, arity, subtree).reverse()
    );
  }
  if (stack.length !== 1) {
    throw new Error('invalid IDS');
  }
  return stack[0];
}
