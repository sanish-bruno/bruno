import React, { useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import PawAssist from 'components/PawAssist';
import { updateRequestTests } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';

const Tests = ({ item, collection }) => {
  const dispatch = useDispatch();
  const tests = item.draft ? get(item, 'draft.request.tests') : get(item, 'request.tests');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Ref for editor instance
  const editorRef = useRef(null);

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

  return (
    <div className="w-full flex flex-col relative">
      <div className="flex items-center justify-between mb-2">
        <div className="title text-xs">Tests</div>
        <PawAssist scriptType="test" editorRef={editorRef} />
      </div>
      <CodeEditor
        ref={editorRef}
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
  );
};

export default Tests;
