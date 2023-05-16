import { promises as fsp } from 'fs';
import * as path from 'path';

import {
  InvalidConfigException,
  TestSyncConfig,
  getConfig,
} from './test-sync-config.js';

const ADAPTED_FROM_REGEX = /Adapted from ([^\s]+)/i;
const BEGIN_UNCHANGED_LABEL = 'BEGIN COPIED CODE';
const END_UNCHANGED_LABEL = 'END COPIED CODE';

let differingCodeSegments = 0;

(async () => {
  try {
    await diffCopiedCode();
  } catch (e: any) {
    if (!(e instanceof InvalidConfigException)) throw e;
    console.error(`Failed to difference copied code\n${e.message}\n`);
    process.exit(1);
  }
})();

async function diffCopiedCode(): Promise<void> {
  const config = await getConfig();
  if (!config.copyDirs) {
    throw new InvalidConfigException("Config file doesn't provide 'copyDirs'");
  }

  for (const dir of config.copyDirs) {
    const dirPath = path.join(process.cwd(), dir);

    for await (const path of iterateOverTSFiles(dirPath)) {
      const sourceText = await fsp.readFile(path, 'utf-8');
      const match = sourceText.match(ADAPTED_FROM_REGEX);
      if (match) {
        const url = createSourceTargetURL(config, match[1]);
        const kyselyText = await loadFileFromURL(url);
        diffText(path, sourceText, kyselyText);
      }
    }
  }

  if (differingCodeSegments > 0) {
    console.error(`\n${differingCodeSegments} differing code segments found`);
    process.exit(1);
  }
}

function createSourceTargetURL(config: TestSyncConfig, url: string): string {
  if (url.startsWith(config.__baseCopyRawUrl)) {
    return url;
  } else if (url.startsWith(config.__baseCopyRefUrl)) {
    return (
      config.__baseCopyRawUrl + url.substring(config.__baseCopyRefUrl.length)
    );
  }
  throw new InvalidConfigException(
    `URL doesn't start with ${config.__baseCopyRefUrl}`
  );
}

async function* iterateOverTSFiles(dir: string): AsyncGenerator<string> {
  const files = await fsp.readdir(dir);
  for (const file of files) {
    const path = `${dir}/${file}`;
    const stat = await fsp.stat(path);
    if (stat.isDirectory()) {
      yield* iterateOverTSFiles(path);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      yield path;
    }
  }
}

async function loadFileFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw Error(`Failed to load ${url}: ${response.statusText}`);
  }
  return await response.text();
}

function diffText(path: string, sourceText: string, kyselyText: string): void {
  const sourceLines = sourceText.split('\n');
  const kyselyLines = kyselyText.split('\n');
  path = path.substring(process.cwd().length + 1);

  let nextUnchangedLineIndex = findNextUnchangedLine(0, sourceLines);
  while (nextUnchangedLineIndex >= 0) {
    const endOfUnchangedLines = findEndOfUnchangedLines(
      sourceLines,
      nextUnchangedLineIndex++
    );
    const unchangedLines = sourceLines.slice(
      nextUnchangedLineIndex,
      endOfUnchangedLines
    );

    const firstDifferingLineIndex = findFirstDifferingLine(
      unchangedLines,
      kyselyLines
    );
    if (firstDifferingLineIndex >= 0) {
      console.error(`${path}: differs from Kysely source`);
      console.error(
        `  ${nextUnchangedLineIndex + firstDifferingLineIndex + 1}: ${
          unchangedLines[firstDifferingLineIndex]
        }`
      );
      ++differingCodeSegments;
    }

    nextUnchangedLineIndex = findNextUnchangedLine(
      endOfUnchangedLines + 1,
      sourceLines
    );
  }
}

function findNextUnchangedLine(
  staringLineIndex: number,
  lines: string[]
): number {
  for (let i = staringLineIndex; i < lines.length; ++i) {
    if (lines[i].includes(BEGIN_UNCHANGED_LABEL)) {
      return i;
    }
  }
  return -1;
}

function findEndOfUnchangedLines(lines: string[], index: number): number {
  for (let i = index; i < lines.length; ++i) {
    if (lines[i].includes(END_UNCHANGED_LABEL)) {
      return i;
    }
  }
  throw new InvalidConfigException(
    `Couldn't find matching ${END_UNCHANGED_LABEL} comment`
  );
}

function findFirstDifferingLine(
  unchangedLines: string[],
  kyselyLines: string[]
): number {
  let lastDifferentLineIndex = 0;
  let kyselyLineIndex = 0;
  while (kyselyLineIndex < kyselyLines.length) {
    if (kyselyLines[kyselyLineIndex] == unchangedLines[0]) {
      let unchangedLineIndex = 1;
      while (unchangedLineIndex < unchangedLines.length) {
        if (
          unchangedLines[unchangedLineIndex] !==
          kyselyLines[kyselyLineIndex + unchangedLineIndex]
        ) {
          lastDifferentLineIndex = unchangedLineIndex;
          break;
        }
        ++unchangedLineIndex;
      }
      if (unchangedLineIndex == unchangedLines.length) {
        return -1;
      }
    }
    ++kyselyLineIndex;
  }
  return lastDifferentLineIndex;
}
