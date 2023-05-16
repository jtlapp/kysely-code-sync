import { promises as fsp } from 'fs';
import { join } from 'path';

import { getConfig } from './test-sync-config.js';

const KYSELY_SOURCE_DIR = '../../node/src/temp';
const CUSTOM_SETUP_FILE = '../custom-test-setup.js';

(async () => {
  try {
    installKyselyTests();
  } catch (e: any) {
    if (!(e instanceof InvalidConfigException)) {
      throw e;
    }
    console.error(`Failed to install Kysely tests: ${e.message}`);
    process.exit(1);
  }
})();

async function installKyselyTests() {
  const config = await getConfig();
  const kyselySourceDir = join(__dirname, KYSELY_SOURCE_DIR);
  await fsp.mkdir(kyselySourceDir);

  for (const fileEntry of Object.entries(config.testFiles)) {
    const fileName = `${fileEntry[0]}.test.ts`;
    const url = `${config.baseRawUrl}test/node/src/${fileName}`;
    const localFilePath = join(kyselySourceDir, `${fileName}`);
    const response = await fetch(url);
    const kyselySource = tweakKyselySource(
      fileName,
      await response.text(),
      fileEntry[1]
    );
    await fsp.writeFile(localFilePath, kyselySource);
  }
}

function tweakKyselySource(
  fileName: string,
  source: string,
  excludedTests: string[]
): string {
  source = source
    .replaceAll(/from '\.\.[./]*'/g, (match) => "from 'kysely'")
    .replaceAll('./test-setup.js', CUSTOM_SETUP_FILE);
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

class InvalidConfigException extends Error {
  constructor(message: string) {
    super(message);
  }
}
