import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class DoctorContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.decode(token);

      if (!decoded || decoded.role !== 'doctor') {
        throw new UnauthorizedException('Invalid doctor token');
      }

      // 🔹 Ajoute le doctorId au header pour le microservice
      req.headers['x-doctor-id'] = decoded.sub;
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}