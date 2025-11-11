import React from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { updateRequestHooks } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';

const Hooks = ({ item, collection }) => {
  const dispatch = useDispatch();
  const hooks = item.draft ? get(item, 'draft.request.hooks') : get(item, 'request.hooks');

  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const onEdit = (value) => {
    dispatch(updateRequestHooks({
      hooks: value,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };

  const onRun = () => dispatch(sendRequest(item, collection.uid));
  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <CodeEditor
      collection={collection}
      value={hooks || ''}
      theme={displayedTheme}
      font={get(preferences, 'font.codeFont', 'default')}
      fontSize={get(preferences, 'font.codeFontSize')}
      onEdit={onEdit}
      mode="javascript"
      onRun={onRun}
      onSave={onSave}
      showHintsFor={['req', 'res', 'bru']}
    />
  );
};

export default Hooks;
