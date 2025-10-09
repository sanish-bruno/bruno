import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  startP2PEngine,
  stopP2PEngine,
  getP2PStatus,
  createSpace,
  joinSpace,
  generateInvite,
  getPeers,
  setCollectionPath,
  syncWithPeers,
  setSyncMode,
  getSyncStatus,
  toggleP2PSettings,
  showInviteDialog,
  setActiveSpace,
  peerConnected,
  peerDisconnected,
  spaceCreated,
  spaceJoined,
} from 'providers/ReduxStore/slices/p2p';
import { IconX, IconWifi, IconWifiOff, IconUsers, IconPlus, IconShare, IconCopy, IconCheck, IconRefresh, IconSettings } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import ConflictResolution from '../ConflictResolution';

const P2PSettings = () => {
  const dispatch = useDispatch();
  const {
    isStarted,
    isStarting,
    isStopping,
    peerInfo,
    spaces,
    activeSpaceId,
    peers,
    error,
    syncStatus,
  } = useSelector(state => state.p2p);

  const [inviteLink, setInviteLink] = useState('');
  const [joinInviteLink, setJoinInviteLink] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncMode, setSyncMode] = useState('manual');
  const [syncInterval, setSyncInterval] = useState(30);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [currentConflict, setCurrentConflict] = useState(null);

  useEffect(() => {
    // Load initial status
    dispatch(getP2PStatus());

    // Set up event listeners for P2P events
    const handlePeerConnected = data => {
      dispatch(peerConnected(data));
    };

    const handlePeerDisconnected = data => {
      dispatch(peerDisconnected(data));
    };

    const handleSpaceCreated = data => {
      dispatch(spaceCreated(data));
    };

    const handleSpaceJoined = data => {
      dispatch(spaceJoined(data));
    };

    let removePeerConnectedListener;
    let removePeerDisconnectedListener;
    let removeSpaceCreatedListener;
    let removeSpaceJoinedListener;

    if (window.ipcRenderer) {
      removePeerConnectedListener = window.ipcRenderer.on('p2p:peer-connected', handlePeerConnected);
      removePeerDisconnectedListener = window.ipcRenderer.on('p2p:peer-disconnected', handlePeerDisconnected);
      removeSpaceCreatedListener = window.ipcRenderer.on('p2p:space-created', handleSpaceCreated);
      removeSpaceJoinedListener = window.ipcRenderer.on('p2p:space-joined', handleSpaceJoined);
    }

    return () => {
      if (removePeerConnectedListener) removePeerConnectedListener();
      if (removePeerDisconnectedListener) removePeerDisconnectedListener();
      if (removeSpaceCreatedListener) removeSpaceCreatedListener();
      if (removeSpaceJoinedListener) removeSpaceJoinedListener();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isStarted) {
      dispatch(getPeers());
    }
  }, [isStarted, dispatch]);

  const handleStartP2P = async () => {
    try {
      console.log('Starting P2P Engine...');
      const result = await dispatch(startP2PEngine()).unwrap();
      console.log('P2P Engine started:', result);
      toast.success('P2P Engine started successfully');
    } catch (error) {
      console.error('P2P Engine start error:', error);
      toast.error(`Failed to start P2P Engine: ${error}`);
    }
  };

  const handleStopP2P = async () => {
    try {
      await dispatch(stopP2PEngine()).unwrap();
      toast.success('P2P Engine stopped');
    } catch (error) {
      toast.error(`Failed to stop P2P Engine: ${error}`);
    }
  };

  const handleCreateSpace = async () => {
    if (!spaceName.trim()) {
      toast.error('Please enter a space name');
      return;
    }

    try {
      console.log('Creating space with name:', spaceName);
      const spaceId = spaceName.toLowerCase().replace(/\s+/g, '-');
      console.log('Generated space ID:', spaceId);

      const result = await dispatch(createSpace({ spaceId, options: { name: spaceName } })).unwrap();
      console.log('Space creation result:', result);
      setInviteLink(result.inviteLink);
      setShowCreateDialog(false);
      setSpaceName('');
      toast.success('Space created successfully');
    } catch (error) {
      console.error('Space creation error:', error);
      toast.error(`Failed to create space: ${error}`);
    }
  };

  const handleJoinSpace = async () => {
    if (!joinInviteLink.trim()) {
      toast.error('Please enter an invite link');
      return;
    }

    try {
      await dispatch(joinSpace({ inviteLink: joinInviteLink })).unwrap();
      setJoinInviteLink('');
      setShowJoinDialog(false);
      toast.success('Successfully joined space');
    } catch (error) {
      toast.error(`Failed to join space: ${error}`);
    }
  };

  const handleGenerateInvite = async spaceId => {
    try {
      const result = await dispatch(generateInvite({ spaceId })).unwrap();
      setInviteLink(result.inviteLink);
    } catch (error) {
      toast.error(`Failed to generate invite: ${error}`);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy invite link');
    }
  };

  const handleSyncNow = async () => {
    if (!activeSpaceId) {
      toast.error('No active space selected');
      return;
    }

    try {
      await dispatch(syncWithPeers({ spaceId: activeSpaceId })).unwrap();
      toast.success('Sync completed');
    } catch (error) {
      toast.error(`Sync failed: ${error}`);
    }
  };

  const handleSetSyncMode = async () => {
    if (!activeSpaceId) {
      toast.error('No active space selected');
      return;
    }

    try {
      const options = syncMode === 'scheduled' ? { interval: syncInterval * 1000 } : {};
      await dispatch(setSyncMode({ spaceId: activeSpaceId, mode: syncMode, options })).unwrap();
      toast.success('Sync mode updated');
      setShowSyncSettings(false);
    } catch (error) {
      toast.error(`Failed to set sync mode: ${error}`);
    }
  };

  const handleSetCollectionPath = async (spaceId, collectionPath) => {
    try {
      await dispatch(setCollectionPath({ spaceId, collectionPath })).unwrap();
      toast.success('Collection path set');
    } catch (error) {
      toast.error(`Failed to set collection path: ${error}`);
    }
  };

  const handleShowConflict = conflict => {
    setCurrentConflict(conflict);
    setShowConflictResolution(true);
  };

  const handleCloseConflict = () => {
    setCurrentConflict(null);
    setShowConflictResolution(false);
  };

  const activeSpace = activeSpaceId ? spaces[activeSpaceId] : null;

  return (
    <StyledWrapper className="h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">P2P Sync Settings</h2>
          <button
            onClick={() => dispatch(toggleP2PSettings())}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* P2P Engine Status */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">P2P Engine</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {isStarted ? (
                  <IconWifi className="text-green-500" size={24} />
                ) : (
                  <IconWifiOff className="text-gray-400" size={24} />
                )}
                <div>
                  <p className="font-medium">
                    {isStarted ? 'Connected' : 'Disconnected'}
                  </p>
                  {peerInfo && (
                    <p className="text-sm text-gray-600">
                      Peer ID:
                      {' '}
                      {peerInfo.peerId?.substring(0, 12)}
                      ...
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                {!isStarted ? (
                  <button
                    onClick={handleStartP2P}
                    disabled={isStarting}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isStarting ? 'Starting...' : 'Start'}
                  </button>
                ) : (
                  <button
                    onClick={handleStopP2P}
                    disabled={isStopping}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isStopping ? 'Stopping...' : 'Stop'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Connected Peers */}
          {isStarted && (
            <div className="space-y-4">
              <h3 className="text-md font-medium">Connected Peers</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                {peers.length > 0 ? (
                  <div className="space-y-2">
                    {peers.map(peerId => (
                      <div key={peerId} className="flex items-center space-x-2">
                        <IconUsers size={16} className="text-green-500" />
                        <span className="text-sm font-mono">
                          {peerId.substring(0, 12)}
                          ...
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No peers connected</p>
                )}
              </div>
            </div>
          )}

          {/* Sync Controls */}
          {activeSpace && (
            <div className="space-y-4">
              <h3 className="text-md font-medium">Sync Controls</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">
                      Active Space:
                      {activeSpace.name || activeSpaceId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mode:
                      {' '}
                      {activeSpace.syncMode || 'manual'}
                      {' '}
                      |
                      Status:
                      {' '}
                      {activeSpace.syncStatus?.isWatching ? 'Watching' : 'Not watching'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSyncNow}
                      disabled={syncStatus === 'syncing'}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      <IconRefresh size={16} className="inline mr-1" />
                      {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => setShowSyncSettings(true)}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      <IconSettings size={16} className="inline mr-1" />
                      Settings
                    </button>
                  </div>
                </div>
                {activeSpace.syncStatus && (
                  <div className="text-sm text-gray-600">
                    <p>
                      Last sync:
                      {activeSpace.syncStatus.lastSyncTime ? new Date(activeSpace.syncStatus.lastSyncTime).toLocaleString() : 'Never'}
                    </p>
                    <p>
                      Pending operations:
                      {activeSpace.syncStatus.pendingOperationsCount || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spaces */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium">Spaces</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowJoinDialog(true)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Join Space
                </button>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <IconPlus size={16} className="inline mr-1" />
                  Create Space
                </button>
              </div>
            </div>

            {Object.keys(spaces).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(spaces).map(([spaceId, space]) => (
                  <div key={spaceId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{space.name || spaceId}</p>
                        <p className="text-sm text-gray-600">
                          ID:
                          {spaceId}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleGenerateInvite(spaceId)}
                          className="p-1 text-gray-600 hover:text-blue-600"
                          title="Generate Invite"
                        >
                          <IconShare size={16} />
                        </button>
                        <button
                          onClick={() => dispatch(setActiveSpace(spaceId))}
                          className={`px-2 py-1 text-xs rounded ${
                            activeSpaceId === spaceId
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {activeSpaceId === spaceId ? 'Active' : 'Select'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No spaces created yet</p>
            )}
          </div>

          {/* Create Space Dialog */}
          {showCreateDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Create Space</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Space Name</label>
                    <input
                      type="text"
                      value={spaceName}
                      onChange={e => setSpaceName(e.target.value)}
                      placeholder="Enter space name"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCreateDialog(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSpace}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Join Space Dialog */}
          {showJoinDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Join Space</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Invite Link</label>
                    <input
                      type="text"
                      value={joinInviteLink}
                      onChange={e => setJoinInviteLink(e.target.value)}
                      placeholder="bruno+p2p://join?space=..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowJoinDialog(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleJoinSpace}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invite Link Display */}
          {inviteLink && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Invite Link</h3>
                <button
                  onClick={() => setInviteLink('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyInvite}
                    className="p-2 text-gray-600 hover:text-blue-600"
                    title="Copy invite link"
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Share this link with others to invite them to your space
                </p>
              </div>
            </div>
          )}

          {/* Sync Settings Dialog */}
          {showSyncSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Sync Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Sync Mode</label>
                    <select
                      value={syncMode}
                      onChange={e => setSyncMode(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="manual">Manual</option>
                      <option value="auto">Auto</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                  {syncMode === 'scheduled' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Sync Interval (seconds)</label>
                      <input
                        type="number"
                        value={syncInterval}
                        onChange={e => setSyncInterval(parseInt(e.target.value))}
                        min="10"
                        max="3600"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowSyncSettings(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetSyncMode}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Conflict Resolution */}
        {showConflictResolution && (
          <ConflictResolution
            conflict={currentConflict}
            onClose={handleCloseConflict}
          />
        )}
      </div>
    </StyledWrapper>
  );
};

export default P2PSettings;
