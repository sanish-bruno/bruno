const { EventEmitter } = require('events');
const crypto = require('crypto');

// Protocol version
const PROTOCOL_VERSION = '1';

// Message types
const MESSAGE_TYPES = {
  HELLO: 'hello',
  JOIN: 'join',
  HEAD: 'head',
  HAVE: 'have',
  WANT: 'want',
  OPS: 'ops',
  ACK: 'ack',
  SNAPSHOT: 'snapshot',
  PING: 'ping',
  PONG: 'pong',
};

class SyncProtocol extends EventEmitter {
  constructor(space) {
    super();
    this.space = space;
    this.engine = space.engine;
    this.encryption = space.encryption;
    this.peerStates = new Map(); // peerId -> peer state
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  setupMessageHandlers() {
    this.messageHandlers.set(MESSAGE_TYPES.HELLO, this.handleHello.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.JOIN, this.handleJoin.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.HEAD, this.handleHead.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.HAVE, this.handleHave.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.WANT, this.handleWant.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.OPS, this.handleOps.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.ACK, this.handleAck.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.SNAPSHOT, this.handleSnapshot.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.PING, this.handlePing.bind(this));
    this.messageHandlers.set(MESSAGE_TYPES.PONG, this.handlePong.bind(this));
  }

  async start() {
    // Set up libp2p stream handler
    if (this.engine.libp2p) {
      await this.engine.libp2p.handle('/bruno/sync/1', this.handleStream.bind(this));
    }
  }

  async stop() {
    if (this.engine.libp2p) {
      await this.engine.libp2p.unhandle('/bruno/sync/1');
    }
  }

  async handleStream(stream) {
    const peerId = stream.connection.remotePeer.toString();

    try {
      // Set up stream reading
      const reader = stream.source[Symbol.asyncIterator]();

      while (true) {
        const { done, value } = await reader.next();
        if (done) break;

        await this.handleMessage(peerId, value);
      }
    } catch (error) {
      console.error(`Error handling stream from peer ${peerId}:`, error);
    }
  }

  async handleMessage(peerId, rawMessage) {
    try {
      // Parse message
      const message = JSON.parse(rawMessage.toString());

      // Verify message structure
      if (!message.type || !message.spaceId || !message.timestamp) {
        throw new Error('Invalid message structure');
      }

      // Check if message is for this space
      if (message.spaceId !== this.space.spaceId) {
        return;
      }

      // Decrypt message if it's encrypted
      let decryptedMessage = message;
      if (message.encrypted) {
        decryptedMessage = await this.encryption.decryptOperation(message);
      }

      // Handle message
      const handler = this.messageHandlers.get(decryptedMessage.type);
      if (handler) {
        await handler(peerId, decryptedMessage);
      } else {
        console.warn(`Unknown message type: ${decryptedMessage.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from peer ${peerId}:`, error);
    }
  }

  async sendMessage(peerId, messageType, data = {}) {
    try {
      const message = {
        type: messageType,
        spaceId: this.space.spaceId,
        timestamp: Date.now(),
        version: PROTOCOL_VERSION,
        ...data,
      };

      // Encrypt message
      const encryptedMessage = await this.encryption.encryptOperation(message);

      // Send via libp2p
      await this.engine.sendMessage(peerId, '/bruno/sync/1', JSON.stringify(encryptedMessage));
    } catch (error) {
      console.error(`Failed to send message to peer ${peerId}:`, error);
      throw error;
    }
  }

  // Message handlers
  async handleHello(peerId, message) {
    console.log(`Received HELLO from peer ${peerId}`);

    // Store peer state
    this.peerStates.set(peerId, {
      peerId,
      lastSeen: Date.now(),
      head: message.head || 0,
      capabilities: message.capabilities || [],
    });

    // Send our head
    await this.sendHead(peerId);

    this.emit('peer:hello', { peerId, message });
  }

  async handleJoin(peerId, message) {
    console.log(`Received JOIN from peer ${peerId}`);

    // Update peer state
    const peerState = this.peerStates.get(peerId) || { peerId, lastSeen: Date.now() };
    peerState.joined = true;
    peerState.spaceId = message.spaceId;
    this.peerStates.set(peerId, peerState);

    this.emit('peer:joined', { peerId, message });
  }

  async handleHead(peerId, message) {
    console.log(`Received HEAD from peer ${peerId}: ${message.head}`);

    // Update peer state
    const peerState = this.peerStates.get(peerId);
    if (peerState) {
      peerState.head = message.head;
      peerState.lastSeen = Date.now();
    }

    // Check if we need to sync
    if (this.space.syncLayer) {
      const ourHead = this.space.syncLayer.operations.length;
      if (message.head > ourHead) {
        // Peer has more operations, request them
        await this.sendWant(peerId, ourHead + 1, message.head);
      } else if (ourHead > message.head) {
        // We have more operations, send them
        await this.sendOps(peerId, message.head + 1, ourHead);
      }
    }

    this.emit('peer:head', { peerId, head: message.head });
  }

  async handleHave(peerId, message) {
    console.log(`Received HAVE from peer ${peerId}: ${message.operations.length} operations`);

    // Process operations
    if (this.space.syncLayer) {
      for (const operation of message.operations) {
        await this.space.syncLayer.applyOperation(operation);
      }
    }

    this.emit('peer:have', { peerId, operations: message.operations });
  }

  async handleWant(peerId, message) {
    console.log(`Received WANT from peer ${peerId}: ${message.from} to ${message.to}`);

    // Send requested operations
    if (this.space.syncLayer) {
      const operations = this.space.syncLayer.operations.slice(message.from - 1, message.to);
      await this.sendOps(peerId, message.from, message.to, operations);
    }
  }

  async handleOps(peerId, message) {
    console.log(`Received OPS from peer ${peerId}: ${message.operations.length} operations`);

    // Process operations
    if (this.space.syncLayer) {
      for (const operation of message.operations) {
        // Verify operation signature
        if (await this.encryption.verifyOperation(operation)) {
          await this.space.syncLayer.applyOperation(operation);
        } else {
          console.warn(`Invalid operation signature from peer ${peerId}`);
        }
      }
    }

    this.emit('peer:ops', { peerId, operations: message.operations });
  }

  async handleAck(peerId, message) {
    console.log(`Received ACK from peer ${peerId} for operation ${message.operationId}`);

    // Remove acknowledged operation from pending
    if (this.space.syncLayer) {
      this.space.syncLayer.pendingOperations.delete(message.operationId);
    }

    this.emit('peer:ack', { peerId, operationId: message.operationId });
  }

  async handleSnapshot(peerId, message) {
    console.log(`Received SNAPSHOT from peer ${peerId}`);

    // Apply snapshot
    if (this.space.syncLayer && message.data) {
      // This would involve restoring the collection to the snapshot state
      // Implementation depends on specific requirements
    }

    this.emit('peer:snapshot', { peerId, message });
  }

  async handlePing(peerId, message) {
    console.log(`Received PING from peer ${peerId}`);

    // Send pong
    await this.sendMessage(peerId, MESSAGE_TYPES.PONG, {
      timestamp: message.timestamp,
    });
  }

  async handlePong(peerId, message) {
    console.log(`Received PONG from peer ${peerId}`);

    // Update peer state
    const peerState = this.peerStates.get(peerId);
    if (peerState) {
      peerState.lastSeen = Date.now();
      peerState.latency = Date.now() - message.timestamp;
    }

    this.emit('peer:pong', { peerId, latency: Date.now() - message.timestamp });
  }

  // Message sending methods
  async sendHello(peerId) {
    await this.sendMessage(peerId, MESSAGE_TYPES.HELLO, {
      head: this.space.syncLayer ? this.space.syncLayer.operations.length : 0,
      capabilities: ['sync', 'encryption'],
    });
  }

  async sendJoin(peerId) {
    await this.sendMessage(peerId, MESSAGE_TYPES.JOIN, {
      spaceId: this.space.spaceId,
    });
  }

  async sendHead(peerId) {
    const head = this.space.syncLayer ? this.space.syncLayer.operations.length : 0;
    await this.sendMessage(peerId, MESSAGE_TYPES.HEAD, { head });
  }

  async sendHave(peerId, operations) {
    await this.sendMessage(peerId, MESSAGE_TYPES.HAVE, { operations });
  }

  async sendWant(peerId, from, to) {
    await this.sendMessage(peerId, MESSAGE_TYPES.WANT, { from, to });
  }

  async sendOps(peerId, from, to, operations = null) {
    if (!operations && this.space.syncLayer) {
      operations = this.space.syncLayer.operations.slice(from - 1, to);
    }

    // Sign operations before sending
    const signedOperations = [];
    for (const operation of operations) {
      const signedOp = await this.encryption.signOperation(operation);
      signedOperations.push(signedOp);
    }

    await this.sendMessage(peerId, MESSAGE_TYPES.OPS, {
      from,
      to,
      operations: signedOperations,
    });
  }

  async sendAck(peerId, operationId) {
    await this.sendMessage(peerId, MESSAGE_TYPES.ACK, { operationId });
  }

  async sendSnapshot(peerId, data) {
    await this.sendMessage(peerId, MESSAGE_TYPES.SNAPSHOT, { data });
  }

  async sendPing(peerId) {
    await this.sendMessage(peerId, MESSAGE_TYPES.PING, {
      timestamp: Date.now(),
    });
  }

  // Sync operations
  async syncWithPeer(peerId) {
    try {
      // Send hello to establish connection
      await this.sendHello(peerId);

      // Send join to join the space
      await this.sendJoin(peerId);

      // Send our head
      await this.sendHead(peerId);
    } catch (error) {
      console.error(`Failed to sync with peer ${peerId}:`, error);
      throw error;
    }
  }

  async broadcastOperation(operation) {
    const peers = this.engine.getConnectedPeers();

    for (const peerId of peers) {
      try {
        await this.sendOps(peerId, 0, 0, [operation]);
      } catch (error) {
        console.error(`Failed to broadcast operation to peer ${peerId}:`, error);
      }
    }
  }

  // Peer management
  getPeerState(peerId) {
    return this.peerStates.get(peerId);
  }

  getAllPeerStates() {
    return Array.from(this.peerStates.values());
  }

  removePeer(peerId) {
    this.peerStates.delete(peerId);
  }

  // Health check
  async pingPeers() {
    const peers = this.engine.getConnectedPeers();

    for (const peerId of peers) {
      try {
        await this.sendPing(peerId);
      } catch (error) {
        console.error(`Failed to ping peer ${peerId}:`, error);
      }
    }
  }
}

module.exports = { SyncProtocol, MESSAGE_TYPES };
