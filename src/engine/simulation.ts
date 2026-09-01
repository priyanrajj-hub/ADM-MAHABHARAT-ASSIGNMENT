/**
 * Simulation Orchestrator for the Chakravyūha Decision Simulator.
 *
 * Runs a complete trial: init state → loop (observe → act → transition) → final metrics.
 * Deterministic: same scenario + seed + decisions = byte-identical result.
 */

import type {
    ScenarioDefinition,
    Action,
    TrialRecord,
    DecisionRecord,
    SimulationState,
    TrialMetrics,
} from './types.js';
import { createPRNG } from './prng.js';
import { createInitialState, transition, buildObservation } from './transition.js';
import { computeAllMetrics } from './metrics.js';

/**
 * Runs a complete simulation trial.
 *
 * @param scenario - The scenario to simulate
 * @param seed - PRNG seed for deterministic randomness
 * @param actions - Ordered list of actions the player takes
 * @param options - Optional configuration
 * @returns A complete TrialRecord with decisions, final state, and metrics
 *
 * @example
 * ```ts
 * const record = runSimulation(tutorialScenario, 42, ['proceed', 'gather_info', 'proceed']);
 * console.log(record.metrics.decisionQuality); // deterministic result
 * ```
 */
export function runSimulation(
    scenario: ScenarioDefinition,
    seed: number,
    actions: Action[],
    options: {
        sessionId?: string;
        trialId?: string;
        decisionTimesMs?: number[];
    } = {}
): TrialRecord {
    const prng = createPRNG(seed);
    let state = createInitialState(scenario);
    const decisions: DecisionRecord[] = [];
    const startTime = Date.now();

    for (let i = 0; i < actions.length; i++) {
        if (state.terminated) break;

        const action = actions[i];
        const obs = buildObservation(state, scenario);
        const decisionTimeMs = options.decisionTimesMs?.[i] ?? 0;

        const riskBefore = state.riskLevel;
        const resourcesBefore = state.resources;

        const result = transition(state, scenario, action, prng);

        const record: DecisionRecord = {
            step: i,
            timestamp_ms: Date.now() - startTime,
            decision_time_ms: decisionTimeMs,
            stateId: state.stateId,
            layer: state.currentLayer,
            infoSeen: obs.knownInfo.map((k) => k.id),
            action,
            riskBefore,
            riskAfter: result.nextState.riskLevel,
            resourcesBefore,
            resourcesAfter: result.nextState.resources,
            terminal: result.terminated,
        };

        decisions.push(record);
        state = result.nextState;
    }

    // If all actions consumed but simulation not terminated, force completion
    if (!state.terminated) {
        state = {
            ...state,
            terminated: true,
            terminationReason: 'completed',
            outcomeScore: state.currentLayer / state.totalLayers * 0.5, // Partial score
        };
    }

    const metrics: TrialMetrics = computeAllMetrics(state, decisions, scenario);

    return {
        trialId: options.trialId ?? `trial_${seed}_${Date.now()}`,
        sessionId: options.sessionId ?? `session_${Date.now()}`,
        scenarioId: scenario.scenario_id,
        seed,
        decisions,
        finalState: state,
        metrics,
        startedAt: new Date(startTime).toISOString(),
        endedAt: new Date().toISOString(),
    };
}

/**
 * Runs the same decisions against a scenario with multiple perturbed seeds
 * to measure robustness (outcome stability under stochastic variation).
 *
 * @param scenario - The scenario to simulate
 * @param baseSeed - Starting seed
 * @param actions - Decision sequence to replay
 * @param perturbations - Number of perturbed trials to run (default: 5)
 * @returns Array of outcome scores from each perturbation
 */
export function runPerturbationTrials(
    scenario: ScenarioDefinition,
    baseSeed: number,
    actions: Action[],
    perturbations: number = 5
): number[] {
    const outcomes: number[] = [];

    for (let i = 0; i < perturbations; i++) {
        const trial = runSimulation(scenario, baseSeed + i, actions);
        outcomes.push(trial.finalState.outcomeScore ?? 0);
    }

    return outcomes;
}

/**
 * Produces a deterministic, reproducible result for a given scenario + seed + actions.
 * Strips non-deterministic fields (timestamps) so the output can be compared
 * byte-for-byte across runs.
 *
 * @param scenario - Scenario definition
 * @param seed - PRNG seed
 * @param actions - Decision sequence
 * @returns A JSON-serializable object that is byte-identical across runs
 */
export function reproducibleResult(
    scenario: ScenarioDefinition,
    seed: number,
    actions: Action[]
): object {
    const trial = runSimulation(scenario, seed, actions, {
        sessionId: 'deterministic',
        trialId: `repro_${seed}`,
    });

    // Strip non-deterministic fields
    return {
        scenarioId: trial.scenarioId,
        seed: trial.seed,
        decisions: trial.decisions.map((d) => ({
            step: d.step,
            stateId: d.stateId,
            layer: d.layer,
            infoSeen: d.infoSeen,
            action: d.action,
            riskBefore: d.riskBefore,
            riskAfter: d.riskAfter,
            resourcesBefore: d.resourcesBefore,
            resourcesAfter: d.resourcesAfter,
            terminal: d.terminal,
        })),
        finalState: {
            currentLayer: trial.finalState.currentLayer,
            stateId: trial.finalState.stateId,
            resources: trial.finalState.resources,
            timeRemaining: trial.finalState.timeRemaining,
            riskLevel: trial.finalState.riskLevel,
            cumulativeRisk: trial.finalState.cumulativeRisk,
            decisionCount: trial.finalState.decisionCount,
            revealedInfo: trial.finalState.revealedInfo,
            terminated: trial.finalState.terminated,
            terminationReason: trial.finalState.terminationReason,
            outcomeScore: trial.finalState.outcomeScore,
        },
        metrics: trial.metrics,
    };
}
