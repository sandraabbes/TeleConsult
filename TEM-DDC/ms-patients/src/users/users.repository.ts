import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

   private async generateIdentifier(): Promise<string> {
    const prefix = 'PTN-180';

    for (let i = 0; i < 5; i++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000); // 6 chiffres
      const candidate = `${prefix}${randomPart}`;

      const existing = await this.usersRepository.findOne({
        where: { identifier: candidate },
      });

      if (!existing) {
        return candidate;
      }
    }
   throw new Error('Failed to generate unique identifier');
  }

  // 🔹 Trouver un utilisateur par email
  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  // 🔹 Trouver un utilisateur par numéro de téléphone
  async findByPhone(phone: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { phone } });
  }

  // 🔹 Trouver un utilisateur par ID
  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  // 🔹 Trouver par nom/prénom
  async findByName(firstName: string, lastName: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { firstName, lastName } });
  }

  // 🔹 Trouver tous les utilisateurs
  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  // 🔹 Créer un nouvel utilisateur
  async createUser(userData: RegisterUserDto): Promise<User> {
    try {
      const identifier = await this.generateIdentifier();

      const user = this.usersRepository.create({
        ...userData,
          identifier,
        });
      return await this.usersRepository.save(user);
    } catch (error) {
      throw new ConflictException('Email or phone number already in use');
    }
  }

  // 🔹 Mettre à jour un utilisateur
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateData);
    return await this.usersRepository.save(user);
  }

  // 🔹 Supprimer un utilisateur
  async deleteUser(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.remove(user);
    return user;
  }
}
