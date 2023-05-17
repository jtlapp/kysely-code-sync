import { promises as fsp } from 'fs';
import { join } from 'path';

import {
  TestSyncConfig,
  getConfig,
  InvalidConfigException,
} from './test-sync-config.js';
import {
  getKyselySourceURL,
  getKyselyVersion,
  getMaxVersions,
  getClosestKyselyVersion,
} from './kysely-versions.js';

const BASE_TEST_RAW_URL =
  'https://raw.githubusercontent.com/jtlapp/kysely-test-sync/main/';

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
  // Load the configuration file.

  const config = await getConfig();
  if (!config.kyselyTestFiles) {
    throw new InvalidConfigException(
      "Config file doesn't provide 'kyselyTestFiles'"
    );
  }

  // Create the directory for the downloaded tests, initially empty.

  const kyselySourceDir = join(process.cwd(), config.downloadDir);
  try {
    await fsp.rm(kyselySourceDir, { recursive: true });
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
  await fsp.mkdir(kyselySourceDir);

  // Dowload the test files.

  const baseDownloadUrl = await getBaseDownloadUrl(config);
  for (const fileEntry of Object.entries(config.kyselyTestFiles)) {
    const fileName = `${fileEntry[0]}.test.ts`;
    const url = `${baseDownloadUrl}${config.kyselyTestDir}${fileName}`;
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

async function getBaseDownloadUrl(config: TestSyncConfig): Promise<string> {
  const kyselyVersion = getKyselyVersion();
  if (!kyselyVersion) {
    if (
      !config.__baseCopyRawUrl ||
      !config.__baseCopyRefUrl.includes(await getPackageName())
    ) {
      throw new InvalidConfigException(
        'Kysely is not installed as a dependency'
      );
    }
    return BASE_TEST_RAW_URL; // for testing kysely-test-sync
  }
  // The following code is not tested because its behavior varies
  // according the installed project's package.json file. However,
  // each of the function is individually tested.
  const maxVersions = getMaxVersions(kyselyVersion);
  const nearestVersion = await getClosestKyselyVersion(maxVersions);
  console.log(`Downloading tests for Kysely version ${nearestVersion}.\n`);
  return getKyselySourceURL(nearestVersion);
}

async function getPackageName(): Promise<string> {
  const packageJsonPath = join(process.cwd(), 'package.json');
  const json = JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'));
  return json.name;
}

function tweakKyselySource(
  config: TestSyncConfig,
  fileName: string,
  source: string,
  excludedTests: string[]
): string {
  // Import from kysely.

  source = source.replaceAll(/from '\.\.[./]*'/g, (match) => "from 'kysely'");

  // Use the custom test setup.

  source = source.replaceAll('./test-setup.js', config.customSetupFile);

  // Add an import for `reportMochaContext` from the custom setup.

  const IMPORT_START = 'import ';
  const importStartOffset = source.indexOf(IMPORT_START);
  if (importStartOffset >= 0) {
    source =
      source.substring(0, importStartOffset) +
      `import { reportMochaContext } from '${config.customSetupFile}';\n` +
      source.substring(importStartOffset);
  }

  // Call `reportMochaContext` from each `describe` block.

  const DESCRIBE_START_REGEX = /[ \t\n]describe\(/gm;
  const DESCRIBE_END_OF_OPENING = '{\n';
  const describeMatches = source.matchAll(DESCRIBE_START_REGEX);
  // replace in reverse order to avoid changing offsets
  const reverseMatches = [...describeMatches].reverse();
  for (const match of reverseMatches) {
    const describeStartOffset = match.index! + 1;
    const endOfPriorLine =
      source.lastIndexOf('\n', describeStartOffset + 1) + 1;
    const indent = source.substring(endOfPriorLine, describeStartOffset);
    const endOfOpeningOffset =
      source.indexOf(DESCRIBE_END_OF_OPENING, describeStartOffset) +
      DESCRIBE_END_OF_OPENING.length;
    source =
      source.substring(0, endOfOpeningOffset) +
      `${indent}  beforeEach(function () {\n` +
      `${indent}    reportMochaContext(this);\n` +
      `${indent}  });\n\n` +
      source.substring(endOfOpeningOffset);
  }

  // Skip excluded tests.

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
