import { Module } from '@nestjs/common';
import { WaitingRoomGateway } from './waiting-room.gateway';
import { WaitingRoomService } from './waiting-room.service';

@Module({
  providers: [WaitingRoomGateway, WaitingRoomService],
  exports: [WaitingRoomService],
})
export class WaitingRoomModule {}
