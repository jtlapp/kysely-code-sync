import { reportMochaContext } from '../custom-test-setup.js';
import { Something } from 'kysely';
import { setup } from '../custom-test-setup.js';

describe('suite 2', () => {
  beforeEach(function () {
    reportMochaContext(this);
  });

  it('should do something 2A', () => {
    // ...
  });

  describe('suite 2.1', () => {
    beforeEach(function () {
      reportMochaContext(this);
    });

    it('should do something 2.1A', () => {
      // ...
    });

    it.skip('should do something 2.1B', () => {
      // ...
    });
  });

  const suite = 'suite';
  describe(`${suite} 2.2`, function () {
    beforeEach(function () {
      reportMochaContext(this);
    });

    it('should do something 2.2A', () => {
      // ...
    });
  });
});
