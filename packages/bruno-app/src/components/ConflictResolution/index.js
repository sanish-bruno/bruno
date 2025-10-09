import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resolveConflict } from 'providers/ReduxStore/slices/p2p';
import { IconX, IconCheck, IconRefresh, IconFile, IconAlertTriangle } from '@tabler/icons';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const ConflictResolution = ({ conflict, onClose }) => {
  const dispatch = useDispatch();
  const { activeSpaceId } = useSelector(state => state.p2p);

  const [selectedResolution, setSelectedResolution] = useState('accept');
  const [mergedContent, setMergedContent] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (conflict && conflict.operation) {
      // Initialize merged content with the incoming operation's content
      setMergedContent(conflict.operation.data?.content || '');
    }
  }, [conflict]);

  if (!conflict) {
    return null;
  }

  const { operation, localContent, conflictType } = conflict;

  const handleResolve = async () => {
    if (!activeSpaceId) {
      toast.error('No active space selected');
      return;
    }

    setIsResolving(true);

    try {
      let resolution;

      switch (selectedResolution) {
        case 'accept':
          resolution = {
            type: 'accept',
            operation: operation,
          };
          break;
        case 'reject':
          resolution = {
            type: 'reject',
            operation: operation,
          };
          break;
        case 'merge':
          resolution = {
            type: 'merge',
            operation: operation,
            mergedData: mergedContent,
          };
          break;
        default:
          throw new Error('Invalid resolution type');
      }

      await dispatch(resolveConflict({
        spaceId: activeSpaceId,
        operationId: operation.id,
        resolution,
      })).unwrap();

      toast.success('Conflict resolved successfully');
      onClose();
    } catch (error) {
      toast.error(`Failed to resolve conflict: ${error}`);
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictDescription = () => {
    switch (conflictType) {
      case 'file_modified':
        return 'Both you and another peer modified the same file';
      case 'file_deleted':
        return 'You deleted a file that another peer modified';
      case 'file_created':
        return 'Both you and another peer created a file with the same name';
      default:
        return 'A conflict occurred during synchronization';
    }
  };

  const renderContentDiff = () => {
    if (!localContent && !operation.data?.content) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Your Version</h4>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm font-mono max-h-40 overflow-y-auto">
            {localContent || '(empty)'}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Incoming Version</h4>
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm font-mono max-h-40 overflow-y-auto">
            {operation.data?.content || '(empty)'}
          </div>
        </div>

        {selectedResolution === 'merge' && (
          <div>
            <h4 className="text-sm font-medium mb-2">Merged Version</h4>
            <textarea
              value={mergedContent}
              onChange={e => setMergedContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded text-sm font-mono max-h-40 resize-none"
              placeholder="Edit the merged content here..."
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <StyledWrapper className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <IconAlertTriangle className="text-orange-500" size={24} />
            <div>
              <h2 className="text-lg font-semibold">Resolve Conflict</h2>
              <p className="text-sm text-gray-600">{getConflictDescription()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* File Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <IconFile size={16} />
            <span className="font-medium">{operation.path}</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>
              Operation:
              {operation.type}
            </p>
            <p>
              Timestamp:
              {new Date(operation.timestamp).toLocaleString()}
            </p>
            <p>
              Space:
              {operation.spaceId}
            </p>
          </div>
        </div>

        {/* Content Diff */}
        {renderContentDiff()}

        {/* Resolution Options */}
        <div className="mt-6 space-y-4">
          <h3 className="text-md font-medium">Resolution</h3>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="accept"
                checked={selectedResolution === 'accept'}
                onChange={e => setSelectedResolution(e.target.value)}
                className="text-blue-600"
              />
              <div>
                <span className="font-medium">Accept Incoming</span>
                <p className="text-sm text-gray-600">Use the incoming version and discard your changes</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="reject"
                checked={selectedResolution === 'reject'}
                onChange={e => setSelectedResolution(e.target.value)}
                className="text-blue-600"
              />
              <div>
                <span className="font-medium">Reject Incoming</span>
                <p className="text-sm text-gray-600">Keep your version and ignore the incoming changes</p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={e => setSelectedResolution(e.target.value)}
                className="text-blue-600"
              />
              <div>
                <span className="font-medium">Merge Manually</span>
                <p className="text-sm text-gray-600">Manually combine both versions</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            disabled={isResolving}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving || (selectedResolution === 'merge' && !mergedContent.trim())}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isResolving ? (
              <>
                <IconRefresh size={16} className="animate-spin" />
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <IconCheck size={16} />
                <span>Resolve</span>
              </>
            )}
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default ConflictResolution;
