import sqlite3 from 'sqlite3';
import debug from 'debug';

const log = debug('users:sqlite3-db');
const error = debug('users:sqlite3-error');

sqlite3.verbose();

export default function createDB() {
  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(
      process.env.SQLITE_FILE,
      sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
      (err) => {
        if (err) {
          error(`Failed to create sqlite database: ${err.stack}`);
          reject(err);
        } else {
          log('SQLITE Database created');
          resolve();
        }
      },
    );
  });
}

