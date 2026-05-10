// src/dto/doctor-response.dto.ts

export class DoctorResponseDto {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  experience: number;
  practicePlace: string;
  country: string;
  city: string;
  clinicAddress: string;
  licenceImg: string;
  identityImg: string;
  role: string;
}