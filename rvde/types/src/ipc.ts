import type { ChannelId, ProcessId } from './ids.js';
import type { RVDEResult } from './result.js';

/** IPC message envelope. */

export interface IPCMessage {
  readonly id: number;
  readonly type: string;
  readonly payload: unknown;
  readonly sender: ProcessId;
  readonly timestamp: number;
}

/** Options for creating an IPC channel. */

export interface ChannelOptions {
  readonly name?: string;
  readonly capacity?: number;
  readonly reliable?: boolean;
}

/** IPC channel metadata. */

export interface ChannelInfo {
  readonly id: ChannelId;
  readonly name: string;
  readonly capacity: number;
  readonly messageCount: number;
  readonly createdAt: number;
}

/** Message handler callback for a process. */

export type IPCMessageHandler = (message: IPCMessage) => void;

/** Inter-process communication interface. */

export interface IPCBus {
  createChannel(options?: ChannelOptions): Promise<RVDEResult<ChannelInfo>>;
  closeChannel(channelId: ChannelId): Promise<RVDEResult<void>>;
  send(channelId: ChannelId, message: Omit<IPCMessage, 'id' | 'timestamp'>): Promise<RVDEResult<void>>;
  receive(channelId: ChannelId): Promise<RVDEResult<IPCMessage>>;
  registerHandler(processId: ProcessId, handler: IPCMessageHandler): RVDEResult<void>;
  unregisterHandler(processId: ProcessId): RVDEResult<void>;
  getChannel(channelId: ChannelId): RVDEResult<ChannelInfo>;
}
