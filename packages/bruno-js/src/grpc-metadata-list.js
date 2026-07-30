const ReadOnlyPropertyList = require('./readonly-property-list');
const { ciEquals } = require('./header-utils');
const { isObject } = require('./utils');

/**
 * GrpcMetadataList — the `bru.grpc.request.metadata` / `bru.grpc.response.trailers` API.
 *
 * Backs onto the request's headers map (`{ [key]: value }`) so reads always reflect
 * the current state and writes mutate the same object other Bruno subsystems see.
 * Key matching is case-insensitive; stored casing is preserved.
 *
 * Read methods (case-insensitive): get / one / has / indexOf. Everything else
 * (all / count / find / filter / map / each / reduce / toObject / toString / toJSON)
 * comes from ReadOnlyPropertyList.
 *
 * Write methods, gated behind `writable`: set / setAll / remove / clear.
 */
class GrpcMetadataList extends ReadOnlyPropertyList {
  #source;
  #writable;

  /**
   * @param {object} source - Object with a `headers` map; writes mutate it in place.
   * @param {object} [options]
   * @param {boolean} [options.writable=false] - When false, write methods throw.
   */
  constructor(source, { writable = false } = {}) {
    super({
      keyProperty: 'key',
      valueProperty: 'value',
      dataSource: () => {
        const headers = source && source.headers;
        if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return [];
        return Object.entries(headers).map(([key, value]) => ({ key, value }));
      }
    });
    this.#source = source;
    this.#writable = writable;
  }

  #assertWritable(method) {
    if (!this.#writable) {
      throw new Error(`bru.grpc metadata.${method}() is read-only in this script phase`);
    }
  }

  #ensureHeaders() {
    const headers = this.#source.headers;
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
      this.#source.headers = {};
    }
    return this.#source.headers;
  }

  // ── Read overrides (case-insensitive) ────────────────────────────────────
  get(name) {
    return this.all().findLast((entry) => ciEquals(entry.key, name))?.value;
  }

  one(name) {
    return this.all().findLast((entry) => ciEquals(entry.key, name));
  }

  has(name, value) {
    const entries = this.all();
    if (value !== undefined) {
      return entries.some((entry) => ciEquals(entry.key, name) && entry.value === value);
    }
    return entries.some((entry) => ciEquals(entry.key, name));
  }

  indexOf(item) {
    const entries = this.all();
    if (typeof item === 'string') {
      return entries.findIndex((entry) => ciEquals(entry.key, item));
    }
    if (!item || typeof item !== 'object') return -1;
    return entries.findIndex((entry) => ciEquals(entry.key, item.key) && entry.value === item.value);
  }

  // ── Writes (mutate source.headers) ───────────────────────────────────────
  set(key, value) {
    this.#assertWritable('set');
    const headers = this.#ensureHeaders();
    const existingKey = Object.keys(headers).find((k) => ciEquals(k, key));
    if (existingKey !== undefined && existingKey !== key) {
      delete headers[existingKey];
    }
    headers[key] = value;
  }

  setAll(data) {
    this.#assertWritable('setAll');
    if (!isObject(data) || Array.isArray(data)) {
      throw new TypeError('setAll expects an object of key/value pairs');
    }
    this.#source.headers = { ...data };
  }

  remove(key) {
    this.#assertWritable('remove');
    const headers = this.#ensureHeaders();
    const existingKey = Object.keys(headers).find((k) => ciEquals(k, key));
    if (existingKey !== undefined) {
      delete headers[existingKey];
    }
  }

  clear() {
    this.#assertWritable('clear');
    this.#source.headers = {};
  }

  /**
   * Sandbox-facing view: the array of `{key, value}` entries with every public
   * method attached as a non-enumerable, `this`-bound property. Users see plain
   * data in logs / JSON.stringify, but method calls dispatch back to the instance.
   */
  expose() {
    const view = this.all();
    let proto = Object.getPrototypeOf(this);
    while (proto && proto !== Object.prototype) {
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor' || name === 'expose') continue;
        if (name.startsWith('_')) continue;
        if (Object.prototype.hasOwnProperty.call(view, name)) continue;
        if (typeof this[name] !== 'function') continue;
        Object.defineProperty(view, name, {
          value: this[name].bind(this),
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
      proto = Object.getPrototypeOf(proto);
    }
    return view;
  }
}

module.exports = GrpcMetadataList;
