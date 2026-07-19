/**
 * Metrics - Performance metrics collection
 * Tracks agent performance, token usage, and tool execution
 */
export class Metrics {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.metrics = {
      agentExecutions: {},
      toolExecutions: {},
      tokenUsage: {
        total: 0,
        byModel: {}
      },
      errors: {},
      latency: []
    };
  }

  /**
   * Record agent execution start
   */
  recordAgentStart(agentName) {
    if (!this.enabled) return;

    if (!this.metrics.agentExecutions[agentName]) {
      this.metrics.agentExecutions[agentName] = {
        total: 0,
        success: 0,
        error: 0,
        totalDuration: 0,
        startTime: null
      };
    }

    this.metrics.agentExecutions[agentName].total++;
    this.metrics.agentExecutions[agentName].startTime = Date.now();
  }

  /**
   * Record agent execution success
   */
  recordAgentSuccess(agentName) {
    if (!this.enabled) return;

    const agent = this.metrics.agentExecutions[agentName];
    if (!agent) return;

    agent.success++;
    
    if (agent.startTime) {
      const duration = Date.now() - agent.startTime;
      agent.totalDuration += duration;
      this.recordLatency('agent', agentName, duration);
      agent.startTime = null;
    }
  }

  /**
   * Record agent execution error
   */
  recordAgentError(agentName, error) {
    if (!this.enabled) return;

    const agent = this.metrics.agentExecutions[agentName];
    if (agent) {
      agent.error++;
      agent.startTime = null;
    }

    this.recordError('agent', agentName, error);
  }

  /**
   * Record tool execution
   */
  recordToolExecution(toolName, duration, success = true) {
    if (!this.enabled) return;

    if (!this.metrics.toolExecutions[toolName]) {
      this.metrics.toolExecutions[toolName] = {
        total: 0,
        success: 0,
        error: 0,
        totalDuration: 0
      };
    }

    const tool = this.metrics.toolExecutions[toolName];
    tool.total++;
    tool.totalDuration += duration;

    if (success) {
      tool.success++;
    } else {
      tool.error++;
    }

    this.recordLatency('tool', toolName, duration);
  }

  /**
   * Record token usage
   */
  recordTokenUsage(modelId, tokens) {
    if (!this.enabled) return;

    this.metrics.tokenUsage.total += tokens;

    if (!this.metrics.tokenUsage.byModel[modelId]) {
      this.metrics.tokenUsage.byModel[modelId] = 0;
    }

    this.metrics.tokenUsage.byModel[modelId] += tokens;
  }

  /**
   * Record error
   */
  recordError(type, name, error) {
    if (!this.enabled) return;

    const key = `${type}:${name}`;
    
    if (!this.metrics.errors[key]) {
      this.metrics.errors[key] = {
        count: 0,
        lastError: null,
        lastTimestamp: null
      };
    }

    this.metrics.errors[key].count++;
    this.metrics.errors[key].lastError = error?.message || String(error);
    this.metrics.errors[key].lastTimestamp = Date.now();
  }

  /**
   * Record latency
   */
  recordLatency(type, name, duration) {
    if (!this.enabled) return;

    this.metrics.latency.push({
      type,
      name,
      duration,
      timestamp: Date.now()
    });

    // Keep only recent latency records (last 1000)
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      summary: this.getSummary()
    };
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const agentStats = Object.entries(this.metrics.agentExecutions).map(([name, data]) => ({
      name,
      total: data.total,
      successRate: data.total > 0 ? (data.success / data.total) * 100 : 0,
      avgDuration: data.success > 0 ? data.totalDuration / data.success : 0
    }));

    const toolStats = Object.entries(this.metrics.toolExecutions).map(([name, data]) => ({
      name,
      total: data.total,
      successRate: data.total > 0 ? (data.success / data.total) * 100 : 0,
      avgDuration: data.total > 0 ? data.totalDuration / data.total : 0
    }));

    return {
      agents: agentStats,
      tools: toolStats,
      tokenUsage: this.metrics.tokenUsage,
      totalErrors: Object.values(this.metrics.errors).reduce((sum, e) => sum + e.count, 0)
    };
  }

  /**
   * Get latency percentiles
   */
  getLatencyPercentiles(type = null, name = null) {
    let latencies = this.metrics.latency;

    if (type) {
      latencies = latencies.filter(l => l.type === type);
    }

    if (name) {
      latencies = latencies.filter(l => l.name === name);
    }

    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = latencies.map(l => l.duration).sort((a, b) => a - b);
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      agentExecutions: {},
      toolExecutions: {},
      tokenUsage: {
        total: 0,
        byModel: {}
      },
      errors: {},
      latency: []
    };
  }

  /**
   * Enable/disable metrics
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}
