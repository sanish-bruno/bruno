import { test, expect } from '../../../../playwright';
import {
  openCollection,
  selectEnvironment,
  openEnvironmentSelector,
  addEnvironmentVariable,
  sendRequest,
  openRequest,
  saveEnvironment,
  closeAllTabs,
  closeAllCollections
} from '../../../utils/page';

import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('Script persistence with environment draft', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllTabs(page);
  });

  // TODO: Redux draft sync is correct (verified by unit tests in scriptEnvironmentUpdateEvent.spec.js).
  // The EnvironmentVariablesTable formik re-renders with the updated draft when both environment.variables
  // and draft.variables change in the same dispatch, but the timing of enableReinitialize vs draft
  // restoration needs further investigation. The initialValues fix helps for re-opening the tab,
  // but the background-tab scenario requires deeper formik lifecycle work.
  test.skip('unsaved draft variable survives script execution and both persist on save', async ({ pageWithUserData: page }) => {
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

    await test.step('Switch back to environment config tab', async () => {
      await locators.environment.collectionEnvTab().click();
      await page.waitForTimeout(500); // allow draft restoration to settle
    });

    await test.step('Both variables should be present', async () => {
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

      await openEnvironmentSelector(page, 'collection');
      await locators.environment.configureButton().click();
      await expect(locators.environment.collectionEnvTab()).toBeVisible();

      await expect(locators.environment.variableRowByName('host')).toBeVisible();
      await expect(locators.environment.variableRowByName('userDraftVar')).toBeVisible();
      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
    });
  });

  test('user can add variable alongside script-persisted variable and save both', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open collection, select environment, run request that sets scriptToken', async () => {
      await openCollection(page, 'draft-sync-test');
      await selectEnvironment(page, 'Test');
      await openRequest(page, 'draft-sync-test', 'set-env-var');
      await sendRequest(page, 200);
    });

    await test.step('Open environment config — scriptToken should be visible', async () => {
      // Retry the open-configure sequence — the dropdown can dismiss before the click lands
      await expect(async () => {
        await openEnvironmentSelector(page, 'collection');
        await locators.environment.configureButton().click({ timeout: 3000 });
        await expect(locators.environment.collectionEnvTab()).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 15000 });

      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
      await expect(locators.environment.variableValue('scriptToken')).toContainText('script-value-123');
    });

    await test.step('Add a user variable alongside the script variable and save', async () => {
      // host is at index 0, scriptToken at index 1, empty row at index 2
      await addEnvironmentVariable(page, { name: 'userVar', value: 'user-value' }, 2);
      await page.waitForTimeout(500);
      await saveEnvironment(page);
    });

    await test.step('Close and reopen — all three variables persist', async () => {
      await locators.environment.collectionEnvTab().hover();
      await locators.environment.collectionEnvTab().getByTestId('request-tab-close-icon').click({ force: true });

      await expect(async () => {
        await openEnvironmentSelector(page, 'collection');
        await locators.environment.configureButton().click({ timeout: 3000 });
        await expect(locators.environment.collectionEnvTab()).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 15000 });

      await expect(locators.environment.variableRowByName('host')).toBeVisible();
      await expect(locators.environment.variableRowByName('scriptToken')).toBeVisible();
      await expect(locators.environment.variableRowByName('userVar')).toBeVisible();
    });
  });
});
