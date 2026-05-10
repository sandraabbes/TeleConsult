import { Injectable } from '@nestjs/common';

export interface WaitingPatient {
  socketId: string;
  patientId: string;
  patientName?: string;
  joinedAt: Date;
}

@Injectable()
export class WaitingRoomService {
  private readonly roomQueues = new Map<string, WaitingPatient[]>();

  addPatient(roomId: string, socketId: string, patientId: string, patientName?: string): number {
    if (!this.roomQueues.has(roomId)) {
      this.roomQueues.set(roomId, []);
    }
    const queue = this.roomQueues.get(roomId)!;
    const existing = queue.findIndex((p) => p.patientId === patientId);
    if (existing >= 0) {
      queue[existing]!.socketId = socketId;
      return existing;
    }
    queue.push({ socketId, patientId, patientName, joinedAt: new Date() });
    return queue.length - 1;
  }

  removePatient(roomId: string, socketId: string): WaitingPatient | null {
    const queue = this.roomQueues.get(roomId);
    if (!queue) return null;
    const index = queue.findIndex((p) => p.socketId === socketId);
    if (index < 0) return null;
    const [removed] = queue.splice(index, 1);
    if (queue.length === 0) this.roomQueues.delete(roomId);
    return removed ?? null;
  }

  getQueue(roomId: string): WaitingPatient[] {
    return this.roomQueues.get(roomId) ?? [];
  }

  getPosition(roomId: string, patientId: string): number {
    const queue = this.getQueue(roomId);
    const index = queue.findIndex((p) => p.patientId === patientId);
    return index >= 0 ? index : -1;
  }

  getPatientBySocketId(roomId: string, socketId: string): WaitingPatient | undefined {
    return this.getQueue(roomId).find((p) => p.socketId === socketId);
  }
}
