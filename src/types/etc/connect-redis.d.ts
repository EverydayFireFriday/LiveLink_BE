// types/connect-redis.d.ts
declare module "connect-redis" {
  import { Store } from "express-session";
  import { RedisClientType } from "redis";
  import * as ioRedis from "ioredis";

  namespace connectRedis {
    interface RedisStoreOptions {
      client?: RedisClientType | ioRedis.Redis | ioRedis.Cluster;
      host?: string;
      port?: number;
      socket?: string;
      url?: string;
      ttl?: number | string | ((store: any, sess: any, sid: string) => number);
      disableTTL?: boolean;
      disableTouch?: boolean;
      prefix?: string;
      scanCount?: number;
      serializer?: {
        stringify: (obj: any) => string;
        parse: (str: string) => any;
      };
      logErrors?: boolean | ((error: string) => void);
    }

    type Client = RedisClientType | ioRedis.Redis | ioRedis.Cluster;
  }

  interface RedisStore extends Store {
    new (options?: connectRedis.RedisStoreOptions): RedisStore;
  }

  function connectRedis(session: any): typeof RedisStore;

  export = connectRedis;
}
