!function(){function e(e,t,r,n){Object.defineProperty(e,t,{get:r,set:n,enumerable:!0,configurable:!0})}var t,r="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof global?global:{},n={},s={},i=r.parcelRequire1a25;null==i&&((i=function(e){if(e in n)return n[e].exports;if(e in s){var t=s[e];delete s[e];var r={id:e,exports:{}};return n[e]=r,t.call(r.exports,r,r.exports),r.exports}var i=Error("Cannot find module '"+e+"'");throw i.code="MODULE_NOT_FOUND",i}).register=function(e,t){s[e]=t},r.parcelRequire1a25=i),i.register("ik1O3",function(t,r){e(t.exports,"register",function(){return n},function(e){return n=e}),e(t.exports,"resolve",function(){return s},function(e){return s=e});var n,s,i={};n=function(e){for(var t=Object.keys(e),r=0;r<t.length;r++)i[t[r]]=e[t[r]]},s=function(e){var t=i[e];if(null==t)throw Error("Could not resolve bundle with id "+e);return t}}),i.register("cXbai",function(t,r){e(t.exports,"getBundleURL",function(){return n},function(e){return n=e});var n,s={};n=function(e){var t=s[e];return t||(t=function(){try{throw Error()}catch(t){var e=(""+t.stack).match(/(https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/[^)\n]+/g);if(e)// Use the 3rd one, which will be a runtime in the original bundle.
return(""+e[2]).replace(/^((?:https?|file|ftp|(chrome|moz|safari-web)-extension):\/\/.+)\/[^/]+$/,"$1")+"/"}return"/"}(),s[e]=t),t}}),i("ik1O3").register(JSON.parse('{"dPT7b":"worker.f1ddca90.js","fi9ib":"dag.cdc88670.txt"}'));/// <reference lib="webworker" />
class a{/**
   * @param {ReadonlyArray<string>} names
   * @param {ReadonlyArray<ReadonlyArray<number>>} edges
   */constructor(e,t){/** @readonly */this.names=e,/** @readonly */this.edges=t;/** @type {Map<string, number>} */let r=new Map;for(let t=0;t<e.length;t++)r.set(e[t],t);/** @readonly @type {Map<string, number>} */this.namesInv=r}/** @param {string} source */get(e){let t=this.namesInv.get(e);return void 0===t?[]:this.edges[t].map(e=>this.names[e])}/** @param {string[]} vertexNames */hcd(e){if(0===e.length)return[];let t=e.map(e=>this.namesInv.get(e));if(t.some(e=>void 0===e))return[];let r=t.map(e=>new Set([e])),n=t.map(e=>[e]),s=t.length;for(let e=0;s>0;e=(e+1)%t.length){if(0===n[e].length)continue;let t=n[e].shift();if(s--,!r.every(e=>e.has(t)))for(let i of this.edges[t])r[e].has(i)||(n[e].push(i),s++,r[e].add(i))}let i=r.reduce((e,t)=>e.size<t.size?e:t),a=[...i].filter(e=>r.every(t=>t.has(e))),o=new Set(a);for(let e of a)for(let t of this.edges[e])o.delete(t);return[...o].map(e=>this.names[e])}/** @param {string} text */static load(e){let t=[],r=[];for(let n=/^(\S+) (.*)$/gmu,s;s=n.exec(e);){let e=s[1],n=s[2]?s[2].split(",").map(e=>parseInt(e)):[];t.push(e),r.push(n)}let n=new a(t,r);return n}}var o={};o=i("cXbai").getBundleURL("dPT7b")+i("ik1O3").resolve("fi9ib");/**
 * @typedef {object} Desc
 * @property {string} name
 * @property {string[]} children
 */let l=fetch((t=o)&&t.__esModule?t.default:t).then(async e=>{let t=await e.text();return a.load(t)});/**
 * @param {string[]} query
 * @returns {Promise<Desc[]>}
 */async function u(e){let t=await l;return t.hcd(e).sort(c).map(e=>({name:e,children:t.get(e).sort(c)}))}/**
 * @param {string[]} items
 * @returns {Promise<Desc[]>}
 */async function f(e){let t=await l;return e.map(e=>({name:e,children:t.get(e).sort(c)}))}/**
 * @param {string} a
 * @param {string} b
 */function c(e,t){let r=/^(?:abst:)?u([0-9a-f]{4,})/,n=r.exec(e),s=r.exec(t),i=/_/,a=/^u2ff[0-9ab]-/;return-e.startsWith("abst:")- -t.startsWith("abst:")||+i.test(e)-+i.test(t)||+a.test(e)-+a.test(t)||+!n-+!s||n&&s&&parseInt(n[1],16)-parseInt(s[1],16)||(e>t?1:e<t?-1:0)}/**
 * @param {WRequest} req
 * @returns {Promise<WResponse>}
 */async function d(e){switch(e.type){case"query":{let t=await u(e.query);return{value:t}}case"children":{let t=await f(e.items);return{value:t}}}}/**
 * @typedef {object} ProcessQueryRequest
 * @property {"query"} type
 * @property {string[]} query
 *//**
 * @typedef {object} ProcessQueryResponse
 * @property {Desc[]} value
 *//**
 * @typedef {object} ChildrenRequest
 * @property {"children"} type
 * @property {string[]} items
 *//**
 * @typedef {object} ChildrenResponse
 * @property {Desc[]} value
 *//** @typedef {ProcessQueryRequest | ChildrenRequest} WRequest *//** @typedef {ProcessQueryResponse | ChildrenResponse} WResponse *//** @typedef {{ error: any; }} WError *//** @typedef {{ id: number; } & WRequest} WorkerRequest *//** @typedef {{ id: number; } & (WResponse | WError)} WorkerResponse */self.addEventListener("message",e=>{if(!(e.data instanceof Object))return;let t=/** @type WorkerRequest */e.data;d(t).then(e=>{self.postMessage(/** @type {WorkerResponse} */{...e,id:t.id})}).catch(e=>{self.postMessage(/** @type {WorkerResponse} */{id:t.id,type:"error",error:e})})})}();//# sourceMappingURL=worker.f1ddca90.js.map

//# sourceMappingURL=worker.f1ddca90.js.map
