// To implement grpc event handlers
const { ipcMain, app } = require('electron');
const { GrpcClient } = require("@usebruno/requests") 
const { safeParseJSON, safeStringifyJSON } = require('../../utils/common');
const { cloneDeep, get } = require('lodash');
const { preferencesUtil } = require('../../store/preferences');
const { getCertsAndProxyConfig } = require('./cert-utils');
const { interpolateString } = require('./interpolate-string');
const path = require('node:path');
const decomment = require('decomment');
const prepareGrpcRequest = require('./prepare-grpc-request');
const { HooksRuntime } = require('@usebruno/js');
const { getBrunoConfig } = require('../../store/bruno-config');
const { getDomainsWithCookies } = require('../../utils/cookies');
const { getProcessEnvVars } = require('../../store/process-env');
const { getEnvVars } = require('../../utils/collection');

// Creating grpcClient at module level so it can be accessed from window-all-closed event
let grpcClient;

const getJsSandboxRuntime = (collection) => {
  const securityConfig = get(collection, 'securityConfig', {});

  if (securityConfig.jsSandboxMode === 'safe') {
    return 'quickjs';
  }

  if (preferencesUtil.isBetaFeatureEnabled('nodevm')) {
    return 'nodevm';
  }

  return 'vm2';
};

/**
 * Register IPC handlers for gRPC
 */
const registerGrpcEventHandlers = (window) => {
   const sendEvent = (eventName, ...args) => {
    if (window && window.webContents) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  const onConsoleLog = (type, args) => {
    console[type](...args);
    if (window && window.webContents) {
      window.webContents.send('main:console-log', {
        type,
        args
      });
    }
  };

  const runHooks = async (options) => {
    const {
      request,
      envVars,
      collectionPath,
      collection,
      collectionUid,
      runtimeVariables,
      processEnvVars,
      scriptingConfig
    } = options;

    let hooksResult = null;
    const collectionName = collection?.name;
    const hooksFile = get(request, 'hooks');
    if (hooksFile?.length) {
      const hooksRuntime = new HooksRuntime({ runtime: scriptingConfig?.runtime });
      hooksResult = await hooksRuntime.runHooks({
        hooksFile: decomment(hooksFile),
        request,
        envVariables: envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        collectionName
      });

      // Store hookManager in request so it can be used later to trigger hooks
      request.__hookManager = hooksResult.hookManager;

      if (window && window.webContents) {
        window.webContents.send('main:script-environment-update', {
          envVariables: hooksResult.envVariables,
          runtimeVariables: hooksResult.runtimeVariables,
          persistentEnvVariables: hooksResult.persistentEnvVariables,
          collectionUid
        });

        window.webContents.send('main:persistent-env-variables-update', {
          persistentEnvVariables: hooksResult.persistentEnvVariables,
          collectionUid
        });

        window.webContents.send('main:global-environment-variables-update', {
          globalEnvironmentVariables: hooksResult.globalEnvironmentVariables
        });
      }

      collection.globalEnvironmentVariables = hooksResult.globalEnvironmentVariables;

      const domainsWithCookies = await getDomainsWithCookies();
      if (window && window.webContents) {
        window.webContents.send('main:cookies-update', safeParseJSON(safeStringifyJSON(domainsWithCookies)));
      }
    } else {
      // Even if no hooks file, create an empty hookManager for potential use
      const hooksRuntime = new HooksRuntime({ runtime: scriptingConfig?.runtime });
      hooksResult = await hooksRuntime.runHooks({
        hooksFile: '',
        request,
        envVariables: envVars,
        runtimeVariables,
        collectionPath,
        onConsoleLog,
        processEnvVars,
        scriptingConfig,
        collectionName
      });
      request.__hookManager = hooksResult.hookManager;
    }

    return hooksResult;
  };

  grpcClient = new GrpcClient(sendEvent);

  // Map to store hookManagers by requestId
  const hookManagers = new Map();
 
  ipcMain.handle('connections-changed', (event) => {
    sendEvent('grpc:connections-changed', event);
  });

  // Start a new gRPC connection
  ipcMain.handle('grpc:start-connection', async (event, { request, collection, environment, runtimeVariables }) => {
    
    try {
      const requestCopy = cloneDeep(request);
      const collectionUid = collection.uid;
      const collectionPath = collection.pathname;
      const brunoConfig = getBrunoConfig(collectionUid);
      const scriptingConfig = get(brunoConfig, 'scripts', {});
      scriptingConfig.runtime = getJsSandboxRuntime(collection);
      const processEnvVars = getProcessEnvVars(collectionUid);
      const envVars = getEnvVars(environment);

      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});

      // Create a request object for hooks that includes hooks from the original request
      // and all the variable properties from preparedRequest
      const requestForHooks = {
        ...preparedRequest,
        hooks: get(requestCopy, 'request.hooks', '')
      };

      // Run hooks first - before everything else
      let hooksResult = null;
      let hooksError = null;
      try {
        hooksResult = await runHooks({
          request: requestForHooks,
          envVars,
          collectionPath,
          collection,
          collectionUid,
          runtimeVariables,
          processEnvVars,
          scriptingConfig
        });
      } catch (error) {
        console.error('Hooks script error:', error);
        hooksError = error;
      }

      if (hooksError) {
        throw hooksError;
      }

      // Store hookManager in preparedRequest so it can be used later to trigger hooks
      preparedRequest.__hookManager = requestForHooks.__hookManager;

      // Store hookManager in the Map for later retrieval
      hookManagers.set(preparedRequest.uid, requestForHooks.__hookManager);

      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy.request,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });
   

      // Extract certificate information from the config
      const { httpsAgentRequestFields } = certsAndProxyConfig;
      
      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;
      const pfx = httpsAgentRequestFields.pfx;

      const requestSent = {
        type: "request",
        url: preparedRequest.url,
        method: preparedRequest.method,
        methodType: preparedRequest.methodType,
        headers: preparedRequest.headers,
        body: preparedRequest.body,
        timestamp: Date.now()
      }
      // Start gRPC connection with the processed request and certificates
      await grpcClient.startConnection({
        request: preparedRequest, 
        collection,
        rootCertificate,
        privateKey,
        certificateChain,
        passphrase,
        pfx,
        verifyOptions
      });

      sendEvent('grpc:request', preparedRequest.uid, collection.uid, requestSent);
      
      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting gRPC connection:', error);
      if (error instanceof Error) {
        throw error;
      }
      sendEvent('grpc:error', request.uid, collection.uid, { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // Get all active connection IDs
  ipcMain.handle('grpc:get-active-connections', (event) => {
    try {
      const activeConnectionIds = grpcClient.getActiveConnectionIds();
      return { success: true, activeConnectionIds };
    } catch (error) {
      console.error('Error getting active connections:', error);
      return { success: false, error: error.message, activeConnectionIds: [] };
    }
  });

  // Send a message to an existing stream
  ipcMain.handle('grpc:send-message', (event, requestId, collectionUid, message) => {
    try {
      grpcClient.sendMessage(requestId, collectionUid, message);
      sendEvent('grpc:message', requestId, collectionUid, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending gRPC message:', error);
      return { success: false, error: error.message };
    }
  });

  // End a streaming request
  ipcMain.handle('grpc:end-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }

      // Trigger hooks before ending the request
      const hookManager = hookManagers.get(requestId);
      if (hookManager) {
        try {
          hookManager.call('grpc:end-request', {
            requestId,
            timestamp: Date.now()
          });
        } catch (hookError) {
          console.error('Error executing grpc:end-request hooks:', hookError);
        }
      }

      grpcClient.end(requestId);

      // Clean up hookManager after ending
      hookManagers.delete(requestId);

      return { success: true };
    } catch (error) {
      console.error('Error ending gRPC stream:', error);
      return { success: false, error: error.message };
    }
  });

  // Cancel a request
  ipcMain.handle('grpc:cancel-request', (event, params) => {
    try {
      const { requestId } = params || {};
      if (!requestId) {
        throw new Error('Request ID is required');
      }

      // Trigger hooks before canceling the request
      const hookManager = hookManagers.get(requestId);
      if (hookManager) {
        try {
          hookManager.call('grpc:cancel-request', {
            requestId,
            timestamp: Date.now()
          });
        } catch (hookError) {
          console.error('Error executing grpc:cancel-request hooks:', hookError);
        }
      }

      grpcClient.cancel(requestId);

      // Clean up hookManager after canceling
      hookManagers.delete(requestId);

      return { success: true };
    } catch (error) {
      console.error('Error cancelling gRPC request:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from server reflection
  ipcMain.handle('grpc:load-methods-reflection', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables);
      
      // Get certificates and proxy configuration
      const certsAndProxyConfig = await getCertsAndProxyConfig({
        collectionUid: collection.uid,
        request: requestCopy.request,
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars,
        collectionPath: collection.pathname,
        globalEnvironmentVariables: collection.globalEnvironmentVariables
      });

      // Extract certificate information from the config
      const { httpsAgentRequestFields } = certsAndProxyConfig;
      
      // Configure verify options
      const verifyOptions = {
        rejectUnauthorized: preferencesUtil.shouldVerifyTls()
      };

      // Extract certificate information
      const rootCertificate = httpsAgentRequestFields.ca;
      const privateKey = httpsAgentRequestFields.key;
      const certificateChain = httpsAgentRequestFields.cert;
      const passphrase = httpsAgentRequestFields.passphrase;
      const pfx = httpsAgentRequestFields.pfx;


      // Send OAuth credentials update if available
      if (preparedRequest?.oauth2Credentials) {
        window.webContents.send('main:credentials-update', {
          credentials: preparedRequest.oauth2Credentials?.credentials,
          url: preparedRequest.oauth2Credentials?.url,
          collectionUid: collection.uid,
          credentialsId: preparedRequest.oauth2Credentials?.credentialsId,
          ...(preparedRequest.oauth2Credentials?.folderUid ? { folderUid: preparedRequest.oauth2Credentials.folderUid } : { itemUid: preparedRequest.uid }),
          debugInfo: preparedRequest.oauth2Credentials.debugInfo,
        });
      }


      const methods = await grpcClient.loadMethodsFromReflection({ 
        request: preparedRequest,
        collectionUid: collection.uid,
        rootCertificate, 
        privateKey, 
        certificateChain, 
        passphrase,
        pfx,
        verifyOptions,
        sendEvent
      });
      
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from reflection:', error);
      return { success: false, error: error.message };
    }
  });

  // Load methods from proto file
  ipcMain.handle('grpc:load-methods-proto', async (event, { filePath, includeDirs }) => {
    try {
      const methods = await grpcClient.loadMethodsFromProtoFile(filePath, includeDirs);
      return { success: true, methods: safeParseJSON(safeStringifyJSON(methods))};
    } catch (error) {
      console.error('Error loading gRPC methods from proto file:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate a sample gRPC message based on method path
  ipcMain.handle('grpc:generate-sample-message', async (event, { methodPath, existingMessage, options = {} }) => {
    try {
      // Generate the sample message
      const result = grpcClient.generateSampleMessage(methodPath, {
        ...options,
        // Parse existing message if provided
        existingMessage: existingMessage ? safeParseJSON(existingMessage) : null
      });
      
      if (!result.success) {
        return { 
          success: false, 
          error: result.error || 'Failed to generate sample message' 
        };
      }
      
      // Convert the message to a JSON string for safe transfer through IPC
      return { 
        success: true, 
        message: JSON.stringify(result.message, null, 2) 
      };
    } catch (error) {
      console.error('Error generating gRPC sample message:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to generate sample message' 
      };
    }
  });

  // Generate grpcurl command for a request
  ipcMain.handle('grpc:generate-grpcurl', async (event, { request, collection, environment, runtimeVariables }) => {
    try {
      const requestCopy = cloneDeep(request);
      const preparedRequest = await prepareGrpcRequest(requestCopy, collection, environment, runtimeVariables, {});
      const interpolationOptions = {
        envVars: preparedRequest.envVars,
        runtimeVariables,
        processEnvVars: preparedRequest.processEnvVars
      };
      let caCertFilePath, certFilePath, keyFilePath;

      if(preferencesUtil.shouldUseCustomCaCertificate()) {
        caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
      }

      const clientCertConfig = get(collection, 'brunoConfig.clientCertificates.certs', []);

      for (let clientCert of clientCertConfig) {
        const domain = interpolateString(clientCert?.domain, interpolationOptions);
        const type = clientCert?.type || 'cert';
        if (domain) {
          const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/)' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
          const requestUrl = interpolateString(preparedRequest.url, interpolationOptions);
          if (requestUrl.match(hostRegex)) {
            if (type === 'cert') {
              certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
              certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collection.pathname, certFilePath);
              keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
              keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collection.pathname, keyFilePath);
            }
          }
        }
      }
      // Generate the grpcurl command
      const command = grpcClient.generateGrpcurlCommand({
        request: preparedRequest,
        collectionPath: collection.pathname,
        certificates: {
          ca: caCertFilePath,
          cert: certFilePath,
          key: keyFilePath
        }
      });

      return { success: true, command };
    } catch (error) {
      console.error('Error generating grpcurl command:', error);
      return { success: false, error: error.message };
    }
  });
};

// Clean up gRPC connections when all windows are closed
if (app && typeof app.on === 'function') {
  app.on('window-all-closed', () => {
    if (grpcClient && typeof grpcClient.clearAllConnections === 'function') {
      try {
        grpcClient.clearAllConnections();
    } catch (error) {
      console.error('Error clearing gRPC connections:', error);
    }
  }
});
}

module.exports = registerGrpcEventHandlers
