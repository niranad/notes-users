import restify from 'restify-clients';
import { assert } from 'chai';

const client = restify.createJsonClient({
  url: 'http://localhost' + process.env.PORT,
  version: '*',
});

client.basicAuth('test', 'D4EG43C0-8BV6-4FE2-B358-7C0R230H11EF');

describe('find user api endpoint', async (done) => {
  await client.get('/find' + process.argv[2], (err, req, res, obj) => {
    assert.isNull(err, 'The get operation should throw no err');
    assert.isObject(obj, 'The returned data should be of type Object');
  });
  done();
});

