import { callIpc } from '../common/ipc';

/**
 * Get tab layout for a collection
 * @param {string} collectionPath - The filesystem path of the collection
 * @returns {Promise<Object>} - The tab layout data
 */
export const getTabLayout = async (collectionPath) => {
  try {
    return await callIpc('renderer:get-tab-layout', collectionPath);
  } catch (error) {
    console.error('Failed to get tab layout:', error);
    return null;
  }
};

/**
 * Save tab layout for a collection
 * @param {string} collectionPath - The filesystem path of the collection
 * @param {Object} layout - The tab layout data
 * @returns {Promise<Object>} - Result with success status
 */
export const saveTabLayout = async (collectionPath, layout) => {
  try {
    return await callIpc('renderer:save-tab-layout', { collectionPath, layout });
  } catch (error) {
    console.error('Failed to save tab layout:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete tab layout for a collection
 * @param {string} collectionPath - The filesystem path of the collection
 * @returns {Promise<Object>} - Result with success status
 */
export const deleteTabLayout = async (collectionPath) => {
  try {
    return await callIpc('renderer:delete-tab-layout', collectionPath);
  } catch (error) {
    console.error('Failed to delete tab layout:', error);
    return { success: false, error: error.message };
  }
};
