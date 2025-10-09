const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class SyncLayer extends EventEmitter {
  constructor(space) {
    super();
    this.space = space;
    this.collectionPath = null;
    this.fileWatcher = null;
    this.operations = [];
    this.isWatching = false;
    this.syncMode = 'manual'; // manual, auto, scheduled
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.pendingOperations = new Map();
    this.operationLog = [];
  }

  async initialize() {
    if (this.space.collectionPath) {
      await this.setCollectionPath(this.space.collectionPath);
    }
  }

  async setCollectionPath(collectionPath) {
    this.collectionPath = collectionPath;
    await this.startWatching();
  }

  async startWatching() {
    if (!this.collectionPath || this.isWatching) {
      return;
    }

    try {
      // Set up file watcher
      this.fileWatcher = chokidar.watch(this.collectionPath, {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /node_modules/,
          /\.git/,
          /\.bruno-sync/,
          /\.DS_Store/,
          /Thumbs\.db/,
        ],
        persistent: true,
        ignoreInitial: true,
      });

      // Set up event handlers
      this.fileWatcher
        .on('add', filePath => this.handleFileEvent('add', filePath))
        .on('change', filePath => this.handleFileEvent('change', filePath))
        .on('unlink', filePath => this.handleFileEvent('unlink', filePath))
        .on('addDir', dirPath => this.handleFileEvent('addDir', dirPath))
        .on('unlinkDir', dirPath => this.handleFileEvent('unlinkDir', dirPath));

      this.isWatching = true;
      this.emit('watching:started', { collectionPath: this.collectionPath });
    } catch (error) {
      console.error('Failed to start file watching:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async stopWatching() {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = null;
    }
    this.isWatching = false;
    this.emit('watching:stopped');
  }

  async handleFileEvent(eventType, filePath) {
    if (!this.collectionPath) {
      return;
    }

    try {
      const relativePath = path.relative(this.collectionPath, filePath);
      const operation = await this.createOperation(eventType, filePath, relativePath);

      if (operation) {
        this.addOperation(operation);
        this.emit('operation:created', operation);
      }
    } catch (error) {
      console.error('Failed to handle file event:', error);
      this.emit('error', error);
    }
  }

  async createOperation(eventType, filePath, relativePath) {
    const operationId = crypto.randomUUID();
    const timestamp = Date.now();

    let operation = {
      id: operationId,
      type: eventType,
      path: relativePath,
      timestamp,
      spaceId: this.space.spaceId,
    };

    // Add file-specific data based on event type
    switch (eventType) {
      case 'add':
      case 'change':
        if (await fs.pathExists(filePath)) {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const content = await fs.readFile(filePath, 'utf8');
            const hash = crypto.createHash('sha256').update(content).digest('hex');

            operation.data = {
              content,
              hash,
              size: stats.size,
              mtime: stats.mtime.getTime(),
            };
          } else if (stats.isDirectory()) {
            operation.type = 'addDir';
            operation.data = {
              isDirectory: true,
            };
          }
        }
        break;

      case 'unlink':
        operation.data = {
          deleted: true,
        };
        break;

      case 'addDir':
        operation.data = {
          isDirectory: true,
        };
        break;

      case 'unlinkDir':
        operation.data = {
          isDirectory: true,
          deleted: true,
        };
        break;
    }

    return operation;
  }

  addOperation(operation) {
    this.operations.push(operation);
    this.operationLog.push(operation);

    // Keep only last 1000 operations in memory
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }

    // Store pending operation for sync
    this.pendingOperations.set(operation.id, operation);

    this.emit('operation:added', operation);
  }

  async syncWithPeers() {
    if (this.pendingOperations.size === 0) {
      return;
    }

    try {
      this.emit('sync:started');

      const operations = Array.from(this.pendingOperations.values());
      const space = this.space;

      // Send operations to all connected peers
      for (const peerId of space.engine.getConnectedPeers()) {
        try {
          await space.engine.sendMessage(peerId, '/bruno/sync/1', {
            type: 'operations',
            spaceId: space.spaceId,
            operations: operations.map(op => this.serializeOperation(op)),
          });
        } catch (error) {
          console.error(`Failed to sync with peer ${peerId}:`, error);
        }
      }

      // Clear pending operations after successful sync
      this.pendingOperations.clear();
      this.lastSyncTime = Date.now();

      this.emit('sync:completed', { operationsCount: operations.length });
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('sync:error', error);
    }
  }

  async applyOperation(operation) {
    if (!this.collectionPath) {
      return;
    }

    try {
      const filePath = path.join(this.collectionPath, operation.path);

      switch (operation.type) {
        case 'add':
        case 'change':
          if (operation.data && operation.data.content !== undefined) {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, operation.data.content, 'utf8');
          }
          break;

        case 'addDir':
          if (operation.data && operation.data.isDirectory) {
            await fs.ensureDir(filePath);
          }
          break;

        case 'unlink':
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
          break;

        case 'unlinkDir':
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
          break;
      }

      this.emit('operation:applied', operation);
    } catch (error) {
      console.error('Failed to apply operation:', error);
      this.emit('operation:error', { operation, error });
    }
  }

  serializeOperation(operation) {
    // Remove any functions or non-serializable data
    return JSON.parse(JSON.stringify(operation));
  }

  setSyncMode(mode, options = {}) {
    this.syncMode = mode;

    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    switch (mode) {
      case 'auto':
        // Auto sync on every operation
        this.on('operation:added', () => {
          setTimeout(() => this.syncWithPeers(), 100); // Small delay to batch operations
        });
        break;

      case 'scheduled':
        const interval = options.interval || 30000; // Default 30 seconds
        this.syncInterval = setInterval(() => {
          this.syncWithPeers();
        }, interval);
        break;

      case 'manual':
      default:
        // Manual sync only
        break;
    }

    this.emit('sync:mode-changed', { mode, options });
  }

  async getSyncStatus() {
    return {
      isWatching: this.isWatching,
      syncMode: this.syncMode,
      lastSyncTime: this.lastSyncTime,
      pendingOperationsCount: this.pendingOperations.size,
      totalOperations: this.operations.length,
    };
  }

  async getOperationHistory(limit = 100) {
    return this.operationLog.slice(-limit);
  }

  async resolveConflict(operationId, resolution) {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    try {
      switch (resolution.type) {
        case 'accept':
          await this.applyOperation(operation);
          break;
        case 'reject':
          // Do nothing, operation is rejected
          break;
        case 'merge':
          // Apply custom merge logic
          await this.applyMergedOperation(operation, resolution.mergedData);
          break;
      }

      this.pendingOperations.delete(operationId);
      this.emit('conflict:resolved', { operationId, resolution });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      this.emit('conflict:error', { operationId, error });
    }
  }

  async applyMergedOperation(operation, mergedData) {
    // Custom merge logic for different file types
    const filePath = path.join(this.collectionPath, operation.path);

    if (operation.path.endsWith('.bru')) {
      // Special handling for .bru files
      await this.mergeBruFile(filePath, mergedData);
    } else {
      // Default merge for other files
      await fs.writeFile(filePath, mergedData, 'utf8');
    }
  }

  async mergeBruFile(filePath, mergedData) {
    // Implement .bru file specific merge logic
    // This could include JSON merging, conflict resolution, etc.
    await fs.writeFile(filePath, mergedData, 'utf8');
  }

  async cleanup() {
    await this.stopWatching();

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.operations = [];
    this.operationLog = [];
    this.pendingOperations.clear();
  }
}

module.exports = SyncLayer;
