import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationService } from '../conversation/conversation.service';
import { SendMessageDto } from '../conversation/dto/send-message.dto';

@WebSocketGateway({
  namespace: '/messages',
  cors: { origin: '*' },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly conversationService: ConversationService) {}

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const { conversationId } = payload;
    if (!conversationId) {
      client.emit('chat_error', { message: 'conversationId is required' });
      return;
    }
    client.join(`conversation:${conversationId}`);
    client.emit('joined', { conversationId });
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const { conversationId } = payload;
    if (!conversationId) {
      client.emit('chat_error', { message: 'conversationId is required' });
      return;
    }
    client.leave(`conversation:${conversationId}`);
    client.emit('left', { conversationId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    try {
      const message = await this.conversationService.saveMessage(payload);
      
      // Broadcast to room
      this.server.to(`conversation:${payload.conversationId}`).emit('message_received', message);
    } catch (error) {
      client.emit('chat_error', { message: error.message || 'Failed to send message' });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; userId: string },
  ) {
    const { conversationId, userId } = payload;
    if (!conversationId || !userId) {
      client.emit('chat_error', { message: 'conversationId and userId are required' });
      return;
    }
    
    try {
      await this.conversationService.markAsRead(conversationId, userId);
      // Notify others in room that messages were read
      this.server.to(`conversation:${conversationId}`).emit('messages_read', { conversationId, userId });
    } catch (error) {
      client.emit('chat_error', { message: error.message || 'Failed to mark as read' });
    }
  }
}
