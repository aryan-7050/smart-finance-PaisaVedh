"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.redisClient = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class MockRedisClient {
    storage = new Map();
    isConnected = true;
    async connect() {
        logger_1.default.info('Using in-memory cache (Redis not required)');
        return Promise.resolve();
    }
    async set(key, value, ttl) {
        try {
            this.storage.set(key, value);
            if (ttl) {
                setTimeout(() => this.storage.delete(key), ttl * 1000);
            }
        }
        catch (error) {
            logger_1.default.error(`Cache set error for key ${key}:`, error);
        }
    }
    async get(key) {
        try {
            return this.storage.get(key) || null;
        }
        catch (error) {
            logger_1.default.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async del(key) {
        try {
            this.storage.delete(key);
        }
        catch (error) {
            logger_1.default.error(`Cache delete error for key ${key}:`, error);
        }
    }
    async exists(key) {
        return this.storage.has(key);
    }
    async increment(key, by = 1) {
        const current = this.storage.get(key) || 0;
        const newValue = current + by;
        this.storage.set(key, newValue);
        return newValue;
    }
    async expire(key, seconds) {
        const value = this.storage.get(key);
        if (value) {
            setTimeout(() => this.storage.delete(key), seconds * 1000);
        }
    }
    async flushAll() {
        this.storage.clear();
        logger_1.default.info('Cache flushed');
    }
    getClient() {
        return {
            on: () => { },
            emit: () => { },
        };
    }
}
exports.redisClient = new MockRedisClient();
exports.cacheService = exports.redisClient;
//# sourceMappingURL=redis.js.map