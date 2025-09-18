import React, { useState } from 'react';
import Modal from 'components/Modal';

const NameExampleModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <Modal
      size="sm"
      title="Name Response Example"
      handleCancel={onClose}
      handleConfirm={handleConfirm}
      confirmText="Save Example"
      cancelText="Cancel"
      confirmDisabled={!name.trim()}
    >
      <div>
        <label htmlFor="exampleName" className="block font-semibold">
          Example Name
        </label>
        <input
          id="exampleName"
          type="text"
          className="textbox mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter example name..."
          autoFocus
          required
        />
      </div>
    </Modal>
  );
};

export default NameExampleModal;
