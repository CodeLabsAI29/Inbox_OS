import { EventEmitter } from 'events';
import { RedisHealth, MockRedisClient } from './redis-health';

const ioredisModule = require('ioredis');
const OriginalRedis = ioredisModule.default || ioredisModule;

// 1. Globally patch EventEmitter.prototype.emit to catch and swallow Redis-related unhandled errors
const origEmit = EventEmitter.prototype.emit;
EventEmitter.prototype.emit = function(this: any, event: string, ...args: any[]) {
  if (event === 'error') {
    const err = args[0];
    const className = this.constructor ? this.constructor.name : '';

    if (
      className === 'RedisConnection' ||
      className === 'Redis' ||
      className === 'Queue' ||
      className === 'Worker' ||
      className === 'QueueEvents' ||
      className === 'QueueBase'
    ) {
      // Mark Redis as disabled if this is a rate limit or connection error
      RedisHealth.handleError(err);

      if (RedisHealth.isDisabled()) {
        // Swallowing the error event to prevent uncaught exception crashes
        console.warn(`⚠️ [RedisPatch] Swallowed uncaught error on ${className}: ${err?.message || err}`);
        return false;
      }
    }
  }
  return origEmit.apply(this, [event, ...args]);
};

// 2. Patch connect method to bypass connection once disabled
const origConnect = OriginalRedis.prototype.connect;
OriginalRedis.prototype.connect = function(this: any, ...args: any[]) {
  if (RedisHealth.isDisabled()) {
    return Promise.resolve();
  }
  return origConnect.apply(this, args);
};

// 3. Patch sendCommand to bypass command sending once disabled and return mock responses
const origSendCommand = OriginalRedis.prototype.sendCommand;
OriginalRedis.prototype.sendCommand = function(this: any, command: any, ...args: any[]) {
  const name = command?.name || '';

  if (RedisHealth.isDisabled() && name !== 'quit' && name !== 'disconnect') {
    const mock = new MockRedisClient() as any;
    if (typeof mock[name] === 'function') {
      const argsToPass = command.args || [];
      return mock[name](...argsToPass);
    }
    return Promise.resolve(null);
  }

  try {
    const result = origSendCommand.call(this, command, ...args);
    if (result && typeof result.then === 'function') {
      return result.catch((err: any) => {
        RedisHealth.handleError(err);
        if (RedisHealth.isDisabled()) {
          return null;
        }
        throw err;
      });
    }
    return result;
  } catch (err) {
    RedisHealth.handleError(err);
    if (RedisHealth.isDisabled()) {
      return null;
    }
    throw err;
  }
};

// 4. Patch status getter/setter safely
const statusDesc = Object.getOwnPropertyDescriptor(OriginalRedis.prototype, 'status')
  || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(OriginalRedis.prototype), 'status');

if (statusDesc) {
  Object.defineProperty(OriginalRedis.prototype, 'status', {
    get(this: any) {
      if (RedisHealth.isDisabled()) {
        return 'end';
      }
      return statusDesc.get ? statusDesc.get.call(this) : this._status;
    },
    set(this: any, val: any) {
      if (statusDesc.set) {
        statusDesc.set.call(this, val);
      } else {
        this._status = val;
      }
    },
    configurable: true
  });
}

console.log('✅ [RedisPatch] Globally patched EventEmitter and ioredis safely.');
