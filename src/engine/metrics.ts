/**
 * Metrics Module for the Chakravyūha Decision Simulator.
 *
 * Each metric is a pure function with documented formula, inputs, output range,
 * and interpretation. All metrics return values in [0, 1], explicitly clamped.
 *
 * IMPORTANT DESIGN NOTE: `decisionQuality` and `regret` use a "reference policy"
 * (hand-authored best-known path per scenario), NOT a mathematically proven optimum.
 * This is documented here and in methodology.md. The reference score is a
 * benchmark, not an oracle — it may not be the true maximum achievable score.
 */

import type { SimulationState, DecisionRecord, ScenarioDefinition } from './types.js';

/** Clamp a value to [0, 1]. Prevents pathological inputs from producing out-of-range metrics. */
function clamp01(value: number): number {
    if (!isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

/**
 * Decision Quality
 *
 * @formula actual_outcome / reference_score
 * @inputs  finalState.outcomeScore, scenario.reference_score
 * @output  [0, 1] — 1.0 means matched or exceeded the reference policy
 * @interpretation Higher = better decisions relative to the reference policy.
 *   NOTE: The reference policy is a hand-authored best-known path, not a
 *   mathematically proven optimum. A score of 1.0 means "as good as the
 *   reference," not "optimal."
 */
export function decisionQuality(
    finalState: SimulationState,
    scenario: ScenarioDefinition
): number {
    const actual = finalState.outcomeScore ?? 0;
    const reference = scenario.reference_score ?? 1;
    if (reference <= 0) return clamp01(actual);
    return clamp01(actual / reference);
}

/**
 * Risk Exposure
 *
 * @formula cumulativeRisk / (decisionCount * maxPossibleRiskPerStep)
 * @inputs  finalState.cumulativeRisk, finalState.decisionCount
 * @output  [0, 1] — 1.0 means maximum risk taken at every step
 * @interpretation Higher = more risk taken over the course of the trial.
 *   Useful for comparing risk attitudes across participants.
 */
export function riskExposure(finalState: SimulationState): number {
    const maxRiskPerStep = 1.0; // Risk level is [0,1], so max added per step ~ 1
    const maxPossible = finalState.decisionCount * maxRiskPerStep;
    if (maxPossible <= 0) return 0;
    return clamp01(finalState.cumulativeRisk / maxPossible);
}

/**
 * Information Efficiency
 *
 * @formula (outcomeScore * infoFractionUsed) / (infoGatherActions / totalActions)
 *   Simplified: quality per unit of info-gathering effort.
 * @inputs  finalState.outcomeScore, revealedInfo count, total hidden info count,
 *          number of gather_info actions, total actions
 * @output  [0, 1] — 1.0 means best outcome with minimal information gathering
 * @interpretation Higher = achieved good outcomes without excessive info gathering.
 *   Low values suggest either over-investing in intelligence or failing to use
 *   gathered info effectively.
 */
export function informationEfficiency(
    finalState: SimulationState,
    decisions: DecisionRecord[]
): number {
    const outcome = finalState.outcomeScore ?? 0;
    const gatherActions = decisions.filter((d) => d.action === 'gather_info').length;
    const totalActions = decisions.length;

    if (totalActions === 0) return 0;

    // If no gather_info actions, efficiency is just outcome quality
    if (gatherActions === 0) return clamp01(outcome);

    // Ratio of useful actions (non-gather) to total
    const actionEfficiency = (totalActions - gatherActions) / totalActions;

    // Combined: good outcome * efficient info use
    return clamp01(outcome * (0.5 + 0.5 * actionEfficiency));
}

/**
 * Regret
 *
 * @formula 1 - (actual_outcome / reference_score)
 * @inputs  finalState.outcomeScore, scenario.reference_score
 * @output  [0, 1] — 0 = no regret (matched reference), 1 = maximum regret
 * @interpretation Higher regret = larger gap between actual and reference
 *   policy outcome. NOTE: "reference" is a hand-authored best-known policy,
 *   not a proven optimum. Regret is measured against this benchmark.
 */
export function regret(
    finalState: SimulationState,
    scenario: ScenarioDefinition
): number {
    const quality = decisionQuality(finalState, scenario);
    return clamp01(1 - quality);
}

/**
 * Robustness
 *
 * @formula 1 - standardDeviation(outcomes) / maxPossibleSD
 *   Requires multiple trial outcomes from perturbed seeds.
 *   For a single trial, returns the outcome score as a proxy (high score → likely robust).
 * @inputs  outcomes: number[] — array of outcome scores from perturbation trials
 * @output  [0, 1] — 1.0 = perfectly consistent outcomes across perturbations
 * @interpretation Higher = more stable outcomes despite stochastic variation.
 *   Perturbation mechanism: same decisions replayed with seeds [seed, seed+1, ..., seed+n].
 *   For single-trial measurement, this returns the outcome as a rough proxy.
 */
export function robustness(outcomes: number[]): number {
    if (outcomes.length <= 1) {
        // Single trial: return outcome score as proxy, or 0.5 (neutral) if no data
        return clamp01(outcomes[0] ?? 0.5);
    }

    const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
    const variance =
        outcomes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / outcomes.length;
    const sd = Math.sqrt(variance);

    // Max possible SD for values in [0,1] is 0.5 (all values at extremes)
    const maxSD = 0.5;
    return clamp01(1 - sd / maxSD);
}

/**
 * Decision Time (normalized)
 *
 * @formula 1 - (mean_decision_time / max_allowed_time_per_decision)
 *   For automated runs (decision_time_ms = 0), returns 1.0 (instant decisions).
 * @inputs  decisions[].decision_time_ms, scenario.time_limit (as proxy for max)
 * @output  [0, 1] — 1.0 = fastest possible decisions, 0 = slowest
 * @interpretation Higher = faster decision-making. Useful for studying
 *   deliberation time under uncertainty. Value of 1.0 for automated/programmatic
 *   runs (decision_time_ms = 0).
 */
export function decisionTime(
    decisions: DecisionRecord[],
    maxDecisionTimeMs: number = 30000
): number {
    if (decisions.length === 0) return 1;

    const totalTime = decisions.reduce((sum, d) => sum + d.decision_time_ms, 0);
    const meanTime = totalTime / decisions.length;

    // Automated runs: instant
    if (meanTime === 0) return 1;

    return clamp01(1 - meanTime / maxDecisionTimeMs);
}

/**
 * Resource Efficiency
 *
 * @formula outcomeScore * (1 - resourcesSpent / maxResources)
 * @inputs  finalState.outcomeScore, resources spent, maxResources
 * @output  [0, 1] — 1.0 = best outcome with no resources spent
 * @interpretation Higher = achieved good outcomes while conserving resources.
 *   Balances outcome quality against resource expenditure.
 */
export function resourceEfficiency(finalState: SimulationState): number {
    const outcome = finalState.outcomeScore ?? 0;
    const spent = finalState.maxResources - finalState.resources;
    const spentFraction = finalState.maxResources > 0 ? spent / finalState.maxResources : 1;

    // Weighted: 70% outcome, 30% conservation
    return clamp01(outcome * 0.7 + (1 - spentFraction) * 0.3);
}

/**
 * Task Completion
 *
 * @formula Graded score based on termination reason:
 *   completed+success → outcomeScore,
 *   completed+fail → outcomeScore * 0.5,
 *   withdrew → layerProgress * 0.3,
 *   out_of_resources → 0.1,
 *   out_of_time → 0.15,
 *   no termination → 0
 * @inputs  finalState.terminated, finalState.terminationReason, finalState.outcomeScore
 * @output  [0, 1] — 1.0 = full successful completion
 * @interpretation Higher = more complete execution of the scenario objective.
 */
export function taskCompletion(finalState: SimulationState): number {
    if (!finalState.terminated) return 0;

    switch (finalState.terminationReason) {
        case 'completed':
            return clamp01(finalState.outcomeScore ?? 0.5);
        case 'failed':
            return clamp01((finalState.outcomeScore ?? 0) * 0.5);
        case 'withdrew': {
            const progress = finalState.currentLayer / finalState.totalLayers;
            return clamp01(progress * 0.3);
        }
        case 'out_of_resources':
            return 0.1;
        case 'out_of_time':
            return 0.15;
        default:
            return 0;
    }
}

/**
 * Computes all metrics for a completed trial.
 */
export function computeAllMetrics(
    finalState: SimulationState,
    decisions: DecisionRecord[],
    scenario: ScenarioDefinition,
    perturbationOutcomes?: number[]
) {
    return {
        decisionQuality: decisionQuality(finalState, scenario),
        riskExposure: riskExposure(finalState),
        informationEfficiency: informationEfficiency(finalState, decisions),
        regret: regret(finalState, scenario),
        robustness: robustness(perturbationOutcomes ?? [finalState.outcomeScore ?? 0]),
        decisionTime: decisionTime(decisions),
        resourceEfficiency: resourceEfficiency(finalState),
        taskCompletion: taskCompletion(finalState),
    };
}
