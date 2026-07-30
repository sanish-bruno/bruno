const { SCRIPT_PHASES } = require('@usebruno/common');
const { safeParseJSON } = require('./utils');
const { findHeaderValue } = require('./header-utils');
const GrpcMetadataList = require('./grpc-metadata-list');
const GrpcMessageList = require('./grpc-message-list');

const { BEFORE_CALL_START, BEFORE_MESSAGE_SEND, AFTER_MESSAGE_RECEIVE, AFTER_CALL_END } = SCRIPT_PHASES.GRPC;

const resolveGrpcAuth = (request) => {
  if (request.oauth2) return 'oauth2';
  const authHeader = findHeaderValue(request.headers, 'Authorization');
  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer')) return 'bearer';
    if (authHeader.startsWith('Basic')) return 'basic';
  }
  if (request.basicAuth?.username) return 'basic';
  if (request.apiKeyAuthValueForQueryParams) return 'apikey';
  if (request.apiKeyHeaderName && findHeaderValue(request.headers, request.apiKeyHeaderName) !== undefined) {
    return 'apikey';
  }
  if (findHeaderValue(request.headers, 'X-WSSE') !== undefined) return 'wsse';
  return 'none';
};

const buildMessageView = ({ data, timestamp }) => {
  const view = timestamp !== undefined ? { data, timestamp } : { data };
  return Object.freeze(view);
};

const baseRequestView = (request, { writableMetadata = false } = {}) => ({
  metadata: new GrpcMetadataList(request, { writable: writableMetadata }).expose(),
  url: request.url ?? null,
  method: request.method ?? null,
  methodType: request.methodType ?? null,
  authMode: resolveGrpcAuth(request)
});

const sentMessages = (entries) =>
  new GrpcMessageList({
    read: () => entries,
    parse: (entry) => safeParseJSON(entry?.content)
  }).expose();

const receivedMessages = (getResponses) =>
  new GrpcMessageList({ read: getResponses }).expose();

const trailers = (raw) =>
  new GrpcMetadataList({ headers: raw ?? {} }, { writable: false }).expose();

const phaseBuilders = new Map([
  [
    BEFORE_CALL_START.FIELD,
    (request) => ({
      request: {
        messages: sentMessages([]),
        ...baseRequestView(request, { writableMetadata: true })
      }
    })
  ],

  [
    BEFORE_MESSAGE_SEND.FIELD,
    (request, { message } = {}) => ({
      request: {
        message: buildMessageView({ data: message ?? null }),
        ...baseRequestView(request)
      }
    })
  ],

  [
    AFTER_MESSAGE_RECEIVE.FIELD,
    (request, { message, timestamp } = {}) => ({
      request: baseRequestView(request),
      response: {
        message: buildMessageView({ data: message ?? null, timestamp: timestamp ?? null })
      }
    })
  ],

  [
    AFTER_CALL_END.FIELD,
    (request, phaseData = {}) => {
      const { responses, statusCode, statusText, trailers: rawTrailers, sentMessages: raw, duration } = phaseData;
      return {
        request: {
          messages: sentMessages(raw ?? []),
          ...baseRequestView(request)
        },
        response: {
          messages: receivedMessages(() => responses),
          trailers: trailers(rawTrailers),
          statusCode: statusCode ?? null,
          statusText: statusText ?? null,
          duration: duration ?? null
        }
      };
    }
  ]
]);

/**
 * Build the phase-aware `bru.grpc` namespace for a gRPC script.
 *
 * @param {object} args - { phaseType, request, phaseData } (phaseData shape varies by phase)
 * @returns {object|undefined} the `bru.grpc` object, or undefined for unknown phases
 */
const buildGrpcScriptApi = ({ phaseType, request, phaseData } = {}) => {
  if (!request) return undefined;
  const build = phaseBuilders.get(phaseType);
  return build ? build(request, phaseData || {}) : undefined;
};

module.exports = buildGrpcScriptApi;
