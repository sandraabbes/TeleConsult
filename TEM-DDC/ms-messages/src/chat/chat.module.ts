import { Module } from '@nestjs/common';
import { ConversationModule } from '../conversation/conversation.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [ConversationModule],
  providers: [ChatGateway],
})
export class ChatModule {}
