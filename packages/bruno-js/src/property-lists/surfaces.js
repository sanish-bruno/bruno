const { writeMethodsOf } = require('./property-list');
const CookieList = require('./cookie-list');
const RequestHeaderList = require('./request-header-list');
const ResponseHeaderList = require('./response-header-list');
const GrpcMetadataList = require('./grpc-metadata-list');

/**
 * Script path → the PropertyList subclass serving it. The QuickJS shims derive
 * their bridge method sets from the class, so the two runtimes cannot drift.
 */
const SURFACES = Object.freeze({
  'bru.cookies': CookieList,
  'req.headerList': RequestHeaderList,
  'res.headerList': ResponseHeaderList,
  'bru.grpc.request.metadata': GrpcMetadataList,
  'bru.grpc.response.metadata': GrpcMetadataList,
  'bru.grpc.response.trailers': GrpcMetadataList
});

const READ_PRIMITIVE_METHODS = ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'];
const READ_OBJECT_METHODS = ['one', 'all', 'idx', 'toJSON'];

/**
 * Bridge method sets for `createPropertyListBridge`, derived from the class so the
 * shim tracks the native surface automatically.
 *
 * @param {string} path - A key of SURFACES
 * @returns {object} Options for `createPropertyListBridge` (minus vm wiring)
 */
const bridgeMethodSets = (path) => {
  const ListClass = SURFACES[path];
  if (!ListClass) {
    throw new Error(`Unknown property list path: '${path}'. Add it to surfaces.js.`);
  }
  const writeMethods = writeMethodsOf(ListClass);
  return {
    syncReadMethods: [...READ_PRIMITIVE_METHODS],
    syncReadObjectMethods: [...READ_OBJECT_METHODS],
    syncWriteMethods: ListClass.asyncWrites ? [] : writeMethods,
    asyncWriteMethods: ListClass.asyncWrites ? writeMethods : [],
    withIterators: true
  };
};

module.exports = { SURFACES, bridgeMethodSets };
