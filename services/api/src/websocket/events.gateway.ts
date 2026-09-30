import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { StructuredLogger, createWSEventEnvelope } from '@kdi/shared';
import type { WSEventEnvelope, AgentStatusChangedPayload } from '@kdi/types';

@WebSocketGateway({ path: '/ws/v1/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new StructuredLogger('EventsGateway');
  private clients = new Set<WebSocket>();

  handleConnection(client: WebSocket) {
    this.clients.add(client);
    this.logger.info('handleConnection', `Client connected. Total active connections: ${this.clients.size}`);
    
    // Send initial welcome message
    const welcome = createWSEventEnvelope('system.connected', 'office:public', {
      message: 'Connected to KDI AI Office Realtime Telemetry Stream',
      serverTime: new Date().toISOString(),
    });
    client.send(JSON.stringify(welcome));
  }

  handleDisconnect(client: WebSocket) {
    this.clients.delete(client);
    this.logger.info('handleDisconnect', `Client disconnected. Total active connections: ${this.clients.size}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: WebSocket, payload: unknown) {
    this.logger.info('handleSubscribe', 'Client subscribed to channels', { payload });
    return { status: 'subscribed' };
  }

  broadcastEvent<T>(envelope: WSEventEnvelope<T>) {
    const raw = JSON.stringify(envelope);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }

  broadcastAgentState(payload: AgentStatusChangedPayload) {
    const envelope = createWSEventEnvelope('agent.status.changed', 'office:events', payload);
    this.broadcastEvent(envelope);
  }

  broadcastOfficeEvent<T = unknown>(
    eventType: string,
    data: T,
    channel: 'office:public' | 'office:events' = 'office:events'
  ) {
    const envelope = createWSEventEnvelope(eventType, channel, data);
    this.broadcastEvent(envelope);
  }
}
