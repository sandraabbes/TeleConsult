import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { UseGuards, UseFilters } from '@nestjs/common';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { SignalingService } from './signaling.service';
import { ConsultationService } from '../consultation/consultation.service';

@WebSocketGateway({
  namespace: '/signaling',
  cors: { origin: '*' },
})
@UseFilters(WsExceptionFilter)
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly signalingService: SignalingService,
    private readonly consultationService: ConsultationService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`[Signaling] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Signaling] Client disconnected: ${client.id}`);
    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    rooms.forEach((roomId) => {
      this.signalingService.removePeer(roomId, client.id);
      // Notify remaining peers that someone left
      client.to(roomId).emit('peer-left', { socketId: client.id });
    });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; userId?: string; role?: string },
  ) {
    const userId = (client as Socket & { user?: { sub: string } }).user?.sub ?? payload.userId ?? client.id;
    const roomId = payload.roomId;
    if (!roomId) {
      return { event: 'signaling-error', data: { message: 'roomId required' } };
    }
    client.join(roomId);
    const staleSocketIds = this.signalingService.addPeer(roomId, client.id, userId, payload.role);

    // Kick stale sockets for the same userId (page refresh, React strict mode double-mount)
    for (const staleId of staleSocketIds) {
      if (this.server?.in) {
        this.server.in(staleId).disconnectSockets(true);
      }
      console.log(`[Signaling] Kicked stale socket ${staleId} for user ${userId}`);
    }

    const peers = this.signalingService.getPeersInRoom(roomId);
    console.log(`[Signaling] User ${userId} (${payload.role}) joined room ${roomId}. Peers: ${peers.length}`);

    // Notify OTHER peers in the room that someone joined
    client.to(roomId).emit('user-joined', {
      socketId: client.id,
      userId,
      role: payload.role,
      peers,
    });

    // Return current peers to the joiner
    return { event: 'room-joined', data: { roomId, peers } };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const roomId = payload.roomId;
    if (roomId) {
      this.signalingService.removePeer(roomId, client.id);
      client.leave(roomId);
      client.to(roomId).emit('peer-left', { socketId: client.id });
    }
    return { event: 'room-left', data: { roomId } };
  }

  // ── WebRTC Signaling (room-broadcast for 1-on-1) ────────────────────

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; targetUserId?: string; offer: RTCSessionDescriptionInit },
  ) {
    const { roomId, targetUserId, offer } = payload;

    if (targetUserId) {
      // Targeted send if targetUserId provided
      const targetSocketId = this.signalingService.getSocketIdByUserId(roomId, targetUserId);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('offer', {
          from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
          offer,
        });
      }
    } else {
      // Broadcast to room (exclude sender) — works for 1-on-1
      client.to(roomId).emit('offer', {
        from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
        offer,
      });
    }

    return { event: 'offer-sent' };
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; targetUserId?: string; answer: RTCSessionDescriptionInit },
  ) {
    const { roomId, targetUserId, answer } = payload;

    if (targetUserId) {
      const targetSocketId = this.signalingService.getSocketIdByUserId(roomId, targetUserId);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('answer', {
          from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
          answer,
        });
      }
    } else {
      client.to(roomId).emit('answer', {
        from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
        answer,
      });
    }

    return { event: 'answer-sent' };
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; targetUserId?: string; candidate: RTCIceCandidateInit },
  ) {
    const { roomId, targetUserId, candidate } = payload;

    if (targetUserId) {
      const targetSocketId = this.signalingService.getSocketIdByUserId(roomId, targetUserId);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('ice-candidate', {
          from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
          candidate,
        });
      }
    } else {
      client.to(roomId).emit('ice-candidate', {
        from: (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id,
        candidate,
      });
    }

    return { event: 'ice-candidate-sent' };
  }

  // ── Chat Messages ───────────────────────────────────────────────────

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      roomId: string; // appointmentId
      senderId: string;
      senderName: string;
      senderRole: string;
      message: string;
    },
  ) {
    const { roomId, ...messageData } = payload;
    if (!roomId) return;

    const chatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      appointmentId: roomId,
      ...messageData,
      timestamp: new Date().toISOString(),
      isFile: false,
    };

    // Broadcast to ALL in the room (including sender so they see their own message)
    this.server.to(roomId).emit('receive-message', chatMessage);

    // Fire-and-forget sync to ms-messages DM repository
    try {
      const consultation = await this.consultationService.findByRoomId(roomId);
      if (consultation && consultation.patientId && consultation.doctorId) {
        
        // 1. Get or create conversation between this Doctor and Patient
        const convRes = await fetch('http://localhost:3060/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doctorId: Number(consultation.doctorId),
            patientId: consultation.patientId,
          }),
        });

        if (convRes.ok) {
          const conversation = await convRes.json();
          // 2. Push message to ms-messages
          await fetch(`http://localhost:3060/conversations/${conversation.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: messageData.senderId,
              senderType: messageData.senderRole.toLowerCase(), // 'doctor' or 'patient'
              text: messageData.message,
            }),
          });
        }
      }
    } catch (e) {
      console.warn('[Signaling] Failed to sync message to ms-messages:', e.message);
    }

    return { event: 'message-sent', data: chatMessage };
  }

  // ── File Sharing ────────────────────────────────────────────────────

  @SubscribeMessage('share-file')
  handleShareFile(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; file: any },
  ) {
    const { roomId, file } = payload;
    if (!roomId) return;

    // Broadcast file info to other peers
    client.to(roomId).emit('file-shared', file);

    return { event: 'file-shared-ack' };
  }

  // ── End Consultation ────────────────────────────────────────────────

  @SubscribeMessage('end-consultation')
  handleEndConsultation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; endedBy?: string },
  ) {
    const { roomId, endedBy } = payload;
    if (!roomId) return;

    // Notify other peers that the consultation has ended
    client.to(roomId).emit('consultation-ended', {
      roomId,
      endedBy: endedBy || client.id,
      timestamp: new Date().toISOString(),
    });

    // Remove the client from the room
    this.signalingService.removePeer(roomId, client.id);
    client.leave(roomId);

    return { event: 'consultation-end-ack' };
  }
}
