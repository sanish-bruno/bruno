const { SURFACES, bridgeMethodSets } = require('../../src/property-lists/surfaces');
const { PropertyList } = require('../../src/property-lists/property-list');

// The derived sets are pinned as explicit arrays so any change to a surface's
// script-facing API shows up here as a reviewable diff.

const READS = ['get', 'has', 'count', 'indexOf', 'toObject', 'toString'];
const READ_OBJECTS = ['one', 'all', 'idx', 'toJSON'];

describe('property-list surfaces', () => {
  test('every surface is served by a PropertyList subclass', () => {
    for (const ListClass of Object.values(SURFACES)) {
      expect(Object.prototype.isPrototypeOf.call(PropertyList, ListClass)).toBe(true);
    }
  });

  test('bridgeMethodSets() throws on unknown paths', () => {
    expect(() => bridgeMethodSets('bru.unknown')).toThrow('Unknown property list path: \'bru.unknown\'');
  });

  test.each(['bru.grpc.request.metadata', 'bru.grpc.response.metadata', 'bru.grpc.response.trailers'])(
    'bridge method sets for %s',
    (path) => {
      expect(bridgeMethodSets(path)).toEqual({
        syncReadMethods: READS,
        syncReadObjectMethods: READ_OBJECTS,
        syncWriteMethods: ['upsert', 'add', 'remove', 'clear'],
        asyncWriteMethods: [],
        withIterators: true
      });
    }
  );

  test.each(['req.headerList', 'res.headerList'])('bridge method sets for %s', (path) => {
    expect(bridgeMethodSets(path)).toEqual({
      syncReadMethods: READS,
      syncReadObjectMethods: READ_OBJECTS,
      syncWriteMethods: ['add', 'upsert', 'remove', 'clear', 'populate', 'repopulate', 'assimilate'],
      asyncWriteMethods: [],
      withIterators: true
    });
  });

  test('bridge method sets for bru.cookies (async writes)', () => {
    expect(bridgeMethodSets('bru.cookies')).toEqual({
      syncReadMethods: READS,
      syncReadObjectMethods: READ_OBJECTS,
      syncWriteMethods: [],
      asyncWriteMethods: ['add', 'upsert', 'remove', 'delete', 'clear'],
      withIterators: true
    });
  });
});
