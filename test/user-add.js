import restify from 'restify-clients';
import { assert } from 'chai';

const client = restify.createJsonClient({
  url: `http://localhost:${process.env.PORT}`,
  version: '*',
});

client.basicAuth('test', 'D4EG43C0-8BV6-4FE2-B358-7C0R230H11EF');

describe('create-user api endpoint', () => {
  it('Should create a user successfully', async (done) => {
    await client.post(
      '/create-user',
      {
        username: 'me',
        password: 'w0rd',
        provider: 'local',
        familyName: 'Jittghiam',
        givenName: 'Brimghieolaer',
        middleName: 'Ostiraldir',
        emails: [],
        photos: [],
      },
      (err, req, res, obj) => {
        assert.isNull(err, 'User should be created successfully');
        assert.isObject(obj, 'The returned user data should be an object');
        assert.hasAllKeys(
          obj,
          [
            'username',
            'password',
            'provider',
            'familyName',
            'givenName',
            'emails',
            'photos',
          ],
          'User object should contain specified keys',
        );
      },
    );
    done();
  });
});

