import { sanitizeUrl, transformUrl, brunoToPostman } from '../../src/postman/bruno-to-postman';
import postmanToBruno from '../../src/postman/postman-to-bruno';

describe('transformUrl', () => {
  it('should handle basic URL with path variables', () => {
    const url = 'https://example.com/{{username}}/api/resource/:id';
    const params = [
      { name: 'id', value: '123', type: 'path' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/{{username}}/api/resource/:id',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['{{username}}', 'api', 'resource', ':id'],
      query: [],
      variable: [
        { key: 'id', value: '123' }
      ]
    });
  });

  it('should handle URL with query parameters', () => {
    const url = 'https://example.com/api/resource?limit=10&offset=20';
    const params = [
      { name: 'limit', value: '10', type: 'query' },
      { name: 'offset', value: '20', type: 'query' }
    ];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'https://example.com/api/resource?limit=10&offset=20',
      protocol: 'https',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [
        { key: 'limit', value: '10' },
        { key: 'offset', value: '20' }
      ],
      variable: []
    });
  });

  it('should handle URL without protocol', () => {
    const url = 'example.com/api/resource';
    const params = [];

    const result = transformUrl(url, params);

    expect(result).toEqual({
      raw: 'example.com/api/resource',
      protocol: '',
      host: ['example', 'com'],
      path: ['api', 'resource'],
      query: [],
      variable: []
    });
  });
});

describe('sanitizeUrl', () => {
  it('should replace backslashes with slashes', () => {
    const input = 'http:\\\\example.com\\path\\to\\file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should collapse multiple slashes into a single slash', () => {
    const input = 'http://example.com//path///to////file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });

  it('should handle URLs with mixed slashes', () => {
    const input = 'http:\\example.com//path\\to//file';
    const expected = 'http://example.com/path/to/file';
    expect(sanitizeUrl(input)).toBe(expected);
  });
});

describe('brunoToPostman null checks and fallbacks', () => {
  it('should handle null or undefined headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([]);
  });

  it('should handle null or undefined items in headers', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            headers: [
              { name: null, value: 'test-value', enabled: true },
              { name: 'Content-Type', value: null, enabled: true }
            ]
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.header).toEqual([
      { key: '', value: 'test-value', disabled: false, type: 'default' },
      { key: 'Content-Type', value: '', disabled: false, type: 'default' }
    ]);
  });

  it('should handle null or undefined body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should not have body property since we're checking for body before adding it
    expect(result.item[0].request.body).toBeUndefined();
  });

  it('should handle null or undefined body mode', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: {}
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    // Should use default raw mode for undefined body mode
    expect(result.item[0].request.body).toEqual({
      mode: 'raw',
      raw: ''
    });
  });

  it('should handle null or undefined formUrlEncoded array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'urlencoded',
      urlencoded: []
    });
  });

  it('should handle null or undefined multipartForm array', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: null
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: []
    });
  });

  it('should handle null or undefined items in form data', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'formUrlEncoded',
              formUrlEncoded: [
                { name: null, value: 'test-value', enabled: true },
                { name: 'field', value: null, enabled: true }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.urlencoded).toEqual([
      { key: '', value: 'test-value', disabled: false, type: 'default' },
      { key: 'field', value: '', disabled: false, type: 'default' }
    ]);
  });

  it('should handle null or undefined method', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            url: 'https://example.com',
            method: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.method).toBe('GET');
  });

  it('should handle null or undefined url', () => {
    // Mock console.error to prevent it from logging during test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.raw).toBe('');
  });

  it('should handle null or undefined params', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            params: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.url.variable).toEqual([]);
  });

  it('should handle null or undefined docs', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            docs: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.description).toBe('');
  });

  it('should handle null or undefined folder name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: null,
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Folder');
  });

  it('should handle null or undefined request name', () => {
    const simpleCollection = {
      items: [
        {
          type: 'http-request',
          name: null,
          request: {
            method: 'GET',
            url: 'https://example.com'
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].name).toBe('Untitled Request');
  });

  it('should handle null or undefined folder items', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          items: null
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].item).toEqual([]);
  });

  it('should handle null or undefined auth object', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: null
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({ type: 'noauth' });
  });

  it('should handle missing token in bearer auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'bearer',
              bearer: { token: null }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'bearer',
      bearer: {
        key: 'token',
        value: '',
        type: 'string'
      }
    });
  });

  it('should handle missing username/password in basic auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'basic',
              basic: { username: null, password: undefined }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'basic',
      basic: [
        {
          key: 'password',
          value: '',
          type: 'string'
        },
        {
          key: 'username',
          value: '',
          type: 'string'
        }
      ]
    });
  });

  it('should handle missing key/value in apikey auth', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            auth: {
              mode: 'apikey',
              apikey: { key: null, value: undefined }
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.auth).toEqual({
      type: 'apikey',
      apikey: [
        {
          key: 'key',
          value: '',
          type: 'string'
        },
        {
          key: 'value',
          value: '',
          type: 'string'
        },
        {
          key: 'in',
          value: 'header',
          type: 'string'
        }
      ]
    });
  });
});

describe('brunoToPostman auth handling', () => {
  const wrap = (auth) => ({
    items: [
      {
        name: 'Test Request',
        type: 'http-request',
        request: { method: 'GET', url: 'https://example.com', auth }
      }
    ]
  });

  it('should export apikey placement=queryparams as in=query', () => {
    const result = brunoToPostman(wrap({
      mode: 'apikey',
      apikey: { key: 'X-Api-Key', value: 'secret', placement: 'queryparams' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'apikey',
      apikey: [
        { key: 'key', value: 'X-Api-Key', type: 'string' },
        { key: 'value', value: 'secret', type: 'string' },
        { key: 'in', value: 'query', type: 'string' }
      ]
    });
  });

  it('should export awsv4 auth with all fields', () => {
    const result = brunoToPostman(wrap({
      mode: 'awsv4',
      awsv4: {
        accessKeyId: 'AKIA',
        secretAccessKey: 'shh',
        sessionToken: 'sess',
        service: 's3',
        region: 'us-east-1',
        profileName: ''
      }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'awsv4',
      awsv4: [
        { key: 'accessKey', value: 'AKIA', type: 'string' },
        { key: 'secretKey', value: 'shh', type: 'string' },
        { key: 'sessionToken', value: 'sess', type: 'string' },
        { key: 'service', value: 's3', type: 'string' },
        { key: 'region', value: 'us-east-1', type: 'string' }
      ]
    });
  });

  it('should export awsv4 with empty fields when values missing', () => {
    const result = brunoToPostman(wrap({ mode: 'awsv4', awsv4: {} }));
    expect(result.item[0].request.auth.awsv4).toEqual([
      { key: 'accessKey', value: '', type: 'string' },
      { key: 'secretKey', value: '', type: 'string' },
      { key: 'sessionToken', value: '', type: 'string' },
      { key: 'service', value: '', type: 'string' },
      { key: 'region', value: '', type: 'string' }
    ]);
  });

  it('should export digest auth', () => {
    const result = brunoToPostman(wrap({
      mode: 'digest',
      digest: { username: 'user', password: 'pass' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'digest',
      digest: [
        { key: 'username', value: 'user', type: 'string' },
        { key: 'password', value: 'pass', type: 'string' }
      ]
    });
  });

  it('should export ntlm auth with domain', () => {
    const result = brunoToPostman(wrap({
      mode: 'ntlm',
      ntlm: { username: 'user', password: 'pass', domain: 'CORP' }
    }));
    expect(result.item[0].request.auth).toEqual({
      type: 'ntlm',
      ntlm: [
        { key: 'username', value: 'user', type: 'string' },
        { key: 'password', value: 'pass', type: 'string' },
        { key: 'domain', value: 'CORP', type: 'string' }
      ]
    });
  });

  it('should export oauth1 with header placement', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth1',
      oauth1: {
        consumerKey: 'ck',
        consumerSecret: 'cs',
        accessToken: 'at',
        accessTokenSecret: 'ats',
        callbackUrl: 'https://cb.example',
        verifier: 'v',
        signatureMethod: 'HMAC-SHA256',
        privateKey: null,
        privateKeyType: 'text',
        timestamp: '1700000000',
        nonce: 'n1',
        version: '1.0',
        realm: 'r',
        placement: 'header',
        includeBodyHash: true
      }
    }));
    expect(result.item[0].request.auth.type).toBe('oauth1');
    expect(result.item[0].request.auth.oauth1).toEqual([
      { key: 'consumerKey', value: 'ck', type: 'string' },
      { key: 'consumerSecret', value: 'cs', type: 'string' },
      { key: 'token', value: 'at', type: 'string' },
      { key: 'tokenSecret', value: 'ats', type: 'string' },
      { key: 'callback', value: 'https://cb.example', type: 'string' },
      { key: 'verifier', value: 'v', type: 'string' },
      { key: 'signatureMethod', value: 'HMAC-SHA256', type: 'string' },
      { key: 'privateKey', value: '', type: 'string' },
      { key: 'timestamp', value: '1700000000', type: 'string' },
      { key: 'nonce', value: 'n1', type: 'string' },
      { key: 'version', value: '1.0', type: 'string' },
      { key: 'realm', value: 'r', type: 'string' },
      { key: 'addParamsToHeader', value: true, type: 'boolean' },
      { key: 'includeBodyHash', value: true, type: 'boolean' }
    ]);
  });

  it('should invert oauth1 query placement to addParamsToHeader=false', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth1',
      oauth1: { placement: 'query' }
    }));
    const addParams = result.item[0].request.auth.oauth1.find((p) => p.key === 'addParamsToHeader');
    expect(addParams).toEqual({ key: 'addParamsToHeader', value: false, type: 'boolean' });
  });

  it('should export oauth2 client_credentials grant', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth2',
      oauth2: {
        grantType: 'client_credentials',
        accessTokenUrl: 'https://token.example',
        refreshTokenUrl: '',
        clientId: 'cid',
        clientSecret: 'csec',
        scope: 'read',
        state: '',
        tokenPlacement: 'header',
        tokenHeaderPrefix: 'Bearer',
        credentialsPlacement: 'basic_auth_header'
      }
    }));
    expect(result.item[0].request.auth.type).toBe('oauth2');
    expect(result.item[0].request.auth.oauth2).toEqual([
      { key: 'grant_type', value: 'client_credentials', type: 'string' },
      { key: 'accessTokenUrl', value: 'https://token.example', type: 'string' },
      { key: 'refreshTokenUrl', value: '', type: 'string' },
      { key: 'clientId', value: 'cid', type: 'string' },
      { key: 'clientSecret', value: 'csec', type: 'string' },
      { key: 'scope', value: 'read', type: 'string' },
      { key: 'state', value: '', type: 'string' },
      { key: 'addTokenTo', value: 'header', type: 'string' },
      { key: 'headerPrefix', value: 'Bearer', type: 'string' },
      { key: 'client_authentication', value: 'basic_auth_header', type: 'string' }
    ]);
  });

  it('should export oauth2 authorization_code with pkce=true as authorization_code_with_pkce', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth2',
      oauth2: {
        grantType: 'authorization_code',
        pkce: true,
        authorizationUrl: 'https://auth.example',
        callbackUrl: 'https://cb.example',
        accessTokenUrl: 'https://token.example',
        clientId: 'cid',
        clientSecret: 'csec',
        credentialsPlacement: 'body',
        tokenPlacement: 'url'
      }
    }));
    const oauth2 = result.item[0].request.auth.oauth2;
    expect(oauth2.find((p) => p.key === 'grant_type').value).toBe('authorization_code_with_pkce');
    expect(oauth2.find((p) => p.key === 'authUrl').value).toBe('https://auth.example');
    expect(oauth2.find((p) => p.key === 'redirect_uri').value).toBe('https://cb.example');
    expect(oauth2.find((p) => p.key === 'addTokenTo').value).toBe('url');
    expect(oauth2.find((p) => p.key === 'client_authentication').value).toBe('body');
  });

  it('should export oauth2 authorization_code without pkce as authorization_code', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth2',
      oauth2: { grantType: 'authorization_code', pkce: false }
    }));
    const grant = result.item[0].request.auth.oauth2.find((p) => p.key === 'grant_type');
    expect(grant.value).toBe('authorization_code');
  });

  it('should export oauth2 password grant as password_credentials', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth2',
      oauth2: {
        grantType: 'password',
        username: 'u',
        password: 'p'
      }
    }));
    const oauth2 = result.item[0].request.auth.oauth2;
    expect(oauth2.find((p) => p.key === 'grant_type').value).toBe('password_credentials');
    expect(oauth2.find((p) => p.key === 'username').value).toBe('u');
    expect(oauth2.find((p) => p.key === 'password').value).toBe('p');
  });

  it('should export oauth2 implicit grant with authUrl and redirect_uri', () => {
    const result = brunoToPostman(wrap({
      mode: 'oauth2',
      oauth2: {
        grantType: 'implicit',
        authorizationUrl: 'https://auth.example',
        callbackUrl: 'https://cb.example'
      }
    }));
    const oauth2 = result.item[0].request.auth.oauth2;
    expect(oauth2.find((p) => p.key === 'grant_type').value).toBe('implicit');
    expect(oauth2.find((p) => p.key === 'authUrl').value).toBe('https://auth.example');
    expect(oauth2.find((p) => p.key === 'redirect_uri').value).toBe('https://cb.example');
  });

  it('should fall back to noauth for unmapped modes (wsse, inherit)', () => {
    expect(brunoToPostman(wrap({ mode: 'wsse', wsse: {} })).item[0].request.auth)
      .toEqual({ type: 'noauth' });
    expect(brunoToPostman(wrap({ mode: 'inherit' })).item[0].request.auth)
      .toEqual({ type: 'noauth' });
  });
});

describe('brunoToPostman auth round-trip (postman → bruno → postman)', () => {
  const roundTrip = async (postmanAuth) => {
    const postmanCollection = {
      info: { name: 'Test', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [
        {
          name: 'Req',
          request: { method: 'GET', url: 'https://example.com', auth: postmanAuth }
        }
      ]
    };
    const { collection } = await postmanToBruno(postmanCollection);
    const exported = brunoToPostman(collection);
    return exported.item[0].request.auth;
  };

  it('round-trips awsv4 auth', async () => {
    const result = await roundTrip({
      type: 'awsv4',
      awsv4: [
        { key: 'accessKey', value: 'AKIA', type: 'string' },
        { key: 'secretKey', value: 'shh', type: 'string' },
        { key: 'sessionToken', value: 'sess', type: 'string' },
        { key: 'service', value: 's3', type: 'string' },
        { key: 'region', value: 'us-east-1', type: 'string' }
      ]
    });
    expect(result.type).toBe('awsv4');
    expect(result.awsv4).toEqual([
      { key: 'accessKey', value: 'AKIA', type: 'string' },
      { key: 'secretKey', value: 'shh', type: 'string' },
      { key: 'sessionToken', value: 'sess', type: 'string' },
      { key: 'service', value: 's3', type: 'string' },
      { key: 'region', value: 'us-east-1', type: 'string' }
    ]);
  });

  it('round-trips digest auth', async () => {
    const result = await roundTrip({
      type: 'digest',
      digest: [
        { key: 'username', value: 'user', type: 'string' },
        { key: 'password', value: 'pass', type: 'string' }
      ]
    });
    expect(result).toEqual({
      type: 'digest',
      digest: [
        { key: 'username', value: 'user', type: 'string' },
        { key: 'password', value: 'pass', type: 'string' }
      ]
    });
  });

  it('round-trips oauth1 with query placement', async () => {
    const result = await roundTrip({
      type: 'oauth1',
      oauth1: [
        { key: 'consumerKey', value: 'ck', type: 'string' },
        { key: 'consumerSecret', value: 'cs', type: 'string' },
        { key: 'token', value: 'at', type: 'string' },
        { key: 'tokenSecret', value: 'ats', type: 'string' },
        { key: 'signatureMethod', value: 'HMAC-SHA1', type: 'string' },
        { key: 'version', value: '1.0', type: 'string' },
        { key: 'addParamsToHeader', value: false, type: 'boolean' }
      ]
    });
    expect(result.type).toBe('oauth1');
    const addParams = result.oauth1.find((p) => p.key === 'addParamsToHeader');
    expect(addParams.value).toBe(false);
    expect(result.oauth1.find((p) => p.key === 'consumerKey').value).toBe('ck');
    expect(result.oauth1.find((p) => p.key === 'token').value).toBe('at');
  });

  it('round-trips oauth2 authorization_code_with_pkce', async () => {
    const result = await roundTrip({
      type: 'oauth2',
      oauth2: [
        { key: 'grant_type', value: 'authorization_code_with_pkce', type: 'string' },
        { key: 'authUrl', value: 'https://auth.example', type: 'string' },
        { key: 'accessTokenUrl', value: 'https://token.example', type: 'string' },
        { key: 'redirect_uri', value: 'https://cb.example', type: 'string' },
        { key: 'clientId', value: 'cid', type: 'string' },
        { key: 'clientSecret', value: 'csec', type: 'string' },
        { key: 'scope', value: 'read', type: 'string' },
        { key: 'addTokenTo', value: 'header', type: 'string' },
        { key: 'client_authentication', value: 'body', type: 'string' }
      ]
    });
    expect(result.type).toBe('oauth2');
    expect(result.oauth2.find((p) => p.key === 'grant_type').value).toBe('authorization_code_with_pkce');
    expect(result.oauth2.find((p) => p.key === 'authUrl').value).toBe('https://auth.example');
    expect(result.oauth2.find((p) => p.key === 'redirect_uri').value).toBe('https://cb.example');
    expect(result.oauth2.find((p) => p.key === 'client_authentication').value).toBe('body');
  });

  it('round-trips oauth2 password_credentials', async () => {
    const result = await roundTrip({
      type: 'oauth2',
      oauth2: [
        { key: 'grant_type', value: 'password_credentials', type: 'string' },
        { key: 'accessTokenUrl', value: 'https://token.example', type: 'string' },
        { key: 'clientId', value: 'cid', type: 'string' },
        { key: 'clientSecret', value: 'csec', type: 'string' },
        { key: 'username', value: 'u', type: 'string' },
        { key: 'password', value: 'p', type: 'string' }
      ]
    });
    expect(result.oauth2.find((p) => p.key === 'grant_type').value).toBe('password_credentials');
    expect(result.oauth2.find((p) => p.key === 'username').value).toBe('u');
    expect(result.oauth2.find((p) => p.key === 'password').value).toBe('p');
  });

  it('round-trips apikey with query placement', async () => {
    const result = await roundTrip({
      type: 'apikey',
      apikey: [
        { key: 'key', value: 'X-Api-Key', type: 'string' },
        { key: 'value', value: 'secret', type: 'string' },
        { key: 'in', value: 'query', type: 'string' }
      ]
    });
    expect(result).toEqual({
      type: 'apikey',
      apikey: [
        { key: 'key', value: 'X-Api-Key', type: 'string' },
        { key: 'value', value: 'secret', type: 'string' },
        { key: 'in', value: 'query', type: 'string' }
      ]
    });
  });
});

describe('brunoToPostman multipartForm handling', () => {
  it('should export file type with type: file and src field', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: ['/path/to/file1.txt', '/path/to/file2.txt'],
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          key: 'myFile',
          src: ['/path/to/file1.txt', '/path/to/file2.txt'],
          disabled: false,
          type: 'file'
        }
      ]
    });
  });

  it('should export text type with type: text and value field', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myField',
                  value: 'some text value',
                  type: 'text',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          key: 'myField',
          value: 'some text value',
          disabled: false,
          type: 'text'
        }
      ]
    });
  });

  it('should export contentType when specified', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: ['/path/to/file.json'],
                  type: 'file',
                  contentType: 'application/json',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          key: 'myFile',
          src: '/path/to/file.json',
          disabled: false,
          type: 'file',
          contentType: 'application/json'
        }
      ]
    });
  });

  it('should handle mixed file and text fields', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'textField',
                  value: 'hello',
                  type: 'text',
                  enabled: true
                },
                {
                  name: 'fileField',
                  value: ['/path/to/file.txt'],
                  type: 'file',
                  enabled: false
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body).toEqual({
      mode: 'formdata',
      formdata: [
        {
          key: 'textField',
          value: 'hello',
          disabled: false,
          type: 'text'
        },
        {
          key: 'fileField',
          src: '/path/to/file.txt',
          disabled: true,
          type: 'file'
        }
      ]
    });
  });

  it('should handle file type with string value (not array)', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: '/single/file/path.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.formdata[0]).toEqual({
      key: 'myFile',
      src: '/single/file/path.txt',
      disabled: false,
      type: 'file'
    });
  });

  it('should handle file type with empty value', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'myFile',
                  value: '',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].request.body.formdata[0]).toEqual({
      key: 'myFile',
      src: null,
      disabled: false,
      type: 'file'
    });
  });
});

describe('brunoToPostman protocolProfileBehavior handling', () => {
  it('should add disableBodyPruning for GET requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'GET with body',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'file',
                  value: '/path/to/file.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toEqual({
      disableBodyPruning: true
    });
  });

  it('should not add protocolProfileBehavior for POST requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'POST with body',
          type: 'http-request',
          request: {
            method: 'POST',
            url: 'https://example.com',
            body: {
              mode: 'multipartForm',
              multipartForm: [
                {
                  name: 'file',
                  value: '/path/to/file.txt',
                  type: 'file',
                  enabled: true
                }
              ]
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toBeUndefined();
  });

  it('should not add protocolProfileBehavior for GET requests without body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'GET without body',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com'
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toBeUndefined();
  });

  it('should add disableBodyPruning for HEAD requests with body', () => {
    const simpleCollection = {
      items: [
        {
          name: 'HEAD with body',
          type: 'http-request',
          request: {
            method: 'HEAD',
            url: 'https://example.com',
            body: {
              mode: 'json',
              json: '{"test": true}'
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.item[0].protocolProfileBehavior).toEqual({
      disableBodyPruning: true
    });
  });
});

describe('brunoToPostman event handling', () => {
  it('should generate events for request scripts (req/res)', () => {
    const simpleCollection = {
      items: [
        {
          name: 'Test Request',
          type: 'http-request',
          request: {
            method: 'GET',
            url: 'https://example.com',
            script: {
              req: 'console.log("pre");',
              res: 'console.log("post");'
            }
          }
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const events = result.item[0].event;

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ listen: 'prerequest', script: { exec: ['console.log("pre");'] } });
    expect(events[1]).toMatchObject({ listen: 'test', script: { exec: ['console.log("post");'] } });
  });

  it('should generate events for folder scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Test Folder',
          script: {
            req: 'console.log("folder pre");',
            res: 'console.log("folder post");'
          },
          items: []
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];

    expect(folder.name).toBe('Test Folder');
    expect(folder.event).toHaveLength(2);
    expect(folder.event[0].listen).toBe('prerequest');
    expect(folder.event[1].listen).toBe('test');
  });

  it('should generate collection-level events from root', () => {
    const simpleCollection = {
      root: {
        script: {
          req: 'console.log("collection pre");',
          res: 'console.log("collection post");'
        }
      },
      items: []
    };

    const result = brunoToPostman(simpleCollection);
    expect(result.event).toHaveLength(2);
    expect(result.event[0].listen).toBe('prerequest');
    expect(result.event[1].listen).toBe('test');
  });

  it('should handle nested folders and requests with scripts', () => {
    const simpleCollection = {
      items: [
        {
          type: 'folder',
          name: 'Parent Folder',
          items: [
            {
              type: 'http-request',
              name: 'Nested Request',
              request: {
                method: 'GET',
                url: 'https://example.com',
                script: { req: 'console.log("nested pre");' }
              }
            }
          ]
        }
      ]
    };

    const result = brunoToPostman(simpleCollection);
    const folder = result.item[0];
    const nestedRequest = folder.item[0];

    expect(folder.name).toBe('Parent Folder');
    expect(nestedRequest.name).toBe('Nested Request');
    expect(nestedRequest.event).toHaveLength(1);
    expect(nestedRequest.event[0].listen).toBe('prerequest');
    expect(nestedRequest.event[0].script.exec).toEqual(['console.log("nested pre");']);
  });
});

describe('brunoToPostman item ordering', () => {
  const makeRequest = (name, seq) => ({
    type: 'http-request',
    name,
    seq,
    request: {
      method: 'GET',
      url: 'https://example.com',
      headers: [],
      params: [],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    }
  });

  const makeFolder = (name, seq, items = []) => ({
    type: 'folder',
    name,
    seq,
    items
  });

  it('should place folders before requests in export output', () => {
    const collection = {
      items: [
        makeRequest('Request A', 1),
        makeFolder('Folder B'),
        makeRequest('Request C', 2),
        makeFolder('Folder A')
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    // Folders first (alphabetical since no seq), then requests (by seq)
    expect(names[0]).toBe('Folder A');
    expect(names[1]).toBe('Folder B');
    expect(names[2]).toBe('Request A');
    expect(names[3]).toBe('Request C');
  });

  it('should sort requests by seq ascending', () => {
    const collection = {
      items: [
        makeRequest('Third', 3),
        makeRequest('First', 1),
        makeRequest('Second', 2)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    expect(names).toEqual(['First', 'Second', 'Third']);
  });

  it('should sort folders by name then sequence', () => {
    const collection = {
      items: [
        makeFolder('Gamma', undefined),
        makeFolder('Alpha', undefined),
        makeFolder('Beta', 1)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    // Beta has seq=1, so it goes to position 0; Alpha and Gamma are alphabetical
    expect(names[0]).toBe('Beta');
    expect(names[1]).toBe('Alpha');
    expect(names[2]).toBe('Gamma');
  });

  it('should sort items recursively within nested folders', () => {
    const collection = {
      items: [
        makeFolder('Parent', 1, [
          makeRequest('Nested C', 3),
          makeFolder('Nested Folder', 1),
          makeRequest('Nested A', 1)
        ])
      ]
    };

    const result = brunoToPostman(collection);
    const parent = result.item[0];
    const nestedNames = parent.item.map((i) => i.name);

    // Folder first, then requests sorted by seq
    expect(nestedNames).toEqual(['Nested Folder', 'Nested A', 'Nested C']);
  });

  it('should handle folders without seq (older collections) alphabetically', () => {
    const collection = {
      items: [
        makeFolder('Zebra', undefined),
        makeFolder('Apple', undefined),
        makeFolder('Mango', undefined)
      ]
    };

    const result = brunoToPostman(collection);
    const names = result.item.map((i) => i.name);

    expect(names).toEqual(['Apple', 'Mango', 'Zebra']);
  });
});
