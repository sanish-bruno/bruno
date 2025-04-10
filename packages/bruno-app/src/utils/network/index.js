export const sendNetworkRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    if (['http-request', 'graphql-request'].includes(item.type)) {
      sendHttpRequest(item, collection, environment, runtimeVariables)
        .then((response) => {
          resolve({
            state: 'success',
            data: response.data,
            // Note that the Buffer is encoded as a base64 string, because Buffers / TypedArrays are not allowed in the redux store
            dataBuffer: response.dataBuffer,
            headers: response.headers,
            size: response.size,
            status: response.status,
            statusText: response.statusText,
            duration: response.duration,
            timeline: response.timeline
          });
        })
        .catch((err) => reject(err));
    } else if (item.type === 'grpc-request') {
      // For gRPC, we just start the connection and return initial state
      // The actual responses will come through event listeners
      startGrpcRequest(item, collection, environment, runtimeVariables)
        .then((initialState) => {
          // Return an initial state object to update the UI
          // The real response data will be handled by event listeners
          resolve(initialState);
        })
        .catch((err) => reject(err));
    }
  });
};

const sendHttpRequest = async (item, collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer
      .invoke('send-http-request', item, collection, environment, runtimeVariables)
      .then(resolve)
      .catch(reject);
  });
};

export const sendCollectionOauth2Request = async (collection, environment, runtimeVariables) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    resolve({});
  });
};

export const fetchGqlSchema = async (endpoint, environment, request, collection) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('fetch-gql-schema', endpoint, environment, request, collection).then(resolve).catch(reject);
  });
};

export const cancelNetworkRequest = async (cancelTokenUid) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;

    ipcRenderer.invoke('cancel-http-request', cancelTokenUid).then(resolve).catch(reject);
  });
};

export const startGrpcRequest = async (item, collection, environment, runtimeVariables, certificateChain, privateKey, rootCertificate, verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    const request = item.draft ? item.draft : item;
  
    
    // Create a cancel token with 'grpc-' prefix to identify it as a gRPC request
    const cancelTokenUid = `grpc-${item.uid}`;
    
    ipcRenderer.invoke('grpc:start-connection', {
      request, 
      collection, 
      environment, 
      runtimeVariables, 
      certificateChain, 
      privateKey, 
      rootCertificate, 
      verifyOptions
    })
    .then(response => {
      // Initial response from the connection setup
      // We don't resolve with the actual response as that will come via events
      resolve({
        state: 'sending',
        status: 'Pending',
        statusText: 'Request sent, waiting for response',
        duration: 0,
        cancelTokenUid: cancelTokenUid
      });
    })
    .catch(err => {
      reject(err);
    });
  });
};

/**
 * Sends a message to an existing gRPC stream
 * @param {string} requestId - The request ID to send a message to
 * @param {Object} message - The message to send
 * @returns {Promise<Object>} - The result of the send operation
 */
export const sendGrpcMessage = async (item, collectionUid, message) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:send-message', item.uid, message)
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Cancels a running gRPC request
 * @param {string} requestId - The request ID to cancel
 * @returns {Promise<Object>} - The result of the cancel operation
 */
export const cancelGrpcRequest = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:cancel', requestId)
      .then(resolve)
      .catch(reject);
  });
};

/**
 * Ends a gRPC streaming request (client-streaming or bidirectional)
 * @param {string} requestId - The request ID to end
 * @returns {Promise<Object>} - The result of the end operation
 */
export const endGrpcStream = async (requestId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:end', requestId)
      .then(resolve)
      .catch(reject);
  });
};

export const loadGrpcMethodsFromProtoFile = async (filePath, includeDirs = []) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-proto', { filePath, includeDirs }).then(resolve).catch(reject);
  });
};

export const loadGrpcMethodsFromReflection = async (url, rootCertificate, privateKey, certificateChain,  verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-reflection', { url, rootCertificate, privateKey, certificateChain, verifyOptions }).then(resolve).catch(reject);
  });
};

export const loadGrpcMethodsFromBufReflection = async (url, rootCertificate, privateKey, certificateChain,  verifyOptions) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:load-methods-buf-reflection', { url, rootCertificate, privateKey, certificateChain, verifyOptions }).then(resolve).catch(reject);
  });
};

export const cancelGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:cancel-request', { requestId: connectionId }).then(resolve).catch(reject);
  });
};

export const endGrpcConnection = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:end-request', { requestId: connectionId }).then(resolve).catch(reject);
  });
};

/**
 * Check if a gRPC connection is active
 * @param {string} connectionId - The connection ID to check
 * @returns {Promise<boolean>} - Whether the connection is active
 */
export const isGrpcConnectionActive = async (connectionId) => {
  return new Promise((resolve, reject) => {
    const { ipcRenderer } = window;
    ipcRenderer.invoke('grpc:is-connection-active', connectionId)
      .then(response => {
        if (response.success) {
          resolve(response.isActive);
        } else {
          // If there was an error, assume the connection is not active
          console.error('Error checking connection status:', response.error);
          resolve(false);
        }
      })
      .catch(err => {
        console.error('Failed to check connection status:', err);
        // On error, assume the connection is not active
        resolve(false);
      });
  });
};
