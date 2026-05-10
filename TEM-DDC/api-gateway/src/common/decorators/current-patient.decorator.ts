// src/common/decorators/current-patient.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentPatient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub || request.user?.id || request.user?.patientId;
  },
);