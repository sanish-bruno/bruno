import { test, expect } from '../../../../playwright';
import {
  openCollection,
  selectEnvironment,
  openEnvironmentSelector,
  addEnvironmentVariable,
  sendRequest,
  openRequest,
  saveEnvironment,
  closeAllTabs
} from '../../../utils/page';

import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('Script persistence with environment draft', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllTabs(page);
  });

  test('unsaved draft variable survives script execution and both persist on save', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await closeAllTabs(page);

    await test.step('Open collection and select environment', async () => {
      await openCollection(page, 'draft-sync-test');
      await selectEnvironment(page, 'Test');
    });

    await test.step('Open environment config and add an unsaved variable', async () => {
      await openEnvironmentSelector(page, 'collection');
      await locators.environment.configureButton().waitFor({ state: 'visible', timeout: 5000 });
      await locators.environment.configureButton().click();
      await expect(locators.environment.collectionEnvTab()).toBeVisible({ timeout: 10000 });

      // "host" is at index 0, the empty row is at index 1
      await addEnvironmentVariable(page, { name: 'userDraftVar', value: 'user-draft-value' }, 1);
      await page.waitForTimeout(500); // draft debounce
    });

    await test.step('Run request that sets scriptToken (env tab stays open in background)', async () => {
      await openRequest(page, 'draft-sync-test', 'set-env-var');
      await sendRequest(page, 200);
    });

    await test.step('Verify both variables are present', async () => {
      // Click back to the env tab, or reopen if it was replaced by the request tab
      const envTabVisible = await locators.environment.collectionEnvTab().isVisible().catch(() => false);
      if (envTabVisible) {
        await locators.environment.collectionEnvTab().click();
      } else {
        await expect(async () => {
          await openEnvironmentSelector(page, 'collection');
          await locators.environment.configureButton().click({ timeout: 3000 });
          await expect(locators.environment.collectionEnvTab()).toBeVisible({ timeout: 3000 });
        }).toPass({ timeout: 15000 });
      }
      await page.waitForTimeout(500);

      // User's draft variable should still be there (draft was synced with script changes)
      await expect(locators.environment.variableRowByName('userDraftVar')).toBeVisible({ timeout: 10000 });

      // Script-added variable should also be there
      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
      await expect(locators.environment.variableValue('scriptToken')).toContainText('script-value-123');

      // Original host variable should be untouched
      await expect(locators.environment.variableRowByName('host')).toBeVisible();
    });

    await test.step('Save — all three variables should persist', async () => {
      await saveEnvironment(page);

      await locators.environment.collectionEnvTab().hover();
      await locators.environment.collectionEnvTab().getByTestId('request-tab-close-icon').click({ force: true });

      await expect(async () => {
        await openEnvironmentSelector(page, 'collection');
        await locators.environment.configureButton().click({ timeout: 3000 });
        await expect(locators.environment.collectionEnvTab()).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 15000 });

      await expect(locators.environment.variableRowByName('host')).toBeVisible();
      await expect(locators.environment.variableRowByName('userDraftVar')).toBeVisible();
      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
    });
  });
});
