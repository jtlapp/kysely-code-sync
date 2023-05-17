import { expect } from 'chai';

import {
  MAX_VERSION,
  getKyselyVersion,
  getKyselySourceURL,
  getMaxVersions,
  getClosestKyselyVersion,
} from './kysely-versions';

describe('kysely version support', () => {
  it('should return the version of kysely installed as a dependency', () => {
    // Kysely is not locally installed. Not easy to test.
    expect(getKyselyVersion()).equal(null);
  });

  it('gshould return the GitHub URL for the given version', () => {
    expect(getKyselySourceURL('1.2.3')).equal(
      `https://github.com/kysely-org/kysely/1.2.3/`
    );
  });

  it('should return the maximum versions for the given version', () => {
    const maxVersions = [MAX_VERSION, MAX_VERSION, MAX_VERSION];

    expect(getMaxVersions('^0.2.3')).deep.equal([0, 2, MAX_VERSION]);
    expect(getMaxVersions('^1.2.3')).deep.equal([1, MAX_VERSION, MAX_VERSION]);
    expect(getMaxVersions('~1.2.3')).deep.equal([1, 2, MAX_VERSION]);
    expect(getMaxVersions('=1.2.3')).deep.equal([1, 2, 3]);
    expect(getMaxVersions('1.2.3')).deep.equal([1, 2, 3]);
    expect(getMaxVersions('<=1.2.3')).deep.equal([1, 2, 3]);
    expect(getMaxVersions('>=1.2.3')).deep.equal(maxVersions);
    expect(getMaxVersions('latest')).deep.equal(maxVersions);
  });

  it('should return the closest released version of kysely', async () => {
    // GitHub has a maximum of 60 requests per hour for unauthenticated users,
    // so keep these testt cases to a minimum.

    let version = await getClosestKyselyVersion([0, 24, 2]);
    expect(version).equal('0.24.2');

    version = await getClosestKyselyVersion([0, 24, 1]);
    expect(version).equal('0.24.0');

    version = await getClosestKyselyVersion([0, 23, MAX_VERSION]);
    expect(version).equal('0.23.5');

    version = await getClosestKyselyVersion([0, 18, 0]);
    expect(version).equal('0.18.0');

    version = await getClosestKyselyVersion([0, 17, MAX_VERSION]);
    expect(version).equal('0.17.3');
  });
});
