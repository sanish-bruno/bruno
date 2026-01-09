const { ipcMain } = require('electron');
const TabLayoutStore = require('../store/tab-layout');

const tabLayoutStore = new TabLayoutStore();

const registerTabLayoutIpc = (mainWindow) => {
  // Get tab layout for a collection
  ipcMain.handle('renderer:get-tab-layout', async (event, collectionPath) => {
    try {
      return tabLayoutStore.getLayoutByCollection(collectionPath);
    } catch (error) {
      console.error('Error getting tab layout:', error);
      return tabLayoutStore.getDefaultLayout();
    }
  });

  // Save tab layout for a collection
  ipcMain.handle('renderer:save-tab-layout', async (event, { collectionPath, layout }) => {
    try {
      tabLayoutStore.saveLayoutByCollection(collectionPath, layout);
      return { success: true };
    } catch (error) {
      console.error('Error saving tab layout:', error);
      return { success: false, error: error.message };
    }
  });

  // Update pinned tabs for a collection
  ipcMain.handle('renderer:update-pinned-tabs', async (event, { collectionPath, pinnedPathnames, tabStates }) => {
    try {
      tabLayoutStore.updatePinnedTabs(collectionPath, pinnedPathnames, tabStates);
      return { success: true };
    } catch (error) {
      console.error('Error updating pinned tabs:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete layout for a collection
  ipcMain.handle('renderer:delete-tab-layout', async (event, collectionPath) => {
    try {
      tabLayoutStore.deleteLayoutByCollection(collectionPath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting tab layout:', error);
      return { success: false, error: error.message };
    }
  });
};

module.exports = registerTabLayoutIpc;
