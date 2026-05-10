// src/users/dto/create-user.input.ts
export class CreateUserInput {
  firstName: string;
  lastName: string;
  birthdate: string;
  gender: string;
  email: string;
  phone: string;
  password: string;
  acceptPrivacyPolicy: boolean;
  role: 'doctor' | 'patient';
}
