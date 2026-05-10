import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WebSocket auth guard. Expects handshake.auth.token or handshake.auth.userId.
 * In production, validate JWT from handshake.auth.token.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = client.handshake.auth?.token as string | undefined;
    const userId = client.handshake.auth?.userId as string | undefined;

    if (userId) {
      (client as Socket & { user: { sub: string } }).user = { sub: userId };
      return true;
    }

    if (token) {
      // TODO: verify JWT and attach user
      (client as Socket & { user: { sub: string } }).user = { sub: token };
      return true;
    }

    throw new WsException('Unauthorized: missing auth');
  }
}
