/**
 * Core type definitions for the Chakravyūha Decision Simulator.
 *
 * These types model the state space (S), action space (A), and
 * observation/information space (I) of the simulation engine.
 */

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

/** Built-in actions available in every scenario */
export type CoreAction = 'proceed' | 'gather_info' | 'change_strategy' | 'withdraw';

/** An action the player can take. Core actions + scenario-specific strings. */
export type Action = CoreAction | string;

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

/** A piece of hidden information that can be revealed */
export interface HiddenInfo {
    id: string;
    /** What layer this info pertains to */
    layer: number;
    /** Human-readable description of what's hidden */
    description: string;
    /** The actual value (hidden from the player until revealed) */
    value: unknown;
    /** Cost in resources to reveal this info */
    revealCost: number;
}

/** Full simulation state at time t */
export interface SimulationState {
    /** Current layer (0-indexed, advancing deeper into the Chakravyūha) */
    currentLayer: number;
    /** Total number of layers in this scenario */
    totalLayers: number;
    /** ID of the current state node within the layer */
    stateId: string;
    /** Available resource points (consumed by actions) */
    resources: number;
    /** Starting resources (for efficiency calculations) */
    maxResources: number;
    /** Time units remaining */
    timeRemaining: number;
    /** Starting time (for calculations) */
    maxTime: number;
    /** Current risk level [0, 1] */
    riskLevel: number;
    /** Cumulative risk exposure (sum of risk taken at each step) */
    cumulativeRisk: number;
    /** Number of decisions made so far */
    decisionCount: number;
    /** IDs of hidden info that has been revealed */
    revealedInfo: string[];
    /** IDs of all hidden info in the scenario */
    allHiddenInfoIds: string[];
    /** Whether the last decision was irreversible */
    lastDecisionIrreversible: boolean;
    /** Current strategy path (for change_strategy) */
    currentStrategy: string;
    /** Whether the simulation has ended */
    terminated: boolean;
    /** Termination reason if ended */
    terminationReason?: 'completed' | 'withdrew' | 'out_of_resources' | 'out_of_time' | 'failed';
    /** Final outcome score (set on termination) */
    outcomeScore?: number;
}

// ─────────────────────────────────────────────────────────────
// Observation / Information
// ─────────────────────────────────────────────────────────────

/** What the player can see at time t (partial view of state) */
export interface ObservationInfo {
    /** Current layer */
    currentLayer: number;
    totalLayers: number;
    stateId: string;
    /** Known info (revealed hidden info descriptions) */
    knownInfo: { id: string; description: string; value: unknown }[];
    /** Count of remaining unrevealed info */
    unknownCount: number;
    /** What the player knows about risk */
    visibleRiskLevel: number;
    resources: number;
    timeRemaining: number;
    /** Available actions for this state */
    availableActions: Action[];
    /** Whether current decisions are irreversible */
    decisionsIrreversible: boolean;
}

// ─────────────────────────────────────────────────────────────
// Transition
// ─────────────────────────────────────────────────────────────

/** Result of applying an action to a state */
export interface TransitionResult {
    /** The next state */
    nextState: SimulationState;
    /** What the player observes after the transition */
    observation: ObservationInfo;
    /** Narrative description of what happened */
    narrative: string;
    /** Whether this transition ended the simulation */
    terminated: boolean;
}

// ─────────────────────────────────────────────────────────────
// Scenario Definition (JSON-serializable)
// ─────────────────────────────────────────────────────────────

/** A transition rule defined in scenario JSON */
export interface TransitionRule {
    /** State ID this rule applies from */
    fromState: string;
    /** Action that triggers this rule */
    action: Action;
    /** State ID to transition to */
    toState: string;
    /** Layer to move to (if different) */
    toLayer?: number;
    /** Resource cost of this action */
    resourceCost: number;
    /** Time cost of this action */
    timeCost: number;
    /** Risk modification (added to current risk) */
    riskDelta: number;
    /** Whether this transition is irreversible */
    irreversible: boolean;
    /** Probability of this outcome (used by PRNG when multiple rules match) */
    probability?: number;
    /** Narrative text for this transition */
    narrative: string;
}

/** Outcome definition in a scenario */
export interface OutcomeDefinition {
    /** State ID that triggers this outcome */
    stateId: string;
    /** Score for reaching this outcome [0, 1] */
    score: number;
    /** Description */
    description: string;
    /** Whether this is a "success" outcome */
    success: boolean;
}

/** Strategy paths available in a scenario */
export interface StrategyDefinition {
    id: string;
    name: string;
    description: string;
}

/** State node definition in a scenario */
export interface StateDefinition {
    id: string;
    layer: number;
    name: string;
    description: string;
    /** Actions available in this state */
    availableActions: Action[];
    /** Whether decisions in this state are irreversible */
    irreversible: boolean;
}

/**
 * Complete scenario definition loaded from JSON.
 *
 * Fields: scenario_id, title, layers, states, actions, hidden_information,
 * risk_level, uncertainty_level, resources, time_limit, information_cost,
 * transition_rules, outcomes, seed.
 */
export interface ScenarioDefinition {
    scenario_id: string;
    title: string;
    description: string;
    /** Number of layers in the scenario */
    layers: number;
    /** State graph */
    states: StateDefinition[];
    /** Scenario-specific actions beyond core actions */
    actions: Action[];
    /** Hidden information available in this scenario */
    hidden_information: HiddenInfo[];
    /** Base risk level [0, 1] */
    risk_level: number;
    /** Uncertainty level [0, 1] — higher means more hidden info */
    uncertainty_level: number;
    /** Starting resource points */
    resources: number;
    /** Time limit in decision units */
    time_limit: number;
    /** Base cost to gather information */
    information_cost: number;
    /** Transition rules */
    transition_rules: TransitionRule[];
    /** Possible outcomes */
    outcomes: OutcomeDefinition[];
    /** Available strategies */
    strategies: StrategyDefinition[];
    /** Reference policy decisions (hand-authored best-known path).
     *  Labeled as "reference policy" not "optimal" — see methodology docs. */
    reference_policy?: Action[];
    /** Reference policy expected score (best-known, not proven optimal) */
    reference_score?: number;
    /** Default seed for reproducibility */
    seed: number;
}

// ─────────────────────────────────────────────────────────────
// Decision Record (event logging)
// ─────────────────────────────────────────────────────────────

/** A single decision recorded during a trial */
export interface DecisionRecord {
    /** Monotonic step index */
    step: number;
    /** Timestamp (ms since trial start) */
    timestamp_ms: number;
    /** Decision time: how long the player took (ms). 0 for automated runs. */
    decision_time_ms: number;
    /** State before the action */
    stateId: string;
    /** Layer at time of decision */
    layer: number;
    /** What the player could see */
    infoSeen: string[];
    /** Action taken */
    action: Action;
    /** Risk level before action */
    riskBefore: number;
    /** Risk level after action */
    riskAfter: number;
    /** Resources before action */
    resourcesBefore: number;
    /** Resources after action */
    resourcesAfter: number;
    /** Whether this triggered a terminal outcome */
    terminal: boolean;
}

// ─────────────────────────────────────────────────────────────
// Trial Record
// ─────────────────────────────────────────────────────────────

/** Computed metrics for a completed trial */
export interface TrialMetrics {
    decisionQuality: number;
    riskExposure: number;
    informationEfficiency: number;
    regret: number;
    robustness: number;
    decisionTime: number;
    resourceEfficiency: number;
    taskCompletion: number;
}

/** Full record of a completed trial */
export interface TrialRecord {
    /** Unique trial ID */
    trialId: string;
    /** Session ID (anonymous) */
    sessionId: string;
    /** Scenario used */
    scenarioId: string;
    /** Seed used for this trial */
    seed: number;
    /** Ordered list of decisions */
    decisions: DecisionRecord[];
    /** Final state */
    finalState: SimulationState;
    /** Computed metrics */
    metrics: TrialMetrics;
    /** Trial start timestamp */
    startedAt: string;
    /** Trial end timestamp */
    endedAt: string;
}
