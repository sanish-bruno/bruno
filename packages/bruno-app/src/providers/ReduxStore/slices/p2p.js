import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks for P2P operations
export const startP2PEngine = createAsyncThunk('p2p/startEngine',
  async (_, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:start');
      if (result.success) {
        return result.peerInfo;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const stopP2PEngine = createAsyncThunk('p2p/stopEngine',
  async (_, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:stop');
      if (result.success) {
        return true;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const getP2PStatus = createAsyncThunk('p2p/getStatus',
  async (_, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:status');
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const createSpace = createAsyncThunk('p2p/createSpace',
  async ({ spaceId, options = {} }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:create-space', { spaceId, options });
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const joinSpace = createAsyncThunk('p2p/joinSpace',
  async ({ inviteLink }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:join-space', { inviteLink });
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const generateInvite = createAsyncThunk('p2p/generateInvite',
  async ({ spaceId }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:generate-invite', { spaceId });
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const getSpace = createAsyncThunk('p2p/getSpace',
  async ({ spaceId }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:get-space', { spaceId });
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const dialPeer = createAsyncThunk('p2p/dialPeer',
  async ({ peerId }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:dial-peer', { peerId });
      if (result.success) {
        return { peerId };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const getPeers = createAsyncThunk('p2p/getPeers',
  async (_, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:get-peers');
      if (result.success) {
        return result.data;
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const setCollectionPath = createAsyncThunk('p2p/setCollectionPath',
  async ({ spaceId, collectionPath }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:set-collection-path', { spaceId, collectionPath });
      if (result.success) {
        return { spaceId, collectionPath };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const syncWithPeers = createAsyncThunk('p2p/syncWithPeers',
  async ({ spaceId }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:sync-peers', { spaceId });
      if (result.success) {
        return { spaceId };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const setSyncMode = createAsyncThunk('p2p/setSyncMode',
  async ({ spaceId, mode, options = {} }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:set-sync-mode', { spaceId, mode, options });
      if (result.success) {
        return { spaceId, mode, options };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const getSyncStatus = createAsyncThunk('p2p/getSyncStatus',
  async ({ spaceId }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:get-sync-status', { spaceId });
      if (result.success) {
        return { spaceId, status: result.data };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

export const resolveConflict = createAsyncThunk('p2p/resolveConflict',
  async ({ spaceId, operationId, resolution }, { rejectWithValue }) => {
    try {
      const result = await window.ipcRenderer.invoke('p2p:resolve-conflict', { spaceId, operationId, resolution });
      if (result.success) {
        return { spaceId, operationId, resolution };
      } else {
        return rejectWithValue(result.error);
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

const initialState = {
  // Engine state
  isStarted: false,
  isStarting: false,
  isStopping: false,
  peerInfo: null,
  error: null,

  // Spaces
  spaces: {}, // spaceId -> space info
  activeSpaceId: null,

  // Peers
  peers: [], // connected peer IDs
  peerConnections: {}, // peerId -> connection info

  // UI state
  showP2PSettings: false,
  showInviteDialog: false,
  showConflictDialog: false,
  conflictData: null,

  // Sync state
  syncStatus: 'idle', // idle, syncing, error
  lastSyncTime: null,
  pendingOperations: [],
};

const p2pSlice = createSlice({
  name: 'p2p',
  initialState,
  reducers: {
    // UI actions
    toggleP2PSettings: state => {
      state.showP2PSettings = !state.showP2PSettings;
    },
    closeP2PSettings: state => {
      state.showP2PSettings = false;
    },
    showInviteDialog: (state, action) => {
      state.showInviteDialog = true;
      state.activeSpaceId = action.payload?.spaceId || null;
    },
    hideInviteDialog: state => {
      state.showInviteDialog = false;
      state.activeSpaceId = null;
    },
    showConflictDialog: (state, action) => {
      state.showConflictDialog = true;
      state.conflictData = action.payload;
    },
    hideConflictDialog: state => {
      state.showConflictDialog = false;
      state.conflictData = null;
    },
    setActiveSpace: (state, action) => {
      state.activeSpaceId = action.payload;
    },

    // Event handlers for IPC events from main process
    peerConnected: (state, action) => {
      const { peerId, connection } = action.payload;
      if (!state.peers.includes(peerId.toString())) {
        state.peers.push(peerId.toString());
      }
      state.peerConnections[peerId.toString()] = {
        peerId: peerId.toString(),
        connectedAt: Date.now(),
        connection,
      };
    },
    peerDisconnected: (state, action) => {
      const { peerId } = action.payload;
      state.peers = state.peers.filter(p => p !== peerId);
      delete state.peerConnections[peerId];
    },
    spaceCreated: (state, action) => {
      const { spaceId, space } = action.payload;
      state.spaces[spaceId] = {
        ...space,
        createdAt: Date.now(),
        isActive: true,
      };
    },
    spaceJoined: (state, action) => {
      const { spaceId, space } = action.payload;
      state.spaces[spaceId] = {
        ...space,
        joinedAt: Date.now(),
        isActive: true,
      };
    },
    syncStarted: state => {
      state.syncStatus = 'syncing';
    },
    syncCompleted: state => {
      state.syncStatus = 'idle';
      state.lastSyncTime = Date.now();
    },
    syncError: (state, action) => {
      state.syncStatus = 'error';
      state.error = action.payload;
    },
    addPendingOperation: (state, action) => {
      state.pendingOperations.push({
        id: Date.now(),
        ...action.payload,
        timestamp: Date.now(),
      });
    },
    removePendingOperation: (state, action) => {
      state.pendingOperations = state.pendingOperations.filter(op => op.id !== action.payload);
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Start P2P Engine
    builder
      .addCase(startP2PEngine.pending, state => {
        state.isStarting = true;
        state.error = null;
      })
      .addCase(startP2PEngine.fulfilled, (state, action) => {
        state.isStarting = false;
        state.isStarted = true;
        state.peerInfo = action.payload;
      })
      .addCase(startP2PEngine.rejected, (state, action) => {
        state.isStarting = false;
        state.error = action.payload;
      });

    // Stop P2P Engine
    builder
      .addCase(stopP2PEngine.pending, state => {
        state.isStopping = true;
        state.error = null;
      })
      .addCase(stopP2PEngine.fulfilled, state => {
        state.isStopping = false;
        state.isStarted = false;
        state.peerInfo = null;
        state.spaces = {};
        state.peers = [];
        state.peerConnections = {};
      })
      .addCase(stopP2PEngine.rejected, (state, action) => {
        state.isStopping = false;
        state.error = action.payload;
      });

    // Get P2P Status
    builder
      .addCase(getP2PStatus.fulfilled, (state, action) => {
        const { isStarted, peerInfo, connectedPeers } = action.payload;
        state.isStarted = isStarted;
        if (peerInfo) {
          state.peerInfo = peerInfo;
        }
        if (connectedPeers) {
          state.peers = connectedPeers;
        }
      });

    // Create Space
    builder
      .addCase(createSpace.fulfilled, (state, action) => {
        const { spaceId, space, inviteLink } = action.payload;
        state.spaces[spaceId] = {
          ...space,
          inviteLink,
          createdAt: Date.now(),
          isActive: true,
        };
        state.activeSpaceId = spaceId;
      })
      .addCase(createSpace.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Join Space
    builder
      .addCase(joinSpace.fulfilled, (state, action) => {
        const { spaceId, space } = action.payload;
        state.spaces[spaceId] = {
          ...space,
          joinedAt: Date.now(),
          isActive: true,
        };
        state.activeSpaceId = spaceId;
      })
      .addCase(joinSpace.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Generate Invite
    builder
      .addCase(generateInvite.fulfilled, (state, action) => {
        const { inviteLink } = action.payload;
        if (state.activeSpaceId && state.spaces[state.activeSpaceId]) {
          state.spaces[state.activeSpaceId].inviteLink = inviteLink;
        }
      })
      .addCase(generateInvite.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Get Space
    builder
      .addCase(getSpace.fulfilled, (state, action) => {
        const { spaceId, ...spaceData } = action.payload;
        state.spaces[spaceId] = {
          ...state.spaces[spaceId],
          ...spaceData,
        };
      });

    // Dial Peer
    builder
      .addCase(dialPeer.fulfilled, (state, action) => {
        const { peerId } = action.payload;
        if (!state.peers.includes(peerId)) {
          state.peers.push(peerId);
        }
      })
      .addCase(dialPeer.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Get Peers
    builder
      .addCase(getPeers.fulfilled, (state, action) => {
        state.peers = action.payload;
      });

    // Set Collection Path
    builder
      .addCase(setCollectionPath.fulfilled, (state, action) => {
        const { spaceId, collectionPath } = action.payload;
        if (state.spaces[spaceId]) {
          state.spaces[spaceId].collectionPath = collectionPath;
        }
      })
      .addCase(setCollectionPath.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Sync With Peers
    builder
      .addCase(syncWithPeers.pending, state => {
        state.syncStatus = 'syncing';
      })
      .addCase(syncWithPeers.fulfilled, (state, action) => {
        state.syncStatus = 'idle';
        state.lastSyncTime = Date.now();
      })
      .addCase(syncWithPeers.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.error = action.payload;
      });

    // Set Sync Mode
    builder
      .addCase(setSyncMode.fulfilled, (state, action) => {
        const { spaceId, mode, options } = action.payload;
        if (state.spaces[spaceId]) {
          state.spaces[spaceId].syncMode = mode;
          state.spaces[spaceId].syncOptions = options;
        }
      })
      .addCase(setSyncMode.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Get Sync Status
    builder
      .addCase(getSyncStatus.fulfilled, (state, action) => {
        const { spaceId, status } = action.payload;
        if (state.spaces[spaceId]) {
          state.spaces[spaceId].syncStatus = status;
        }
      })
      .addCase(getSyncStatus.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Resolve Conflict
    builder
      .addCase(resolveConflict.fulfilled, (state, action) => {
        const { operationId } = action.payload;
        state.pendingOperations = state.pendingOperations.filter(op => op.id !== operationId);
      })
      .addCase(resolveConflict.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  toggleP2PSettings,
  closeP2PSettings,
  showInviteDialog,
  hideInviteDialog,
  showConflictDialog,
  hideConflictDialog,
  setActiveSpace,
  peerConnected,
  peerDisconnected,
  spaceCreated,
  spaceJoined,
  syncStarted,
  syncCompleted,
  syncError,
  addPendingOperation,
  removePendingOperation,
  clearError,
} = p2pSlice.actions;

export default p2pSlice.reducer;
