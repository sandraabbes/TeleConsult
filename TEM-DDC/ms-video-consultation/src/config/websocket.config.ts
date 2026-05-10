import { ConfigService } from '@nestjs/config';

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials?: boolean;
  };
  path?: string;
  pingInterval?: number;
  pingTimeout?: number;
}

export const getWebSocketConfig = (
  config: ConfigService,
): WebSocketConfig => {
  const origin = config.get<string>('WS_CORS_ORIGIN');
  return {
    cors: {
      origin: origin === '*' ? '*' : origin?.split(',') ?? ['*'],
      credentials: true,
    },
    path: '/ws',
    pingInterval: 25000,
    pingTimeout: 20000,
  };
};
