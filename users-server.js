import restify from 'restify';
import * as UserModel from './users-sequelize.js';
import debug from 'debug';
import util from 'util';

const log = debug('users:server');
const error = debug('users:error');

const server = restify.createServer({
  name: 'User-Auth-Service',
  version: '0.0.1',
});

server.use(restify.authorizationParser());
server.use(check);
server.use(restify.queryParser());
server.use(restify.bodyParser({ mapParams: true }));

// Create a user record
server.post('/create-user', (req, res, next) => {
  const {
    username,
    password,
    provider,
    lastName,
    givenName,
    middleName,
    emails,
    photos,
  } = req.params;
  UserModel.create(
    username,
    password,
    provider,
    lastName,
    givenName,
    middleName,
    emails,
    photos,
  )
    .then(result => {
      log('created ' + util.inspect(result));
      res.send(result);
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Update user record
server.post('/update-user/:username', (req, res, next) => {
  const {
    username,
    password,
    provider,
    lastName,
    givenName,
    middleName,
    emails,
    photos,
  } = req.params;
  UserModel.update(
    username,
    password,
    provider,
    lastName,
    givenName,
    middleName,
    emails,
    photos,
  )
    .then(result => {
      log('updated ' + util.inspect(result));
      res.send(result);
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Find a user, if not found create one given profile information
server.post('/find-or-create', (req, res, next) => {
  const {
    username,
    password,
    provider,
    lastName,
    givenName,
    middleName,
    emails,
    photos,
  } = req.params;
  UserModel.findOrCreate({
    id: username,
    username,
    password,
    provider,
    familyName,
    givenName,
    middleName,
    emails,
    photos,
  })
    .then(result => {
      res.send(result);
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Find the user data
server.get('/find/:username', (req, res, next) => {
  UserModel.find(req.params.username)
    .then(user => {
      if (!user) {
        res.send(500, new Error('Did not find ' + req.params.username));
      } else {
        res.send(user);
      }
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Delete a user record
server.del('/destroy/:username', (req, res, next) => {
  UserModel.destroy(req.params.username)
    .then(() => {
      res.send({});
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      next(false);
    });
});

// Check password
server.post('/passwordCheck', (req, res, next) => {
  UserModel.userPasswordCheck(req.params.username, req.params.password)
    .then(check => {
      res.send(check);
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      next(false);
    });
});

// List users
server.get('/list', (req, res, next) => {
  UserModel.listUsers()
    .then(usersList => {
      if (!usersList) return [];
      res.send(usersList);
      next(false);
    })
    .catch(err => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

server.listen(process.env.PORT, 'localhost', () => {
  log(`${server.name} listening at ${server.url}`);
});

// Mimic API key authentication
let apiKeys = [
  {
    user: 'test',
    key: 'D4EG43C0-8BV6-4FE2-B358-7C0R230H11EF',
  },
];

function check(req, res, next) {
  if (req.authorization) {
    let found = false;
    for (let auth of apikeys) {
      if (
        auth.key === req.authorization.basic.password &&
        auth.user === req.authorization.basic.username
      ) {
        found = true;
        break;
      }
      if (found) next();
      else {
        res.send(401, new Error('Not Authenticated'));
        error(`Failed authentication check ` + util.inspect(req.authorization));
        next(false);
      }
    }
  } else {
    res.send(500, new Error('No Authorization Key'));
    error('NO AUTHORIZATION');
    next(false);
  }
}

