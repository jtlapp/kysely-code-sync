import { promises as fsp } from 'fs';
import * as path from 'path';

export const CONFIG_FILE_NAME = 'test-sync.json';

const CONFIG_ARG = '--config=';
const VERSION_ARG = '--version=';
const DEFAULT_BASE_SYNC_REF_URL =
  'https://github.com/kysely-org/kysely/blob/master/';
const DEFAULT_BASE_SYNC_RAW_URL =
  'https://raw.githubusercontent.com/kysely-org/kysely/master/';

let config: TestSyncConfig;

export interface TestSyncConfig {
  __baseSyncRefUrl: string;
  __baseSyncRawUrl: string;
  kyselyVersion?: string;
  localSyncDirs: string[];
  kyselyTestDir: string;
  kyselyTestFiles: Record<string, string[]>;
  downloadDir: string;
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

    try {
      const configText = await fsp.readFile(absoluteConfigPath, 'utf-8');
      config = JSON.parse(configText);
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
      throw new InvalidConfigException(
        `Config file not found: ${relativeConfigPath}`
      );
    }

    if (!config.localSyncDirs && !config.kyselyTestFiles) {
      throw new InvalidConfigException(
        `${relativeConfigPath} must provide at least one of 'localSyncDirs' and 'kyselyTestFiles'`
      );
    }
    if (config.kyselyTestFiles && !config.kyselyTestDir) {
      throw new InvalidConfigException(
        `${relativeConfigPath} must provide 'kyselyTestDir' for 'kyselyTestFiles'`
      );
    }
    if (config.kyselyTestFiles && !config.downloadDir) {
      throw new InvalidConfigException(
        `${relativeConfigPath} must provide 'downloadDir' for 'kyselyTestFiles'`
      );
    }
    if (config.kyselyTestFiles && !config.customSetupFile) {
      throw new InvalidConfigException(
        `${relativeConfigPath} must provide 'customSetupFile' for 'kyselyTestFiles'`
      );
    }

    config.__baseSyncRefUrl = appendSlash(
      config.__baseSyncRefUrl,
      DEFAULT_BASE_SYNC_REF_URL
    );
    config.__baseSyncRawUrl = appendSlash(
      config.__baseSyncRawUrl,
      DEFAULT_BASE_SYNC_RAW_URL
    );
    config.kyselyTestDir = appendSlash(config.kyselyTestDir, '');

    const versionArg = process.argv.filter((arg) =>
      arg.startsWith(VERSION_ARG)
    );
    if (versionArg[0]) {
      config.kyselyVersion = versionArg[0].substring(VERSION_ARG.length);
    }
  }
  return config;
}

export class InvalidConfigException extends Error {
  constructor(message: string) {
    super(message);
  }
}

function appendSlash(dir: string | undefined, defaultDir: string): string {
  dir ??= defaultDir;
  return dir.endsWith('/') ? dir : dir + '/';
}
