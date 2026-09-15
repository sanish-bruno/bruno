const { PropertyList } = require('./property-list');
const { setMetadataKey } = require('../grpc/grpc-metadata');
const { findKeyCI } = require('./key-matching');
const { metadataLines } = require('./serializers');

/**
 * GrpcMetadataList — `bru.grpc.request.metadata`, `bru.grpc.response.metadata`
 * and `bru.grpc.response.trailers`. A view over the live `{ key: value }` map.
 *
 * A writable list needs `readMetadata` to return the same live object every
 * call, since that object is what writes edit. Request metadata is writable only
 * in the beforeCallStart hook; response metadata and trailers never are.
 */
class GrpcMetadataList extends PropertyList {
  #readMetadata;
  #writable;

  static errors = {
    readonly: (method) =>
      `metadata.${method}() is not available once the call has been sent — change metadata in the beforeCallStart hook`
  };

  /**
   * @param {Function} readMetadata - Returns the `{ key: value }` map backing the list
   * @param {object} [options]
   * @param {boolean} [options.writable=false]
   */
  constructor(readMetadata, { writable = false } = {}) {
    super({ caseInsensitive: true, uniqueKeys: true, stringify: metadataLines });
    this.#readMetadata = readMetadata;
    this.#writable = writable === true;
  }

  read() {
    return Object.entries(this.#readMetadata()).map(([key, value]) => ({ key, value }));
  }

  #writableMetadata(method) {
    if (!this.#writable) {
      throw new Error(GrpcMetadataList.errors.readonly(method));
    }
    return this.#readMetadata();
  }

  /** Insert a key, or update it in place when it already exists. */
  upsert(key, value) {
    const metadata = this.#writableMetadata('upsert');
    if (typeof key !== 'string' || !key.length) {
      return;
    }
    const existing = findKeyCI(metadata, key);
    // A server reads `X-Token` and `x-token` as one key, so a re-cased upsert replaces instead of
    // leaving two entries the transport would send as duplicates.
    if (existing !== undefined && existing !== key) {
      delete metadata[existing];
    }
    setMetadataKey(metadata, key, value);
  }

  /** Upsert from the `{ key, value }` shape `all()` returns, so entries move between lists. */
  add(item) {
    this.#writableMetadata('add');
    if (!item || typeof item !== 'object') {
      return;
    }
    this.upsert(item.key, item.value);
  }

  remove(key) {
    const metadata = this.#writableMetadata('remove');
    const existing = findKeyCI(metadata, key);
    if (existing !== undefined) {
      delete metadata[existing];
    }
  }

  /** Emptied in place rather than reassigned, since the map is shared with the call. */
  clear() {
    const metadata = this.#writableMetadata('clear');
    for (const key of Object.keys(metadata)) {
      delete metadata[key];
    }
  }
}

module.exports = GrpcMetadataList;
