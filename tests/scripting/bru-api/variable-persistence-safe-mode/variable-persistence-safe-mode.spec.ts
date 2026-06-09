import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment } from '../../../utils/page';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('Script variable persistence to disk (safe mode)', () => {
  test('persists env var and collection var in safe mode', async ({ pageWithUserData: page, collectionFixturePath }) => {
    await openCollection(page, 'variable-persistence-safe-test');
    await selectEnvironment(page, 'Test');
    await runCollection(page, 'variable-persistence-safe-test');

    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });

    await test.step('Verify env var persisted to environments/Test.bru', async () => {
      const envFilePath = path.join(collectionFixturePath!, 'variable-persistence-safe-test', 'environments', 'Test.bru');
      await expect.poll(() => fs.readFileSync(envFilePath, 'utf8'), { timeout: PERSISTENCE_TIMEOUT }).toContain('persistedToken');
      expect(fs.readFileSync(envFilePath, 'utf8')).toContain('test-value-123');
    });

    await test.step('Verify collection var persisted to collection.bru', async () => {
      const collectionBruPath = path.join(collectionFixturePath!, 'variable-persistence-safe-test', 'collection.bru');
      await expect.poll(() => fs.readFileSync(collectionBruPath, 'utf8'), { timeout: PERSISTENCE_TIMEOUT }).toContain('persistedCollectionToken');
      expect(fs.readFileSync(collectionBruPath, 'utf8')).toContain('collection-value-456');
    });
  });
});
