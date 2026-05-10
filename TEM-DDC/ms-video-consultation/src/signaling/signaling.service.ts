import { Injectable } from '@nestjs/common';

export interface RoomPeer {
  socketId: string;
  userId: string;
  role?: string;
}

@Injectable()
export class SignalingService {
  private readonly roomPeers = new Map<string, Map<string, RoomPeer>>();

  addPeer(roomId: string, socketId: string, userId: string, role?: string): string[] {
    if (!this.roomPeers.has(roomId)) {
      this.roomPeers.set(roomId, new Map());
    }
    const room = this.roomPeers.get(roomId)!;

    // Remove any stale sockets for the same userId (e.g. page refresh / reconnect)
    const staleSocketIds: string[] = [];
    for (const [existingSocketId, peer] of room) {
      if (peer.userId === userId && existingSocketId !== socketId) {
        staleSocketIds.push(existingSocketId);
        room.delete(existingSocketId);
      }
    }

    room.set(socketId, { socketId, userId, role });
    return staleSocketIds; // Return stale IDs so the gateway can kick them from the room
  }

  removePeer(roomId: string, socketId: string): void {
    const room = this.roomPeers.get(roomId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.roomPeers.delete(roomId);
      }
    }
  }

  getPeersInRoom(roomId: string): RoomPeer[] {
    const room = this.roomPeers.get(roomId);
    return room ? Array.from(room.values()) : [];
  }

  getSocketIdByUserId(roomId: string, userId: string): string | undefined {
    const room = this.roomPeers.get(roomId);
    if (!room) return undefined;
    for (const [sid, peer] of room) {
      if (peer.userId === userId) return sid;
    }
    return undefined;
  }
}
