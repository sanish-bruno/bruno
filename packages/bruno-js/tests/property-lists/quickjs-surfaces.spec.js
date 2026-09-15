const os = require('os');
const path = require('path');

const mockJar = {
  setCookie: jest.fn((url, cookie, cb) => cb()),
  deleteCookie: jest.fn((url, name, cb) => cb()),
  getCookies: jest.fn((url, cb) => cb(null, [{ key: 'k', value: 'v' }]))
};
jest.mock('@usebruno/requests', () => ({
  ...jest.requireActual('@usebruno/requests'),
  cookies: { jar: () => mockJar, getCookiesForUrl: () => [{ key: 'session', value: 's1' }] }
}));

const Bru = require('../../src/bru');
const BrunoRequest = require('../../src/bruno-request');
const BrunoResponse = require('../../src/bruno-response');

const collectionPath = path.join(os.tmpdir(), 'bruno-quickjs-surfaces');

const run = async (script, context) => {
  const sandbox = require('../../src/sandbox/quickjs');
  await sandbox.loader();
  await sandbox.executeQuickJsVmAsync({ script, context, collectionPath });
};

describe('property-list surfaces through the QuickJS shims', () => {
  test('req.headerList and res.headerList round-trip reads, writes and gates', async () => {
    const rawReq = { method: 'GET', url: 'https://x', headers: { 'Content-Type': 'application/json' } };
    const req = new BrunoRequest(rawReq);
    const res = new BrunoResponse({ status: 200, headers: { 'x-a': '1', 'x-b': '2' }, data: {} });
    const bru = new Bru({ runtime: 'quickjs', envVariables: {}, runtimeVariables: {}, processEnvVars: {}, collectionPath, collectionName: 't' });

    await run(`
      req.headerList.add('X-Token', 'abc');
      req.headerList.remove((h) => h.key.toLowerCase() === 'content-type');
      bru.setVar('reqKeys', req.headerList.map((h) => h.key).join(','));
      bru.setVar('reqIdx', req.headerList.idx(0).key);
      bru.setVar('resCount', res.headerList.count());
      bru.setVar('resObj', JSON.stringify(res.headerList.toObject()));
      try { res.headerList.add({ key: 'z', value: '1' }); } catch (e) { bru.setVar('resErr', e.message); }
      bru.setVar('appendType', typeof req.headerList.append);
    `, { bru, req, res });

    expect(bru.getVar('reqKeys')).toBe('X-Token');
    expect(bru.getVar('reqIdx')).toBe('X-Token');
    expect(rawReq.headers).toEqual({ 'X-Token': 'abc' });
    expect(rawReq.__headersToDelete).toEqual(['Content-Type']);
    expect(bru.getVar('resCount')).toBe(2);
    expect(bru.getVar('resObj')).toBe('{"x-a":"1","x-b":"2"}');
    expect(bru.getVar('resErr')).toContain('read-only');
    expect(bru.getVar('appendType')).toBe('undefined');
  });

  test('bru.cookies bridges async writes and the jar handle', async () => {
    const bru = new Bru({
      runtime: 'quickjs', envVariables: {}, runtimeVariables: {}, processEnvVars: {}, collectionPath, collectionName: 't',
      requestUrl: 'https://example.com'
    });

    await run(`
      await bru.cookies.add({ key: 'a', value: '1' });
      await bru.cookies.remove('a');
      bru.setVar('count', bru.cookies.count());
      bru.setVar('has', bru.cookies.has('session'));
      const jarCookies = await bru.cookies.jar().getCookies('https://other');
      bru.setVar('jar', JSON.stringify(jarCookies));
      bru.setVar('prependType', typeof bru.cookies.prepend);
    `, { bru });

    expect(mockJar.setCookie).toHaveBeenCalledWith('https://example.com', { key: 'a', value: '1' }, expect.any(Function));
    expect(mockJar.deleteCookie).toHaveBeenCalledWith('https://example.com', 'a', expect.any(Function));
    expect(bru.getVar('count')).toBe(1);
    expect(bru.getVar('has')).toBe(true);
    expect(bru.getVar('jar')).toBe('[{"key":"k","value":"v"}]');
    expect(bru.getVar('prependType')).toBe('undefined');
  });
});
