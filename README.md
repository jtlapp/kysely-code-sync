# kysely-test-sync

Utility for keeping code and tests in sync with the Kysely repo

**UNDER DEVELOPMENT. NOT READY FOR USE. BUT SOON!**

## Introduction

With this utility, you can run your code against tests that are currently in the master branch of the Kysely repo. It is useful for testing Kysely dialects or other Kysely extensions and provides the following benefits:

1. It allows you to have confidence that Kysely continues to work as expected under the extension, that you didn't accidentally overlook something.
2. It allows you to benefit from new tests that are added to Kysely.
3. It allows you to learn when Kysely has fixed a bug that also requires your attention.
4. It allows you to borrow code from the Kysely repo that you found necessary for implementation, while also informing you of when Kysely has changed the borrowed code, in case you also need to update the code.

The utility accomplishes this with two development-time commands. The first command is `check-synced-code`, which compares blocks of code that you have borrowed from Kysely with the corresponding code that is currently in Kysely. You label the start and end of each of these blocks within your own code, and the tool reports the differences found.

The second command is `load-kysely-tests`. It downloads selected test files from the Kysely repo and modifies them for local use, storing them in a temporary directory. You have complete control over which test files are downloaded. For each file, you can specify which tests are not to be run as part of the local test suite. The command would run with every run of the test suite, so that the code always runs against the latest Kysely tests.

## Installation

First install the package with your preferred dependency manager:

```
npm install -D kysely-test-sync

yarn add -D kysely-test-sync

pnpm add -D kysely-test-sync
```

To run downloaded Kysely tests, you'll also need to install Kysely and [Kysely's test dependencies](https://github.com/kysely-org/kysely/blob/master/package.json), which you may need to manually keep in sync with Kysely. These are the additional dependencies at the time of this writing:

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
| `localSyncDirs` | An array of the directories containing code having code blocks that are to be synced with Kysely. Includes all nested directories. |

The `load-kysely-tests` command uses the following configuration keys:

<!-- prettier-ignore -->
| Key | Description |
| --- | --- |
| `kyselyTestDir` | Directory relative to the Kysely root where the desired test files are found. (e.g. `test/node/src`). |
| `kyselyTestFiles` | Object mapping test names to arrays of test names. If a file in the `kyselyTestDir` directory has name `select.test.ts`, the key is just `select`. The test names are the names of the tests that are to be skipped. |
| `downloadedTestsDir` | This is the temporary directory into which the test files are to be downloaded from Kysely for local transpilation by TypeScript. The command deletes this directory prior to running. Expressed relative to the current working directory. |
| `customSetupFile` | This is the path to the test setup code, expressed relative to the files in `downloadedTestsDir`. The file replaces the `test-setup.ts` found in the Kysely test suite. You'll want to copy and modify Kysely's file. |

Here is an example from [`kysely-pg-client`](https://github.com/jtlapp/kysely-pg-client):

```json
// test-sync.json
{
  "localSyncDirs": ["src", "test/node/src"],
  "kyselyTestDir": "test/node/src",
  "kyselyTestFiles": {
    "delete": [],
    "execute": [],
    "insert": [],
    "select": [
      "should release connection on premature async iterator stop",
      "should release connection on premature async iterator stop when using a specific chunk size",
      "should throw an error if the cursor implementation is not provided for the postgres dialect"
    ],
    "transaction": ["should run multiple transactions in parallel"],
    "update": []
  },
  "downloadedTestsDir": "test/node/src/temp",
  "customSetupFile": "../custom-test-setup.js"
}
```

You can specify a particular configuration file via the `--config` option, giving the file any name you want. It is expressed relative to the current working directory. Examples:

```
npx check-synced-code --config=test/test-sync.json

npx load-kysely-tests --config=config-files/config-file-1.json
```

You'll use separate configuration files for running tests from different Kysely directories.

## Using `check-synced-code`

The `check-synced-code` command compares designated blocks of code in your repo with corresponding code in the Kysely repo. These are blocks of code that you have copied from Kysely to implement or test your Kysely extension. Remember to include copyright notices.

Make sure that any code you want synchronized with Kysely is in a directory listed in the `localSyncDirs` configuration key. The code can also be within a nested directory.

In a comment at the start of the file, include the words `SYNC WITH <URL>`, where `<URL>` is the GitHub URL for the file that contains the code you copied from. This can be either a "blob" URL or a "raw" URL. `SYNC WITH` must be uppercase.

Before each block of code that you which to keep synchronized with Kysely, add a comment including the exact phrase `BEGIN SYNCED CODE`, including letter case. And after each of these blocks of code, include a comment with the exact phrase `END SYNCED CODE`. For example:

<!-- prettier-ignore -->
```ts
// SYNC WITH https://github.com/kysely-org/kysely/blob/master/test/node/src/test-setup.ts

...

/* BEGIN SYNCED CODE | Copyright (c) 2022 Sami Koskimäki | MIT License */
export interface Person {
  id: Generated<number>
  first_name: string | null
  middle_name: ColumnType<string | null, string | undefined, string | undefined>
  last_name: string | null
  gender: 'male' | 'female' | 'other'
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | null
}

export interface Pet {
  id: Generated<number>
  name: string
  owner_id: number
  species: 'dog' | 'cat' | 'hamster'
}
/* END SYNCED CODE */
```

The code in this block must match the code in Kysely, including identation, blank lines, and prettier format. To get the right indentation, you may need to bracket code in simple `{ ... }` code blocks. Kysely does not end statements with semi-colons, so you'll need to be sure your prettier is not automatically including them.

Run `npx check-synced-code` to compare these blocks with the most recent files in the Kysely master branch. The tool looks for an exact match. It reports when no match can be found, and when a partial match is found, it reports the first differing line in each block, providing the line number in your local file. It's probably best to call this command prior to every build of code that includes synchronized blocks.

## Using `load-kysely-tests`

The `load-kysely-tests` command dynamically downloads test files from the Kysely repo and modifes them for local use. But it requires quite a bit of setup. I found it easiest to locally mirror the Kysely test structure and borrow `package.json` test scripts from Kysely. Here is the structure I have working with [`kysely-pg-client`](https://github.com/jtlapp/kysely-pg-client):

```
test-sync.json
test/
    node/
        dist/  <-- output of test build
        src/
            temp/  <-- directory into which Kysely tests download
        custom-test-setup.ts
        custom-select.test.ts
        custom-transaction.test.ts
```

The files `custom-select.test.ts` and `custom-transaction.test.ts` contain tests I modified from Kysely's `select.test.ts` and `transaction.test.ts` files. You don't have to prefix these files with `custom-`; I only did so to make it clear that I'm not looking at the downloaded `select.test.ts` and `transaction.test.ts`, most of whose tests I'm also running.

You'll almost certainly need to create `custom-test-setup.ts` by copying and modifying the appropriate `test-setup.ts` file from Kysely. This is a good place to be using synced code blocks, as well as in your custom test files. You can give setup file any name you want; just be sure to set the `customSetupFile` configuration key to the file.

Your custom test setup file must export a `reportMochaContext()` function. This function receives the Mocha context for each test immediately prior to running the test. This context is the value of `this` within a Mocha test. You can use it to get the name of the enclosing `describe` block as well as the name of the curren test. (Sorry, I can't find a decent reference.) Here is an example implementation:

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

This function is probably most useful for intercepting calls to `testSql()`, which is defined in the test setup. It receives object mapping dialects to SQL to run for the dialect, but if you're developing your own dialect, your dialect won't be among those in Kysely's test suite. You can remedy this by modifying `testSql()` to use the appropriate dialect-specific SQL associated wth the test case indicated by the most recent call to `reportMochaContext()`.

Of course, if you don't need this function, you can just stub it out:

<!-- prettier-ignore -->
```ts
import { Context as MochaContext } from 'mocha'

export function reportMochaContext(_cx: MochaContext): void {
  // not used
}
```

The trickiest part of modifying the test setup is getting the tests to transpile despite not running the tests against any of its native dialects. There are many ways to do this, and I'll not walk you through it, but you can reference [`kysely-pg-client`'s implementation](https://github.com/jtlapp/kysely-pg-client/blob/main/test/node/src/custom-test-setup.ts). This implementation restricts execution to just the `postgres` dialect.

Set the `KyselyTestDir` configuration key to the directory of the desired test suite. List the test files that you would like to run as keys of the `kyselyTestFiles` object. Only these files of the suite will be downloaded. Each of these file keys takes an array of the test names that will **NOT** be run as part of the local test suite. The downloader will attach a `.skip` qualifier to each of them. Finally, set `downloadedTestsDir` to the directory into which the test files should be downloaded.

Now you can run `npx load-kysely-tests` to download the test files into the download directory and have them modified for use in the local test suite. It's probably best to call the command on every run of the test, so you don't have to remember to download the files prior to running the test.

You'll probably also want to add the download directory to your `.gitignore`.

## The Meaning of Test Failures

When `check-synced-code` reports differences, or when tests that `load-kysely-tests` has downloaded report test failures, you can't necessarily infer that there is a bug in your code. All you can infer is that something has changed in the Kysely repo that requires your attention. You may only need to make small tweaks to get things running again, or you may find that Kysely has reorganized its code, or you may find that Kysely has indeed added a test that uncovers a bug in your code.

Unlike a traditional test suite, a test suite that employs these commands can (almost certainly will) eventually break without your ever changing a line. This is by design. The folks who maintain Kysely are maintaining part of your test suite for you.
You are getting some repo maintenance for free.

## License

MIT License. Copyright &copy; 2023 Joseph T. Lapp
