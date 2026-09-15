const { ciEquals } = require('./key-matching');
const serializers = require('./serializers');

/**
 * PropertyList — the abstract collection behind every list-like scripting surface
 * (`req.headerList`, `res.headerList`, `bru.cookies`, gRPC metadata/trailers).
 *
 * A concrete surface is a subclass that *is* its own store: it implements
 * `read()` to derive a fresh `{ key, value, ... }[]` from its backing source on
 * every call, and defines its write methods as ordinary prototype methods with the
 * surface's own signatures. Every read here starts from `read()`, so a live
 * surface can never diverge from its raw counterpart (`req.headers`, the jar).
 *
 * Subclass contract:
 *   read()                  required; a fresh array per call that the caller may keep
 *   static errors           { readonly(method) } message template, for read-only surfaces
 *   static asyncWrites      true when writes use the callback-or-promise convention
 *
 * Every own prototype method a subclass adds is a write method of its surface
 * (see `writeMethodsOf`). The base has no write or positional methods: a keyed
 * surface simply lacks insert/append, and only an ordered subclass defines them.
 */

const thrower = (message) => () => {
  throw new Error(message);
};

class PropertyList {
  #caseInsensitive;
  #uniqueKeys;
  #stringify;
  #objectify;

  static errors = {
    readonly: (method) => `${method}() is not available — this list is read-only`
  };

  static asyncWrites = false;

  /**
   * @param {object} [options]
   * @param {boolean} [options.caseInsensitive=false] - Case-insensitive key matching
   * @param {boolean} [options.uniqueKeys=false] - Keys are unique; enables the string-key
   *   `indexOf` and object-form `has` shortcuts, which are ambiguous with duplicate keys
   * @param {Function} [options.stringify] - Items → string, behind toString() (see serializers.js)
   * @param {Function} [options.objectify] - Items → plain object, behind toObject() (see serializers.js)
   */
  constructor({ caseInsensitive = false, uniqueKeys = false, stringify = serializers.pairs, objectify = serializers.lastWins } = {}) {
    this.#caseInsensitive = caseInsensitive === true;
    this.#uniqueKeys = uniqueKeys === true;
    this.#stringify = stringify;
    this.#objectify = objectify;
  }

  read() {
    throw new Error(`${this.constructor.name} must implement read()`);
  }

  #read() {
    return this.read();
  }

  #keyEquals(a, b) {
    return this.#caseInsensitive ? ciEquals(a, b) : a === b;
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  /** Value by key; duplicate keys resolve to the last entry, consistent with toObject(). */
  get(name) {
    const item = this.#read().findLast((i) => this.#keyEquals(i.key, name));
    return item ? item.value : undefined;
  }

  /** Full item by key (last-wins on duplicates). */
  one(name) {
    return this.#read().findLast((i) => this.#keyEquals(i.key, name));
  }

  all() {
    return this.#read();
  }

  /** Item at a position in the backing store's iteration order. */
  idx(index) {
    return this.#read()[index];
  }

  count() {
    return this.#read().length;
  }

  /** Index by `{ key, value }` structural equality, or by key string on unique-key lists. */
  indexOf(item) {
    if (this.#uniqueKeys && typeof item === 'string') {
      return this.#read().findIndex((i) => this.#keyEquals(i.key, item));
    }
    if (!item || typeof item !== 'object') return -1;
    return this.#read().findIndex((i) => this.#keyEquals(i.key, item.key) && i.value === item.value);
  }

  // ── Search ─────────────────────────────────────────────────────────────

  /** Key presence, also matching `value` when given; unique-key lists accept `{ key }`. */
  has(name, value) {
    if (this.#uniqueKeys && name && typeof name === 'object' && name.key) {
      return this.#read().some((i) => this.#keyEquals(i.key, name.key));
    }
    const items = this.#read();
    if (value !== undefined) {
      return items.some((i) => this.#keyEquals(i.key, name) && i.value === value);
    }
    return items.some((i) => this.#keyEquals(i.key, name));
  }

  find(predicate, context) {
    return this.#read().find(context !== undefined ? predicate.bind(context) : predicate);
  }

  filter(predicate, context) {
    return this.#read().filter(context !== undefined ? predicate.bind(context) : predicate);
  }

  // ── Iteration ──────────────────────────────────────────────────────────

  each(fn, context) {
    this.#read().forEach(context !== undefined ? fn.bind(context) : fn);
  }

  map(fn, context) {
    return this.#read().map(context !== undefined ? fn.bind(context) : fn);
  }

  reduce(fn, ...args) {
    const bound = args.length > 1 ? fn.bind(args[1]) : fn;
    return args.length ? this.#read().reduce(bound, args[0]) : this.#read().reduce(bound);
  }

  // ── Transformation ─────────────────────────────────────────────────────

  toObject(...args) {
    return this.#objectify(this.#read(), ...args);
  }

  toString() {
    return this.#stringify(this.#read());
  }

  toJSON() {
    return this.all();
  }

  static isPropertyList(obj) {
    return obj instanceof PropertyList;
  }
}

/** The write API a subclass adds to the base: its own prototype methods. */
const writeMethodsOf = (ListClass) =>
  Object.getOwnPropertyNames(ListClass.prototype).filter(
    (name) => name !== 'constructor' && !Object.hasOwn(PropertyList.prototype, name)
  );

/**
 * Give a read-only surface the write API of its writable sibling, every method
 * throwing `errors.readonly`, so scripts get the reason instead of "not a function".
 */
const mirrorAsReadOnly = (ReadOnlyClass, WritableClass) => {
  for (const name of writeMethodsOf(WritableClass)) {
    Object.defineProperty(ReadOnlyClass.prototype, name, {
      value: thrower(ReadOnlyClass.errors.readonly(name)),
      writable: true,
      configurable: true
    });
  }
  return ReadOnlyClass;
};

module.exports = { PropertyList, writeMethodsOf, mirrorAsReadOnly };
