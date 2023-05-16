import { promises as fsp } from 'fs';
import { join } from 'path';

import {
  TestSyncConfig,
  getConfig,
  InvalidConfigException,
} from './test-sync-config.js';

(async () => {
  try {
    await installKyselyTests();
  } catch (e: any) {
    if (!(e instanceof InvalidConfigException)) throw e;
    console.error(`Failed to install Kysely tests\n${e.message}\n`);
    process.exit(1);
  }
})();

async function installKyselyTests() {
  const config = await getConfig();
  if (!config.testFiles) {
    throw new InvalidConfigException("Config file doesn't provide 'testFiles'");
  }

  const kyselySourceDir = join(process.cwd(), config.downloadedTestsDir);
  try {
    await fsp.rm(kyselySourceDir, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
  await fsp.mkdir(kyselySourceDir);

  for (const fileEntry of Object.entries(config.testFiles)) {
    const fileName = `${fileEntry[0]}.test.ts`;
    const url = `${config.__baseTestRawUrl}${fileName}`;
    const localFilePath = join(kyselySourceDir, `${fileName}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw Error(`Failed to load ${url}: ${response.statusText}`);
    }
    const kyselySource = tweakKyselySource(
      config,
      fileName,
      await response.text(),
      fileEntry[1]
    );
    await fsp.writeFile(localFilePath, kyselySource);
  }
}

function tweakKyselySource(
  config: TestSyncConfig,
  fileName: string,
  source: string,
  excludedTests: string[]
): string {
  source = source
    .replaceAll(/from '\.\.[./]*'/g, (match) => "from 'kysely'")
    .replaceAll('./test-setup.js', config.customSetupFile);
  for (const excludedTest of excludedTests) {
    const TEST_START = 'it(';
    const testNameOffset = source.indexOf(excludedTest);
    if (testNameOffset < 0) {
      throw new InvalidConfigException(
        `Test '${excludedTest}' not found in ${fileName}`
      );
    }
    const testStartOffset = source.lastIndexOf(TEST_START, testNameOffset);
    if (testStartOffset < 0) {
      throw new InvalidConfigException(
        `Start of test '${excludedTest}' not found in ${fileName}`
      );
    }
    const space = source.substring(
      testStartOffset + TEST_START.length,
      testNameOffset
    );
    if (/^[\s'"`]+$/.test(space)) {
      const splitOffset = testStartOffset + TEST_START.length - 1;
      source =
        source.substring(0, splitOffset) +
        '.skip(' +
        source.substring(testNameOffset - 1);
    }
  }
  return source;
}
