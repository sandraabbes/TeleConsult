import { Test, TestingModule } from '@nestjs/testing';
import { DoctorRegisterService } from './doctor-register.service';

describe('DoctorRegisterService', () => {
  let service: DoctorRegisterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoctorRegisterService],
    }).compile();

    service = module.get<DoctorRegisterService>(DoctorRegisterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
