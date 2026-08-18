import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  REALTIME_EVENTS,
  type SeatHeldPayload,
  type SeatReleasedPayload,
  type SeatSoldPayload,
} from '@ticket-seller/shared';

function roomName(screeningId: string): string {
  return `screening:${screeningId}`;
}

@WebSocketGateway({ path: '/socket.io' })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger('RealtimeGateway');

  handleConnection(client: Socket): void {
    const origin = client.handshake.headers.origin;
    const allowed = process.env.PUBLIC_ORIGIN;
    if (allowed && origin && origin !== allowed) {
      this.logger.warn(`Origem rejeitada no handshake: ${origin}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('screening:join')
  handleJoin(
    @MessageBody() data: { screeningId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!data?.screeningId) return;
    void client.join(roomName(data.screeningId));
  }

  @SubscribeMessage('screening:leave')
  handleLeave(
    @MessageBody() data: { screeningId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    if (!data?.screeningId) return;
    void client.leave(roomName(data.screeningId));
  }

  broadcastSeatHeld(screeningId: string, payload: SeatHeldPayload): void {
    this.server
      ?.to(roomName(screeningId))
      .emit(REALTIME_EVENTS.SEAT_HELD, payload);
  }

  broadcastSeatReleased(
    screeningId: string,
    payload: SeatReleasedPayload,
  ): void {
    this.server
      ?.to(roomName(screeningId))
      .emit(REALTIME_EVENTS.SEAT_RELEASED, payload);
  }

  broadcastSeatSold(screeningId: string, payload: SeatSoldPayload): void {
    this.server
      ?.to(roomName(screeningId))
      .emit(REALTIME_EVENTS.SEAT_SOLD, payload);
  }
}
