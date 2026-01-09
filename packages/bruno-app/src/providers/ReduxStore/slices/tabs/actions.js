import { restoreTabLayout } from 'providers/ReduxStore/slices/tabs';
import { getTabLayout } from 'utils/tabLayout';
import { findCollectionByUid, findItemInCollectionByPathname } from 'utils/collections';

/**
 * Restore tab layout from persistence when a collection is opened
 * Maps stored pathnames back to current item UIDs (since UIDs change on restart)
 * @param {string} collectionPath - The filesystem path of the collection
 * @param {string} collectionUid - The UID of the collection
 */
export const restoreTabLayoutFromPersistence = (collectionPath, collectionUid) => async (dispatch, getState) => {
  try {
    const layout = await getTabLayout(collectionPath);

    if (!layout) {
      return;
    }

    const state = getState();
    const collection = findCollectionByUid(state.collections.collections, collectionUid);

    if (!collection) {
      return;
    }

    // Map pathnames back to current UIDs
    const pinnedTabOrder = (layout.pinnedPathnames || [])
      .map((pathname) => {
        const item = findItemInCollectionByPathname(collection, pathname);
        return item?.uid;
      })
      .filter(Boolean);

    const tabStates = (layout.tabStates || [])
      .map(({ pathname, pinned }) => {
        const item = findItemInCollectionByPathname(collection, pathname);
        if (!item) return null;
        return { uid: item.uid, pinned };
      })
      .filter(Boolean);

    // Restore tab states (pinned)
    if (tabStates.length > 0 || pinnedTabOrder.length > 0) {
      dispatch(restoreTabLayout({
        pinnedTabOrder,
        tabStates
      }));
    }
  } catch (error) {
    console.error('Failed to restore tab layout:', error);
  }
};
