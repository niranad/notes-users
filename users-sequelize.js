import { Sequelize } from 'sequelize';
import jsyaml from 'js-yaml';
import debug from 'debug';
import { hash, compare } from 'bcrypt';
import { readFile } from 'fs';

const log = debug('users:model-users');
const error = debug('users:model-error');

let SQUser;
let sequlz;

export const connectDB = () => {
  if (SQUser) return SQUser.sync();

  return new Promise((resolve, reject) => {
    readFile(process.env.SEQUELIZE_CONNECT, 'utf8', (err, data) => {
      if (err) {
        error(`Failed to read sequelize connect file: ${err}`);
        reject(err);
      } else {
        resolve(data);
      }
    });
  })
    .then((yamltext) => {
      return jsyaml.load(yamltext, 'utf8');
    })
    .then((params) => {
      if (!sequlz) {
        sequlz = new Sequelize(
          params.dbname,
          params.username,
          params.password,
          params.params,
        );
      }
      if (!SQUser) {
        SQUser = sequlz.define('User', {
          username: { type: Sequelize.STRING, unique: true },
          password: Sequelize.STRING,
          provider: Sequelize.STRING,
          familyName: Sequelize.STRING,
          givenName: Sequelize.STRING,
          middleName: Sequelize.STRING,
          emails: Sequelize.STRING(2048),
          photos: Sequelize.STRING(2048),
        });
      }
      return SQUser.sync();
    });
};

export const create = (
  username,
  password,
  provider,
  familyName,
  givenName,
  middleName,
  emails,
  photos,
) => {
  return connectDB().then(() => {
    return hash(password, 12).then((hashPass) => {
      return SQUser.create({
        username,
        password: hashPass,
        provider,
        familyName,
        givenName,
        middleName,
        emails: JSON.stringify(emails),
        photos: JSON.stringify(photos),
      });
    });
  });
};

export const update = (username, obj) => {
  return connectDB().then(() => {
    return SQUser.findOne({ where: { username }}).then((user) => {
      return user && obj.password
        ? hash(obj.password, 12).then((hashPass) => {
            return new Promise((resolve, reject) => {
             user.update({ ...obj, password: hashPass })
             user.save();
             resolve(user);
            })
          })
        : user
        ? SQUser.update( { ...obj }, { where: { username } })
        : undefined;
    });
  });
};

export const find = (username) => {
  log('find ' + username);
  return connectDB()
    .then(() => {
      return SQUser.findOne({ where: { username } });
    })
    .then((user) => (user ? sanitizedUser(user) : undefined));
};

export const destroy = (username) => {
  return connectDB()
    .then(() => {
      return SQUser.findOne({ where: { username } });
    })
    .then((user) => {
      if (!user)
        return error(
          `Did not find the requested user with username ${username}`,
        );
      user.destroy();
    });
};

export const userPasswordCheck = (username, password) => {
  return connectDB()
    .then(() => {
      return SQUser.findOne({ where: { username } });
    })
    .then((user) => {
      if (!user || user.username !== username) {
        return {
          check: false,
          username,
          message: 'Username does not exist',
        };
      } else {
        return compare(password, user.password).then((valid) => {
          if (valid) return { check: true, username };
          return { check: false, username, message: 'Invalid credentials' };
        });
      } 
    });
};

export const findOrCreate = (profile) => {
  return find(profile.id).then((user) => {
    if (user) return user;
    return create(
      profile.id,
      profile.password,
      profile.provider,
      profile.familyName,
      profile.givenName,
      profile.middleName,
      profile.emails,
      profile.photos,
    );
  });
};

export const listUsers = () => {
  return connectDB()
    .then(() => {
      return SQUser.findAll({});
    })
    .then((userslist) => userslist.map((user) => sanitizedUser(user)))
    .catch((err) => error(`listUsers; ${err}`));
};

export const sanitizedUser = (user) => ({
  id: user.username,
  username: user.username,
  provider: user.provider,
  familyName: user.familyName,
  givenName: user.givenName,
  middleName: user.middleName,
  emails: user.emails,
  photos: user.photos,
});


