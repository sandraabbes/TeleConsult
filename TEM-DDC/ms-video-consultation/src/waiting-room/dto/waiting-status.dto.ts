export class WaitingStatusDto {
  roomId: string;
  position: number;
  totalWaiting: number;
  estimatedWaitMinutes?: number;
  status: 'waiting' | 'invited' | 'ready';
}
