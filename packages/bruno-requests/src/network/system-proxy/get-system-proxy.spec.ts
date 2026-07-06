/**
 * Cross-platform integration tests for getSystemProxy().
 * Verifies platform detection (macOS scutil / Linux gsettings, KDE, files / Windows registry, netsh)
 * and merge behavior with the process.env layer (env wins per key; source reflects both when both contribute).
 *
 * The refresh path (refreshShellEnvProxyVars) is intentionally NOT exercised here — its contract
 * lives in ../../utils/shell-env-proxy-refresh.spec.ts. Tests below arrange the env layer by
 * mutating process.env directly, which is what getSystemProxy actually reads.
 */
export {}; // Mark this file as a module so top-level declarations don't collide with sibling specs.

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('node:util', () => ({ promisify: jest.fn((fn) => fn) }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));
jest.mock('node:fs/promises', () => ({ readFile: jest.fn(), readdir: jest.fn() }));

const PROXY_ENV_KEYS = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'no_proxy',
  'NO_PROXY',
  'all_proxy',
  'ALL_PROXY'
];

interface FreshModules {
  execFile: jest.MockedFunction<any>;
  existsSync: jest.MockedFunction<any>;
  readFile: jest.MockedFunction<any>;
  readdir: jest.MockedFunction<any>;
  getSystemProxy: () => Promise<any>;
}

/**
 * Re-require the proxy modules with a mocked node:os platform. The SystemProxyResolver
 * singleton reads platform() at construction, so this has to happen before requiring ./index.
 */
const loadForPlatform = (platform: string): FreshModules => {
  jest.resetModules();
  jest.doMock('node:os', () => ({ platform: () => platform }));

  const { execFile } = require('node:child_process');
  const { existsSync } = require('node:fs');
  const { readFile, readdir } = require('node:fs/promises');
  const { getSystemProxy } = require('./index');

  return { execFile, existsSync, readFile, readdir, getSystemProxy };
};

/**
 * Argument-aware execFile router. Matches on a substring of the joined args; first hit wins.
 * Keeps tests decoupled from the resolver's internal call sequencing.
 */
const routeExecFile = (
  execFile: jest.MockedFunction<any>,
  routes: Array<[string, { stdout: string; stderr?: string } | Error]>
) => {
  execFile.mockImplementation((file: string, args: string[]) => {
    const command = [file, ...args].join(' ');
    for (const [needle, response] of routes) {
      if (command.includes(needle)) {
        return response instanceof Error
          ? Promise.reject(response)
          : Promise.resolve({ stderr: '', ...response });
      }
    }
    return Promise.resolve({ stdout: '', stderr: '' });
  });
};

let originalEnv: typeof process.env;

beforeEach(() => {
  originalEnv = { ...process.env };
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = originalEnv;
});

describe('getSystemProxy — macOS', () => {
  it('detects manual HTTP/HTTPS proxy and bypass list from scutil', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('darwin');
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
        HTTPEnable : 1
        HTTPPort : 8080
        HTTPProxy : proxy.usebruno.com
        HTTPSEnable : 1
        HTTPSPort : 8443
        HTTPSProxy : secure-proxy.usebruno.com
        ExceptionsList : <array> {
          0 : localhost
          1 : 127.0.0.1
        }
      }`,
      stderr: ''
    });

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('macos-system');
  });

  it('merges env layer with system detection: env wins for http, system supplies pac_url', async () => {
    process.env.http_proxy = 'http://env-proxy.usebruno.com:9090';
    const { execFile, getSystemProxy } = loadForPlatform('darwin');
    execFile.mockResolvedValueOnce({
      stdout: `<dictionary> {
        HTTPEnable : 1
        HTTPPort : 8080
        HTTPProxy : sys-proxy.usebruno.com
        ProxyAutoConfigEnable : 1
        ProxyAutoConfigURLString : http://wpad.usebruno.com/proxy.pac
      }`,
      stderr: ''
    });

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://env-proxy.usebruno.com:9090');
    expect(result.pac_url).toBe('http://wpad.usebruno.com/proxy.pac');
    expect(result.source).toBe('macos-system + environment');
  });
});

describe('getSystemProxy — Linux', () => {
  it('detects manual proxy configuration from GNOME (gsettings)', async () => {
    const { execFile, existsSync, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false);
    routeExecFile(execFile, [
      ['org.gnome.system.proxy mode', { stdout: '\'manual\'' }],
      ['org.gnome.system.proxy.http host', { stdout: '\'proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.http port', { stdout: '8080' }],
      ['org.gnome.system.proxy.https host', { stdout: '\'secure-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.https port', { stdout: '8443' }],
      ['org.gnome.system.proxy ignore-hosts', { stdout: '[\'localhost\', \'127.0.0.1\']' }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('merges env layer with system detection: env wins for http, system supplies https + bypass', async () => {
    process.env.http_proxy = 'http://env-proxy.usebruno.com:9090';
    const { execFile, existsSync, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false);
    routeExecFile(execFile, [
      ['org.gnome.system.proxy mode', { stdout: '\'manual\'' }],
      ['org.gnome.system.proxy.http host', { stdout: '\'sys-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.http port', { stdout: '8080' }],
      ['org.gnome.system.proxy.https host', { stdout: '\'secure-proxy.usebruno.com\'' }],
      ['org.gnome.system.proxy.https port', { stdout: '8443' }],
      ['org.gnome.system.proxy ignore-hosts', { stdout: '[\'localhost\', \'127.0.0.1\']' }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://env-proxy.usebruno.com:9090');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system + environment');
  });

  it('detects manual proxy configuration from KDE (kreadconfig5)', async () => {
    const { execFile, existsSync, getSystemProxy } = loadForPlatform('linux');
    existsSync.mockReturnValue(false);
    execFile.mockImplementation((file: string, args: string[]) => {
      const fullCommand = [file, ...args].join(' ');
      if (fullCommand.includes('gsettings')) {
        return Promise.reject(new Error('gsettings not available'));
      }
      if (fullCommand.includes('kreadconfig5')) {
        const lowerArgs = args.join(' ').toLowerCase();
        if (lowerArgs.includes('proxytype')) return Promise.resolve({ stdout: '1', stderr: '' });
        if (lowerArgs.includes('httpproxy')) return Promise.resolve({ stdout: 'http://proxy.usebruno.com:8080', stderr: '' });
        if (lowerArgs.includes('httpsproxy')) return Promise.resolve({ stdout: 'http://secure-proxy.usebruno.com:8443', stderr: '' });
        if (lowerArgs.includes('noproxyfor')) return Promise.resolve({ stdout: 'localhost,127.0.0.1', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://secure-proxy.usebruno.com:8443');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('detects proxy from /etc/environment', async () => {
    const { execFile, existsSync, readFile, getSystemProxy } = loadForPlatform('linux');
    execFile.mockImplementation(() => Promise.reject(new Error('gsettings / kreadconfig5 not available')));
    existsSync.mockReturnValueOnce(true);
    readFile.mockResolvedValueOnce(`
      http_proxy=http://proxy.usebruno.com:8080
      https_proxy=http://proxy.usebruno.com:8080
      no_proxy=localhost,127.0.0.1
    `);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.no_proxy).toBe('localhost,127.0.0.1');
    expect(result.source).toBe('linux-system');
  });

  it('detects proxy from systemd system.conf.d', async () => {
    const { execFile, existsSync, readFile, readdir, getSystemProxy } = loadForPlatform('linux');
    execFile.mockImplementation(() => Promise.reject(new Error('gsettings / kreadconfig5 not available')));
    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    readdir.mockResolvedValueOnce(['proxy.conf']);
    readFile.mockResolvedValueOnce(`
      http_proxy=http://proxy.usebruno.com:8080
      https_proxy=http://proxy.usebruno.com:8443
    `);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8443');
    expect(result.source).toBe('linux-system');
  });
});

describe('getSystemProxy — Windows', () => {
  it('detects proxy from Internet Options registry and normalizes semicolons/<local>', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('win32');
    routeExecFile(execFile, [
      ['Internet Settings', {
        stdout: `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ    proxy.usebruno.com:8080
    ProxyOverride    REG_SZ    localhost;127.0.0.1;<local>
`
      }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.no_proxy).toBe('localhost,127.0.0.1,<local>');
    expect(result.source).toBe('windows-system');
  });

  it('ignores lingering registry values when ProxyEnable is 0x0', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('win32');
    routeExecFile(execFile, [
      ['Internet Settings', {
        stdout: `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x0
    ProxyServer    REG_SZ    stale-proxy.usebruno.com:8080
`
      }],
      ['winhttp', { stdout: 'Direct access (no proxy server).' }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBeNull();
    expect(result.https_proxy).toBeNull();
  });

  it('falls back to WinHTTP when registry access fails', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('win32');
    routeExecFile(execFile, [
      ['Internet Settings', new Error('Registry access denied')],
      ['winhttp', {
        stdout: `
Current WinHTTP proxy settings:
    Proxy Server(s) :  proxy.usebruno.com:8080
    Bypass List     :  localhost
`
      }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.no_proxy).toBe('localhost');
    expect(result.source).toBe('windows-system');
  });

  it('detects system-wide env vars from HKLM Session Manager Environment', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('win32');
    routeExecFile(execFile, [
      ['Internet Settings', { stdout: '' }],
      ['winhttp', { stdout: 'Direct access (no proxy server).' }],
      ['Session Manager\\Environment', {
        stdout: `
HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment
    HTTP_PROXY    REG_SZ    http://proxy.usebruno.com:8080
    HTTPS_PROXY    REG_SZ    http://proxy.usebruno.com:8443
`
      }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://proxy.usebruno.com:8080');
    expect(result.https_proxy).toBe('http://proxy.usebruno.com:8443');
    expect(result.source).toBe('windows-system');
  });

  it('detects user env vars from HKCU Environment and handles case-insensitive keys', async () => {
    const { execFile, getSystemProxy } = loadForPlatform('win32');
    routeExecFile(execFile, [
      ['Internet Settings', { stdout: '' }],
      ['winhttp', { stdout: 'Direct access (no proxy server).' }],
      ['HKLM\\SYSTEM', { stdout: '' }],
      ['HKCU\\Environment', {
        stdout: `
HKEY_CURRENT_USER\\Environment
    http_proxy    REG_SZ    http://user-proxy.usebruno.com:8080
`
      }]
    ]);

    const result = await getSystemProxy();

    expect(result.http_proxy).toBe('http://user-proxy.usebruno.com:8080');
    expect(result.source).toBe('windows-system');
  });
});
