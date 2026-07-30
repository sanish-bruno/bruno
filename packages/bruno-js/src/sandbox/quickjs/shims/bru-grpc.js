const { marshallToVm } = require('../utils');

/**
 * Marshals the phase-aware `bru.grpc` namespace into the QuickJS sandbox.
 *
 * All API-object methods bridge natively — the host classes now return arrays
 * (not maps) from `all()`, so iterators like `find/filter/map/each` need no
 * in-VM reimplementation. New methods added to the host classes surface
 * automatically via reflection.
 */

const methodNames = (obj) => {
  const names = new Set();
  const collect = (source) => {
    for (const key of Object.getOwnPropertyNames(source)) {
      if (key === 'constructor' || key.startsWith('_')) continue;
      if (typeof obj[key] === 'function') names.add(key);
    }
  };
  collect(obj);
  const proto = Object.getPrototypeOf(obj);
  if (proto && proto !== Object.prototype && proto !== Array.prototype) {
    collect(proto);
  }
  return [...names];
};

// An API object (list/message-list) exposes callable own-props via `expose()`.
// A namespace (grpc/request/response) or plain message POJO has none — recurse
// or marshal as data.
const isApiObject = (value) => value !== null && typeof value === 'object' && methodNames(value).length > 0;

const attachMethods = (vm, hostObj, targetObj) => {
  for (const name of methodNames(hostObj)) {
    const fn = vm.newFunction(name, (...vmArgs) => {
      const args = vmArgs.map((a) => vm.dump(a));
      return marshallToVm(hostObj[name](...args), vm);
    });
    fn.consume((handle) => vm.setProp(targetObj, name, handle));
  }
};

const marshallGrpcNode = (vm, node) => {
  if (node === null || typeof node !== 'object') {
    return marshallToVm(node, vm);
  }
  if (isApiObject(node)) {
    // List-like (has `all()`): base the VM value on the underlying array so it
    // logs and serializes as data — mirroring host `expose()`. Otherwise: plain
    // object of methods.
    const base = typeof node.all === 'function' ? marshallToVm(node.all(), vm) : vm.newObject();
    attachMethods(vm, node, base);
    return base;
  }

  const obj = vm.newObject();
  for (const key of Object.keys(node)) {
    const child = marshallGrpcNode(vm, node[key]);
    vm.setProp(obj, key, child);
    child.dispose();
  }
  return obj;
};

const addBruGrpcShimToContext = (vm, grpc) => {
  const grpcHandle = marshallGrpcNode(vm, grpc);
  const bruHandle = vm.getProp(vm.global, 'bru');
  vm.setProp(bruHandle, 'grpc', grpcHandle);
  bruHandle.dispose();
  grpcHandle.dispose();
};

module.exports = addBruGrpcShimToContext;
