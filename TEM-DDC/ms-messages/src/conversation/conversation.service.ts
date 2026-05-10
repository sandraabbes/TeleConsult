import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity, SenderType } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
  ) {}

  async createConversation(
    dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    // Ensure unique conversation (one chat conversation between the same 2 users)
    const existing = await this.conversationRepo.findOne({
      where: { doctorId: dto.doctorId, patientId: dto.patientId },
    });
    if (existing) {
      return existing;
    }

    const conv = this.conversationRepo.create(dto);
    return this.conversationRepo.save(conv);
  }

  async getUserConversations(
    userId: string,
    userType: SenderType,
  ): Promise<ConversationEntity[]> {
    const whereClause =
      userType === SenderType.DOCTOR
        ? { doctorId: userId }
        : { patientId: userId };

    return this.conversationRepo.find({
      where: whereClause,
      order: { lastMessageAt: 'DESC' },
      relations: ['messages'], // Optionally eager load messages or handle separately
    });
  }

  async getConversationHistory(
    conversationId: string,
  ): Promise<MessageEntity[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async saveMessage(dto: SendMessageDto): Promise<MessageEntity> {
    const conv = await this.conversationRepo.findOne({
      where: { id: dto.conversationId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      senderType: dto.senderType,
      text: dto.text,
    });
    
    // Save message and update conversation lastMessageAt
    const savedMessage = await this.messageRepo.save(message);
    conv.lastMessageAt = savedMessage.createdAt;
    await this.conversationRepo.save(conv);

    return savedMessage;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    // Mark all messages in the conversation NOT sent by the given userId as read
    await this.messageRepo
      .createQueryBuilder()
      .update(MessageEntity)
      .set({ isRead: true })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = :isRead', { isRead: false })
      .execute();
  }
}
