import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SenderType } from './entities/message.entity';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    return this.conversationService.createConversation(dto);
  }

  @Get()
  async findAll(@Query('userId') userId: string, @Query('userType') userType: string) {
    if (!userId || !userType) {
      throw new HttpException('userId and userType are required', HttpStatus.BAD_REQUEST);
    }
    return this.conversationService.getUserConversations(userId, userType as SenderType);
  }

  @Get(':id')
  async getHistory(@Param('id') id: string) {
    return this.conversationService.getConversationHistory(id);
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: { senderId: string; senderType: SenderType; text: string }
  ) {
    return this.conversationService.saveMessage({
      conversationId,
      senderId: dto.senderId,
      senderType: dto.senderType,
      text: dto.text,
    });
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Body() body: { userId: string }) {
    if (!body.userId) {
      throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
    }
    await this.conversationService.markAsRead(id, body.userId);
    return { success: true };
  }
}
