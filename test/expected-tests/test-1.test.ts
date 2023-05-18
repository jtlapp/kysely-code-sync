// Copied from Kysely | MIT License | Copyright (c) 2022 Sami Koskimäki
// https://github.com/jtlapp/kysely-test-sync/blob/main/test/mock-kysely-tests/test-1.test.ts

import { reportMochaContext } from '../custom-test-setup.js';
import { Something } from 'kysely';
import { setup } from '../custom-test-setup.js';

describe('suite 1', () => {
  beforeEach(function () {
    reportMochaContext(this);
  });

  it.skip('should do something 1A', () => {
    // ...
  });

  it('should do something 1B', () => {
    // ...
  });

  it.skip('should do something 1C', () => {
    // ...
  });
});
