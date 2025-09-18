import React from 'react';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { IconBookmark } from '@tabler/icons';
import range from 'lodash/range';
import StyledWrapper from './StyledWrapper';

const ExampleItem = ({ example, item, collection }) => {
  const dispatch = useDispatch();

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


  return (
    <StyledWrapper 
      className="flex items-center h-full w-full hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
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
        <IconBookmark size={16} className="mr-2 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        <span className="truncate text-gray-700 dark:text-gray-300">
          {example.name}
        </span>
      </div>
    </StyledWrapper>
  );
};

export default ExampleItem;
