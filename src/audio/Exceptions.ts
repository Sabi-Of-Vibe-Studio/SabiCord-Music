/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
export class AudioException extends Error {
  public readonly code: string;
  public readonly timestamp: number;
  constructor(message: string, code = 'AUDIO_ERROR') {
    super(message);
    this.name = 'AudioException';
    this.code = code;
    this.timestamp = Date.now();
    Error.captureStackTrace(this, this.constructor);
  }
}
export class NodeException extends AudioException {
  constructor(message: string, code = 'NODE_ERROR') {
    super(message, code);
    this.name = 'NodeException';
  }
}
export class NodeConnectionFailure extends NodeException {
  constructor(message: string) {
    super(message, 'NODE_CONNECTION_FAILED');
    this.name = 'NodeConnectionFailure';
  }
}
export class NodeNotAvailable extends NodeException {
  constructor(message: string) {
    super(message, 'NODE_NOT_AVAILABLE');
    this.name = 'NodeNotAvailable';
  }
}
export class PlayerException extends AudioException {
  constructor(message: string, code = 'PLAYER_ERROR') {
    super(message, code);
    this.name = 'PlayerException';
  }
}
export class PlayerNotConnected extends PlayerException {
  constructor(message: string) {
    super(message, 'PLAYER_NOT_CONNECTED');
    this.name = 'PlayerNotConnected';
  }
}
export class PlayerAlreadyConnected extends PlayerException {
  constructor(message: string) {
    super(message, 'PLAYER_ALREADY_CONNECTED');
    this.name = 'PlayerAlreadyConnected';
  }
}
export class InvalidChannelPermissions extends PlayerException {
  constructor(message: string) {
    super(message, 'INVALID_CHANNEL_PERMISSIONS');
    this.name = 'InvalidChannelPermissions';
  }
}
export class TrackException extends AudioException {
  constructor(message: string, code = 'TRACK_ERROR') {
    super(message, code);
    this.name = 'TrackException';
  }
}
export class TrackLoadFailed extends TrackException {
  constructor(message: string) {
    super(message, 'TRACK_LOAD_FAILED');
    this.name = 'TrackLoadFailed';
  }
}
export class QueueException extends AudioException {
  constructor(message: string, code = 'QUEUE_ERROR') {
    super(message, code);
    this.name = 'QueueException';
  }
}
export class QueueFull extends QueueException {
  constructor(message: string) {
    super(message, 'QUEUE_FULL');
    this.name = 'QueueFull';
  }
}
export class QueueEmpty extends QueueException {
  constructor(message: string) {
    super(message, 'QUEUE_EMPTY');
    this.name = 'QueueEmpty';
  }
}
export class FilterException extends AudioException {
  constructor(message: string, code = 'FILTER_ERROR') {
    super(message, code);
    this.name = 'FilterException';
  }
}
export class InvalidFilterValue extends FilterException {
  constructor(message: string) {
    super(message, 'INVALID_FILTER_VALUE');
    this.name = 'InvalidFilterValue';
  }
}
