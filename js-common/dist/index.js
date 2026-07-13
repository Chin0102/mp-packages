var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  VERSION: () => VERSION,
  readonly: () => readonly
});
module.exports = __toCommonJS(index_exports);

// src/proxy.js
var cache = /* @__PURE__ */ new WeakMap();
function readonly(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const cached = cache.get(obj);
  if (cached) return cached;
  const deny = () => {
    throw new TypeError("Cannot modify readonly state");
  };
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      return readonly(Reflect.get(target, key, receiver));
    },
    set: deny,
    deleteProperty: deny,
    defineProperty: deny,
    setPrototypeOf: deny,
    preventExtensions: deny
  });
  cache.set(obj, proxy);
  return proxy;
}

// src/index.js
var VERSION = "0.1.0";
