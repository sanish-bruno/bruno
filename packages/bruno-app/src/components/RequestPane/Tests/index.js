import React, { useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { IconBrain } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import AIGenerateTests from './AIGenerateTests';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');
  const [showAIGenerate, setShowAIGenerate] = useState(false);

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const aiSettings = preferences.ai || {};

  const onEdit = (value) => {
    dispatch(
      updateRequestTests({
        tests: value,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  const handleAITestsGenerated = (testCode) => {
    // Append the generated tests to existing tests
    const existingTests = tests || '';
    const newTests = existingTests ? `${existingTests}\n\n${testCode}` : testCode;
    onEdit(newTests);
  };

  const getRequestData = () => {
    const request = item.draft ? item.draft.request : item.request;
    return {
      method: request.method,
      url: request.url,
      headers: request.headers || [],
      body: request.body
    };
  };

  const getResponseData = () => {
    // This would need to be connected to the actual response data
    // For now, return null as we don't have access to the response
    return null;
  };

  if (showAIGenerate) {
    return (
      <AIGenerateTests
        request={getRequestData()}
        response={getResponseData()}
        existingTests={tests || ''}
        onClose={() => setShowAIGenerate(false)}
        onTestsGenerated={handleAITestsGenerated}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* AI Generation Button */}
      {aiSettings.enabled && (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <IconBrain size={16} className="text-blue-600" />
            <span className="text-sm font-medium">AI Test Generation</span>
          </div>
          <button
            onClick={() => setShowAIGenerate(true)}
            className="btn btn-sm btn-outline flex items-center gap-2"
          >
            <IconBrain size={14} />
            Generate Tests
          </button>
        </div>
      )}

      {/* Code Editor */}
      <div className="flex-1">
        <CodeEditor
          collection={collection}
          value={tests || ''}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          onEdit={onEdit}
          mode="javascript"
          onRun={onRun}
          onSave={onSave}
          showHintsFor={['req', 'res', 'bru']}
        />
      </div>
    </div>
  );
};

export default Tests;
