import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: Array<'doctor' | 'patient' | 'admin'>) =>
  SetMetadata('roles', roles);
