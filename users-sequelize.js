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
  return new Promise((resolve, reject) => {
    if (SQUser) return resolve(SQUser.sync());

    return new Promise((res, rej) => {
      readFile(process.env.SEQUELIZE_CONNECT, 'utf8', (err, data) => {
        if (err) {
          rej(err);
        } else {
          res(data);
        }
      })
        .then(yamltext => {
          return jsyaml.load(yamltext, 'utf8');
        })
        .then(params => {
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
          return resolve(SQUser.sync());
        })
        .catch(err => reject(err));
    });
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
  return connectDB().then(SQUser => {
    return hash(password, 12).then(hashPass => {
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

export const update = (
  username,
  password,
  provider,
  familyName,
  givenName,
  middleName,
  emails,
  photos,
) => {
  return connectDB().then(SQUser => {
    return find(username).then(user => {
      return user
        ? hash(password, 12).then(hashPass => {
            return SQUser.update(
              { where: { username } },
              {
                password: hashPass,
                provider,
                familyName,
                givenName,
                middleName,
                emails: JSON.stringify(emails),
                photos: JSON.stringify(photos),
              },
            );
          })
        : undefined;
    });
  });
};

export const find = username => {
  log('find ' + username);
  return connectDB()
    .then(SQUser => {
      return SQUser.find({ where: { username } });
    })
    .then(user => (user ? sanitizedUser(user) : undefined));
};

export const destroy = username => {
  return connectDB()
    .then(SQUser => {
      return SQUser.find({ where: { username } });
    })
    .then(user => {
      if (!user)
        return error(
          `Did not find the requested user with username ${username}`,
        );
      user.destroy();
    });
};

export const userPasswordCheck = (username, password) => {
  return connectDB()
    .then(SQUser => {
      return SQUser.find({ where: { username } });
    })
    .then(user => {
      if (!user) {
        return {
          check: false,
          username,
          message: 'No account with the provided username',
        };
      } else if (user.username === username) {
        return compare(password, user.password).then(valid => {
          if (valid) {
            return { check: true, username };
          } else {
            return { check: false, username, message: 'Invalid credentials' };
          }
        }) 
      } else {
        return { check: false, username, message: 'Invalid credentials' };
      }
    });
};

export const findOrCreate = profile => {
  return find(profile.id).then(user => {
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
    .then(SQUser => {
      return SQUser.findAll({});
    })
    .then(userslist => userslist.map(user => sanitizedUser(user)))
    .catch(err => error(`listUsers; ${err}`));
};

export const sanitizedUser = user => ({
  id: user.username,
  username: user.username,
  provider: user.provider,
  familyName: user.familyName,
  givenName: user.givenName,
  middleName: user.middleName,
  emails: user.emails,
  photos: user.photos,
});


