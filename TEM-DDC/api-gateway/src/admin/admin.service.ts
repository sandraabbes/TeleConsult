import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Admin, 'adminConnection')
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  /** Seed default admin if not exists */
  private async seedDefaultAdmin() {
    const existing = await this.adminRepo.findOneBy({ email: 'admin@teleconsult.com' });
    if (!existing) {
      const hashed = await bcrypt.hash('Admin@1234', 10);
      const admin = this.adminRepo.create({
        email: 'admin@teleconsult.com',
        password: hashed,
        role: 'ADMIN',
      });
      await this.adminRepo.save(admin);
      this.logger.log('✅ Default admin seeded: admin@teleconsult.com');
    } else {
      this.logger.log('ℹ️ Default admin already exists');
    }
  }

  /** Validate admin credentials */
  async validateAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = await this.adminRepo.findOneBy({ email });
    if (!admin) return null;

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return null;

    return admin;
  }

  /** Find admin by ID */
  async findById(id: string): Promise<Admin | null> {
    return this.adminRepo.findOneBy({ id });
  }
}
