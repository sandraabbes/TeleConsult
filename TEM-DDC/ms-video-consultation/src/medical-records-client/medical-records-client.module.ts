import { Module, Global } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Global()
@Module({
  providers: [
    {
      provide: 'MEDICAL_RECORDS_SERVICE',
      useFactory: () =>
        ClientProxyFactory.create({
          transport: Transport.TCP,
          options: {
            host: process.env.MEDICAL_RECORDS_SERVICE_HOST || 'localhost',
            port: parseInt(
              process.env.MEDICAL_RECORDS_SERVICE_PORT || '4006',
              10,
            ),
          },
        }),
    },
  ],
  exports: ['MEDICAL_RECORDS_SERVICE'],
})
export class MedicalRecordsClientModule {}
