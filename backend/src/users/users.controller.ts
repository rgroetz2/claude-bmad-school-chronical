import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * GET /api/v1/users
   * List all users (active + inactive). Admin only.
   */
  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(UserResponseDto.from);
  }

  /**
   * POST /api/v1/users
   * Create a new user account. Admin only.
   * Sets forcePasswordChange = true so teacher must set their own password.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto);
    return UserResponseDto.from(user);
  }

  /**
   * PATCH /api/v1/users/:id
   * Update role and/or deactivate account. Admin only.
   * Deactivated users: isActive = false. JwtStrategy rejects them
   * on the very next request without waiting for token expiry.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto);
    return UserResponseDto.from(user);
  }

  /**
   * POST /api/v1/users/:id/reset-password
   * Trigger password reset email for a specific user. Admin only.
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async triggerPasswordReset(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByIdAdmin(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    await this.passwordResetService.requestReset(user.email);

    return {
      message: `Password reset email sent to ${user.email}`,
    };
  }
}
