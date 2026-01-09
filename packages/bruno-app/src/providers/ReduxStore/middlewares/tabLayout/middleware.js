import { saveTabLayout } from 'utils/tabLayout';
import find from 'lodash/find';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';

// Actions that affect tab layout and should trigger a save
const tabActionsToIntercept = [
  'tabs/pinTab',
  'tabs/unpinTab',
  'tabs/togglePinTab',
  'tabs/reorderPinnedTabs',
  'tabs/closeTabs',
  'tabs/closeAllCollectionTabs'
];

// Track pending save timers per collection
const pendingSaveTimers = {};

// Debounce interval for saving (ms)
const SAVE_DEBOUNCE_MS = 500;

/**
 * Get collection from collection uid
 */
const getCollection = (state, collectionUid) => {
  return findCollectionByUid(state.collections.collections, collectionUid);
};

/**
 * Build tab layout data for persistence
 * Uses item pathnames (stable) instead of UIDs (regenerated on restart)
 */
const buildTabLayoutData = (state, collectionUid) => {
  const collection = getCollection(state, collectionUid);
  if (!collection) {
    return { pinnedPathnames: [], tabStates: [] };
  }

  const tabs = state.tabs.tabs.filter((t) => t.collectionUid === collectionUid);

  // Convert pinned tab UIDs to pathnames (stable across restarts)
  const pinnedPathnames = state.tabs.pinnedTabOrder
    .filter((uid) => tabs.some((t) => t.uid === uid))
    .map((uid) => {
      const item = findItemInCollection(collection, uid);
      return item?.pathname;
    })
    .filter(Boolean);

  // Convert tab states to use pathnames instead of UIDs
  const tabStates = tabs
    .map((tab) => {
      const item = findItemInCollection(collection, tab.uid);
      if (!item?.pathname) return null;
      return {
        pathname: item.pathname,
        pinned: tab.pinned || false
      };
    })
    .filter(Boolean);

  return {
    pinnedPathnames,
    tabStates
  };
};

/**
 * Schedule a debounced save for a collection
 */
const scheduleSave = (collectionPath, layoutData) => {
  // Clear any existing timer for this collection
  if (pendingSaveTimers[collectionPath]) {
    clearTimeout(pendingSaveTimers[collectionPath]);
  }

  // Schedule a new save
  pendingSaveTimers[collectionPath] = setTimeout(() => {
    saveTabLayout(collectionPath, layoutData);
    delete pendingSaveTimers[collectionPath];
  }, SAVE_DEBOUNCE_MS);
};

/**
 * Get affected collection UIDs from an action
 */
const getAffectedCollectionUids = (state, action) => {
  const collectionUids = new Set();

  // Get collection from action payload if available
  if (action.payload?.collectionUid) {
    collectionUids.add(action.payload.collectionUid);
  }

  // For tab actions, get collection from the affected tab
  if (action.payload?.uid) {
    const tab = find(state.tabs.tabs, (t) => t.uid === action.payload.uid);
    if (tab?.collectionUid) {
      collectionUids.add(tab.collectionUid);
    }
  }

  // For closeTabs action, get collections from all closed tabs
  if (action.payload?.tabUids) {
    action.payload.tabUids.forEach((uid) => {
      const tab = find(state.tabs.tabs, (t) => t.uid === uid);
      if (tab?.collectionUid) {
        collectionUids.add(tab.collectionUid);
      }
    });
  }

  return Array.from(collectionUids);
};

/**
 * Tab layout persistence middleware
 * Automatically saves tab layout when pinning or reordering tabs
 */
export const tabLayoutMiddleware = ({ dispatch, getState }) => (next) => (action) => {
  // Get state before the action
  const stateBefore = getState();

  // Get affected collections before the action runs (for closeTabs, we need the tabs before they're removed)
  let affectedCollectionUids = [];
  if (tabActionsToIntercept.includes(action.type)) {
    affectedCollectionUids = getAffectedCollectionUids(stateBefore, action);
  }

  // Let the action update the state
  const result = next(action);

  // Check if this action should trigger a save
  if (!tabActionsToIntercept.includes(action.type)) {
    return result;
  }

  // Get state after the action
  const stateAfter = getState();

  // If we didn't get collection UIDs before (e.g., for actions that specify it in payload), try again
  if (affectedCollectionUids.length === 0) {
    affectedCollectionUids = getAffectedCollectionUids(stateAfter, action);
  }

  // Schedule saves for all affected collections
  affectedCollectionUids.forEach((collectionUid) => {
    const collection = getCollection(stateAfter, collectionUid);
    if (collection?.pathname) {
      const layoutData = buildTabLayoutData(stateAfter, collectionUid);
      scheduleSave(collection.pathname, layoutData);
    }
  });

  return result;
};

export default tabLayoutMiddleware;
