import { Injectable, Logger } from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';

@Injectable()
export class RedisFileCacheService {
  private readonly log = new Logger(RedisFileCacheService.name);
  private readonly redis: Redis;
  private readonly ttlSec = Number(process.env.FILE_CACHE_TTL_SEC ?? 3600); // 1h
  private readonly maxBytes = Number(process.env.FILE_CACHE_MAX_BYTES ?? 5 * 1024 * 1024);

  constructor() {
    this.redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  }

  private key(filename: string) { return `file:${filename}`; }
  private keyCT(filename: string) { return `filect:${filename}`; }

  async get(filename: string): Promise<{ buf: Buffer; ct?: string } | null> {
    const [b64, ct] = await this.redis.mget(this.key(filename), this.keyCT(filename));
    if (!b64) return null;
    try {
      return { buf: Buffer.from(b64, 'base64'), ct: ct || undefined };
    } catch (e) {
      this.log.warn(`decode error for ${filename}: ${String(e)}`);
      return null;
    }
  }

  async set(filename: string, buf: Buffer, contentType?: string) {
    if (!buf?.length) return;
    if (buf.length > this.maxBytes) {
      this.log.debug(`skip cache ${filename}: ${buf.length} > ${this.maxBytes}`);
      return;
    }
    const b64 = buf.toString('base64');
    const pipe = this.redis.multi();
    pipe.set(this.key(filename), b64, 'EX', this.ttlSec);
    if (contentType) pipe.set(this.keyCT(filename), contentType, 'EX', this.ttlSec);
    await pipe.exec();
  }

  async del(filename: string) {
    await this.redis.del(this.key(filename), this.keyCT(filename));
  }
}
