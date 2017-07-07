import { ILOOTList } from '../types/ILOOTList';

import * as Promise from 'bluebird';
import { app as appIn, remote } from 'electron';
import * as fs from 'fs-extra-promise';
import { safeDump, safeLoad } from 'js-yaml';
import { log, types, util } from 'nmm-api';
import * as path from 'path';

const app = appIn || remote.app;

/**
 * persistor syncing to and from the loot userlist.yaml file
 *
 * @class UserlistPersistor
 * @implements {types.IPersistor}
 */
class UserlistPersistor implements types.IPersistor {
  private mResetCallback: () => void;
  private mUserlistPath: string;
  private mUserlist: ILOOTList;
  private mSerializing: boolean = false;
  private mSerializeQueue: Promise<void> = Promise.resolve();
  private mLoaded: boolean = false;
  private mFailed: boolean = false;
  private mOnError: (message: string, details: Error) =>  void;

  constructor(onError: (message: string, details: Error) => void) {
    this.mUserlist = {
      globals: [],
      plugins: [],
    };
    this.mOnError = onError;
  }

  public disable(): Promise<void> {
    return this.enqueue(() => new Promise<void>(resolve => {
      this.mUserlist = {
        globals: [],
        plugins: [],
      };
      this.mUserlistPath = undefined;
      this.mLoaded = false;
      if (this.mResetCallback) {
        this.mResetCallback();
      }
      resolve();
    }));
  }

  public loadFiles(gameMode: string) {
    this.mUserlistPath = path.join(app.getPath('userData'), gameMode, 'userlist.yaml');
    // read the files now and update the store
    this.deserialize();
  }

  public setResetCallback(cb: () => void) {
    this.mResetCallback = cb;
  }

  public getItem(key: string, cb: (error: Error, result?: string) => void): void {
    cb(null, JSON.stringify(this.mUserlist || { globals: [], plugins: [] }));
  }

  public setItem(key: string, value: string, cb: (error: Error) => void): void {
    this.mUserlist = JSON.parse(value);
    this.serialize().then(() => cb(null));
  }

  public removeItem(key: string, cb: (error: Error) => void): void {
    delete this.mUserlist[key];
    this.serialize().then(() => cb(null));
  }

  public getAllKeys(cb: (error: Error, keys?: string[]) => void): void {
    cb(null, ['userlist']);
  }

  private enqueue(fn: () => Promise<void>): Promise<void> {
    this.mSerializeQueue = this.mSerializeQueue.then(fn);
    return this.mSerializeQueue;
  }

  private reportError(message: string, detail: Error) {
    if (!this.mFailed) {
      this.mOnError(message, detail);
      this.mFailed = true;
    }
  }

  private serialize(): Promise<void> {
    if (!this.mLoaded) {
      // this happens during initialization, when the persistor is initially created, with default
      // values.
      return Promise.resolve();
    }
    // ensure we don't try to concurrently write the files
    this.mSerializeQueue = this.mSerializeQueue.then(() => {
      this.doSerialize();
    });
    return this.mSerializeQueue;
  }

  private doSerialize(): Promise<void> {
    if ((this.mUserlist === undefined) || (this.mUserlistPath === undefined)) {
      return;
    }

    const id = require('shortid').generate();
    const userlistPath = this.mUserlistPath;

    this.mSerializing = true;
    return fs.writeFileAsync(userlistPath + '.tmp', safeDump(this.mUserlist))
      .then(() => fs.renameAsync(userlistPath + '.tmp', userlistPath))
      .then(() => { this.mFailed = false; })
      .catch(err => {
        this.reportError('failed to write userlist', err);
      })
      .finally(() => {
        this.mSerializing = false;
      });
  }

  private deserialize(): Promise<void> {
    if (this.mUserlist === undefined) {
      return;
    }

    fs.readFileAsync(this.mUserlistPath)
    .then((data: NodeBuffer) => {
      this.mUserlist = safeLoad(data.toString());
      if (this.mResetCallback) {
        this.mResetCallback();
        this.mLoaded = true;
      }
    })
    .catch(err => {
      if (err.code === 'ENOENT') {
        this.mUserlist = {
          globals: [],
          plugins: [],
        };
        this.mLoaded = true;
      } else {
        // if we can't read the file but the file is there,
        // we would be destroying its content if we don't quit right now.
        util.terminate({
          message: 'Failed to read userlist file for this game',
          details: err,
        });
      }
    });
  }
}

export default UserlistPersistor;
