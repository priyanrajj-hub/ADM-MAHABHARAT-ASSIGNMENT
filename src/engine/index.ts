/**
 * Chakravyūha Decision Simulator — Engine barrel export.
 */

export type {
    SimulationState,
    ObservationInfo,
    TransitionResult,
    ScenarioDefinition,
    Action,
    CoreAction,
    DecisionRecord,
    TrialRecord,
    TrialMetrics,
    HiddenInfo,
    TransitionRule,
    OutcomeDefinition,
    StrategyDefinition,
    StateDefinition,
} from './types.js';

export { createPRNG } from './prng.js';
export type { PRNG } from './prng.js';

export { createInitialState, transition, buildObservation } from './transition.js';

export {
    decisionQuality,
    riskExposure,
    informationEfficiency,
    regret,
    robustness,
    decisionTime,
    resourceEfficiency,
    taskCompletion,
    computeAllMetrics,
} from './metrics.js';

export { runSimulation, runPerturbationTrials, reproducibleResult } from './simulation.js';

export { scenarios, getScenario, listScenarios } from './scenarios.js';
