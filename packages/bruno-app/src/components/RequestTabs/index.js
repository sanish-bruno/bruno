import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import find from 'lodash/find';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import {
  focusTab,
  reorderTabs,
  reorderPinnedTabs
} from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import CollectionToolBar from './CollectionToolBar';
import RequestTab from './RequestTab';
import StyledWrapper from './StyledWrapper';
import DraggableTab from './DraggableTab';
import { IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon/index';

const RequestTabs = () => {
  const dispatch = useDispatch();
  const tabsRef = useRef();
  const scrollContainerRef = useRef();
  const collectionTabsRef = useRef();
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [tabOverflowStates, setTabOverflowStates] = useState({});
  const [showChevrons, setShowChevrons] = useState(false);
  const tabs = useSelector((state) => state.tabs.tabs);
  const pinnedTabOrder = useSelector((state) => state.tabs.pinnedTabOrder);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const collections = useSelector((state) => state.collections.collections);
  const leftSidebarWidth = useSelector((state) => state.app.leftSidebarWidth);
  const sidebarCollapsed = useSelector((state) => state.app.sidebarCollapsed);
  const screenWidth = useSelector((state) => state.app.screenWidth);

  const createSetHasOverflow = useCallback((tabUid) => {
    return (hasOverflow) => {
      setTabOverflowStates((prev) => {
        if (prev[tabUid] === hasOverflow) {
          return prev;
        }
        return {
          ...prev,
          [tabUid]: hasOverflow
        };
      });
    };
  }, []);

  const activeTab = find(tabs, (t) => t.uid === activeTabUid);
  const activeCollection = find(collections, (c) => c.uid === activeTab?.collectionUid);
  const collectionRequestTabs = filter(tabs, (t) => t.collectionUid === activeTab?.collectionUid);

  // Separate pinned and unpinned tabs
  const { pinnedTabs, unpinnedTabs } = useMemo(() => {
    const pinned = [];
    const unpinned = [];

    // Sort pinned tabs by their order in pinnedTabOrder
    const collectionPinnedOrder = pinnedTabOrder.filter((uid) =>
      collectionRequestTabs.some((t) => t.uid === uid)
    );

    collectionRequestTabs.forEach((tab) => {
      if (tab.pinned) {
        pinned.push(tab);
      } else {
        unpinned.push(tab);
      }
    });

    // Sort pinned tabs according to pinnedTabOrder
    pinned.sort((a, b) => {
      const aIdx = collectionPinnedOrder.indexOf(a.uid);
      const bIdx = collectionPinnedOrder.indexOf(b.uid);
      return aIdx - bIdx;
    });

    return { pinnedTabs: pinned, unpinnedTabs: unpinned };
  }, [collectionRequestTabs, pinnedTabOrder]);

  useEffect(() => {
    if (!activeTabUid || !activeTab) return;

    const checkOverflow = () => {
      if (tabsRef.current && scrollContainerRef.current) {
        const hasOverflow = tabsRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
        setShowChevrons(hasOverflow);
      }
    };

    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [activeTabUid, activeTab, collectionRequestTabs.length, screenWidth, leftSidebarWidth, sidebarCollapsed]);

  const getTabClassname = (tab, index, isPinned = false) => {
    return classnames('request-tab select-none', {
      'active': tab.uid === activeTabUid,
      'last-tab': tabs && tabs.length && index === tabs.length - 1,
      'has-overflow': tabOverflowStates[tab.uid],
      'pinned-tab': isPinned
    });
  };

  const handleClick = (tab) => {
    dispatch(
      focusTab({
        uid: tab.uid
      })
    );
  };

  const handleMoveTab = (sourceUid, targetUid) => {
    dispatch(reorderTabs({ sourceUid, targetUid }));
  };

  const handleMovePinnedTab = (sourceUid, targetUid) => {
    dispatch(reorderPinnedTabs({ sourceUid, targetUid }));
  };

  if (!activeTabUid) {
    return null;
  }

  const effectiveSidebarWidth = sidebarCollapsed ? 0 : leftSidebarWidth;
  const maxTablistWidth = screenWidth - effectiveSidebarWidth - 150;

  const leftSlide = () => {
    scrollContainerRef.current?.scrollBy({
      left: -120,
      behavior: 'smooth'
    });
  };

  const rightSlide = () => {
    scrollContainerRef.current?.scrollBy({
      left: 120,
      behavior: 'smooth'
    });
  };

  const getRootClassname = () => {
    return classnames({
      'has-chevrons': showChevrons
    });
  };

  // Render a single tab
  const renderTab = (tab, index, isPinned = false) => (
    <DraggableTab
      key={tab.uid}
      id={tab.uid}
      index={index}
      pinned={isPinned}
      onMoveTab={isPinned ? handleMovePinnedTab : handleMoveTab}
      className={getTabClassname(tab, index, isPinned)}
      onClick={() => handleClick(tab)}
    >
      <RequestTab
        collectionRequestTabs={collectionRequestTabs}
        tabIndex={index}
        tab={tab}
        collection={activeCollection}
        folderUid={tab.folderUid}
        hasOverflow={tabOverflowStates[tab.uid]}
        setHasOverflow={createSetHasOverflow(tab.uid)}
        dropdownContainerRef={collectionTabsRef}
        isPinned={isPinned}
      />
    </DraggableTab>
  );

  // Todo: Must support ephemeral requests
  return (
    <StyledWrapper className={getRootClassname()}>
      {newRequestModalOpen && (
        <NewRequest collectionUid={activeCollection?.uid} onClose={() => setNewRequestModalOpen(false)} />
      )}
      {collectionRequestTabs && collectionRequestTabs.length ? (
        <>
          <CollectionToolBar collection={activeCollection} />
          <div className="flex items-center gap-2 pl-2" ref={collectionTabsRef}>

            {showChevrons ? (
              <ActionIcon size="lg" onClick={leftSlide} aria-label="Left Chevron" style={{ marginBottom: '3px' }}>
                <IconChevronLeft size={18} strokeWidth={1.5} />
              </ActionIcon>
            ) : null}

            <div className="tabs-scroll-container" style={{ maxWidth: maxTablistWidth }} ref={scrollContainerRef}>
              <ul role="tablist" ref={tabsRef}>
                {/* Pinned tabs */}
                {pinnedTabs.map((tab, index) => renderTab(tab, index, true))}

                {/* Unpinned tabs */}
                {unpinnedTabs.map((tab, index) => renderTab(tab, index, false))}
              </ul>
            </div>

            {activeCollection && (
              <ActionIcon onClick={() => setNewRequestModalOpen(true)} aria-label="New Request" size="lg" style={{ marginBottom: '3px' }}>
                <IconPlus
                  size={18}
                  strokeWidth={1.5}
                />
              </ActionIcon>
            )}

            {showChevrons ? (
              <ActionIcon size="lg" onClick={rightSlide} aria-label="Right Chevron" style={{ marginBottom: '3px' }}>
                <IconChevronRight size={18} strokeWidth={1.5} />
              </ActionIcon>
            ) : null}
          </div>
        </>
      ) : null}
    </StyledWrapper>
  );
};

export default RequestTabs;
