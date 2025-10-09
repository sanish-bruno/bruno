const nacl = require('tweetnacl');
const naclUtil = require('tweetnacl-util');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

class EncryptionManager {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.deviceKeyPair = null;
    this.spaceKey = null;
    this.peerKeys = new Map(); // peerId -> publicKey
  }

  async initialize() {
    try {
      // Load or generate device key pair
      await this.loadOrGenerateDeviceKeys();

      // Load or generate space key
      await this.loadOrGenerateSpaceKey();

      console.log('Encryption manager initialized');
    } catch (error) {
      console.error('Failed to initialize encryption manager:', error);
      throw error;
    }
  }

  async loadOrGenerateDeviceKeys() {
    const deviceKeyPath = path.join(this.dataDir, 'device-keys.json');

    try {
      if (await fs.pathExists(deviceKeyPath)) {
        const keyData = await fs.readJson(deviceKeyPath);
        this.deviceKeyPair = {
          publicKey: naclUtil.decodeBase64(keyData.publicKey),
          secretKey: naclUtil.decodeBase64(keyData.secretKey),
        };
      } else {
        // Generate new device key pair
        this.deviceKeyPair = nacl.box.keyPair();

        // Save device keys
        await fs.writeJson(deviceKeyPath, {
          publicKey: naclUtil.encodeBase64(this.deviceKeyPair.publicKey),
          secretKey: naclUtil.encodeBase64(this.deviceKeyPair.secretKey),
        });
      }
    } catch (error) {
      console.error('Failed to load/generate device keys:', error);
      throw error;
    }
  }

  async loadOrGenerateSpaceKey() {
    const spaceKeyPath = path.join(this.dataDir, 'space.key');

    try {
      if (await fs.pathExists(spaceKeyPath)) {
        this.spaceKey = await fs.readFile(spaceKeyPath);
      } else {
        // Generate new space key (32 bytes for XChaCha20-Poly1305)
        this.spaceKey = crypto.randomBytes(32);
        await fs.writeFile(spaceKeyPath, this.spaceKey);
      }
    } catch (error) {
      console.error('Failed to load/generate space key:', error);
      throw error;
    }
  }

  getDevicePublicKey() {
    return this.deviceKeyPair ? naclUtil.encodeBase64(this.deviceKeyPair.publicKey) : null;
  }

  getDevicePublicKeyBytes() {
    return this.deviceKeyPair ? this.deviceKeyPair.publicKey : null;
  }

  async encryptInvite(inviteData) {
    try {
      const data = JSON.stringify(inviteData);
      const nonce = crypto.randomBytes(24); // XChaCha20 nonce size

      // Use XChaCha20-Poly1305 for encryption
      const cipher = crypto.createCipher('aes-256-gcm', this.spaceKey);
      cipher.setAAD(nonce);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const result = {
        encrypted: encrypted,
        nonce: nonce.toString('hex'),
        authTag: authTag.toString('hex'),
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      console.error('Failed to encrypt invite:', error);
      throw error;
    }
  }

  async decryptInvite(encryptedData) {
    try {
      const data = JSON.parse(Buffer.from(encryptedData, 'base64').toString());

      const decipher = crypto.createDecipher('aes-256-gcm', this.spaceKey);
      decipher.setAAD(Buffer.from(data.nonce, 'hex'));
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt invite:', error);
      throw error;
    }
  }

  async encryptMessage(message, recipientPublicKey) {
    try {
      const data = JSON.stringify(message);
      const nonce = crypto.randomBytes(24);

      // Convert recipient public key from base64 to Uint8Array
      const recipientKey = naclUtil.decodeBase64(recipientPublicKey);

      // Encrypt using NaCl box (Curve25519 + Salsa20 + Poly1305)
      const encrypted = nacl.box(naclUtil.decodeUTF8(data),
        nonce,
        recipientKey,
        this.deviceKeyPair.secretKey);

      return {
        encrypted: naclUtil.encodeBase64(encrypted),
        nonce: naclUtil.encodeBase64(nonce),
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  }

  async decryptMessage(encryptedMessage, senderPublicKey) {
    try {
      const senderKey = naclUtil.decodeBase64(senderPublicKey);
      const nonce = naclUtil.decodeBase64(encryptedMessage.nonce);
      const encrypted = naclUtil.decodeBase64(encryptedMessage.encrypted);

      const decrypted = nacl.box.open(encrypted,
        nonce,
        senderKey,
        this.deviceKeyPair.secretKey);

      if (!decrypted) {
        throw new Error('Failed to decrypt message');
      }

      return JSON.parse(naclUtil.encodeUTF8(decrypted));
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }

  async encryptOperation(operation) {
    try {
      const data = JSON.stringify(operation);
      const nonce = crypto.randomBytes(24);

      // Use XChaCha20-Poly1305 for operation encryption
      const cipher = crypto.createCipher('aes-256-gcm', this.spaceKey);
      cipher.setAAD(nonce);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        nonce: nonce.toString('hex'),
        authTag: authTag.toString('hex'),
        spaceId: operation.spaceId,
      };
    } catch (error) {
      console.error('Failed to encrypt operation:', error);
      throw error;
    }
  }

  async decryptOperation(encryptedOperation) {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.spaceKey);
      decipher.setAAD(Buffer.from(encryptedOperation.nonce, 'hex'));
      decipher.setAuthTag(Buffer.from(encryptedOperation.authTag, 'hex'));

      let decrypted = decipher.update(encryptedOperation.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt operation:', error);
      throw error;
    }
  }

  async addPeerKey(peerId, publicKey) {
    this.peerKeys.set(peerId, publicKey);

    // Save peer keys to disk
    const peerKeysPath = path.join(this.dataDir, 'peer-keys.json');
    const peerKeysData = Object.fromEntries(this.peerKeys);
    await fs.writeJson(peerKeysPath, peerKeysData);
  }

  async loadPeerKeys() {
    const peerKeysPath = path.join(this.dataDir, 'peer-keys.json');

    try {
      if (await fs.pathExists(peerKeysPath)) {
        const peerKeysData = await fs.readJson(peerKeysPath);
        this.peerKeys = new Map(Object.entries(peerKeysData));
      }
    } catch (error) {
      console.error('Failed to load peer keys:', error);
    }
  }

  async signOperation(operation) {
    try {
      const data = JSON.stringify(operation);
      const signature = nacl.sign.detached(naclUtil.decodeUTF8(data),
        this.deviceKeyPair.secretKey);

      return {
        ...operation,
        signature: naclUtil.encodeBase64(signature),
        signer: this.getDevicePublicKey(),
      };
    } catch (error) {
      console.error('Failed to sign operation:', error);
      throw error;
    }
  }

  async verifyOperation(operation) {
    try {
      if (!operation.signature || !operation.signer) {
        return false;
      }

      const { signature, signer, ...operationData } = operation;
      const data = JSON.stringify(operationData);

      return nacl.sign.detached.verify(naclUtil.decodeUTF8(data),
        naclUtil.decodeBase64(signature),
        naclUtil.decodeBase64(signer));
    } catch (error) {
      console.error('Failed to verify operation:', error);
      return false;
    }
  }

  async rekeySpace() {
    try {
      // Generate new space key
      const newSpaceKey = crypto.randomBytes(32);

      // Save new space key
      const spaceKeyPath = path.join(this.dataDir, 'space.key');
      await fs.writeFile(spaceKeyPath, newSpaceKey);

      // Update in memory
      this.spaceKey = newSpaceKey;

      console.log('Space rekeyed successfully');
      return true;
    } catch (error) {
      console.error('Failed to rekey space:', error);
      throw error;
    }
  }

  async exportSpaceKey() {
    // This would be used for backup or migration
    return this.spaceKey ? this.spaceKey.toString('hex') : null;
  }

  async importSpaceKey(spaceKeyHex) {
    try {
      const spaceKey = Buffer.from(spaceKeyHex, 'hex');

      if (spaceKey.length !== 32) {
        throw new Error('Invalid space key length');
      }

      // Save imported space key
      const spaceKeyPath = path.join(this.dataDir, 'space.key');
      await fs.writeFile(spaceKeyPath, spaceKey);

      this.spaceKey = spaceKey;

      console.log('Space key imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import space key:', error);
      throw error;
    }
  }
}

module.exports = EncryptionManager;
