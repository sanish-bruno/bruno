const { EventEmitter } = require('events');
const SimplePeer = require('simple-peer');
const { Server } = require('socket.io');
const { createServer } = require('http');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

class SimpleP2PEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      dataDir: options.dataDir || path.join(process.cwd(), '.bruno-sync'),
      signalingPort: options.signalingPort || 3456,
      ...options,
    };
    this.isStarted = false;
    this.spaces = new Map(); // spaceId -> Space
    this.peers = new Map(); // peerId -> PeerInfo
    this.connections = new Map(); // peerId -> SimplePeer
    this.signalingServer = null;
    this.io = null;
    this.deviceId = null;
  }

  async start() {
    if (this.isStarted) {
      return;
    }

    try {
      // Ensure data directory exists
      await fs.ensureDir(this.options.dataDir);

      // Generate device ID
      this.deviceId = await this.getOrCreateDeviceId();

      // Start signaling server
      await this.startSignalingServer();

      this.isStarted = true;

      console.log('Simple P2P Engine started:', {
        deviceId: this.deviceId,
        signalingPort: this.options.signalingPort,
      });

      this.emit('started', {
        deviceId: this.deviceId,
        signalingPort: this.options.signalingPort,
      });
    } catch (error) {
      console.error('Failed to start Simple P2P Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isStarted) {
      return;
    }

    try {
      // Close all peer connections
      for (const [peerId, peer] of this.connections) {
        peer.destroy();
      }
      this.connections.clear();
      this.peers.clear();

      // Stop signaling server
      if (this.signalingServer) {
        this.signalingServer.close();
        this.signalingServer = null;
        this.io = null;
      }

      this.isStarted = false;
      this.emit('stopped');
      console.log('Simple P2P Engine stopped');
    } catch (error) {
      console.error('Failed to stop Simple P2P Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async startSignalingServer() {
    return new Promise((resolve, reject) => {
      try {
        const server = createServer();
        this.io = new Server(server, {
          cors: {
            origin: '*',
            methods: ['GET', 'POST'],
          },
        });

        this.io.on('connection', socket => {
          console.log('Signaling client connected:', socket.id);

          socket.on('join-space', data => {
            const { spaceId, deviceId } = data;
            socket.join(spaceId);
            socket.spaceId = spaceId;
            socket.deviceId = deviceId;

            // Notify other clients in the space
            socket.to(spaceId).emit('peer-joined', { deviceId, socketId: socket.id });

            console.log(`Device ${deviceId} joined space ${spaceId}`);
          });

          socket.on('offer', data => {
            const { targetDeviceId, offer, spaceId } = data;
            socket.to(spaceId).emit('offer', {
              fromDeviceId: socket.deviceId,
              offer,
              spaceId,
            });
          });

          socket.on('answer', data => {
            const { targetDeviceId, answer, spaceId } = data;
            socket.to(spaceId).emit('answer', {
              fromDeviceId: socket.deviceId,
              answer,
              spaceId,
            });
          });

          socket.on('ice-candidate', data => {
            const { targetDeviceId, candidate, spaceId } = data;
            socket.to(spaceId).emit('ice-candidate', {
              fromDeviceId: socket.deviceId,
              candidate,
              spaceId,
            });
          });

          socket.on('disconnect', () => {
            console.log('Signaling client disconnected:', socket.id);
            if (socket.spaceId && socket.deviceId) {
              socket.to(socket.spaceId).emit('peer-left', { deviceId: socket.deviceId });
            }
          });
        });

        this.signalingServer = server;
        this.signalingServer.listen(this.options.signalingPort, () => {
          console.log(`Signaling server running on port ${this.options.signalingPort}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getOrCreateDeviceId() {
    const deviceIdPath = path.join(this.options.dataDir, 'device-id.json');

    try {
      if (await fs.pathExists(deviceIdPath)) {
        const deviceData = await fs.readJson(deviceIdPath);
        return deviceData.deviceId;
      }
    } catch (error) {
      console.warn('Failed to load existing device ID:', error.message);
    }

    // Generate new device ID
    const deviceId = crypto.randomBytes(16).toString('hex');

    try {
      await fs.writeJson(deviceIdPath, { deviceId });
    } catch (error) {
      console.warn('Failed to save device ID:', error.message);
    }

    return deviceId;
  }

  async createSpace(spaceId, options = {}) {
    if (this.spaces.has(spaceId)) {
      throw new Error(`Space ${spaceId} already exists`);
    }

    const space = new SimpleSpace(spaceId, {
      engine: this,
      dataDir: path.join(this.options.dataDir, 'spaces', spaceId),
      collectionPath: options.collectionPath,
      ...options,
    });

    await space.initialize();
    this.spaces.set(spaceId, space);

    this.emit('space:created', { spaceId, space });
    return space;
  }

  async joinSpace(spaceId, inviteData) {
    if (this.spaces.has(spaceId)) {
      return this.spaces.get(spaceId);
    }

    const space = new SimpleSpace(spaceId, {
      engine: this,
      dataDir: path.join(this.options.dataDir, 'spaces', spaceId),
      inviteData,
    });

    await space.initialize();
    this.spaces.set(spaceId, space);

    this.emit('space:joined', { spaceId, space });
    return space;
  }

  getSpace(spaceId) {
    return this.spaces.get(spaceId);
  }

  async connectToPeer(peerId, spaceId) {
    try {
      const peer = new SimplePeer({ initiator: true, trickle: false });

      peer.on('signal', data => {
        // Send offer through signaling server
        if (this.io) {
          this.io.to(spaceId).emit('offer', {
            targetDeviceId: peerId,
            fromDeviceId: this.deviceId,
            offer: data,
            spaceId,
          });
        }
      });

      peer.on('connect', () => {
        console.log('Connected to peer:', peerId);
        this.connections.set(peerId, peer);
        this.emit('peer:connected', { peerId, connection: peer });
      });

      peer.on('data', data => {
        try {
          const message = JSON.parse(data.toString());
          this.emit('message:received', { peerId, message });
        } catch (error) {
          console.error('Failed to parse message from peer:', error);
        }
      });

      peer.on('close', () => {
        console.log('Peer disconnected:', peerId);
        this.connections.delete(peerId);
        this.peers.delete(peerId);
        this.emit('peer:disconnected', peerId);
      });

      peer.on('error', error => {
        console.error('Peer connection error:', error);
        this.emit('peer:error', { peerId, error });
      });

      return peer;
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      throw error;
    }
  }

  async sendMessage(peerId, message) {
    const peer = this.connections.get(peerId);
    if (!peer) {
      throw new Error(`No connection to peer ${peerId}`);
    }

    try {
      peer.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  getPeerInfo() {
    return {
      deviceId: this.deviceId,
      isStarted: this.isStarted,
      signalingPort: this.options.signalingPort,
    };
  }

  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }
}

// Simple Space class for managing individual collections
class SimpleSpace extends EventEmitter {
  constructor(spaceId, options = {}) {
    super();
    this.spaceId = spaceId;
    this.engine = options.engine;
    this.dataDir = options.dataDir;
    this.collectionPath = options.collectionPath;
    this.inviteData = options.inviteData;
    this.isInitialized = false;
    this.encryption = null;
    this.syncLayer = null;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure space directory exists
      await fs.ensureDir(this.dataDir);

      // Initialize encryption
      this.encryption = new EncryptionManager(this.dataDir);
      await this.encryption.initialize();

      // Initialize sync layer
      this.syncLayer = new SyncLayer(this);
      await this.syncLayer.initialize();

      // Set up sync layer event forwarding
      this.syncLayer.on('operation:created', operation => {
        this.emit('operation:created', operation);
        // Broadcast operation to peers
        this.broadcastOperation(operation);
      });

      this.syncLayer.on('sync:started', () => {
        this.emit('sync:started');
      });

      this.syncLayer.on('sync:completed', data => {
        this.emit('sync:completed', data);
      });

      this.syncLayer.on('sync:error', error => {
        this.emit('sync:error', error);
      });

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize space:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async generateInvite() {
    const inviteData = {
      spaceId: this.spaceId,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    const encryptedInvite = await this.encryption.encryptInvite(inviteData);
    return `bruno+p2p://join?space=${this.spaceId}&blob=${encryptedInvite}`;
  }

  async setCollectionPath(collectionPath) {
    this.collectionPath = collectionPath;
    if (this.syncLayer) {
      await this.syncLayer.setCollectionPath(collectionPath);
    }
  }

  async syncWithPeers() {
    if (this.syncLayer) {
      return await this.syncLayer.syncWithPeers();
    }
  }

  async setSyncMode(mode, options = {}) {
    if (this.syncLayer) {
      this.syncLayer.setSyncMode(mode, options);
    }
  }

  async getSyncStatus() {
    if (this.syncLayer) {
      return await this.syncLayer.getSyncStatus();
    }
    return null;
  }

  async applyOperation(operation) {
    if (this.syncLayer) {
      return await this.syncLayer.applyOperation(operation);
    }
  }

  async resolveConflict(operationId, resolution) {
    if (this.syncLayer) {
      return await this.syncLayer.resolveConflict(operationId, resolution);
    }
  }

  async broadcastOperation(operation) {
    const peers = this.engine.getConnectedPeers();

    for (const peerId of peers) {
      try {
        await this.engine.sendMessage(peerId, {
          type: 'operation',
          spaceId: this.spaceId,
          operation: operation,
        });
      } catch (error) {
        console.error(`Failed to broadcast operation to peer ${peerId}:`, error);
      }
    }
  }
}

// Simple encryption manager
class EncryptionManager {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.spaceKey = null;
  }

  async initialize() {
    const keyPath = path.join(this.dataDir, 'space.key');

    try {
      if (await fs.pathExists(keyPath)) {
        this.spaceKey = await fs.readFile(keyPath);
      } else {
        this.spaceKey = crypto.randomBytes(32);
        await fs.writeFile(keyPath, this.spaceKey);
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  async encryptInvite(inviteData) {
    // Simple base64 encoding for now
    return Buffer.from(JSON.stringify(inviteData)).toString('base64');
  }

  async decryptInvite(encryptedData) {
    // Simple base64 decoding for now
    return JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
  }
}

// Simple sync layer
class SyncLayer extends EventEmitter {
  constructor(space) {
    super();
    this.space = space;
    this.fileWatcher = null;
    this.operations = [];
    this.isWatching = false;
    this.syncMode = 'manual';
  }

  async initialize() {
    if (this.space.collectionPath) {
      await this.setCollectionPath(this.space.collectionPath);
    }
  }

  async setCollectionPath(collectionPath) {
    this.collectionPath = collectionPath;
    // File watching would be implemented here
    this.isWatching = true;
  }

  async syncWithPeers() {
    // Sync operations would be implemented here
    console.log('Syncing with peers...');
  }

  setSyncMode(mode, options = {}) {
    this.syncMode = mode;
  }

  async getSyncStatus() {
    return {
      isWatching: this.isWatching,
      syncMode: this.syncMode,
      operationsCount: this.operations.length,
    };
  }
}

module.exports = { SimpleP2PEngine, SimpleSpace, EncryptionManager, SyncLayer };
