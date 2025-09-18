import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { deleteResponseExample, updateResponseExample, addResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { IconBookmark, IconDots } from '@tabler/icons';
import range from 'lodash/range';
import Dropdown from 'components/Dropdown';
import Modal from 'components/Modal';
import DeleteExampleModal from './DeleteExampleModal';
import StyledWrapper from './StyledWrapper';

const ExampleItem = ({ example, item, collection }) => {
  const dispatch = useDispatch();
  const [editName, setEditName] = useState(example.name);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dropdownTippyRef = useRef(null);

  // Calculate indentation: item depth + 1 for examples
  const indents = range((item.depth || 0) + 1);

  const handleExampleClick = () => {
    dispatch(
      addTab({
        uid: `example-${item.uid}-${example.id}`,
        collectionUid: collection.uid,
        type: 'response-example',
        itemUid: item.uid,
        exampleId: example.id
      })
    );
  };

  const handleRename = () => {
    setEditName(example.name); // Set current name when opening modal
    setShowRenameModal(true);
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  // Update editName when example changes
  useEffect(() => {
    setEditName(example.name);
  }, [example.name]);

  const handleClone = () => {
    const clonedExample = {
      name: `${example.name} (Copy)`,
      status: example.status,
      headers: example.headers,
      body: example.body,
      description: example.description
    };

    dispatch(
      addResponseExample({
        itemUid: item.uid,
        collectionUid: collection.uid,
        example: clonedExample
      })
    );
    dispatch(saveRequest(item.uid, collection.uid));
    
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
    if (dropdownTippyRef.current) {
      dropdownTippyRef.current.hide();
    }
  };

  const handleRenameConfirm = (newName) => {
    // Find the example index in the original examples array
    const examples = item.request?.examples || [];
    const exampleIndex = examples.findIndex(ex => ex.meta?.name === example.name);
    
    if (exampleIndex !== -1) {
      dispatch(updateResponseExample({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleId: exampleIndex.toString(),
        example: {
          name: newName,
          status: example.status,
          headers: example.headers,
          body: example.body,
          description: example.description
        }
      }));
      dispatch(saveRequest(item.uid, collection.uid));
    }
    setShowRenameModal(false);
  };

  const onDropdownCreate = (instance) => {
    dropdownTippyRef.current = instance;
  };

  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22} />
      </div>
    );
  });


  return (
    <StyledWrapper 
      className="flex collection-item-name relative items-center"
      onClick={handleExampleClick}
    >
      {indents && indents.length
        ? indents.map((i) => (
            <div
              className="indent-block"
              key={i}
              style={{ width: 16, minWidth: 16, height: '100%' }}
            >
              &nbsp;{/* Indent */}
            </div>
          ))
        : null}
      <div
        className="flex flex-grow items-center h-full overflow-hidden"
        style={{ paddingLeft: 8 }}
      >
        <IconBookmark size={16} className="mr-2 text-gray-400" />
        <span className="item-name truncate text-gray-700 dark:text-gray-300">
          {example.name}
        </span>
      </div>
      <div className="menu-icon pr-2">
        <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
          <div
            className="dropdown-item"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleRename();
            }}
          >
            Rename
          </div>
          <div
            className="dropdown-item"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleClone();
            }}
          >
            Clone
          </div>
          <div
            className="dropdown-item text-red-600"
            onClick={(e) => {
              dropdownTippyRef.current.hide();
              handleDelete();
            }}
          >
            Delete
          </div>
        </Dropdown>
      </div>
      
      {showRenameModal && (
        <Modal
          size="sm"
          title="Rename Example"
          handleCancel={() => {
            setShowRenameModal(false);
            setEditName(example.name); // Reset to original name on cancel
          }}
          handleConfirm={() => handleRenameConfirm(editName)}
          confirmText="Rename"
          cancelText="Cancel"
          confirmDisabled={!editName.trim()}
        >
          <div>
            <label htmlFor="renameExampleName" className="block font-semibold">
              Example Name
            </label>
            <input
              id="renameExampleName"
              type="text"
              className="textbox mt-2"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter example name..."
              autoFocus
              required
            />
          </div>
        </Modal>
      )}
      
      {showDeleteModal && (
        <DeleteExampleModal
          onClose={() => setShowDeleteModal(false)}
          example={example}
          item={item}
          collection={collection}
        />
      )}
    </StyledWrapper>
  );
};

export default ExampleItem;
