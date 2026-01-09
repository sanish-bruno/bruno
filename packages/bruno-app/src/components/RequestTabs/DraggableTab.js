import React from 'react';
import { useDrag, useDrop } from 'react-dnd';

// Drag types
export const TAB_DRAG_TYPE = 'tab';

const DraggableTab = ({
  id,
  onMoveTab,
  index,
  children,
  className,
  onClick,
  pinned = false
}) => {
  const ref = React.useRef(null);

  const [{ handlerId, isOver }, drop] = useDrop({
    accept: TAB_DRAG_TYPE,
    hover(item, monitor) {
      // Only trigger move if tabs are in the same zone (both pinned or both unpinned)
      const isSameZone = item.pinned === pinned;

      if (isSameZone) {
        onMoveTab(item.id, id);
      }
    },
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
      isOver: monitor.isOver()
    })
  });

  const [{ isDragging }, drag] = useDrag({
    type: TAB_DRAG_TYPE,
    item: () => {
      return { id, index, pinned };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: 'move'
    }
  });

  drag(drop(ref));

  return (
    <li
      className={className}
      ref={ref}
      role="tab"
      style={{ opacity: isDragging || isOver ? 0 : 1 }}
      onClick={onClick}
      data-handler-id={handlerId}
    >
      {children}
    </li>
  );
};

export default DraggableTab;
