# kysely-test-sync

Utility for keeping code and tests in sync with the Kysely repo

## Introduction

With this utility, you can run your code against tests in published versions of the [Kysely](https://github.com/kysely-org/kysely) repo. Semantic versioning determines the appropriate release of Kysely to use, allowing code to run against newer releases that are supposed to be compatible. The utility is useful for testing Kysely dialects or other Kysely extensions and provides the following benefits:

1. It allows you to have confidence that Kysely continues to work as expected under the extension, that you didn't accidentally overlook something.
2. It allows you to benefit from new tests that are added to Kysely.
3. It allows you to learn when Kysely has fixed a bug that also requires your attention.
4. It allows you to borrow code from the Kysely repo that you found necessary for implementation, while also informing you of when Kysely has changed the borrowed code, in case you also need to update the code.

The utility accomplishes this with two development-time commands. The first command is `check-synced-code`, which compares blocks of code that you have borrowed from Kysely with the corresponding code in Kysely releases. You label the start and end of each of these blocks within your own code, and the tool reports the differences found. The command is especially useful for adapting tests.

The second command is `load-kysely-tests`. It downloads selected test files from Kysely releases and modifies them for local use, storing them in a local directory. You have complete control over which test files are downloaded. For each file, you can specify which tests are not to be run as part of the local test suite. You would normally execute the command only when you want to upgrade the test suite for a newer release of Kysely.

You can have the utility sync with a particular release, or you can have the utility heed the semantic version of your Kysely installation and sync with the most recent compatible release of Kysely.

## Installation

First install the package with your preferred dependency manager:

```
npm install -D kysely-test-sync

yarn add -D kysely-test-sync

pnpm add -D kysely-test-sync
```

To run downloaded Kysely tests, you'll also need to install Kysely and [Kysely's test dependencies](https://github.com/kysely-org/kysely/blob/master/package.json), which you'll need to manually keep in sync with the appropriate Kysely release. These are the additional dependencies at the time of this writing:

```json
  "devDependencies": {
    "@types/chai": "^4.3.1",
    "@types/chai-as-promised": "^7.1.5",
    "@types/chai-subset": "^1.3.3",
    "@types/mocha": "^9.1.1",
    "@types/node": "^18.15.11",
    "chai": "^4.3.6",
    "chai-as-promised": "^7.1.1",
    "chai-subset": "^1.6.0",
    "kysely": "latest",
    "mocha": "^10.0.0",
    "typescript": "^4.9.5"
  }
```

The utility requires Node.js v18 or higher.

## Configuration

The default configuration file is `test-sync.json`, and it is expected to be found in the current working directory at the time a command is run.

The `check-synced-code` command only uses the configuration key:

<!-- prettier-ignore -->
| Key | Description |
| --- | --- |
| `kyselyVersion` | *Optional.* Version of Kysely with which to compare code, or branch name. Overrides determination by semantic versioning, but is itself overridden by the `--version` command line option. |
| `localSyncDirs` | *Required.* An array of the directories containing code having code blocks that are to be synced with Kysely. Includes all nested directories. |

The `load-kysely-tests` command uses the following configuration keys:

<!-- prettier-ignore -->
| Key | Description |
| --- | --- |
| `kyselyVersion` | *Optional.* Version of Kysely from which to pull test files, or branch name. Overrides determination by semantic versioning, but is itself overridden by the `--version` command line option. |
| `kyselyTestDir` | *Required.* Directory relative to the Kysely root where the desired test files are found. (e.g. `test/node/src`). |
| `kyselyTestFiles` | *Required.* Object mapping file names to arrays of test names. The test names are the names of the tests that are to be skipped. |
| `downloadDir` | *Required.* This is the directory into which the test files are to be downloaded from Kysely for local transpilation by TypeScript. The command deletes this directory prior to running. Expressed relative to the current working directory. |
| `customSetupFile` | *Required.* This is the path to the test setup code, expressed relative to the files in `downloadDir`. The file replaces the `test-setup.ts` found in the Kysely test suite. You'll want to copy and modify Kysely's file. |

Here is an example from [`kysely-pg-client`](https://github.com/jtlapp/kysely-pg-client):

```json
// test-sync.json
{
  "localSyncDirs": ["src", "test/node/src"],
  "kyselyTestDir": "test/node/src",
  "kyselyTestFiles": {
    "delete.test.ts": [],
    "execute.test.ts": [],
    "insert.test.ts": [],
    "select.test.ts": [
      "should release connection on premature async iterator stop",
      "should release connection on premature async iterator stop when using a specific chunk size",
      "should throw an error if the cursor implementation is not provided for the postgres dialect"
    ],
    "transaction.test.ts": ["should run multiple transactions in parallel"],
    "update.test.ts": []
  },
  "downloadDir": "test/node/src/downloads",
  "customSetupFile": "../custom-test-setup.js"
}
```

You can specify a particular configuration file via the `--config` option, giving the file any name you want, provided it has extension `.json`. Express the file relative to the current working directory. Examples:

```bash
npx check-synced-code --config=test/test-sync.json

npx load-kysely-tests --config=config-files/config-file-1.json
```

You can also use the `--version` option to specify a particular version or branch of Kysely against which to sync the data, overriding the configuration. Examples:

```bash
npx check-synced-code --version=some-branch

npx load-kysely-tests --version=0.23.0
```

You'll use separate configuration files for running tests from different Kysely directories.

## Using `check-synced-code`

The `check-synced-code` command compares designated blocks of code in your repo with corresponding code in Kysely releases. These are blocks of code that you have copied from Kysely to implement or test your Kysely extension. Be sure to borrow code from the appropriate Kysely release, instead of from the master branch, which might have newer code intended for a later release. Also remember to convey copyright notices.

Make sure that any code you want synchronized with Kysely is in a directory listed in the `localSyncDirs` configuration key. The code can also be within a nested directory.

In a comment at the start of the file, include the words `SYNC WITH <URL>`, where `<URL>` is the GitHub URL for the file that contains the code you copied from. This can be either a "blob" URL or a "raw" URL. `SYNC WITH` must be uppercase.

Before each block of code that you which to keep synchronized with Kysely, add a comment including the exact phrase `BEGIN SYNCED CODE`, including letter case. After each of these blocks of code, include a comment with the exact phrase `END SYNCED CODE`. The comment style you use doesn't matter. Here is an example:

<!-- prettier-ignore -->
```ts
// SYNC WITH https://github.com/kysely-org/kysely/blob/master/test/node/src/test-setup.ts

...

// BEGIN SYNCED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License
export interface Person {
  id: Generated<number>
  first_name: string | null
  middle_name: ColumnType<string | null, string | undefined, string | undefined>
  last_name: string | null
  gender: 'male' | 'female' | 'other'
}

export interface Pet {
  id: Generated<number>
  name: string
  owner_id: number
  species: 'dog' | 'cat' | 'hamster'
}
// END SYNCED CODE
```

The code in this block must match the code in Kysely, including identation, blank lines, and prettier format. To get matching indentation, you may need to further bracket code in simple `{ ... }` code blocks. Kysely does not end statements with semi-colons, so you'll need to be sure your prettier is not automatically including them.

Run `npx check-synced-code` to compare these blocks with the most recent version-compatible release of Kysely. The tool requries the code to exactly match a of block of code within Kysely. It reports when no match can be found, and when a partial match is found, it reports the first differing line in each block, providing the line number for your local file.

When differences are found, they are written to `stderr` and the command exits with exit code 1.

## Using `load-kysely-tests`

The `load-kysely-tests` command dynamically downloads test files from the Kysely repo and modifies them for local use. It also puts `_kysely-version.txt` in the downloads directory to indicate the downloaded version, including its URL. You'll need to provide the scripts that compile and run the tests, as the command does not provide them.

This command requires quite a bit of setup. I found it easiest to locally mirror the Kysely test structure and borrow some of Kysely's `package.json` test scripts.

Here is the structure I have working with [`kysely-pg-client`](https://github.com/jtlapp/kysely-pg-client):

```
test-sync.json
test/
    node/
        dist/  <-- output of test build
        src/
            downloads/  <-- directory into which Kysely tests download
        custom-test-setup.ts
        custom-select.test.ts
        custom-transaction.test.ts
```

The files `custom-select.test.ts` and `custom-transaction.test.ts` contain tests I modified from Kysely's `select.test.ts` and `transaction.test.ts` files. You don't have to prefix these files with `custom-`; I only did so to make it clear when I'm not looking at the downloaded `select.test.ts` and `transaction.test.ts`, whose tests I'm also running.

You'll almost certainly need to create your `custom-test-setup.ts` by copying and modifying the appropriate `test-setup.ts` file from Kysely. This is a good place to be using synced code blocks, as well as in your custom test files. You can give the setup file any name you want; just be sure to set the `customSetupFile` configuration key to the file.

Your custom setup file must export a `reportMochaContext()` function. This function receives the Mocha context for each test immediately before the test is run. The context is the value of `this` within a non-arrow function Mocha test. You can use the context to get the name of the enclosing `describe` block as well as the name of the current test. (Sorry, I can't find a decent reference.) Here is an example implementation:

<!-- prettier-ignore -->
```ts
import { Context as MochaContext } from 'mocha'

let parentTestName?: string
let currentTestName?: string

export function reportMochaContext(cx: MochaContext): void {
  parentTestName = cx.test?.parent?.title
  currentTestName = cx.test?.title
  if (currentTestName) {
    const HOOK_FOR = 'hook for '
    const hookOffset = currentTestName.indexOf(HOOK_FOR)
    if (hookOffset >= 0) {
      currentTestName = currentTestName.slice(hookOffset + HOOK_FOR.length)
      currentTestName = currentTestName.substring(1, currentTestName.length - 1)
    }
  }
}
```

This function is probably most useful for intercepting calls to `testSql()`, which is defined in the test setup. `testSql()` receives an object that maps dialect names to SQL and verifies that the query compiles to this SQL. If you're developing your own dialect, your dialect won't be in this object map. You can remedy this by having `testSql()` associate your own SQL with each test and relying on `reportMochaContext()` to indicate the current test.

Of course, if you don't need this function, you can just stub it out:

<!-- prettier-ignore -->
```ts
import { Context as MochaContext } from 'mocha'

export function reportMochaContext(_cx: MochaContext): void {
  // not used
}
```

The trickiest part of modifying the test setup is getting the tests to transpile despite not using the native dialects. There are many ways to accomplish this, and I'll not walk you through it, but you can reference [`kysely-pg-client`'s implementation](https://github.com/jtlapp/kysely-pg-client/blob/main/test/node/src/custom-test-setup.ts). This implementation restricts execution to just the `postgres` dialect.

Also create the configuration file. Set the `KyselyTestDir` key to the directory of the desired test suite. List the test files that you would like to run as keys of the `kyselyTestFiles` object. Only these files of the suite will be downloaded. Each of these file keys takes an array of the names of tests that will **NOT** be run as part of the local test suite; the downloader attaches a `.skip` qualifier to each of them. Finally, set `downloadDir` to the directory into which the test files should be downloaded.

Now you can run `npx load-kysely-tests` to download the test files into the download directory, modified for use in the local test suite.

## Semantic Versioning of Tests

When you run `check-synced-code` or `load-kysely-tests`, the command needs to decide which version of Kysely to sync with. The version is selected by the following procedure:

1. If the command includes the `--version` option, this is the version used.
2. Otherwise, if the configuration file includes the `kyselyVersion` key, this is the version used.
3. Otherwise, the command looks up the version of Kysely that's installed, according to `package.json`. It then identifies the most recent Kysely release that is compatible with this version according to semantic versioning.

Upon selecting a version, synced code blocks are compared with this release having this version, and test files are downloaded from this release having this version.

The most recent compatible release is determined as follows:

<!-- prettier-ignore -->
| Version Prefix | Example | Release Used |
| :---: | :---: | --- |
| none | `1.2.3` | Only this exact release (e.g. `1.2.3`). |
| `=` | `=1.2.3` | Only this exact release (e.g. `1.2.3`). |
| `~` | `~1.2.3` | The greatest patch release of this major/minor version (e.g. `1.2.10`) |
| `^` | `^1.2.3` | The greatest minor release of this major version (e.g. `1.20.5`), unless the major release is `0`, in which case behaves as if the prefix were `~`. |
| `<=` | `<=1.2.3` | Only this exact release (e.g. `1.2.3`). |
| `>=` | `>=1.2.3` | The most recent release, even if it has a different major version (e.g. `4.1.0`). |
| `latest` | `latest` | Same as `>=`. |

Each command outputs text reporting the release it is using. For example:

```
Syncing with Kysely release 0.24.2...
  https://github.com/kysely-org/kysely/tree/0.24.2
```

## Managing the Test Suite

These tools should not be run as part of the test suite proper. Instead, they should be run when you wish to upgrade your project for a newer version of Kysely.

Establish the Kysely release you would like to use and visit that release on GitHub to examine its code. Acquire the code you want to borrow and decide which tests of that release you wish to use. Use `load-kysely-tests` to locally install those tests and then adapt your borrowed code to get the tests to pass. Do not modify the downloaded test files.

Now you have a project that builds and passes its tests. Commit the project to your repository, including the downloaded tests. Provide a script that runs this test suite but does not call `load-kysely-tests` or `check-synced-code`.

Run these commands when you want to upgrade your project for compatibility with a more recent release of Kysely. When `check-synced-code` reports differences, or when tests that `load-kysely-tests` has downloaded report test failures, you can't necessarily infer that there is a bug in your project. All you can infer is that a more recent release changed something that requires your attention because the newer code is somehow incompatible. You are essentially collaborating with the folks who maintain Kysely. They are maintaining part of your test suite for you, but you have to periodically do the local integration.

It is probably unwise to run these commands as part of your test suite proper, because the tests could break on even patch updates to Kysely. It is not reasonable for you to immediately update the project for each new release, and it would not look good for a user to install your project, run the tests, and find that they fail.

It may be helpful to provide and document a script that runs the commands using semantic versioning, so that users have a way to check the project against more recent versions of Kysely. The project is supposed to be compatible with semantically equivalent versions, after all. Collectively, your users could be running this check more often than you do, and they could be reporting to you when its time to work on an upgrade. If you don't want this run to overwrite the committed, working tests, you could use a second configuration file indicating a second downloads directory in a second test directory. You'll want symbolic links for the custom files that need to be shared between the two test directories.

## License

MIT License. Copyright &copy; 2023 Joseph T. Lapp
