import { AgentContext } from './core/AgentContext';
import { agentRegistry } from './core/AgentRegistry';
import { ExecutorAgent } from './agents/ExecutorAgent';
import { PlannerAgent } from './agents/PlannerAgent';
import { AskAgent } from './agents/AskAgent';
import { FixerAgent } from './agents/FixerAgent';
import { Logger } from './observability/Logger';
import { Metrics } from './observability/Metrics';
import { Tracer } from './observability/Tracer';
import { SessionManager } from './persistence/SessionManager';
import { OperationLog } from './persistence/OperationLog';
import { UndoRedoStack } from './persistence/UndoRedoStack';
import { ErrorHandler } from './reliability/ErrorHandler';
import { RetryPolicy } from './reliability/RetryPolicy';
import { CircuitBreaker } from './reliability/CircuitBreaker';
import { FallbackManager } from './reliability/FallbackManager';
import { indexer } from '../indexer';

/**
 * Initialize agent system
 */
function initializeAgentSystem() {
  const logger = new Logger({ level: 'info', prefix: '[Agent]', enabled: true });
  const metrics = new Metrics({ enabled: true });
  const tracer = new Tracer({ enabled: true });
  const sessionManager = new SessionManager({ logger });
  const operationLog = new OperationLog({ logger });
  const undoRedoStack = new UndoRedoStack({ logger });
  const errorHandler = new ErrorHandler({ logger, metrics });
  const retryPolicy = RetryPolicy.getPolicy('STANDARD', logger);
  const circuitBreaker = new CircuitBreaker({ logger });
  const fallbackManager = new FallbackManager({ logger });
  
  agentRegistry.register(new ExecutorAgent(), true);
  agentRegistry.register(new PlannerAgent());
  agentRegistry.register(new AskAgent());
  agentRegistry.register(new FixerAgent());
  
  logger.info('Agent system initialized', {
    agents: agentRegistry.getAgentNames(),
    defaultAgent: agentRegistry.defaultAgent
  });
  
  return { logger, metrics, tracer, sessionManager, operationLog, undoRedoStack, errorHandler, retryPolicy, circuitBreaker, fallbackManager };
}

const subsystems = initializeAgentSystem();

/**
 * Main entry point - routes to appropriate agent based on mode
 */
export async function runAgentTurn({
  messages,
  settings,
  workspacePath,
  activeFile,
  activeFileContent,
  mode = 'agent',
  onToken,
  onToolCall,
  onToolResult,
  onThinkingToken,
  onIterationUpdate,
  onDone,
  signal
}) {
  const { logger, metrics, tracer, sessionManager } = subsystems;
  
  const context = new AgentContext({
    workspacePath, activeFile, activeFileContent, settings, messages,
    indexer, logger, metrics, sessionManager
  });
  
  // Wrap onThinkingToken with logging
  const wrappedOnThinkingToken = onThinkingToken ? (token) => {
    if (token === '__START__') {
      console.log('[Agent] 🧠 Thinking started');
    } else if (token === '__END__') {
      console.log('[Agent] ✅ Thinking completed');
    } else {
      console.log('[Agent] 💭 Thinking token received (length:', token.length, ')');
    }
    onThinkingToken(token);
  } : null;
  
  context.setCallbacks({ onToken, onToolCall, onToolResult, onThinkingToken: wrappedOnThinkingToken, onIterationUpdate, onDone });
  context.setAbortSignal(signal);
  
  let agent;
  try {
    agent = agentRegistry.getByMode(mode);
    logger.info(`Selected agent: ${agent.name} for mode: ${mode}`);
  } catch (error) {
    logger.error('Failed to get agent', error);
    agent = agentRegistry.getDefault();
    logger.warn(`Falling back to default agent: ${agent.name}`);
  }
  
  const spanId = tracer.startSpan('agent_execution', {
    agent: agent.name, mode, workspacePath, messageCount: messages.length
  });
  
  try {
    logger.info(`Starting agent execution: ${agent.name}`);
    const result = await agent.execute(context);
    tracer.endSpan(spanId, 'success', result);
    return result;
  } catch (error) {
    logger.error(`Agent execution failed: ${agent.name}`, error);
    tracer.endSpan(spanId, 'error', error);
    throw error;
  }
}

export function getAgentSystemStatus() {
  return {
    agents: agentRegistry.getAgentNames(),
    defaultAgent: agentRegistry.defaultAgent,
    metrics: subsystems.metrics.getSummary(),
    logs: subsystems.logger.getLogs({ limit: 100 }),
    traces: subsystems.tracer.getTraces({ limit: 50 }),
    sessions: subsystems.sessionManager.getStats(),
    operations: subsystems.operationLog.getStats(),
    undoRedo: subsystems.undoRedoStack.getStats()
  };
}

export async function saveAgentSession(sessionData) {
  return await subsystems.sessionManager.saveSession(sessionData);
}

export async function loadAgentSession(sessionId) {
  return await subsystems.sessionManager.loadSession(sessionId);
}

export function getAllAgentSessions() {
  return subsystems.sessionManager.getAllSessions();
}

export async function undoLastOperation() {
  return await subsystems.undoRedoStack.undo();
}

export async function redoLastOperation() {
  return await subsystems.undoRedoStack.redo();
}

export function getUndoRedoStatus() {
  return {
    canUndo: subsystems.undoRedoStack.canUndo(),
    canRedo: subsystems.undoRedoStack.canRedo(),
    undoStack: subsystems.undoRedoStack.getUndoStack(),
    redoStack: subsystems.undoRedoStack.getRedoStack()
  };
}

export function clearAgentSystemData() {
  subsystems.logger.clearLogs();
  subsystems.metrics.reset();
  subsystems.tracer.clearTraces();
}

export { subsystems, agentRegistry };
