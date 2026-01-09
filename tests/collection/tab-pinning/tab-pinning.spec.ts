import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection } from '../../utils/page';

test.describe('Tab Pinning', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Pin and unpin a tab via context menu', async ({ page, createTmpDir }) => {
    // Create a collection
    await createCollection(page, 'pin-tab-collection', await createTmpDir('pin-tab-collection'));

    // Add a request to the collection
    const collection = page.locator('.collection-name').filter({ hasText: 'pin-tab-collection' });
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('test-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('#new-request-url textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the request to be created
    await page.waitForTimeout(1000);
    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-request' })).toBeVisible();

    // Open the request tab
    await page.locator('.collection-item-name').filter({ hasText: 'test-request' }).dblclick();
    await page.waitForTimeout(500);
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' })).toBeVisible();

    // Right-click to open context menu
    const tabLabel = page.locator('.request-tab .tab-label').filter({ hasText: 'test-request' });
    await tabLabel.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Click "Pin Tab" in the context menu
    await page.locator('.tippy-content').locator('text=Pin Tab').click();
    await page.waitForTimeout(300);

    // Verify the tab has a pin indicator
    const pinnedTab = page.locator('.request-tab.pinned-tab');
    await expect(pinnedTab).toBeVisible();

    // Right-click again to unpin
    await tabLabel.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Click "Unpin Tab" in the context menu
    await page.locator('.tippy-content').locator('text=Unpin Tab').click();
    await page.waitForTimeout(300);

    // Verify the tab is no longer pinned
    await expect(pinnedTab).not.toBeVisible();
  });

  test('Pin tab via keyboard shortcut', async ({ page, createTmpDir }) => {
    // Create a collection
    await createCollection(page, 'pin-tab-keyboard', await createTmpDir('pin-tab-keyboard'));

    // Add a request to the collection
    const collection = page.locator('.collection-name').filter({ hasText: 'pin-tab-keyboard' });
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('keyboard-test');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('#new-request-url textarea').fill('https://echo.usebruno.com');
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the request to be created and open the tab
    await page.waitForTimeout(1000);
    await page.locator('.collection-item-name').filter({ hasText: 'keyboard-test' }).dblclick();
    await page.waitForTimeout(500);

    // Verify tab is visible
    const tabLabel = page.locator('.request-tab .tab-label').filter({ hasText: 'keyboard-test' });
    await expect(tabLabel).toBeVisible();

    // Pin using keyboard shortcut (Cmd/Ctrl + Shift + P)
    await tabLabel.click();
    await page.keyboard.press('ControlOrMeta+Shift+P');
    await page.waitForTimeout(300);

    // Verify the tab is pinned
    const pinnedTab = page.locator('.request-tab.pinned-tab');
    await expect(pinnedTab).toBeVisible();

    // Unpin using keyboard shortcut
    await page.keyboard.press('ControlOrMeta+Shift+P');
    await page.waitForTimeout(300);

    // Verify the tab is unpinned
    await expect(pinnedTab).not.toBeVisible();
  });

  test('Pinned tabs appear before unpinned tabs', async ({ page, createTmpDir }) => {
    // Create a collection
    await createCollection(page, 'pin-order-collection', await createTmpDir('pin-order-collection'));

    // Add first request
    const collection = page.locator('.collection-name').filter({ hasText: 'pin-order-collection' });
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('first-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('#new-request-url textarea').fill('https://echo.usebruno.com/1');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(1000);

    // Add second request
    await collection.hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByPlaceholder('Request Name').fill('second-request');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('#new-request-url textarea').fill('https://echo.usebruno.com/2');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.waitForTimeout(1000);

    // Open both tabs
    await page.locator('.collection-item-name').filter({ hasText: 'first-request' }).dblclick();
    await page.waitForTimeout(500);
    await page.locator('.collection-item-name').filter({ hasText: 'second-request' }).dblclick();
    await page.waitForTimeout(500);

    // Verify initial order (first-request should be first)
    const tabs = page.locator('.request-tab .tab-label');
    await expect(tabs.nth(0)).toContainText('first-request');
    await expect(tabs.nth(1)).toContainText('second-request');

    // Pin the second request
    const secondTab = page.locator('.request-tab .tab-label').filter({ hasText: 'second-request' });
    await secondTab.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.locator('.tippy-content').locator('text=Pin Tab').click();
    await page.waitForTimeout(500);

    // Verify pinned tab appears first (before unpinned tabs)
    const pinnedTabs = page.locator('.request-tab.pinned-tab .tab-label');
    await expect(pinnedTabs.first()).toContainText('second-request');
  });
});
