import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  /** ----------------------------------------------------
   * 🟢 REGISTER USER + SEND SECURE WELCOME EMAIL
   * ---------------------------------------------------- */
  async register(userData: RegisterUserDto) {
    try {
      const email = userData.email.trim().toLowerCase();
      const phone = userData.phone.trim();

      /** 🔍 Email déjà utilisé */
      const existingUser = await this.usersRepository.findByEmail(email);
      if (existingUser) throw new ConflictException('Email already in use');

      /** 🔍 Téléphone déjà utilisé */
      const existingPhone = await this.usersRepository.findByPhone(phone);
      if (existingPhone)
        throw new ConflictException('Phone number already in use');

      /** 🔐 Hash du mot de passe */
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      /** 🆕 Création de l'utilisateur */
      const createdUser = await this.usersRepository.createUser({
        ...userData,
        email,
        phone,
        password: hashedPassword,
        role: userData.role || 'patient',
      });

      /** ----------------------------------------------------
       * 📧 Envoi de l'email de bienvenue (configuré via ENV)
       * ---------------------------------------------------- */
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.MAIL_HOST!,
          port: Number(process.env.MAIL_PORT!),
          secure: false,
          auth: {
            user: process.env.MAIL_USER!,
            pass: process.env.MAIL_PASS!,
          },
        });

        await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.MAIL_USER,
          to: createdUser.email,
          subject: 'Bienvenue chez Medilink – Politique de confidentialité',
          text: `
Bonjour ${createdUser.firstName},

Merci pour votre inscription chez Medilink.

Voici notre politique de confidentialité :

- Nous collectons vos données pour améliorer votre expérience utilisateur.
- Vos informations sont protégées et ne seront jamais partagées sans votre accord.
- Vous pouvez modifier ou supprimer vos données à tout moment.

Si vous avez des questions, contactez-nous à support@medilink.com.

Cordialement,
L’équipe Medilink 🌿
          `,
        });

        this.logger.log(`📨 Email de bienvenue envoyé à ${createdUser.email}`);
      } catch (mailErr) {
        this.logger.error(`❌ Erreur email: ${mailErr.message}`);
      }

      return createdUser;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error('❌ Error during user registration', error.stack);
      throw new InternalServerErrorException(
        'An error occurred during user registration',
      );
    }
  }

  /** ----------------------------------------------------
   * 🔍 GET ALL USERS
   * ---------------------------------------------------- */
  async getAllUsers() {
    try {
      return await this.usersRepository.findAll();
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while retrieving users',
      );
    }
  }

  /** ----------------------------------------------------
   * 🔍 FIND USER BY EMAIL
   * ---------------------------------------------------- */
  async findByEmail(email: string) {
    const user = await this.usersRepository.findByEmail(email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** ----------------------------------------------------
   * 🔍 GET USER BY ID
   * ---------------------------------------------------- */
  async getUserById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** ----------------------------------------------------
   * ✏️ UPDATE USER
   * ---------------------------------------------------- */
  async updateUser(id: string, updateData: UpdateUserDto) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    return await this.usersRepository.updateUser(id, updateData);
  }

  /** ----------------------------------------------------
   * 🗑 DELETE USER
   * ---------------------------------------------------- */
  async deleteUser(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.usersRepository.deleteUser(id);
  }

  /** ----------------------------------------------------
   * 🔍 SEARCH BY NAME
   * ---------------------------------------------------- */
  async findByName(firstName: string, lastName: string) {
    return this.usersRepository.findByName(firstName, lastName);
  }
}