/**
 * Unit tests for HooksRuntime — verifies context availability (bru, req, res)
 * across all four hook events.
 *
 * Context matrix:
 * | Event                       | bru  | req  | res  |
 * |-----------------------------|------|------|------|
 * | runner:beforeCollectionRun  | yes  | null | null |
 * | runner:afterCollectionRun   | yes  | null | null |
 * | http:beforeRequest          | yes  | yes  | null |
 * | http:afterResponse          | yes  | yes  | yes  |
 *
 * Note: result.runtimeVariables is a deep-copy snapshot (via cleanJson) taken
 * at registration time. Hook handlers that fire later mutate the ORIGINAL
 * runtimeVariables object, so we keep a direct reference to it for assertions.
 */
const HooksRuntime = require('../src/runtime/hooks-runtime');
const HookManager = require('../src/hook-manager');

const EVENTS = HookManager.EVENTS;

/**
 * Helper: create options and return both the options and a direct reference
 * to the runtimeVariables object that bru.setVar will mutate.
 */
const createOpts = () => {
  const runtimeVariables = {};
  const opts = {
    request: {},
    envVariables: {},
    runtimeVariables,
    collectionPath: '.',
    processEnvVars: {},
    scriptingConfig: {},
    collectionName: 'test-collection'
  };
  return { opts, runtimeVariables };
};

describe('HooksRuntime — context availability', () => {
  describe('initial context', () => {
    it('req and res start as null', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.runner.onBeforeCollectionRun(() => {
          bru.setVar('init-req-null', (typeof req === 'undefined' || req == null) ? 'true' : 'false');
          bru.setVar('init-res-null', (typeof res === 'undefined' || res == null) ? 'true' : 'false');
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });
      await result.hookManager.call(EVENTS.RUNNER_BEFORE_COLLECTION_RUN);

      expect(vars['init-req-null']).toBe('true');
      expect(vars['init-res-null']).toBe('true');
    });
  });

  describe('updateContext with req only (http:beforeRequest)', () => {
    it('req is available, res remains null', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.http.onBeforeRequest(() => {
          bru.setVar('br-bru', (bru != null).toString());
          bru.setVar('br-req-avail', (typeof req !== 'undefined' && req != null).toString());
          bru.setVar('br-req-has-getUrl', (typeof req.getUrl === 'function').toString());
          bru.setVar('br-res-null', (typeof res === 'undefined' || res == null) ? 'true' : 'false');
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });

      // Simulate what the runner does before firing http:beforeRequest
      const mockReq = { getUrl: () => 'http://localhost/test', getName: () => 'test' };
      result.updateContext({ req: mockReq });

      await result.hookManager.call(EVENTS.HTTP_BEFORE_REQUEST);

      expect(vars['br-bru']).toBe('true');
      expect(vars['br-req-avail']).toBe('true');
      expect(vars['br-req-has-getUrl']).toBe('true');
      expect(vars['br-res-null']).toBe('true');
    });
  });

  describe('updateContext with req + res (http:afterResponse)', () => {
    it('both req and res are available', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.http.onAfterResponse(() => {
          bru.setVar('ar-bru', (bru != null).toString());
          bru.setVar('ar-req-avail', (typeof req !== 'undefined' && req != null).toString());
          bru.setVar('ar-res-avail', (typeof res !== 'undefined' && res != null).toString());
          bru.setVar('ar-res-has-getStatus', (typeof res.getStatus === 'function').toString());
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });

      // Simulate what the runner does before firing http:afterResponse
      const mockReq = { getUrl: () => 'http://localhost/test' };
      const mockRes = { getStatus: () => 200, getBody: () => 'ok' };
      result.updateContext({ req: mockReq, res: mockRes });

      await result.hookManager.call(EVENTS.HTTP_AFTER_RESPONSE);

      expect(vars['ar-bru']).toBe('true');
      expect(vars['ar-req-avail']).toBe('true');
      expect(vars['ar-res-avail']).toBe('true');
      expect(vars['ar-res-has-getStatus']).toBe('true');
    });
  });

  describe('runner hooks without updateContext', () => {
    it('beforeCollectionRun: bru available, req/res null', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.runner.onBeforeCollectionRun(() => {
          bru.setVar('bcr-bru', (bru != null).toString());
          bru.setVar('bcr-req-null', (typeof req === 'undefined' || req == null) ? 'true' : 'false');
          bru.setVar('bcr-res-null', (typeof res === 'undefined' || res == null) ? 'true' : 'false');
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });

      // No updateContext — runner hooks fire without req/res
      await result.hookManager.call(EVENTS.RUNNER_BEFORE_COLLECTION_RUN);

      expect(vars['bcr-bru']).toBe('true');
      expect(vars['bcr-req-null']).toBe('true');
      expect(vars['bcr-res-null']).toBe('true');
    });

    it('afterCollectionRun: bru available, req/res null', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.runner.onAfterCollectionRun(() => {
          bru.setVar('acr-bru', (bru != null).toString());
          bru.setVar('acr-req-null', (typeof req === 'undefined' || req == null) ? 'true' : 'false');
          bru.setVar('acr-res-null', (typeof res === 'undefined' || res == null) ? 'true' : 'false');
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });

      // No updateContext — runner hooks fire without req/res
      await result.hookManager.call(EVENTS.RUNNER_AFTER_COLLECTION_RUN);

      expect(vars['acr-bru']).toBe('true');
      expect(vars['acr-req-null']).toBe('true');
      expect(vars['acr-res-null']).toBe('true');
    });
  });

  describe('full context matrix', () => {
    it('walks through all 4 events verifying the complete context matrix', async () => {
      const runtime = new HooksRuntime({ runtime: 'nodevm' });
      const { opts, runtimeVariables: vars } = createOpts();

      const script = `
        bru.hooks.runner.onBeforeCollectionRun(() => {
          bru.setVar('m-bcr-bru', (bru != null).toString());
          bru.setVar('m-bcr-req', (typeof req === 'undefined' || req == null) ? 'null' : 'available');
          bru.setVar('m-bcr-res', (typeof res === 'undefined' || res == null) ? 'null' : 'available');
        });

        bru.hooks.http.onBeforeRequest(() => {
          bru.setVar('m-br-bru', (bru != null).toString());
          bru.setVar('m-br-req', (typeof req === 'undefined' || req == null) ? 'null' : 'available');
          bru.setVar('m-br-res', (typeof res === 'undefined' || res == null) ? 'null' : 'available');
        });

        bru.hooks.http.onAfterResponse(() => {
          bru.setVar('m-ar-bru', (bru != null).toString());
          bru.setVar('m-ar-req', (typeof req === 'undefined' || req == null) ? 'null' : 'available');
          bru.setVar('m-ar-res', (typeof res === 'undefined' || res == null) ? 'null' : 'available');
        });

        bru.hooks.runner.onAfterCollectionRun(() => {
          bru.setVar('m-acr-bru', (bru != null).toString());
          bru.setVar('m-acr-req', (typeof req === 'undefined' || req == null) ? 'null' : 'available');
          bru.setVar('m-acr-res', (typeof res === 'undefined' || res == null) ? 'null' : 'available');
        });
      `;

      const result = await runtime.runHooks({ ...opts, hooksFile: script });
      const hm = result.hookManager;

      // 1. runner:beforeCollectionRun — no updateContext
      await hm.call(EVENTS.RUNNER_BEFORE_COLLECTION_RUN);
      expect(vars['m-bcr-bru']).toBe('true');
      expect(vars['m-bcr-req']).toBe('null');
      expect(vars['m-bcr-res']).toBe('null');

      // 2. http:beforeRequest — updateContext with req only
      const mockReq = { getUrl: () => 'http://localhost/test' };
      result.updateContext({ req: mockReq });
      await hm.call(EVENTS.HTTP_BEFORE_REQUEST);
      expect(vars['m-br-bru']).toBe('true');
      expect(vars['m-br-req']).toBe('available');
      expect(vars['m-br-res']).toBe('null');

      // 3. http:afterResponse — updateContext with req + res
      const mockRes = { getStatus: () => 200 };
      result.updateContext({ req: mockReq, res: mockRes });
      await hm.call(EVENTS.HTTP_AFTER_RESPONSE);
      expect(vars['m-ar-bru']).toBe('true');
      expect(vars['m-ar-req']).toBe('available');
      expect(vars['m-ar-res']).toBe('available');

      // 4. runner:afterCollectionRun — reset context (no req/res)
      result.updateContext({ req: null, res: null });
      await hm.call(EVENTS.RUNNER_AFTER_COLLECTION_RUN);
      expect(vars['m-acr-bru']).toBe('true');
      expect(vars['m-acr-req']).toBe('null');
      expect(vars['m-acr-res']).toBe('null');
    });
  });
});
