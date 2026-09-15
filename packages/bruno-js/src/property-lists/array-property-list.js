const { PropertyList } = require('./property-list');

/**
 * ArrayPropertyList — a list that owns its items outright, and the one surface
 * with a real ordering, so the only one with positional mutators.
 */
class ArrayPropertyList extends PropertyList {
  #items;

  /**
   * @param {Array} [items] - Initial items; copied, never aliased
   * @param {object} [options] - PropertyList options
   */
  constructor(items, options) {
    super(options);
    this.#items = Array.isArray(items) ? [...items] : [];
  }

  read() {
    return [...this.#items];
  }

  #findIndex(ref) {
    if (typeof ref === 'string') {
      return this.#items.findIndex((i) => i.key === ref);
    }
    if (ref && typeof ref === 'object') {
      return this.#items.findIndex((i) => i.key === ref.key && i.value === ref.value);
    }
    return -1;
  }

  add(item) {
    this.#items.push(item);
  }

  /** Update an existing item by key, or append if not found. */
  upsert(item) {
    const index = this.#items.findIndex((i) => i.key === item.key);
    if (index !== -1) {
      this.#items[index] = item;
    } else {
      this.#items.push(item);
    }
  }

  /** Remove items matching a predicate, key string, or item reference. */
  remove(predicate) {
    if (typeof predicate === 'function') {
      this.#items = this.#items.filter((item) => !predicate(item));
    } else if (typeof predicate === 'string') {
      this.#items = this.#items.filter((item) => item.key !== predicate);
    } else if (predicate && typeof predicate === 'object') {
      const index = this.#findIndex(predicate);
      if (index !== -1) {
        this.#items.splice(index, 1);
      }
    }
  }

  clear() {
    this.#items = [];
  }

  populate(items) {
    this.#items = Array.isArray(items) ? [...items] : [];
  }

  repopulate(items) {
    this.populate(items);
  }

  /**
   * Merge items from another PropertyList or array.
   * @param {PropertyList|Array} source
   * @param {boolean} [prune=false] - Clear existing items first
   */
  assimilate(source, prune) {
    if (prune) {
      this.#items = [];
    }
    let items;
    if (PropertyList.isPropertyList(source)) {
      items = source.all();
    } else if (Array.isArray(source)) {
      items = source;
    } else {
      items = [];
    }
    for (const item of items) {
      this.#items.push(item);
    }
  }

  append(item) {
    this.add(item);
  }

  prepend(item) {
    this.#items.unshift(item);
  }

  /** Insert before a reference (key string or item object); appends when not found. */
  insert(item, before) {
    const index = this.#findIndex(before);
    if (index === -1) {
      this.#items.push(item);
    } else {
      this.#items.splice(index, 0, item);
    }
  }

  /** Insert after a reference (key string or item object); appends when not found. */
  insertAfter(item, after) {
    const index = this.#findIndex(after);
    if (index === -1) {
      this.#items.push(item);
    } else {
      this.#items.splice(index + 1, 0, item);
    }
  }
}

module.exports = ArrayPropertyList;
