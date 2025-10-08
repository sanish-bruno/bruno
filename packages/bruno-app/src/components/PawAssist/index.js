import React, { useState, useRef, useEffect } from 'react';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import { useSelector } from 'react-redux';
import PawAssistButton from './PawAssistButton';
import PawAssistPanel from './PawAssistPanel';

const PawAssist = ({ scriptType = 'pre', editorRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const isPawAssistEnabled = useBetaFeature(BETA_FEATURES.PAW_ASSIST);
  const preferences = useSelector((state) => state.app.preferences);

  useEffect(() => {
    // Check if Paw Assist is properly configured
    const pawAssistConfig = preferences?.pawAssist;
    const hasValidConfig = pawAssistConfig?.enabled
      && pawAssistConfig?.provider
      && pawAssistConfig?.apiKey
      && pawAssistConfig?.model;

    setIsConfigured(!!hasValidConfig);
  }, [preferences]);

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  // Don't render if feature is not enabled or not configured
  if (!isPawAssistEnabled || !isConfigured) {
    return null;
  }

  return (
    <>
      <PawAssistButton
        onClick={handleToggle}
        isActive={isVisible}
      />
      <PawAssistPanel
        scriptType={scriptType}
        editorRef={editorRef}
        isVisible={isVisible}
        onClose={handleClose}
      />
    </>
  );
};

export default PawAssist;
