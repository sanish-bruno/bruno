/**
 * GrpcMessageList — the `bru.grpc.request.messages` / `bru.grpc.response.messages` API.
 *
 * A read-only positional list of message payloads. `read` is a closure so response
 * messages (which arrive as the call streams) always see the latest entries.
 * `parse` transforms each raw entry into its user-facing shape:
 *   - sent messages: `{ name, content: JSON_string }` → `parsed content`
 *   - received messages: `{ data, timestamp }` → identity
 *
 * Not extending ReadOnlyPropertyList: messages are keyless (access is positional),
 * so the key-centric API (`get(name)`, `has(name)`) would misdirect users.
 */
class GrpcMessageList {
  #read;
  #parse;

  /**
   * @param {object} [options]
   * @param {Function} [options.read] - Returns the raw entries array on every call.
   * @param {Function} [options.parse] - Transforms each raw entry (default: identity).
   */
  constructor({ read, parse } = {}) {
    this.#read = typeof read === 'function' ? read : () => [];
    this.#parse = typeof parse === 'function' ? parse : (entry) => entry;
  }

  #entries() {
    const raw = this.#read();
    return Array.isArray(raw) ? raw : [];
  }

  all() {
    return this.#entries().map(this.#parse);
  }

  get(index = 0) {
    const entries = this.#entries();
    return index >= 0 && index < entries.length ? this.#parse(entries[index]) : null;
  }

  first() {
    return this.get(0);
  }

  last() {
    const entries = this.#entries();
    return entries.length ? this.#parse(entries[entries.length - 1]) : null;
  }

  count() {
    return this.#entries().length;
  }

  find(predicate) {
    return this.all().find(predicate);
  }

  filter(predicate) {
    return this.all().filter(predicate);
  }

  map(mapper) {
    return this.all().map(mapper);
  }

  each(callback) {
    this.all().forEach(callback);
  }

  expose() {
    const view = this.all();
    for (const name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if (name === 'constructor' || name === 'expose') continue;
      if (Object.prototype.hasOwnProperty.call(view, name)) continue;
      if (typeof this[name] !== 'function') continue;
      Object.defineProperty(view, name, {
        value: this[name].bind(this),
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    return view;
  }
}

module.exports = GrpcMessageList;
