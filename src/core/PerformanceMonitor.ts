/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { ILogger } from './Logger';

export interface IPerformanceMetrics {
  commandExecutionTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  activeConnections: number;
  queueSize: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private logger: ILogger;
  private metrics: IPerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.startMonitoring();
  }

  public startCommandTimer(): () => number {
    const startTime = process.hrtime.bigint();
    
    return (): number => {
      const endTime = process.hrtime.bigint();
      return Number(endTime - startTime) / 1000000;
    };
  }

  public recordCommandExecution(executionTime: number, commandName: string): void {
    if (executionTime > 5000) {
      this.logger.warn(`Slow command execution: ${commandName} took ${executionTime}ms`, 'performance');
    }

    this.addMetric({
      commandExecutionTime: executionTime,
      memoryUsage: process.memoryUsage(),
      activeConnections: 0,
      queueSize: 0,
      timestamp: Date.now(),
    });
  }

  public recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > 500) {
      this.logger.warn(`High memory usage: ${heapUsedMB.toFixed(2)}MB`, 'performance');
    }

    this.addMetric({
      commandExecutionTime: 0,
      memoryUsage: memUsage,
      activeConnections: 0,
      queueSize: 0,
      timestamp: Date.now(),
    });
  }

  public getAverageCommandTime(minutes = 5): number {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => 
      m.timestamp > cutoff && m.commandExecutionTime > 0
    );

    if (recentMetrics.length === 0) return 0;

    const total = recentMetrics.reduce((sum, m) => sum + m.commandExecutionTime, 0);
    return total / recentMetrics.length;
  }

  public getCurrentMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  public getMemoryUsageFormatted(): string {
    const usage = process.memoryUsage();
    return `Heap: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB, RSS: ${(usage.rss / 1024 / 1024).toFixed(2)}MB`;
  }

  public getPerformanceReport(): any {
    const now = Date.now();
    const last5Min = this.metrics.filter(m => now - m.timestamp < 300000);
    const last1Hour = this.metrics.filter(m => now - m.timestamp < 3600000);

    return {
      current: {
        memory: this.getMemoryUsageFormatted(),
        uptime: process.uptime(),
      },
      last5Minutes: {
        averageCommandTime: this.calculateAverage(last5Min, 'commandExecutionTime'),
        commandCount: last5Min.filter(m => m.commandExecutionTime > 0).length,
      },
      lastHour: {
        averageCommandTime: this.calculateAverage(last1Hour, 'commandExecutionTime'),
        commandCount: last1Hour.filter(m => m.commandExecutionTime > 0).length,
        peakMemory: this.calculatePeak(last1Hour, 'memoryUsage'),
      },
    };
  }

  public checkPerformanceThresholds(): void {
    const avgCommandTime = this.getAverageCommandTime(5);
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (avgCommandTime > 3000) {
      this.logger.warn(`Performance degradation: Average command time ${avgCommandTime.toFixed(2)}ms`, 'performance');
    }

    if (heapUsedMB > 800) {
      this.logger.warn(`High memory usage: ${heapUsedMB.toFixed(2)}MB`, 'performance');
    }

    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
    
    if (cpuPercent > 80) {
      this.logger.warn(`High CPU usage: ${cpuPercent.toFixed(2)}%`, 'performance');
    }
  }

  public cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.recordMemoryUsage();
      this.checkPerformanceThresholds();
      this.cleanupOldMetrics();
    }, 30000);
  }

  private addMetric(metric: IPerformanceMetrics): void {
    this.metrics.push(metric);
    
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  private calculateAverage(metrics: IPerformanceMetrics[], field: keyof IPerformanceMetrics): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics
      .map(m => m[field])
      .filter(v => typeof v === 'number' && v > 0) as number[];
    
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePeak(metrics: IPerformanceMetrics[], field: string): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics
      .map(m => {
        if (field === 'memoryUsage') {
          return (m.memoryUsage as NodeJS.MemoryUsage).heapUsed;
        }
        return m[field as keyof IPerformanceMetrics];
      })
      .filter(v => typeof v === 'number') as number[];
    
    return Math.max(...values);
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }
}
