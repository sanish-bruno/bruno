const { ipcMain } = require('electron');
const { SimpleP2PEngine } = require('../p2p/simple-engine');
const path = require('path');
const { app } = require('electron');

let p2pEngine = null;

const initializeP2PEngine = () => {
  if (p2pEngine) {
    console.log('P2P engine already exists');
    return p2pEngine;
  }

  console.log('Initializing P2P engine...');
  const dataDir = path.join(app.getPath('userData'), 'p2p');
  p2pEngine = new SimpleP2PEngine({ dataDir });
  console.log('P2P engine created:', !!p2pEngine);

  // Set up event forwarding to renderer
  p2pEngine.on('started', data => {
    // Broadcast to all windows
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:started', data);
    });
  });

  p2pEngine.on('stopped', () => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:stopped');
    });
  });

  p2pEngine.on('peer:connected', data => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:peer-connected', data);
    });
  });

  p2pEngine.on('peer:disconnected', peerId => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:peer-disconnected', { peerId: peerId.toString() });
    });
  });

  p2pEngine.on('space:created', data => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:space-created', data);
    });
  });

  p2pEngine.on('space:joined', data => {
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('p2p:space-joined', data);
    });
  });

  return p2pEngine;
};

const registerP2PHandlers = () => {
  console.log('Registering P2P IPC handlers...');

  // Start P2P engine
  ipcMain.handle('p2p:start', async () => {
    try {
      console.log('Starting P2P engine...');
      const engine = initializeP2PEngine();
      await engine.start();
      const peerInfo = engine.getPeerInfo();
      console.log('P2P engine started successfully:', peerInfo);
      return { success: true, peerInfo };
    } catch (error) {
      console.error('Failed to start P2P engine:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop P2P engine
  ipcMain.handle('p2p:stop', async () => {
    try {
      if (p2pEngine) {
        await p2pEngine.stop();
        p2pEngine = null;
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to stop P2P engine:', error);
      return { success: false, error: error.message };
    }
  });

  // Get P2P engine status
  ipcMain.handle('p2p:status', async () => {
    try {
      console.log('Getting P2P status, engine exists:', !!p2pEngine);
      if (!p2pEngine) {
        console.log('No P2P engine, returning not started');
        return { success: true, data: { isStarted: false } };
      }

      const peerInfo = p2pEngine.getPeerInfo();
      const connectedPeers = p2pEngine.getConnectedPeers();

      console.log('P2P status:', { isStarted: p2pEngine.isStarted, peerInfo, connectedPeers });

      return {
        success: true,
        data: {
          isStarted: p2pEngine.isStarted,
          peerInfo,
          connectedPeers,
        },
      };
    } catch (error) {
      console.error('Failed to get P2P status:', error);
      return { success: false, error: error.message };
    }
  });

  // Create a new space
  ipcMain.handle('p2p:create-space', async (event, { spaceId, options = {} }) => {
    try {
      console.log('Creating space:', spaceId, options);
      const engine = initializeP2PEngine();
      if (!engine.isStarted) {
        console.log('Starting P2P engine...');
        await engine.start();
      }

      console.log('Creating space in engine...');
      const space = await engine.createSpace(spaceId, options);
      console.log('Space created, generating invite...');
      const inviteLink = await space.generateInvite();
      console.log('Invite generated:', inviteLink);

      return {
        success: true,
        data: {
          spaceId,
          inviteLink,
          space: {
            spaceId: space.spaceId,
            isInitialized: space.isInitialized,
          },
        },
      };
    } catch (error) {
      console.error('Failed to create space:', error);
      return { success: false, error: error.message };
    }
  });

  // Join a space from invite
  ipcMain.handle('p2p:join-space', async (event, { inviteLink }) => {
    try {
      const engine = initializeP2PEngine();
      if (!engine.isStarted) {
        await engine.start();
      }

      // Parse invite link
      const url = new URL(inviteLink);
      const spaceId = url.searchParams.get('space');
      const encryptedBlob = url.searchParams.get('blob');

      if (!spaceId || !encryptedBlob) {
        throw new Error('Invalid invite link');
      }

      const space = await engine.joinSpace(spaceId, { encryptedBlob });

      return {
        success: true,
        data: {
          spaceId,
          space: {
            spaceId: space.spaceId,
            isInitialized: space.isInitialized,
          },
        },
      };
    } catch (error) {
      console.error('Failed to join space:', error);
      return { success: false, error: error.message };
    }
  });

  // Get space info
  ipcMain.handle('p2p:get-space', async (event, { spaceId }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      return {
        success: true,
        data: {
          spaceId: space.spaceId,
          isInitialized: space.isInitialized,
        },
      };
    } catch (error) {
      console.error('Failed to get space:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate invite for space
  ipcMain.handle('p2p:generate-invite', async (event, { spaceId }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      const inviteLink = await space.generateInvite();

      return {
        success: true,
        data: { inviteLink },
      };
    } catch (error) {
      console.error('Failed to generate invite:', error);
      return { success: false, error: error.message };
    }
  });

  // Dial a peer
  ipcMain.handle('p2p:dial-peer', async (event, { peerId }) => {
    try {
      const engine = initializeP2PEngine();
      if (!engine.isStarted) {
        return { success: false, error: 'P2P engine not started' };
      }

      await engine.dialPeer(peerId);

      return { success: true };
    } catch (error) {
      console.error('Failed to dial peer:', error);
      return { success: false, error: error.message };
    }
  });

  // Send message to peer
  ipcMain.handle('p2p:send-message', async (event, { peerId, protocol, message }) => {
    try {
      const engine = initializeP2PEngine();
      if (!engine.isStarted) {
        return { success: false, error: 'P2P engine not started' };
      }

      await engine.sendMessage(peerId, protocol, message);

      return { success: true };
    } catch (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }
  });

  // Get connected peers
  ipcMain.handle('p2p:get-peers', async () => {
    try {
      const engine = initializeP2PEngine();
      if (!engine.isStarted) {
        return { success: true, data: [] };
      }

      const peers = engine.getConnectedPeers();
      return { success: true, data: peers };
    } catch (error) {
      console.error('Failed to get peers:', error);
      return { success: false, error: error.message };
    }
  });

  // Set collection path for space
  ipcMain.handle('p2p:set-collection-path', async (event, { spaceId, collectionPath }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      await space.setCollectionPath(collectionPath);

      return { success: true };
    } catch (error) {
      console.error('Failed to set collection path:', error);
      return { success: false, error: error.message };
    }
  });

  // Sync with peers
  ipcMain.handle('p2p:sync-peers', async (event, { spaceId }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      await space.syncWithPeers();

      return { success: true };
    } catch (error) {
      console.error('Failed to sync with peers:', error);
      return { success: false, error: error.message };
    }
  });

  // Set sync mode
  ipcMain.handle('p2p:set-sync-mode', async (event, { spaceId, mode, options = {} }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      await space.setSyncMode(mode, options);

      return { success: true };
    } catch (error) {
      console.error('Failed to set sync mode:', error);
      return { success: false, error: error.message };
    }
  });

  // Get sync status
  ipcMain.handle('p2p:get-sync-status', async (event, { spaceId }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      const status = await space.getSyncStatus();

      return { success: true, data: status };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { success: false, error: error.message };
    }
  });

  // Resolve conflict
  ipcMain.handle('p2p:resolve-conflict', async (event, { spaceId, operationId, resolution }) => {
    try {
      const engine = initializeP2PEngine();
      const space = engine.getSpace(spaceId);

      if (!space) {
        return { success: false, error: 'Space not found' };
      }

      await space.resolveConflict(operationId, resolution);

      return { success: true };
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('P2P IPC handlers registered successfully');
};

module.exports = {
  registerP2PHandlers,
  initializeP2PEngine,
};
