import { promises as fsp } from 'fs';
import * as path from 'path';

export const CONFIG_FILE_NAME = 'test-sync.json';

const CONFIG_ARG = '--config=';
const DEFAULT_BASE_COPY_REF_URL =
  'https://github.com/kysely-org/kysely/blob/master/';
const DEFAULT_BASE_COPY_RAW_URL =
  'https://raw.githubusercontent.com/kysely-org/kysely/master/';
const DEFAULT_BASE_TEST_RAW_URL =
  'https://raw.githubusercontent.com/kysely-org/kysely/master/test/node/src/';

let config: TestSyncConfig;

export interface TestSyncConfig {
  __baseCopyRefUrl: string;
  __baseCopyRawUrl: string;
  __baseTestRawUrl: string;
  copyDirs: string[];
  testFiles: Record<string, string[]>;
  downloadedTestsDir: string;
  customSetupFile: string;
}

export async function getConfig(configFile?: string): Promise<TestSyncConfig> {
  if (!config) {
    const configArg = process.argv.filter((arg) => arg.startsWith(CONFIG_ARG));
    const relativeConfigPath = configFile
      ? configFile
      : configArg[0]
      ? configArg[0].substring(CONFIG_ARG.length)
      : CONFIG_FILE_NAME;
    const absoluteConfigPath = path.join(process.cwd(), relativeConfigPath);

    const configText = await fsp.readFile(absoluteConfigPath, 'utf-8');
    config = JSON.parse(configText);

    if (!config.copyDirs && !config.testFiles) {
      throw new Error(
        `${relativeConfigPath} must provide at least one of 'copyDirs' and 'testFiles'`
      );
    }
    if (config.testFiles && !config.downloadedTestsDir) {
      throw new Error(
        `${relativeConfigPath} must provide 'downloadedTestsDir' for 'testFiles'`
      );
    }
    if (config.testFiles && !config.customSetupFile) {
      throw new Error(
        `${relativeConfigPath} must provide 'customSetupFile' for 'testFiles'`
      );
    }

    config.__baseCopyRefUrl = appendSlash(
      config.__baseCopyRefUrl,
      DEFAULT_BASE_COPY_REF_URL
    );
    config.__baseCopyRawUrl = appendSlash(
      config.__baseCopyRawUrl,
      DEFAULT_BASE_COPY_RAW_URL
    );
    config.__baseTestRawUrl = appendSlash(
      config.__baseTestRawUrl,
      DEFAULT_BASE_TEST_RAW_URL
    );
  }
  return config;
}

function appendSlash(dir: string | undefined, defaultDir: string): string {
  dir ??= defaultDir;
  return dir.endsWith('/') ? dir : dir + '/';
}
