import {
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsBoolean,
  IsString,
  IsEnum,
  IsOptional,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsTrue(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsTrue',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: boolean) {
          return value === true;
        },
        defaultMessage() {
          return 'This field should be checked';
        },
      },
    });
  };
}

export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return value === (args.object as any)[relatedPropertyName];
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must match ${args.constraints[0]}`;
        },
      },
    });
  };
}

export class RegisterUserDto {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  lastName: string;

  @IsNotEmpty({ message: 'Birthdate is required' })
  @IsString({ message: "Birthdate must be a valid string in 'YYYY-MM-DD' format" })
  birthdate: string;

  @IsNotEmpty({ message: 'Gender is required' })
  @IsString({ message: 'Gender must be a string' })
  gender: string;

  @IsEmail({}, { message: 'Email must be a valid email' })
  email: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone must be a string' })
  phone: string;

  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 32, { message: 'Password must be between 8 and 32 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W_]{8,}$/, {
    message:
      'Password too weak. It must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  })
  password: string;

  @IsNotEmpty({ message: 'Confirm Password is required' })
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @IsOptional()
  @IsEnum(['doctor', 'patient'], {
    message: "Role must be either 'doctor' or 'patient'",
  })
  role?: 'doctor' | 'patient';

  @IsBoolean({ message: 'Accept Privacy Policy must be a boolean' })
  @IsNotEmpty({ message: 'You must accept the Privacy Policy to register' })
  @IsTrue({ message: 'This field should be checked' })
  acceptPrivacyPolicy: boolean;
}
