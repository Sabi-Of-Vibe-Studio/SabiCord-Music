/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

export class VoicelinkException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoicelinkException';
  }
}

export class NodeException extends VoicelinkException {
  constructor(message: string) {
    super(message);
    this.name = 'NodeException';
  }
}

export class NodeConnectionFailure extends NodeException {
  constructor(message: string) {
    super(message);
    this.name = 'NodeConnectionFailure';
  }
}

export class NodeCreationError extends NodeException {
  constructor(message: string) {
    super(message);
    this.name = 'NodeCreationError';
  }
}

export class NodeNotAvailable extends NodeException {
  constructor(message: string) {
    super(message);
    this.name = 'NodeNotAvailable';
  }
}

export class NoNodesAvailable extends NodeException {
  constructor(message: string) {
    super(message);
    this.name = 'NoNodesAvailable';
  }
}

export class TrackException extends VoicelinkException {
  constructor(message: string) {
    super(message);
    this.name = 'TrackException';
  }
}

export class TrackLoadError extends TrackException {
  constructor(message: string) {
    super(message);
    this.name = 'TrackLoadError';
  }
}

export class TrackInvalidPosition extends TrackException {
  constructor(message: string) {
    super(message);
    this.name = 'TrackInvalidPosition';
  }
}

export class DuplicateTrack extends TrackException {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateTrack';
  }
}

export class QueueException extends VoicelinkException {
  constructor(message: string) {
    super(message);
    this.name = 'QueueException';
  }
}

export class QueueFull extends QueueException {
  constructor(message: string) {
    super(message);
    this.name = 'QueueFull';
  }
}

export class OutOfList extends QueueException {
  constructor(message: string) {
    super(message);
    this.name = 'OutOfList';
  }
}

export class FilterException extends VoicelinkException {
  constructor(message: string) {
    super(message);
    this.name = 'FilterException';
  }
}

export class FilterInvalidArgument extends FilterException {
  constructor(message: string) {
    super(message);
    this.name = 'FilterInvalidArgument';
  }
}

export class FilterTagAlreadyInUse extends FilterException {
  constructor(message: string) {
    super(message);
    this.name = 'FilterTagAlreadyInUse';
  }
}

export class PlayerException extends VoicelinkException {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerException';
  }
}

export class PlayerNotConnected extends PlayerException {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerNotConnected';
  }
}

export class PlayerAlreadyConnected extends PlayerException {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerAlreadyConnected';
  }
}

export class InvalidChannelPermissions extends PlayerException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidChannelPermissions';
  }
}
