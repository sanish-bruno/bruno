import type { Page } from '@playwright/test';
import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  dragSidebarToWidth,
  isScriptSubTabCollapsed,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  openRequest,
  selectRequestPaneTab,
  selectScriptSubTab,
  setWindowContentSize,
  type ScriptSubTab
} from '../../utils/page';

const COLLECTION_NAME = 'GrpcScriptTabsOverflow';
const REQUEST_NAME = 'HooksOverflow';

const HOOKS: ScriptSubTab[] = [
  'before-call-start',
  'before-message-send',
  'after-message-receive',
  'after-call-end'
];

const wideWindowSize = { width: 1600, height: 900 };
const narrowWindowSize = { width: 1000, height: 900 };

/**
 * The chevron renders only when something collapsed, so it doubles as the settled "row overflowed"
 * signal — before the row measures, every hook is in it and the chevron is absent.
 */
const expectSomeHooksCollapsed = (page: Page) =>
  expect(buildCommonLocators(page).paneTabs.scriptSubTabsOverflowTrigger()).toBeVisible();

const expectEveryHookInRow = async (page: Page) => {
  const locators = buildCommonLocators(page);
  for (const hook of HOOKS) {
    await expect(locators.paneTabs.tabTrigger(hook)).toBeVisible();
  }
  await expect(locators.paneTabs.scriptSubTabsOverflowTrigger()).toBeHidden();
};

const collapsedHooks = async (page: Page): Promise<ScriptSubTab[]> => {
  const collapsed = await Promise.all(HOOKS.map((hook) => isScriptSubTabCollapsed(page, hook)));
  return HOOKS.filter((_, index) => collapsed[index]);
};

const rowWidth = (page: Page): Promise<number> =>
  buildCommonLocators(page).paneTabs.scriptSubTabsList().evaluate((node: HTMLElement) => node.offsetWidth);

/**
 * Asserts every hook still in the row is actually inside the row's box. `.tabs-list` clips its
 * overflow, so a tab reaching past the right edge is the clipping this feature exists to prevent.
 */
const expectNoClippedHooks = async (page: Page) => {
  const locators = buildCommonLocators(page);
  const listBox = await locators.paneTabs.scriptSubTabsList().boundingBox();
  expect(listBox).not.toBeNull();

  const collapsed = await collapsedHooks(page);
  for (const hook of HOOKS.filter((h) => !collapsed.includes(h))) {
    const tabBox = await locators.paneTabs.tabTrigger(hook).boundingBox();
    expect(tabBox, `${hook} should be laid out`).not.toBeNull();
    // A pixel of slack: offsetWidth measurement rounds, so a sub-pixel overhang isn't a clip.
    expect(tabBox!.x + tabBox!.width, `${hook} should end inside the row`).toBeLessThanOrEqual(
      listBox!.x + listBox!.width + 1
    );
  }
};

const activeHookKey = async (page: Page): Promise<string> => {
  const testId = await buildCommonLocators(page)
    .paneTabs.scriptSubTabsList()
    .locator('.tab-trigger.active')
    .getAttribute('data-testid');
  expect(testId, 'a hook should be selected').not.toBeNull();
  return testId!.replace('tab-trigger-', '');
};

test.describe('gRPC script hook tabs reflow', () => {
  test('moves hooks between the row and the dropdown as the window and the pane resize', async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });

    await setWindowContentSize(app, page, wideWindowSize);
    await dragSidebarToWidth(page, MIN_SIDEBAR_WIDTH);
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await selectRequestPaneTab(page, 'Script');

    await test.step('With room for all four hooks, none collapse and the chevron stays away', async () => {
      await expectEveryHookInRow(page);
      await expectNoClippedHooks(page);
    });

    await test.step('Narrowing the window collapses the hooks that no longer fit', async () => {
      await setWindowContentSize(app, page, narrowWindowSize);

      await expectSomeHooksCollapsed(page);
      expect(
        (await collapsedHooks(page)).length,
        'the selected hook should still be in the row'
      ).toBeLessThan(HOOKS.length);
      await expectNoClippedHooks(page);
    });

    await test.step('Widening the window brings every hook back into the row', async () => {
      await setWindowContentSize(app, page, wideWindowSize);

      await expectEveryHookInRow(page);
      await expectNoClippedHooks(page);
    });

    await test.step('Squeezing the pane with the sidebar reflows the row with no window resize', async () => {
      await setWindowContentSize(app, page, narrowWindowSize);
      await dragSidebarToWidth(page, MIN_SIDEBAR_WIDTH);
      await expectSomeHooksCollapsed(page);
      const widthBefore = await rowWidth(page);

      await dragSidebarToWidth(page, MAX_SIDEBAR_WIDTH);
      await expect.poll(() => rowWidth(page)).toBeLessThan(widthBefore);

      // The teeth of this step: the row shrank with the window untouched, so a split still measured
      // against the old width would leave its visible hooks hanging past the clipped right edge.
      // How many collapse isn't asserted — the request/response split is a persisted ratio, so the
      // pane width at a given sidebar width differs between installs.
      await expectNoClippedHooks(page);
      await expectSomeHooksCollapsed(page);
    });
  });

  test('keeps the selected hook in the row and reachable through the dropdown', async ({
    pageWithUserData: page,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const app = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    const locators = buildCommonLocators(page);

    await setWindowContentSize(app, page, narrowWindowSize);
    await dragSidebarToWidth(page, MIN_SIDEBAR_WIDTH);
    await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
    await selectRequestPaneTab(page, 'Script');

    await expectSomeHooksCollapsed(page);
    const collapsedHook = (await collapsedHooks(page)).at(-1) as ScriptSubTab;

    await test.step('A hook picked from the dropdown becomes active and joins the row', async () => {
      await selectScriptSubTab(page, collapsedHook);

      await expect(locators.paneTabs.tabTrigger(collapsedHook)).toBeVisible();
      await expect(page.getByTestId(`${collapsedHook}-script-editor`)).toBeVisible();
      await expectNoClippedHooks(page);
    });

    await test.step('The selected hook stays in the row however narrow the pane gets', async () => {
      await dragSidebarToWidth(page, MAX_SIDEBAR_WIDTH);
      await expectSomeHooksCollapsed(page);

      expect(await activeHookKey(page)).toBe(collapsedHook);
      await expect(locators.paneTabs.tabTrigger(collapsedHook)).toBeVisible();
      await expectNoClippedHooks(page);
    });
  });
});
