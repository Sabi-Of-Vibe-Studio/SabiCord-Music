/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { PlayerState } from '../audio/Enums';
import { ILogger } from '../core/Logger';
import { EventEmitter } from 'events';
export class PlayerStateManager extends EventEmitter {
  private currentState: PlayerState = PlayerState.IDLE;
  private logger: ILogger;
  private stateHistory: Array<{ state: PlayerState; timestamp: number }> = [];
  private readonly maxHistorySize = 10;
  constructor(logger: ILogger) {
    super();
    this.logger = logger;
    this.recordStateChange(PlayerState.IDLE);
  }
  public setState(newState: PlayerState): void {
    const previousState = this.currentState;
    if (!this.isValidStateTransition(previousState, newState)) {
      this.logger.warn(
        `Invalid state transition from ${previousState} to ${newState}`,
        'player-state'
      );
      return;
    }
    this.currentState = newState;
    this.recordStateChange(newState);
    this.logger.debug(
      `Player state changed: ${previousState} -> ${newState}`,
      'player-state'
    );
    this.emit('stateChange', newState, previousState);
  }
  public getState(): PlayerState {
    return this.currentState;
  }
  public isPlaying(): boolean {
    return this.currentState === PlayerState.PLAYING;
  }
  public isPaused(): boolean {
    return this.currentState === PlayerState.PAUSED;
  }
  public isConnected(): boolean {
    return this.currentState !== PlayerState.IDLE && 
           this.currentState !== PlayerState.DESTROYED;
  }
  public canPlay(): boolean {
    return this.currentState === PlayerState.IDLE || 
           this.currentState === PlayerState.PAUSED ||
           this.currentState === PlayerState.STOPPED;
  }
  public canPause(): boolean {
    return this.currentState === PlayerState.PLAYING;
  }
  public canStop(): boolean {
    return this.currentState === PlayerState.PLAYING || 
           this.currentState === PlayerState.PAUSED;
  }
  public getStateHistory(): Array<{ state: PlayerState; timestamp: number }> {
    return [...this.stateHistory];
  }
  public forceState(state: PlayerState): void {
    const previousState = this.currentState;
    this.currentState = state;
    this.recordStateChange(state);
    this.logger.warn(
      `Player state forcibly changed: ${previousState} -> ${state}`,
      'player-state'
    );
    this.emit('stateChange', state, previousState);
  }
  public reset(): void {
    this.setState(PlayerState.IDLE);
    this.stateHistory = [];
    this.recordStateChange(PlayerState.IDLE);
  }
  private isValidStateTransition(from: PlayerState, to: PlayerState): boolean {
    const validTransitions: Record<PlayerState, PlayerState[]> = {
      [PlayerState.IDLE]: [PlayerState.CONNECTING, PlayerState.DESTROYED],
      [PlayerState.CONNECTING]: [PlayerState.IDLE, PlayerState.STOPPED, PlayerState.DESTROYED],
      [PlayerState.PLAYING]: [PlayerState.PAUSED, PlayerState.STOPPED, PlayerState.DESTROYED],
      [PlayerState.PAUSED]: [PlayerState.PLAYING, PlayerState.STOPPED, PlayerState.DESTROYED],
      [PlayerState.STOPPED]: [PlayerState.PLAYING, PlayerState.IDLE, PlayerState.DESTROYED],
      [PlayerState.DESTROYED]: [], 
    };
    return validTransitions[from]?.includes(to) ?? false;
  }
  private recordStateChange(state: PlayerState): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now(),
    });
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }
}
