const { createLibp2p } = require('libp2p');
const { webSockets } = require('@libp2p/websockets');
const { tcp } = require('@libp2p/tcp');
const { mplex } = require('@libp2p/mplex');
const { noise } = require('@libp2p/noise');
const { kadDHT } = require('@libp2p/kad-dht');
const { bootstrap } = require('@libp2p/bootstrap');
const { identify } = require('@libp2p/identify');
const { peerIdFromString } = require('@libp2p/peer-id');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const SyncLayer = require('./sync-layer');
const EncryptionManager = require('./encryption');
const { SyncProtocol } = require('./sync-protocol');

class P2PEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      dataDir: options.dataDir || path.join(process.cwd(), '.bruno-sync'),
      relay: options.relay || null,
      ...options,
    };
    this.libp2p = null;
    this.isStarted = false;
    this.spaces = new Map(); // spaceId -> Space
    this.peers = new Map(); // peerId -> PeerInfo
    this.connections = new Map(); // peerId -> Connection
  }

  async start() {
    if (this.isStarted) {
      return;
    }

    try {
      // Ensure data directory exists
      await fs.ensureDir(this.options.dataDir);

      // Create libp2p node
      this.libp2p = await createLibp2p({
        peerId: await this.getOrCreatePeerId(),
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/0.0.0.0/tcp/0/ws',
          ],
        },
        transports: [
          webSockets(),
          tcp(),
        ],
        streamMuxers: [mplex()],
        connectionEncryption: [noise()],
        services: {
          identify: identify(),
          dht: kadDHT({
            kBucketSize: 20,
            clientMode: false,
          }),
        },
        dht: {
          enabled: true,
          randomWalk: {
            enabled: true,
            interval: 30000,
            enabled: true,
          },
        },
      });

      // Set up event listeners
      this.setupEventListeners();

      // Start the node
      await this.libp2p.start();
      this.isStarted = true;

      console.log('P2P Engine started:', {
        peerId: this.libp2p.peerId.toString(),
        addresses: this.libp2p.getMultiaddrs().map(addr => addr.toString()),
      });

      this.emit('started', {
        peerId: this.libp2p.peerId.toString(),
        addresses: this.libp2p.getMultiaddrs(),
      });
    } catch (error) {
      console.error('Failed to start P2P Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isStarted || !this.libp2p) {
      return;
    }

    try {
      await this.libp2p.stop();
      this.isStarted = false;
      this.emit('stopped');
      console.log('P2P Engine stopped');
    } catch (error) {
      console.error('Failed to stop P2P Engine:', error);
      this.emit('error', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Peer discovery
    this.libp2p.addEventListener('peer:discovery', event => {
      const { detail: peerId } = event;
      console.log('Peer discovered:', peerId.toString());
      this.emit('peer:discovered', peerId);
    });

    // Connection events
    this.libp2p.addEventListener('peer:connect', event => {
      const { detail: connection } = event;
      const peerId = connection.remotePeer;
      console.log('Peer connected:', peerId.toString());
      this.connections.set(peerId.toString(), connection);
      this.emit('peer:connected', { peerId, connection });
    });

    this.libp2p.addEventListener('peer:disconnect', event => {
      const { detail: peerId } = event;
      console.log('Peer disconnected:', peerId.toString());
      this.connections.delete(peerId.toString());
      this.peers.delete(peerId.toString());
      this.emit('peer:disconnected', peerId);
    });

    // DHT events
    this.libp2p.services.dht.addEventListener('peer:discovery', event => {
      const { detail: peerId } = event;
      console.log('DHT peer discovered:', peerId.toString());
    });
  }

  async getOrCreatePeerId() {
    const peerIdPath = path.join(this.options.dataDir, 'peer-id.json');

    try {
      if (await fs.pathExists(peerIdPath)) {
        const peerIdData = await fs.readJson(peerIdPath);
        return await peerIdFromString(peerIdData.id);
      }
    } catch (error) {
      console.warn('Failed to load existing peer ID:', error.message);
    }

    // Generate new peer ID
    const peerId = await peerIdFromString(crypto.randomBytes(32).toString('hex'));

    try {
      await fs.writeJson(peerIdPath, { id: peerId.toString() });
    } catch (error) {
      console.warn('Failed to save peer ID:', error.message);
    }

    return peerId;
  }

  async createSpace(spaceId, options = {}) {
    if (this.spaces.has(spaceId)) {
      throw new Error(`Space ${spaceId} already exists`);
    }

    const space = new Space(spaceId, {
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

    const space = new Space(spaceId, {
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

  async dialPeer(peerId) {
    try {
      const connection = await this.libp2p.dial(peerId);
      this.connections.set(peerId.toString(), connection);
      return connection;
    } catch (error) {
      console.error('Failed to dial peer:', error);
      throw error;
    }
  }

  async sendMessage(peerId, protocol, message) {
    const connection = this.connections.get(peerId.toString());
    if (!connection) {
      throw new Error(`No connection to peer ${peerId}`);
    }

    try {
      const stream = await connection.newStream(protocol);
      await stream.sink([message]);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  getPeerInfo() {
    return {
      peerId: this.libp2p?.peerId?.toString(),
      addresses: this.libp2p?.getMultiaddrs()?.map(addr => addr.toString()) || [],
      isStarted: this.isStarted,
    };
  }

  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }
}

// Space class for managing individual collections
class Space extends EventEmitter {
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
    this.syncProtocol = null;
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

      // Initialize sync protocol
      this.syncProtocol = new SyncProtocol(this);
      await this.syncProtocol.start();

      // Set up sync layer event forwarding
      this.syncLayer.on('operation:created', operation => {
        this.emit('operation:created', operation);
        // Broadcast operation to peers
        if (this.syncProtocol) {
          this.syncProtocol.broadcastOperation(operation);
        }
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

      // Set up sync protocol event forwarding
      this.syncProtocol.on('peer:hello', data => {
        this.emit('peer:hello', data);
      });

      this.syncProtocol.on('peer:joined', data => {
        this.emit('peer:joined', data);
      });

      this.syncProtocol.on('peer:ops', data => {
        this.emit('peer:ops', data);
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

  async joinFromInvite(inviteData) {
    // Implementation for joining from invite
    // This would decrypt the invite and set up the space
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

  async syncWithPeer(peerId) {
    if (this.syncProtocol) {
      return await this.syncProtocol.syncWithPeer(peerId);
    }
  }

  async broadcastOperation(operation) {
    if (this.syncProtocol) {
      return await this.syncProtocol.broadcastOperation(operation);
    }
  }

  getPeerStates() {
    if (this.syncProtocol) {
      return this.syncProtocol.getAllPeerStates();
    }
    return [];
  }

  async pingPeers() {
    if (this.syncProtocol) {
      return await this.syncProtocol.pingPeers();
    }
  }
}

module.exports = { P2PEngine, Space, EncryptionManager, SyncLayer };
