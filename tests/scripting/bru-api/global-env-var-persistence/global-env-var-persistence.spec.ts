import { test, expect } from '../../../../playwright';
import { openCollection, sendRequest, openEnvironmentSelector } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

test.describe('Global environment variable persistence via script', () => {
  test('bru.deleteGlobalEnvVar() removes variable from global environment', async ({
    pageWithUserData: page
  }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'global-env-var-persistence-test');
    await locators.sidebar.request('delete-global-env-var').click();
    await sendRequest(page, 200);

    await test.step('Open global environment config', async () => {
      await openEnvironmentSelector(page, 'global');
      await locators.environment.configureButton().click();
      await expect(locators.environment.globalEnvTab()).toBeVisible();
    });

    await test.step('Verify "toBeDeleted" is removed', async () => {
      await expect(locators.environment.variableRowByName('toBeDeleted')).not.toBeVisible();
    });

    await test.step('Verify "baseUrl" still exists with original value', async () => {
      await expect(locators.environment.variableRowByName('baseUrl')).toBeVisible();
      const value = await locators.environment.variableValue('baseUrl').textContent();
      expect(value).toContain('https://testbench-sanity.usebruno.com');
    });

    await test.step('Close global environment config', async () => {
      await locators.environment.globalEnvTab().hover();
      await locators.environment.globalEnvTab().getByTestId('request-tab-close-icon').click({ force: true });
    });
  });
});
