import { Something } from '../../../';
import { setup } from './test-setup.js';

describe('suite 2', () => {
  it('should do something 2A', () => {
    // ...
  });

  describe('suite 2.1', () => {
    it('should do something 2.1A', () => {
      // ...
    });

    it('should do something 2.1B', () => {
      // ...
    });
  });

  const suite = 'suite';
  describe(`${suite} 2.2`, function () {
    it('should do something 2.2A', () => {
      // ...
    });
  });
});
