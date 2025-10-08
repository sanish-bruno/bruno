// Bruno API Reference for context (based on actual Bruno source code)
const BRUNO_API_REFERENCE = {
  variables: {
    set: 'bru.setVar("key", value)',
    get: 'bru.getVar("key")',
    delete: 'bru.deleteVar("key")',
    deleteAll: 'bru.deleteAllVars()',
    has: 'bru.hasVar("key")'
  },
  environment: {
    get: 'bru.getEnvVar("key")',
    set: 'bru.setEnvVar("key", "value")',
    delete: 'bru.deleteEnvVar("key")',
    has: 'bru.hasEnvVar("key")',
    getGlobal: 'bru.getGlobalEnvVar("key")',
    setGlobal: 'bru.setGlobalEnvVar("key", "value")',
    getOauth2: 'bru.getOauth2CredentialVar("key")'
  },
  request: {
    // Request object methods (req.*)
    getUrl: 'req.getUrl()',
    setUrl: 'req.setUrl("https://api.example.com/endpoint")',
    getMethod: 'req.getMethod()',
    setMethod: 'req.setMethod("GET|POST|PUT|DELETE|PATCH")',
    getHeaders: 'req.getHeaders()',
    setHeaders: 'req.setHeaders({})',
    getHeader: 'req.getHeader("name")',
    setHeader: 'req.setHeader("name", "value")',
    getBody: 'req.getBody()',
    setBody: 'req.setBody(data)',
    getTimeout: 'req.getTimeout()',
    setTimeout: 'req.setTimeout(5000)',
    setMaxRedirects: 'req.setMaxRedirects(5)',
    onFail: 'req.onFail(callback)',
    getName: 'req.getName()',
    getTags: 'req.getTags()',
    getAuthMode: 'req.getAuthMode()'
  },
  response: {
    // Response object methods (res.*)
    getStatus: 'res.getStatus()',
    getStatusText: 'res.getStatusText()',
    getHeaders: 'res.getHeaders()',
    getHeader: 'res.getHeader("name")',
    getBody: 'res.getBody()',
    setBody: 'res.setBody(data)',
    getResponseTime: 'res.getResponseTime()',
    getUrl: 'res.getUrl()',
    getSize: 'res.getSize()',
    getDataBuffer: 'res.getDataBuffer()',
    // Response is callable for JSON querying
    json: 'res.json() or res("path.to.value")',
    text: 'res.text()'
  },
  assertions: {
    // Bruno uses Chai for assertions - model should know Chai syntax
    expect: 'expect(value).to.equal(expected)',
    assert: 'assert.equal(actual, expected, "message")'
  },
  test: {
    // Bruno test function
    test: 'test("description", function() { /* test code */ })'
  },
  runner: {
    skipRequest: 'bru.runner.skipRequest()',
    stopExecution: 'bru.runner.stopExecution()',
    setNextRequest: 'bru.runner.setNextRequest("requestName")'
  },
  cookies: {
    jar: 'bru.cookies.jar()',
    getCookie: 'bru.cookies.jar().getCookie(url, name, callback)',
    getCookies: 'bru.cookies.jar().getCookies(url, callback)',
    setCookie: 'bru.cookies.jar().setCookie(url, name, value, callback)',
    setCookies: 'bru.cookies.jar().setCookies(url, cookies, callback)',
    clear: 'bru.cookies.jar().clear(callback)',
    deleteCookies: 'bru.cookies.jar().deleteCookies(url, callback)',
    deleteCookie: 'bru.cookies.jar().deleteCookie(url, name, callback)'
  },
  utilities: {
    sleep: 'bru.sleep(ms)',
    cwd: 'bru.cwd()',
    getCollectionName: 'bru.getCollectionName()',
    getEnvName: 'bru.getEnvName()',
    getProcessEnv: 'bru.getProcessEnv("key")',
    interpolate: 'bru.interpolate(stringOrObject)',
    sendRequest: 'bru.sendRequest(request, callback)'
  },
  console: {
    log: 'console.log(...args)',
    error: 'console.error(...args)',
    warn: 'console.warn(...args)',
    info: 'console.info(...args)'
  }
};

// Postman to Bruno API mappings (corrected based on actual Bruno APIs)
const POSTMAN_TO_BRUNO_MAPPINGS = {
  'pm.environment.set': 'bru.setEnvVar',
  'pm.environment.get': 'bru.getEnvVar',
  'pm.collectionVariables.set': 'bru.setVar',
  'pm.collectionVariables.get': 'bru.getVar',
  'pm.request.headers.set': 'req.setHeader',
  'pm.request.headers.get': 'req.getHeader',
  'pm.request.body.raw': 'req.setBody',
  'pm.response.json': 'res.json()',
  'pm.response.text': 'res.getBody()',
  'pm.response.code': 'res.getStatus()',
  'pm.response.status': 'res.getStatus()',
  'pm.response.headers': 'res.getHeaders()',
  'pm.response.getHeader': 'res.getHeader',
  'pm.response.time': 'res.getResponseTime()',
  'pm.test': 'test',
  'pm.expect': 'expect',
  'pm.globals.set': 'bru.setVar',
  'pm.globals.get': 'bru.getVar',
  'pm.variables.set': 'bru.setVar',
  'pm.variables.get': 'bru.getVar',
  'pm.info.requestName': 'req.getName()',
  'pm.info.requestId': 'req.getName()',
  'pm.request.url': 'req.getUrl()',
  'pm.request.method': 'req.getMethod()',
  'pm.response.responseTime': 'res.getResponseTime()',
  'pm.response.responseSize': 'res.getSize()'
};

// Context cache to avoid regenerating prompts
const contextCache = new Map();

function getBrunoApiContext(scriptType, isConversion = false) {
  const cacheKey = `${scriptType}-${isConversion}`;

  if (contextCache.has(cacheKey)) {
    return contextCache.get(cacheKey);
  }

  let context = `You are Paw Assist, an AI helper inside Bruno (an API client).
Output only JavaScript code suitable for Bruno's scripting environment.

BRUNO API REFERENCE:
Variables: ${BRUNO_API_REFERENCE.variables.set}, ${BRUNO_API_REFERENCE.variables.get}
Environment: ${BRUNO_API_REFERENCE.environment.set}, ${BRUNO_API_REFERENCE.environment.get}
Request: ${BRUNO_API_REFERENCE.request.setHeader}, ${BRUNO_API_REFERENCE.request.setBody}
Response: ${BRUNO_API_REFERENCE.response.getStatus}, ${BRUNO_API_REFERENCE.response.json}
Assertions: ${BRUNO_API_REFERENCE.assertions.expect}, ${BRUNO_API_REFERENCE.assertions.assert}
Test: ${BRUNO_API_REFERENCE.test.test}
Console: ${BRUNO_API_REFERENCE.console.log}

CONTEXT:`;

  if (scriptType === 'pre') {
    context += `
PRE-REQUEST SCRIPT:
- Runs before sending the request
- Use bru.setVar() to set variables
- Use bru.setEnvVar() to set environment variables
- Use req.setHeader() to set request headers
- Use req.setBody() to set request body
- Use req.setMethod() to set HTTP method
- Use req.setUrl() to set request URL
- Use req.setTimeout() to set request timeout
- Use bru.getVar() to read variables
- Use bru.getEnvVar() to read environment variables
- Use bru.sleep() for delays
- Use bru.runner.skipRequest() to skip the request`;
  } else if (scriptType === 'post' || scriptType === 'test') {
    context += `
POST-RESPONSE/TEST SCRIPT:
- Runs after receiving the response
- Use res.getStatus() to get HTTP status code
- Use res.getHeaders() to get all response headers
- Use res.getHeader("name") to get specific header
- Use res.json() to parse JSON response body
- Use res.getBody() to get raw response body
- Use res.getResponseTime() to get response time
- Use res("path.to.value") to query JSON response
- Use expect() and assert() for assertions (Chai syntax)
- Use test("description", function() {}) for test cases
- Use bru.setVar() to save response data for later use
- Use console.log() for debugging`;
  }

  if (isConversion) {
    context += `

POSTMAN TO BRUNO CONVERSION:
Replace Postman APIs with Bruno equivalents:
${Object.entries(POSTMAN_TO_BRUNO_MAPPINGS).map(([postman, bruno]) => `- ${postman} → ${bruno}`).join('\n')}

CONVERSION RULES:
- pm.environment.* → bru.getEnvVar()/bru.setEnvVar()
- pm.collectionVariables.* → bru.getVar()/bru.setVar()
- pm.request.* → req.setHeader(), req.setBody(), etc.
- pm.response.* → res.getStatus(), res.json(), etc.
- pm.test() → test("description", function() {})
- pm.expect() → expect() (Chai syntax)
- pm.globals.* → bru.getVar()/bru.setVar()
- pm.variables.* → bru.getVar()/bru.setVar()`;
  }

  context += `

IMPORTANT:
- Output ONLY JavaScript code, no explanations
- Use proper Bruno API methods
- Include error handling where appropriate
- Use async/await for asynchronous operations
- Use try-catch for error handling`;

  contextCache.set(cacheKey, context);
  return context;
}

function buildConversionPrompt(postmanCode, contextType) {
  return `Convert this Postman ${contextType}-request script to Bruno syntax:

\`\`\`javascript
${postmanCode}
\`\`\`

Convert all pm.* APIs to Bruno equivalents and ensure the code works in Bruno's environment.`;
}

function getSystemPrompt(contextType, isConversion = false) {
  return getBrunoApiContext(contextType, isConversion);
}

// Build user prompt for script generation
function buildUserPrompt(userPrompt, scriptType, context = {}) {
  const { goal, vars, notes, expectations } = context;

  let prompt = userPrompt;

  if (scriptType === 'pre') {
    if (goal) prompt += `\n- Goal: ${goal}`;
    if (vars) prompt += `\n- Required variables: ${vars}`;
    if (notes) prompt += `\n- Notes: ${notes}`;
  } else if (scriptType === 'post' || scriptType === 'test') {
    if (expectations) prompt += `\n- Response expectations: ${expectations}`;
    if (vars) prompt += `\n- Variables to set: ${vars}`;
  }

  return prompt;
}

function extractJs(s) {
  const fence = s.match(/```(?:js|javascript)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return s.trim();
}

// Validate API key format (basic validation)
function validateApiKey(apiKey, provider) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Basic length and format validation
  if (apiKey.length < 10) {
    return false;
  }

  // Provider-specific validation could be added here
  switch (provider) {
    case 'deepseek':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    default:
      return true; // Unknown provider, basic validation only
  }
}

// Clear cache when needed (e.g., when Bruno API reference is updated)
function clearContextCache() {
  contextCache.clear();
}

module.exports = {
  getBrunoApiContext,
  buildConversionPrompt,
  getSystemPrompt,
  buildUserPrompt,
  extractJs,
  clearContextCache,
  validateApiKey,
  BRUNO_API_REFERENCE,
  POSTMAN_TO_BRUNO_MAPPINGS
};
