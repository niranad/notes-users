import restify from 'restify';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import debug from 'debug';
import util from 'util';

dotenv.config();

const log = debug('users:server');
const error = debug('users:error');

let UserModel;
const { DEBUG, PROJECT_EMAIL, BOT_EMAIL, EMAIL_HOST_PASS } = process.env;

(async () => {
  if (DEBUG) {
    UserModel = await import('./users-sequelize.js');
  } else {
    UserModel = await import('./users-mongoose.js');
  }
})();

const server = restify.createServer({
  name: 'User-Auth-Service',
  version: '0.0.1',
});

process.on('uncaughtException', (err) => {
  if (DEBUG) return error('An unknown error has occurred.');

  const transport = nodemailer.createTransport({
    host: 'gmail',
    requireTLS: true,
    auth: {
      user: BOT_EMAIL,
      pass: EMAIL_HOST_PASS,
    },
    from: BOT_EMAIL,
  });
  transport.verify((err, success) => {
    if (err) {
      console.log(err);
    }
  });
  const mailOptions = {
    from: `Note-Users Microservice <${BOT_EMAIL}>`,
    to: PROJECT_EMAIL,
    subject: 'Unknown Error in Notes Users Authentication Microservice',
    html: `<p>An unknown error has just occurred in the application.<p> <br/><br/><strong>Error info:<strong><br/><br/>${err}`,
  };
  transport.sendMail(mailOptions, (err, success) => {
    if (err) console.log(err);
    else console.log(success);
  });
});

server.use(restify.plugins.authorizationParser());
server.use(check);
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

// Create a user record
server.post('/create-user', (req, res, next) => {
  const {
    username,
    password,
    provider,
    familyName,
    givenName,
    middleName,
    emails,
    photos,
  } = req.body;
  UserModel.create(
    username,
    password,
    provider,
    familyName,
    givenName,
    middleName,
    emails,
    photos,
  )
    .then((result) => {
      log('created ' + util.inspect(result));
      res.send(result);
      next(false);
    })
    .catch((err) => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Update user record
server.post('/update-user/:username', (req, res, next) => {
  UserModel.update(req.params.username, req.body)
    .then((result) => {
      log('updated ' + util.inspect(result));
      res.send(result);
      next(false);
    })
    .catch((err) => {
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
    familyName,
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
    .then((result) => {
      res.send(result);
      next(false);
    })
    .catch((err) => {
      res.send(500, err);
      error(err.stack);
      next(false);
    });
});

// Find the user data
server.get('/find/:username', (req, res, next) => {
  UserModel.find(req.params.username)
    .then((user) => {
      if (!user) {
        res.send(500, new Error('Did not find ' + req.params.username));
      } else {
        res.send(user);
      }
      next(false);
    })
    .catch((err) => {
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
    .catch((err) => {
      res.send(500, err);
      next(false);
    });
});

// Check password
server.post('/passwordCheck', (req, res, next) => {
  console.log(req.body);
  UserModel.userPasswordCheck(req.body.username, req.body.password)
    .then((check) => {
      res.send(check);
      next(false);
    })
    .catch((err) => {
      res.send(500, err);
      next(false);
    });
});

// List users
server.get('/list', (req, res, next) => {
  UserModel.listUsers()
    .then((usersList) => {
      if (!usersList) return [];
      res.send(usersList);
      next(false);
    })
    .catch((err) => {
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
    user: TEST_USER,
    key: TEST_API_KEY,
  },
  {
    user: NOTES_USER,
    key: NOTES_API_KEY,
  },
];

function check(req, res, next) {
  if (req.authorization) {
    for (let auth of apiKeys) {
      if (
        auth.key === req.authorization?.basic?.password &&
        auth.user === req.authorization?.basic?.username
      ) {
        return next();
      }
    }
    res.send(401, new Error('Not Authenticated'));
    error(`Failed authentication check ` + util.inspect(req.authorization));
    next(false);
  } else {
    res.send(500, new Error('No Authorization Key'));
    error('NO AUTHORIZATION');
    next(false);
  }
}

