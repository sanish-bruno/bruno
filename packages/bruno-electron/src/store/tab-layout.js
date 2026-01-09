const Store = require('electron-store');

/**
 * Store for persisting tab layout (pinned tabs and ordering)
 * Data is stored per collection using the collection pathname as the key
 */
class TabLayoutStore {
  constructor() {
    this.store = new Store({
      name: 'tab-layout',
      clearInvalidConfig: true
    });
  }

  /**
   * Get all stored tab layouts
   */
  getAllLayouts() {
    return this.store.get('layouts') || {};
  }

  /**
   * Get tab layout for a specific collection
   * @param {string} collectionPath - The filesystem path of the collection
   */
  getLayoutByCollection(collectionPath) {
    const layouts = this.getAllLayouts();
    return layouts[collectionPath] || this.getDefaultLayout();
  }

  /**
   * Get default empty layout structure
   */
  getDefaultLayout() {
    return {
      pinnedPathnames: [], // Array of item pathnames in pinned order (stable across restarts)
      tabStates: [] // Array of { pathname, pinned }
    };
  }

  /**
   * Save tab layout for a specific collection
   * @param {string} collectionPath - The filesystem path of the collection
   * @param {Object} layout - The tab layout data
   */
  saveLayoutByCollection(collectionPath, layout) {
    const layouts = this.getAllLayouts();
    layouts[collectionPath] = {
      ...this.getDefaultLayout(),
      ...layout,
      updatedAt: new Date().toISOString()
    };
    this.store.set('layouts', layouts);
  }

  /**
   * Update pinned tabs for a collection
   * @param {string} collectionPath - The filesystem path of the collection
   * @param {Array} pinnedPathnames - Array of item pathnames in pinned order (stable across restarts)
   * @param {Array} tabStates - Array of { pathname, pinned } objects
   */
  updatePinnedTabs(collectionPath, pinnedPathnames, tabStates) {
    const layout = this.getLayoutByCollection(collectionPath);
    layout.pinnedPathnames = pinnedPathnames;
    layout.tabStates = tabStates;
    this.saveLayoutByCollection(collectionPath, layout);
  }

  /**
   * Delete layout for a collection
   * @param {string} collectionPath - The filesystem path of the collection
   */
  deleteLayoutByCollection(collectionPath) {
    const layouts = this.getAllLayouts();
    delete layouts[collectionPath];
    this.store.set('layouts', layouts);
  }

  /**
   * Clear all stored layouts
   */
  clearAll() {
    this.store.set('layouts', {});
  }
}

module.exports = TabLayoutStore;
