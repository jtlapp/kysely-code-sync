import { promises as fsp } from 'fs';
import * as path from 'path';

export const CONFIG_FILE_NAME = 'test-sync.json';

const configFilePath = path.join(process.cwd(), CONFIG_FILE_NAME);
const DEFAULT_BASE_REFERENCE_URL =
  'https://github.com/kysely-org/kysely/blob/master/';
const DEFAULT_BASE_RAW_URL =
  'https://raw.githubusercontent.com/kysely-org/kysely/master/';

let config: TestSyncConfig;

export interface TestSyncConfig {
  baseRefUrl: string;
  baseRawUrl: string;
  copyDirs: string[];
  testFiles: Record<string, string[]>;
}

export async function getConfig(): Promise<TestSyncConfig> {
  if (!config) {
    const configText = await fsp.readFile(configFilePath, 'utf-8');
    config = JSON.parse(configText);
    if (!config.copyDirs && !config.testFiles) {
      throw new Error(
        `${CONFIG_FILE_NAME} must provide at least one of 'copyDirs' and 'testFiles'`
      );
    }
    config.baseRefUrl ??= DEFAULT_BASE_REFERENCE_URL;
    config.baseRawUrl ??= DEFAULT_BASE_RAW_URL;
  }
  return config;
}
