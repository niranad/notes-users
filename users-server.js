import express from 'express';
import expressAuthParser from 'express-auth-parser';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import debug from 'debug';
import util from 'util';

dotenv.config();

const log = debug('users:server');
const error = debug('users:error');

let UserModel;
const {
  DEBUG,
  PROJECT_EMAIL,
  BOT_EMAIL,
  EMAIL_HOST_PASS,
  TEST_USER,
  TEST_API_KEY,
  NOTES_USER,
  NOTES_API_KEY,
} = process.env;

// handle uncaught exception in application
process.on('uncaughtException', (err) => {
  if (DEBUG) return error('An unknown error has occurred.');

  if (process.env.NODE_ENV === 'test') return;

  const transport = nodemailer.createTransport({
    service: 'gmail',
    requireTLS: true,
    auth: {
      user: BOT_EMAIL,
      pass: EMAIL_HOST_PASS,
    },
    from: BOT_EMAIL,
  });
  transport.verify((err, success) => {
    if (err) {
      error('Mail error: ', err);
    }
  });
  const mailOptions = {
    from: `Note-Users Microservice <${BOT_EMAIL}>`,
    to: PROJECT_EMAIL,
    subject: 'Unknown Error in Notes Users Authentication Microservice',
    html: `<p>An unknown error has just occurred in the application.<p> <br/><br/><strong>Error info:<strong><br/><br/>${err}`,
  };
  transport.sendMail(mailOptions, (err, success) => {
    if (err) error(err);
    else log(success);
  });
});

// dynamically load User model base on environment
async function loadUserModel() {
  if (DEBUG) {
    UserModel = await import('./users-sequelize.js');
  } else {
    UserModel = await import('./users-mongoose.js');
  }
}

await loadUserModel();

const server = express();

server.use(expressAuthParser);
server.use(check);
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Create a user record
server.post('/create-user', async (req, res, next) => {
  try {
    const result = await UserModel.create(req.body);
    log('Created \n' + util.inspect(result));
    res.status(201).json(result);
  } catch (err) {
    error('POST /create-user \n' + util.inspect(err));
    next(err);
  }
});

// Update user record
server.post('/update-user/:username', async (req, res, next) => {
  try {
    const result = await UserModel.update(req.params.username, req.body);
    log('Updated ' + util.inspect(result));
    res.status(200).json(result);
  } catch (err) {
    error('POST /update-user/:username \n' + util.inspect(err));
    next(err);
  }
});

// Find a user, if not found create one given profile information
server.post('/find-or-create', async (req, res, next) => {
  try {
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
    const result = await UserModel.findOrCreate({
      id: username,
      username,
      password,
      provider,
      familyName,
      givenName,
      middleName,
      emails,
      photos,
    });
    log('FindOrCreate \n' + util.inspect(result));
    res.status(200).json(result);
  } catch (err) {
    error('POST /find-or-create \n' + util.inspect(err));
    next(err);
  }
});

// Find the user data
server.get('/find/:username', async (req, res, next) => {
  try {
    const user = await UserModel.find(req.params.username);
    if (!user) {
      res.status(404).json({ error: 'Did not find ' + req.params.username });
    } else {
      res.status(200).json(user);
    }
  } catch (err) {
    error('GET /find/:username \n' + util.inspect(err));
    next(err);
  }
});

// Delete a user record
server.delete('/destroy/:username', async (req, res, next) => {
  try {
    await UserModel.destroy(req.params.username);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    error('DELETE /destroy/:username ' + util.inspect(err));
    next(err);
  }
});

// Check password
server.post('/passwordCheck', async (req, res, next) => {
  try {
    const check = await UserModel.userPasswordCheck(
      req.body.username,
      req.body.password,
    );
    res.status(200).json(check);
  } catch (err) {
    error('POST /passwordCheck \n' + util.inspect(err));
    next(err);
  }
});

// List users
server.get('/list', async (req, res, next) => {
  try {
    const usersList = await UserModel.listUsers();
    log('UsersList ' + util.inspect(usersList));
    if (!usersList) return res.status(200).json([]);
    res.status(200).json(usersList);
  } catch (err) {
    error('GET /list \n' + util.inspect(err));
    next(err);
  }
});

export default server;

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

