import { expect } from 'chai';
import { execSync } from 'child_process';
import { promises as fsp } from 'fs';
import { join } from 'path';

import { CONFIG_FILE_NAME, getConfig } from './test-sync-config.js';

const COMMAND_PATH = join(__dirname, './load-kysely-tests.js');
const TEST_DIR_NAME = 'test';
const TEST_DIR = join(process.cwd(), TEST_DIR_NAME);
const TEST_CONFIG_FILE = join(TEST_DIR_NAME, CONFIG_FILE_NAME);
const EXPECTED_TESTS_PATH = join(TEST_DIR, 'expected-tests');

describe('load-kysely-tests', () => {
  it('should produce the expected test files', async () => {
    const config = await getConfig();
    const downloadPath = join(process.cwd(), config.downloadedTestsDir);

    const command = `node ${COMMAND_PATH} --config=${TEST_CONFIG_FILE}`;
    execSync(command);

    const expectedFiles = await fsp.readdir(EXPECTED_TESTS_PATH);
    expectedFiles.sort();
    const actualFiles = await fsp.readdir(downloadPath);
    actualFiles.sort();

    expect(actualFiles).to.deep.equal(expectedFiles);

    for (const fileName of expectedFiles) {
      const expectedText = await fsp.readFile(
        join(EXPECTED_TESTS_PATH, fileName),
        'utf-8'
      );
      const actualText = await fsp.readFile(
        join(downloadPath, fileName),
        'utf-8'
      );
      expect(actualText).to.equal(expectedText);
    }
  });
});
