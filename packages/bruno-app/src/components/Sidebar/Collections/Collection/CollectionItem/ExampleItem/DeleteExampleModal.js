import React from 'react';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const DeleteExampleModal = ({ onClose, example, item, collection }) => {
  const dispatch = useDispatch();

  const onConfirm = () => {
    // Find the example index in the original examples array
    const examples = item.request?.examples || [];
    const exampleIndex = examples.findIndex(ex => ex.meta?.name === example.name);
    
    if (exampleIndex !== -1) {
      dispatch(deleteResponseExample({ 
        itemUid: item.uid, 
        collectionUid: collection.uid, 
        exampleId: exampleIndex.toString()
      }));
      dispatch(saveRequest(item.uid, collection.uid));
    }
    onClose();
  };

  return (
    <StyledWrapper>
      <Modal
        size="sm"
        title="Delete Example"
        confirmText="Delete"
        handleConfirm={onConfirm}
        handleCancel={onClose}
        confirmButtonClass="btn-danger"
      >
        Are you sure you want to delete the example <span className="font-semibold">{example.name}</span>?
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteExampleModal;
