import logger from '../utils/logger';

class MockRedisClient {
  private storage: Map<string, any> = new Map();
  private isConnected: boolean = true;

  async connect(): Promise<void> {
    logger.info('Using in-memory cache (Redis not required)');
    return Promise.resolve();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      this.storage.set(key, value);
      if (ttl) {
        setTimeout(() => this.storage.delete(key), ttl * 1000);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async get(key: string): Promise<any> {
    try {
      return this.storage.get(key) || null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.storage.delete(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const current = this.storage.get(key) || 0;
    const newValue = current + by;
    this.storage.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const value = this.storage.get(key);
    if (value) {
      setTimeout(() => this.storage.delete(key), seconds * 1000);
    }
  }

  async flushAll(): Promise<void> {
    this.storage.clear();
    logger.info('Cache flushed');
  }

  getClient() {
    return {
      on: () => {},
      emit: () => {},
    };
  }
}

export const redisClient = new MockRedisClient();
export const cacheService = redisClient;