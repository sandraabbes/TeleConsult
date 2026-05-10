import { randomBytes } from 'crypto';

const ROOM_ID_LENGTH = 12;
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generates a unique room ID suitable for WebRTC/consultation rooms.
 * Uses crypto for randomness and a URL-safe alphanumeric string.
 */
export function generateRoomId(): string {
  const bytes = randomBytes(ROOM_ID_LENGTH);
  let result = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    result += ALPHANUMERIC[bytes[i]! % ALPHANUMERIC.length];
  }
  return result;
}
