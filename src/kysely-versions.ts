import * as path from 'path';
import * as fs from 'fs';

import { InvalidConfigException, TestSyncConfig } from './test-sync-config';

export const MAX_VERSION = 9999999;

const BASE_TEST_RAW_URL =
  'https://raw.githubusercontent.com/jtlapp/kysely-test-sync/main/';
const KYSELY_RELEASE_URL =
  'https://api.github.com/repos/kysely-org/kysely/releases?per_page=100';

interface GitHubRelease {
  tag_name: string;
}

export async function getBaseDownloadUrl(
  config: TestSyncConfig
): Promise<string> {
  const kyselyVersion = getKyselyVersion();
  if (!kyselyVersion) {
    if (
      !config.__baseCopyRawUrl ||
      !config.__baseCopyRefUrl.includes(getPackageName())
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

/**
 * Returns the name of the current package.
 * @returns A string
 */
export function getPackageName(): string {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return json.name;
}

/**
 * Returns the semantic version of the installed Kysely package, according to
 * the `package.json` file in the current working directory, or null if the
 * file does not indicate a Kysely package.
 */
export function getKyselyVersion(): string | null {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return json.dependencies?.kysely ?? json.devDependencies?.kysely ?? null;
}

/**
 * Returns the base URL for the source code to the indicated Kysely version.
 * @param version A semantic version expressed as a string
 * @returns A URL
 */
export function getKyselySourceURL(version: string): string {
  return `https://raw.githubusercontent.com/kysely-org/kysely/${version}/`;
}

/**
 * Returns the theoretical maximum version of a package with which the given
 * semantic version is compatible, assuming maximum versions of `MAX_VERSION`.
 * @param version A semantic version
 * @returns A semantic version expressed as a tuple
 */
export function getMaxVersions(version: string): [number, number, number] {
  const prefix = version.match(/^\D*/)![0];
  const versions = version
    .slice(prefix.length)
    .split('.')
    .map((v) => parseInt(v));
  switch (prefix) {
    case '^':
      if (versions[0] === 0) {
        return [versions[0], versions[1], MAX_VERSION];
      }
      return [versions[0], MAX_VERSION, MAX_VERSION];
    case '~':
      return [versions[0], versions[1], MAX_VERSION];
    case '':
    case '=':
    case '<=':
      return [versions[0], versions[1], versions[2]];
    default:
      return [MAX_VERSION, MAX_VERSION, MAX_VERSION];
  }
}

/**
 * Returns the greatest released version of Kysely that is less than or equal
 * to the given version, according to the GitHub API.
 * @param version A semantic version expressed as a tuple
 * @returns A semantic version expressed as a string
 */
export async function getClosestKyselyVersion(
  maxVersions: [number, number, number]
): Promise<string> {
  let response = await fetch(KYSELY_RELEASE_URL + '&page=1');
  let page = 1;
  while (response.ok) {
    const releases: GitHubRelease[] = await response.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      break;
    }
    for (const release of releases) {
      const versions = release.tag_name.split('.').map((v) => parseInt(v));
      if (
        versions[0] <= maxVersions[0] &&
        versions[1] <= maxVersions[1] &&
        versions[2] <= maxVersions[2]
      ) {
        return versions.join('.');
      }
    }
    response = await fetch(`${KYSELY_RELEASE_URL}&page=${++page}`);
  }
  throw new InvalidConfigException(
    'Could not find a version of Kysely <= ' + maxVersions.join('.')
  );
}
