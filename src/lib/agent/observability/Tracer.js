/**
 * Tracer - Trace agent execution flow
 * Provides execution tracing for debugging and analysis
 */
export class Tracer {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.traces = [];
    this.activeSpans = new Map();
    this.maxTraces = config.maxTraces || 100;
  }

  /**
   * Generate unique span ID
   */
  generateSpanId() {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a new span
   */
  startSpan(name, attributes = {}) {
    if (!this.enabled) return null;

    const spanId = this.generateSpanId();
    const span = {
      id: spanId,
      name,
      attributes,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      status: 'active',
      children: []
    };

    this.activeSpans.set(spanId, span);
    return spanId;
  }

  /**
   * End a span
   */
  endSpan(spanId, status = 'success', result = null) {
    if (!this.enabled || !spanId) return;

    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    span.result = result;

    this.activeSpans.delete(spanId);
    this.traces.push(span);

    // Keep only recent traces
    if (this.traces.length > this.maxTraces) {
      this.traces.shift();
    }
  }

  /**
   * Add event to active span
   */
  addEvent(spanId, eventName, data = {}) {
    if (!this.enabled || !spanId) return;

    const span = this.activeSpans.get(spanId);
    if (!span) return;

    if (!span.events) {
      span.events = [];
    }

    span.events.push({
      name: eventName,
      timestamp: Date.now(),
      data
    });
  }

  /**
   * Set span attribute
   */
  setAttribute(spanId, key, value) {
    if (!this.enabled || !spanId) return;

    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.attributes[key] = value;
  }

  /**
   * Get all traces
   */
  getTraces(filter = {}) {
    let filtered = this.traces;

    if (filter.name) {
      filtered = filtered.filter(trace => trace.name === filter.name);
    }

    if (filter.status) {
      filtered = filtered.filter(trace => trace.status === filter.status);
    }

    if (filter.minDuration) {
      filtered = filtered.filter(trace => trace.duration >= filter.minDuration);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Get active spans
   */
  getActiveSpans() {
    return Array.from(this.activeSpans.values());
  }

  /**
   * Clear all traces
   */
  clearTraces() {
    this.traces = [];
  }

  /**
   * Enable/disable tracing
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get trace statistics
   */
  getStats() {
    const traces = this.traces;
    
    if (traces.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0
      };
    }

    const durations = traces.map(t => t.duration).filter(d => d !== null);
    const successes = traces.filter(t => t.status === 'success').length;

    return {
      total: traces.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successes / traces.length) * 100
    };
  }
}
