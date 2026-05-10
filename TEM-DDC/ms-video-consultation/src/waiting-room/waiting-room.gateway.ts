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
import { Inject, UseFilters } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { WaitingRoomService } from './waiting-room.service';

@WebSocketGateway({
  namespace: '/waiting-room',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
@UseFilters(WsExceptionFilter)
export class WaitingRoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly waitingRoomService: WaitingRoomService,
    @Inject('NOTIFICATIONS_SERVICE') private readonly notificationsClient: ClientProxy,
  ) {
    console.log('🔥 WaitingRoom Gateway loaded');
  }

  handleConnection(client: Socket) {}

  handleDisconnect(client: Socket) {
    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    for (const roomId of rooms) {
      const removed = this.waitingRoomService.removePatient(roomId, client.id);
      if (removed) {
        this.server.to(roomId).emit('patient-left', {
          patientId: removed.patientId,
          position: this.waitingRoomService.getQueue(roomId).length,
        });
      }
    }
  }

  @SubscribeMessage('join-waiting-room')
  handleJoinWaitingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; consultationId: string; patientId?: string; patientName?: string },
  ) {
    const { roomId, consultationId, patientId, patientName } = payload;
    const pid = patientId ?? (client as Socket & { user?: { sub: string } }).user?.sub ?? client.id;
    if (!roomId || !consultationId) {
      return { event: 'error', data: { message: 'roomId and consultationId required' } };
    }
    client.join(roomId);
    const position = this.waitingRoomService.addPatient(roomId, client.id, pid, patientName);
    const queue = this.waitingRoomService.getQueue(roomId);
    client.emit('waiting-status', {
      roomId,
      consultationId,
      position,
      totalWaiting: queue.length,
      status: 'waiting',
    });
    this.server.to(roomId).emit('queue-updated', { roomId, queueLength: queue.length });
    return { event: 'joined', data: { roomId, position, totalWaiting: queue.length } };
  }

  @SubscribeMessage('leave-waiting-room')
  handleLeaveWaitingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const roomId = payload.roomId;
    if (roomId) {
      this.waitingRoomService.removePatient(roomId, client.id);
      client.leave(roomId);
      this.server.to(roomId).emit('queue-updated', {
        roomId,
        queueLength: this.waitingRoomService.getQueue(roomId).length,
      });
    }
    return { event: 'left', data: { roomId } };
  }

  @SubscribeMessage('join-waiting-room-doctor')
  async handleJoinWaitingRoomDoctor(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; doctorId: string; doctorName?: string },
  ) {
    const { roomId, doctorId, doctorName } = payload;
    if (!roomId || !doctorId) {
      return { event: 'error', data: { message: 'roomId and doctorId required' } };
    }
    client.join(roomId);
    const doctorDisplayName = doctorName?.trim() ? `Dr. ${doctorName.trim()}` : 'Dr.';
    const queue = this.waitingRoomService.getQueue(roomId);
    for (const patient of queue) {
      try {
        await firstValueFrom(
          this.notificationsClient.send('create_notification', {
            userId: patient.patientId,
            userType: 'PATIENT',
            type: 'DOCTOR_READY',
            message: `${doctorDisplayName} is ready for your consultation`,
          }),
        );
      } catch (e) {
        console.warn(`[WaitingRoom] create_notification failed for patient ${patient.patientId}:`, e);
      }
    }
    return { event: 'joined', data: { roomId } };
  }

  @SubscribeMessage('patient-join-waiting-room')
  handlePatientJoinWaitingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; consultationId: string; patientId: string; patientName?: string },
  ) {
    const { roomId, consultationId, patientId, patientName } = payload;
    if (!roomId || !consultationId) {
      return { event: 'error', data: { message: 'roomId and consultationId required' } };
    }
    client.join(roomId);
    const position = this.waitingRoomService.addPatient(roomId, client.id, patientId, patientName);
    const queue = this.waitingRoomService.getQueue(roomId);

    // Notify doctor (and anyone else in room) that patient entered
    this.server.to(roomId).emit('patient-entered', {
      roomId,
      patientId,
      patientName,
      position,
      totalWaiting: queue.length,
    });

    client.emit('waiting-status', {
      roomId,
      consultationId,
      position,
      totalWaiting: queue.length,
      status: 'waiting',
    });

    return { event: 'joined', data: { roomId, position, totalWaiting: queue.length } };
  }

  /**
   * Doctor starts the consultation — broadcasts to ALL in the room
   * so the patient's WaitingRoom page enables the Join button.
   */
  @SubscribeMessage('start-consultation')
  handleStartConsultation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; appointmentId: string },
  ) {
    const { roomId, appointmentId } = payload;
    if (!roomId) {
      return { event: 'error', data: { message: 'roomId required' } };
    }

    // Broadcast to ALL sockets in the room (including doctor)
    this.server.to(roomId).emit('consultation-started', {
      roomId,
      appointmentId: appointmentId || roomId,
      startedAt: new Date().toISOString(),
    });

    return { event: 'consultation-start-ack', data: { roomId } };
  }

  /**
   * Doctor invites a patient into the call (server can call this from REST or another gateway).
   */
  invitePatient(roomId: string, patientId: string): boolean {
    const queue = this.waitingRoomService.getQueue(roomId);
    const patient = queue.find((p) => p.patientId === patientId);
    if (!patient) return false;
    this.server.to(patient.socketId).emit('invited', { roomId, status: 'invited' });
    return true;
  }
}
