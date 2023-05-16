import { expect } from 'chai';
import { exec } from 'child_process';
import { promises as fsp } from 'fs';
import { join } from 'path';

import { CONFIG_FILE_NAME, getConfig } from './test-sync-config.js';

const COMMAND_PATH = join(__dirname, './check-synced-code.js');
const TEST_DIR_NAME = 'test';
const TEST_DIR = join(process.cwd(), TEST_DIR_NAME);
const TEST_CONFIG_FILE = join(TEST_DIR_NAME, CONFIG_FILE_NAME);
const EXPECTED_DIFFS_PATH = join(TEST_DIR, 'expected-diffs.txt');

describe('check-synced-code', () => {
  it('should produce the expected stderr output', async () => {
    const command = `node ${COMMAND_PATH} --config=${TEST_CONFIG_FILE}`;
    let stderr: string = await new Promise((resolve) => {
      exec(command, (err: any) => {
        resolve(
          err
            ? err.message.substring(err.message.indexOf('\n') + 1)
            : 'NO DIFFERENCES FOUND'
        );
      });
    });
    stderr = stderr.trim();

    // Sort the output for proper comparison with expected output.
    if (stderr.length > 0) {
      const lines = stderr.split('\n');
      const messages: string[] = [];
      for (let i = 0; i < lines.length - 2; i += 2) {
        messages.push(`${lines[i]}\n${lines[i + 1]}`);
      }
      messages.sort();
      stderr =
        messages.join('\n') +
        `\n${lines[lines.length - 2]}\n${lines[lines.length - 1]}`;
    }

    const expectedOutput = await fsp.readFile(EXPECTED_DIFFS_PATH, 'utf-8');
    expect(stderr).to.equal(expectedOutput);
  });

  it('should error on invalid configurations', async () => {
    const testConfigDir = join(TEST_DIR_NAME, 'test-config-files');

    let err = await runCommand();
    expect(err).to.contain('Config file not found');

    err = await runCommand('invalid-config.json');
    expect(err).to.contain('Config file not found');

    err = await runCommand(join(testConfigDir, 'no-copyDirs.json'));
    expect(err).to.contain("Config file doesn't provide 'copyDirs'");

    try {
      await getConfig(join(testConfigDir, 'valid-for-kysely.json'));
    } catch (e: any) {
      expect(true).to.equal(false, 'Unexpected error: ' + e.message);
    }
  });
});

async function runCommand(configFile?: string) {
  const command = configFile
    ? `node ${COMMAND_PATH} --config=${configFile}`
    : `node ${COMMAND_PATH}`;
  return new Promise<string>((resolve) => {
    exec(command, (err: any, _stdout, stderr) => {
      resolve(err ? err.message : stderr);
    });
  });
}
