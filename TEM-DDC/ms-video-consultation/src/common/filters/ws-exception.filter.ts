import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    const message =
      exception instanceof WsException
        ? exception.getError()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    this.logger.warn(`WebSocket error for client ${client.id}: ${message}`);

    client.emit('error', {
      status: 'error',
      message,
    });
  }
}