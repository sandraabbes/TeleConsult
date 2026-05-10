// src/common/decorators/current-doctor.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentDoctor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);