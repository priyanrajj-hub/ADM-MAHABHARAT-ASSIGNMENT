/**
 * Transition Engine for the Chakravyūha Decision Simulator.
 *
 * Pure function: transition(state, scenario, action, prng) → TransitionResult
 *
 * Handles: resource cost, time decrement, risk modification, info reveal,
 * and edge cases (zero resources → forced outcome, zero time → forced outcome,
 * gather_info on fully-revealed state → no-op that wastes resources,
 * invalid actions → Error).
 */

import type {
    SimulationState,
    ObservationInfo,
    TransitionResult,
    ScenarioDefinition,
    Action,
    TransitionRule,
    HiddenInfo,
} from './types.js';
import type { PRNG } from './prng.js';

/**
 * Creates the initial state for a scenario.
 */
export function createInitialState(scenario: ScenarioDefinition): SimulationState {
    const startState = scenario.states[0];
    if (!startState) throw new Error(`Scenario ${scenario.scenario_id} has no states`);

    return {
        currentLayer: 0,
        totalLayers: scenario.layers,
        stateId: startState.id,
        resources: scenario.resources,
        maxResources: scenario.resources,
        timeRemaining: scenario.time_limit,
        maxTime: scenario.time_limit,
        riskLevel: scenario.risk_level,
        cumulativeRisk: 0,
        decisionCount: 0,
        revealedInfo: [],
        allHiddenInfoIds: scenario.hidden_information.map((h) => h.id),
        lastDecisionIrreversible: false,
        currentStrategy: scenario.strategies[0]?.id ?? 'default',
        terminated: false,
    };
}

/**
 * Builds the observation (partial state view) from current state and scenario.
 */
export function buildObservation(
    state: SimulationState,
    scenario: ScenarioDefinition
): ObservationInfo {
    const currentStateDef = scenario.states.find((s) => s.id === state.stateId);
    const revealedDetails = scenario.hidden_information
        .filter((h) => state.revealedInfo.includes(h.id))
        .map((h) => ({ id: h.id, description: h.description, value: h.value }));

    const unrevealed = state.allHiddenInfoIds.filter(
        (id) => !state.revealedInfo.includes(id)
    );

    // Determine available actions
    const availableActions: Action[] = [];
    if (currentStateDef) {
        for (const action of currentStateDef.availableActions) {
            // Filter out actions that are impossible given current state
            if (action === 'gather_info' && unrevealed.length === 0) {
                // No hidden info left — still list it, but it'll be a no-op (wastes resources)
                availableActions.push(action);
            } else {
                availableActions.push(action);
            }
        }
    }

    return {
        currentLayer: state.currentLayer,
        totalLayers: state.totalLayers,
        stateId: state.stateId,
        knownInfo: revealedDetails,
        unknownCount: unrevealed.length,
        visibleRiskLevel: state.riskLevel,
        resources: state.resources,
        timeRemaining: state.timeRemaining,
        availableActions,
        decisionsIrreversible: currentStateDef?.irreversible ?? false,
    };
}

/**
 * Checks if the state forces termination (out of resources or time).
 */
function checkForcedTermination(state: SimulationState): SimulationState {
    if (state.terminated) return state;

    if (state.resources <= 0) {
        return {
            ...state,
            resources: 0,
            terminated: true,
            terminationReason: 'out_of_resources',
            outcomeScore: 0.1, // Minimal score for running out
        };
    }

    if (state.timeRemaining <= 0) {
        return {
            ...state,
            timeRemaining: 0,
            terminated: true,
            terminationReason: 'out_of_time',
            outcomeScore: 0.15, // Slightly above zero for running out of time
        };
    }

    return state;
}

/**
 * Finds matching transition rules for a given state + action.
 */
function findMatchingRules(
    scenario: ScenarioDefinition,
    stateId: string,
    action: Action
): TransitionRule[] {
    return scenario.transition_rules.filter(
        (r) => r.fromState === stateId && r.action === action
    );
}

/**
 * Selects a transition rule from matching rules using PRNG.
 * If rules have probabilities, weights by those; otherwise picks uniformly.
 */
function selectRule(rules: TransitionRule[], prng: PRNG): TransitionRule {
    if (rules.length === 1) return rules[0];

    // Check if probabilities are defined
    const hasProbabilities = rules.every((r) => r.probability !== undefined);

    if (hasProbabilities) {
        const roll = prng.next();
        let cumulative = 0;
        for (const rule of rules) {
            cumulative += rule.probability!;
            if (roll < cumulative) return rule;
        }
        return rules[rules.length - 1]; // Fallback
    }

    // Uniform random selection
    return rules[prng.nextInt(0, rules.length - 1)];
}

/**
 * Handles the 'gather_info' action.
 * If no hidden info remains, this is a no-op that still costs resources.
 */
function handleGatherInfo(
    state: SimulationState,
    scenario: ScenarioDefinition,
    prng: PRNG
): { nextState: SimulationState; narrative: string } {
    const unrevealed = scenario.hidden_information.filter(
        (h) => !state.revealedInfo.includes(h.id)
    );

    const cost = scenario.information_cost;

    if (unrevealed.length === 0) {
        // No-op: wastes resources, reveals nothing
        return {
            nextState: {
                ...state,
                resources: state.resources - cost,
                timeRemaining: state.timeRemaining - 1,
                decisionCount: state.decisionCount + 1,
            },
            narrative:
                'You search for more information but find nothing new. All available intelligence has already been gathered. Resources were spent in the attempt.',
        };
    }

    // Pick a random unrevealed piece of info
    const toReveal: HiddenInfo = prng.pick(unrevealed);
    const actualCost = toReveal.revealCost > 0 ? toReveal.revealCost : cost;

    return {
        nextState: {
            ...state,
            resources: state.resources - actualCost,
            timeRemaining: state.timeRemaining - 1,
            revealedInfo: [...state.revealedInfo, toReveal.id],
            decisionCount: state.decisionCount + 1,
        },
        narrative: `Intelligence gathered: ${toReveal.description}`,
    };
}

/**
 * Handles the 'withdraw' action.
 */
function handleWithdraw(state: SimulationState): {
    nextState: SimulationState;
    narrative: string;
} {
    const progressFraction = state.currentLayer / state.totalLayers;
    const withdrawScore = progressFraction * 0.3; // Partial credit for progress

    return {
        nextState: {
            ...state,
            terminated: true,
            terminationReason: 'withdrew',
            outcomeScore: withdrawScore,
            decisionCount: state.decisionCount + 1,
        },
        narrative: `You chose to withdraw after reaching layer ${state.currentLayer} of ${state.totalLayers}. A cautious decision that preserves remaining resources.`,
    };
}

/**
 * Handles the 'change_strategy' action.
 */
function handleChangeStrategy(
    state: SimulationState,
    scenario: ScenarioDefinition,
    prng: PRNG
): { nextState: SimulationState; narrative: string } {
    const otherStrategies = scenario.strategies.filter(
        (s) => s.id !== state.currentStrategy
    );

    if (otherStrategies.length === 0) {
        return {
            nextState: {
                ...state,
                timeRemaining: state.timeRemaining - 1,
                decisionCount: state.decisionCount + 1,
            },
            narrative: 'No alternative strategies available. Time was spent reconsidering.',
        };
    }

    const newStrategy = prng.pick(otherStrategies);
    return {
        nextState: {
            ...state,
            currentStrategy: newStrategy.id,
            timeRemaining: state.timeRemaining - 1,
            resources: state.resources - 1, // Small cost for strategic pivot
            decisionCount: state.decisionCount + 1,
        },
        narrative: `Strategy changed to: ${newStrategy.name}. ${newStrategy.description}`,
    };
}

/**
 * Core transition function.
 *
 * transition(state, scenario, action, prng) → TransitionResult
 *
 * @param state - Current simulation state S_t
 * @param scenario - The scenario definition
 * @param action - Action chosen by the player
 * @param prng - Seeded PRNG for deterministic randomness
 * @returns TransitionResult with next state and observation
 *
 * @throws Error if:
 *   - The state is already terminated
 *   - The action is not available in the current state
 */
export function transition(
    state: SimulationState,
    scenario: ScenarioDefinition,
    action: Action,
    prng: PRNG
): TransitionResult {
    // ── Guard: already terminated ──
    if (state.terminated) {
        throw new Error(
            `Cannot transition from terminated state (reason: ${state.terminationReason})`
        );
    }

    // ── Guard: validate action is available ──
    const currentStateDef = scenario.states.find((s) => s.id === state.stateId);
    if (!currentStateDef) {
        throw new Error(`State ${state.stateId} not found in scenario ${scenario.scenario_id}`);
    }

    if (!currentStateDef.availableActions.includes(action)) {
        throw new Error(
            `Action "${action}" is not available in state "${state.stateId}". ` +
            `Available: [${currentStateDef.availableActions.join(', ')}]`
        );
    }

    let nextState: SimulationState;
    let narrative: string;

    // ── Handle special actions ──
    switch (action) {
        case 'gather_info': {
            const result = handleGatherInfo(state, scenario, prng);
            nextState = result.nextState;
            narrative = result.narrative;
            break;
        }
        case 'withdraw': {
            const result = handleWithdraw(state);
            nextState = result.nextState;
            narrative = result.narrative;
            break;
        }
        case 'change_strategy': {
            const result = handleChangeStrategy(state, scenario, prng);
            nextState = result.nextState;
            narrative = result.narrative;
            break;
        }
        case 'proceed':
        default: {
            // Use transition rules from scenario
            const rules = findMatchingRules(scenario, state.stateId, action);

            if (rules.length === 0) {
                throw new Error(
                    `No transition rules found for state "${state.stateId}" + action "${action}" ` +
                    `in scenario "${scenario.scenario_id}"`
                );
            }

            const rule = selectRule(rules, prng);

            // Check if we've reached an outcome state
            const outcome = scenario.outcomes.find((o) => o.stateId === rule.toState);

            nextState = {
                ...state,
                stateId: rule.toState,
                currentLayer: rule.toLayer ?? state.currentLayer + 1,
                resources: state.resources - rule.resourceCost,
                timeRemaining: state.timeRemaining - rule.timeCost,
                riskLevel: Math.max(0, Math.min(1, state.riskLevel + rule.riskDelta)),
                cumulativeRisk: state.cumulativeRisk + Math.abs(rule.riskDelta) + state.riskLevel * 0.1,
                lastDecisionIrreversible: rule.irreversible,
                decisionCount: state.decisionCount + 1,
                terminated: outcome !== undefined,
                terminationReason: outcome ? (outcome.success ? 'completed' : 'failed') : undefined,
                outcomeScore: outcome?.score,
            };

            narrative = rule.narrative;
            if (outcome) {
                narrative += ` — ${outcome.description}`;
            }
            break;
        }
    }

    // ── Check forced termination (resources/time exhaustion) ──
    nextState = checkForcedTermination(nextState);

    // ── Build observation ──
    const observation = buildObservation(nextState, scenario);

    return {
        nextState,
        observation,
        narrative,
        terminated: nextState.terminated,
    };
}
