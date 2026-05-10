import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** ========== REGISTER USER ========== */
  @Post('register')
  async register(@Body() userData: RegisterUserDto) {
    try {
      const user = await this.usersService.register(userData);
      return { statusCode: 201, message: "User registered successfully", data: user };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: "Registration failed", error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== GET ALL USERS ========== */
  @Get()
  async getAllUsers() {
    try {
      const users = await this.usersService.getAllUsers();
      return { statusCode: 200, message: 'Users retrieved successfully', data: users };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: 'Failed to retrieve users', error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== SEARCH USERS (must come before :id) ========== */
  @Get('search')
  async searchUser(@Query() query: { firstName: string; lastName: string }) {
    try {
      const users = await this.usersService.findByName(query.firstName, query.lastName);
      return { statusCode: 200, message: 'Users retrieved successfully', data: users };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: 'Failed to search users', error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== GET USER BY ID ========== */
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    try {
      const user = await this.usersService.getUserById(id);
      if (!user) {
        return { statusCode: 404, message: 'User not found' };
      }
      return { statusCode: 200, message: 'User retrieved successfully', data: user };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: 'Failed to retrieve user', error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== UPDATE USER ========== */
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateData: UpdateUserDto) {
    try {
      const updatedUser = await this.usersService.updateUser(id, updateData);
      return { statusCode: 200, message: 'User updated successfully', data: updatedUser };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: 'Failed to update user', error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** ========== DELETE USER ========== */
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    try {
      const deleted = await this.usersService.deleteUser(id);
      return { statusCode: 200, message: 'User deleted successfully', data: deleted };
    } catch (error) {
      throw new HttpException(
        { statusCode: 400, message: 'Failed to delete user', error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
