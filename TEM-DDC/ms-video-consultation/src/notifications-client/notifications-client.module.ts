import { Module, Global } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Global()
@Module({
  providers: [
    {
      provide: 'NOTIFICATIONS_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.NOTIFICATIONS_SERVICE_HOST || 'localhost',
            port: parseInt(process.env.NOTIFICATIONS_SERVICE_PORT || '4005', 10),
          },
        }),
    },
  ],
  exports: ['NOTIFICATIONS_SERVICE'],
})
export class NotificationsClientModule {}
