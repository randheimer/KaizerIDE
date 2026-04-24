/**
 * AgentRegistry - Central registry for managing agents
 * Handles agent registration, lookup, and lifecycle
 */
export class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.defaultAgent = null;
  }

  /**
   * Register an agent
   */
  register(agent, isDefault = false) {
    if (!agent || !agent.name) {
      throw new Error('Agent must have a name property');
    }

    // Allow re-registration during hot reload
    if (this.agents.has(agent.name)) {
      console.log(`[AgentRegistry] Re-registering agent: ${agent.name} (hot reload)`);
      this.agents.set(agent.name, agent);
      return;
    }

    this.agents.set(agent.name, agent);

    if (isDefault || this.agents.size === 1) {
      this.defaultAgent = agent.name;
    }

    console.log(`[AgentRegistry] Registered agent: ${agent.name}`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentName) {
    if (!this.agents.has(agentName)) {
      throw new Error(`Agent '${agentName}' is not registered`);
    }

    this.agents.delete(agentName);

    if (this.defaultAgent === agentName) {
      this.defaultAgent = this.agents.size > 0 ? this.agents.keys().next().value : null;
    }

    console.log(`[AgentRegistry] Unregistered agent: ${agentName}`);
  }

  /**
   * Get agent by name
   */
  get(agentName) {
    const agent = this.agents.get(agentName);
    
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found in registry`);
    }

    return agent;
  }

  /**
   * Get default agent
   */
  getDefault() {
    if (!this.defaultAgent) {
      throw new Error('No default agent set');
    }

    return this.get(this.defaultAgent);
  }

  /**
   * Set default agent
   */
  setDefault(agentName) {
    if (!this.agents.has(agentName)) {
      throw new Error(`Cannot set default: Agent '${agentName}' not found`);
    }

    this.defaultAgent = agentName;
  }

  /**
   * Check if agent exists
   */
  has(agentName) {
    return this.agents.has(agentName);
  }

  /**
   * Get all registered agent names
   */
  getAgentNames() {
    return Array.from(this.agents.keys());
  }

  /**
   * Get all registered agents
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Clear all agents
   */
  clear() {
    this.agents.clear();
    this.defaultAgent = null;
  }

  /**
   * Get agent by mode (convenience method)
   */
  getByMode(mode) {
    const modeMap = {
      'agent': 'executor',
      'plan': 'planner',
      'ask': 'ask',
      'fix': 'fixer'
    };

    const agentName = modeMap[mode?.toLowerCase()] || 'executor';
    
    if (this.has(agentName)) {
      return this.get(agentName);
    }

    // Fallback to default
    return this.getDefault();
  }

  /**
   * Initialize all agents
   */
  async initializeAll(context) {
    const agents = this.getAll();
    
    for (const agent of agents) {
      await agent.initialize(context);
    }
  }

  /**
   * Cleanup all agents
   */
  async cleanupAll(context) {
    const agents = this.getAll();
    
    for (const agent of agents) {
      await agent.cleanup(context);
    }
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();
