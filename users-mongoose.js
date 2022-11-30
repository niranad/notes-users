import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { sanitizedUser } from './users-sequelize.js';
import dotenv from 'dotenv';
import debug from 'debug';

dotenv.config();

const log = debug('users:mongoose-model');
const error = debug('users:error');

const UserSchema = new mongoose.Schema({
  username: { type: String, trim: true, unique: true, required: true },
  password: { type: String, required: true },
  provider: { type: String, default: 'local' },
  familyName: { type: String, trim: true, required: true },
  middleName: { type: String, trim: true },
  givenName: { type: String, trim: true, required: true },
  emails: { type: [String], default: [] },
  photos: { type: [String], default: [] },
});

export const User = mongoose.model('User', UserSchema);

let db_conn;

export const connectDB = () => {
  if (db_conn) return Promise.resolve(db_conn);
  return mongoose.connect(
    process.env.MONGO_URI,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err) => {
      if (err) {
        error(`Failed to connect db: ${err}`);
        return err;
      } else {
        db_conn = mongoose.connection;
        log('Database connected!');
        mongoose.on('disconnected', () => {
          db_conn = null;
          log('Database disconnected. Will try to reconnect.');
        });
      }
    },
  );
};

export const create = (userData) => {
  return connectDB()
    .then(() => {
      return bcrypt.hash(userData.password, 12);
    })
    .then((hashPass) => {
      return User.create({userData, password: hashPass});
    })
    .then((doc) => {
      return doc ? doc : null;
    });
};

export const update = (username, updateData) => {
  return connectDB()
    .then(() => {
      if (updateData.password)
        return bcrypt.hash(updateData.password).then((hashPass) => {
          return User.findOneAndUpdate(
            { username },
            { ...updateData, password: hashPass },
            { new: true },
          );
        });
      return User.findOneAndUpdate({ username }, updateData, {
        new: true,
      });
    })
    .then((doc) => {
      return doc ? sanitizedUser(doc) : null;
    });
};

export const find = (username) => {
  return connectDB()
    .then(() => {
      return User.findOne({ username });
    })
    .then((doc) => {
      return doc ? sanitizedUser(doc) : null;
    });
};

export const userPasswordCheck = (username, password) => {
  return connectDB().then(() => {
    return find(username).then((user) => {
      if (!user || user.username !== username) {
        return { check: false, username, message: 'Invalid credentials' };
      } else {
        return bcrypt.compare(password, user.password).then((valid) => {
          if (valid) return { check: true, username };
          return { check: false, username, message: 'Invalid credentials' };
        });
      }
    });
  });
};

export const destroy = (username) => {
  return connectDB().then(() => {
    return User.deleteOne({ username });
  });
};

export const findOrCreate = (profile) => {
  return connectDB().then(() => {
    return User.findOne({ username: profile.id }).then((user) => {
      if (user) return user;
      return create({
        username: profile.id,
        password: profile.password,
        familyName: profile.familyName,
        givenName: profile.givenName,
        middleName: profile.middleName,
        emails: profile.emails,
        photos: profile.photos,
      });
    });
  });
};

export const listUsers = () => {
  return connectDB()
    .then(() => {
      return User.find({});
    })
    .then((users) => users.map((user) => sanitizedUser(user)));
};
