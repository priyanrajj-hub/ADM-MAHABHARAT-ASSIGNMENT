import { describe, it, expect } from 'vitest';
import type { SimulationState, DecisionRecord, ScenarioDefinition } from '../engine/types.js';
import {
    decisionQuality,
    riskExposure,
    informationEfficiency,
    regret,
    robustness,
    decisionTime,
    resourceEfficiency,
    taskCompletion,
    computeAllMetrics,
} from '../engine/metrics.js';

// ─── Test fixtures ──────────────────────────────────────────

const baseScenario: Pick<ScenarioDefinition, 'reference_score'> = {
    reference_score: 1.0,
};

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
    return {
        currentLayer: 3,
        totalLayers: 5,
        stateId: 'test',
        resources: 10,
        maxResources: 20,
        timeRemaining: 5,
        maxTime: 15,
        riskLevel: 0.3,
        cumulativeRisk: 1.2,
        decisionCount: 5,
        revealedInfo: ['h1'],
        allHiddenInfoIds: ['h1', 'h2', 'h3'],
        lastDecisionIrreversible: false,
        currentStrategy: 'default',
        terminated: true,
        terminationReason: 'completed',
        outcomeScore: 0.8,
        ...overrides,
    };
}

function makeDecisions(count: number, options: Partial<DecisionRecord> = {}): DecisionRecord[] {
    return Array.from({ length: count }, (_, i) => ({
        step: i,
        timestamp_ms: i * 1000,
        decision_time_ms: options.decision_time_ms ?? 0,
        stateId: `s${i}`,
        layer: i,
        infoSeen: [],
        action: options.action ?? 'proceed',
        riskBefore: 0.2,
        riskAfter: 0.3,
        resourcesBefore: 20 - i * 3,
        resourcesAfter: 20 - (i + 1) * 3,
        terminal: i === count - 1,
        ...options,
    }));
}

// ─── Tests ──────────────────────────────────────────────────

describe('Metrics Module', () => {
    describe('All metrics return values in [0, 1]', () => {
        const states = [
            makeState({ outcomeScore: 0 }),
            makeState({ outcomeScore: 0.5 }),
            makeState({ outcomeScore: 1.0 }),
            makeState({ outcomeScore: 1.5 }), // Pathological: above 1
            makeState({ outcomeScore: -0.5 }), // Pathological: below 0
            makeState({ decisionCount: 0, cumulativeRisk: 0 }),
        ];

        for (const state of states) {
            it(`decisionQuality is in [0,1] for outcomeScore=${state.outcomeScore}`, () => {
                const v = decisionQuality(state, baseScenario as ScenarioDefinition);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });

            it(`riskExposure is in [0,1] for decisionCount=${state.decisionCount}`, () => {
                const v = riskExposure(state);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });

            it(`resourceEfficiency is in [0,1] for outcomeScore=${state.outcomeScore}`, () => {
                const v = resourceEfficiency(state);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });

            it(`taskCompletion is in [0,1] for reason=${state.terminationReason}`, () => {
                const v = taskCompletion(state);
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            });
        }
    });

    describe('decisionQuality()', () => {
        it('returns 0.8 for score=0.8 against reference=1.0', () => {
            const state = makeState({ outcomeScore: 0.8 });
            expect(decisionQuality(state, baseScenario as ScenarioDefinition)).toBeCloseTo(0.8);
        });

        it('clamps to 1.0 if score exceeds reference', () => {
            const state = makeState({ outcomeScore: 1.5 });
            expect(decisionQuality(state, baseScenario as ScenarioDefinition)).toBe(1);
        });

        it('returns 0 for undefined outcome', () => {
            const state = makeState({ outcomeScore: undefined });
            expect(decisionQuality(state, baseScenario as ScenarioDefinition)).toBe(0);
        });
    });

    describe('riskExposure()', () => {
        it('returns 0 for zero decisions', () => {
            const state = makeState({ decisionCount: 0, cumulativeRisk: 0 });
            expect(riskExposure(state)).toBe(0);
        });

        it('returns proportional value for moderate risk', () => {
            const state = makeState({ decisionCount: 5, cumulativeRisk: 2.5 });
            const v = riskExposure(state);
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThanOrEqual(1);
        });
    });

    describe('informationEfficiency()', () => {
        it('returns outcome for zero gather_info actions', () => {
            const state = makeState({ outcomeScore: 0.7 });
            const decisions = makeDecisions(5, { action: 'proceed' });
            expect(informationEfficiency(state, decisions)).toBeCloseTo(0.7);
        });

        it('returns 0 for empty decisions', () => {
            const state = makeState();
            expect(informationEfficiency(state, [])).toBe(0);
        });

        it('penalizes excessive gathering', () => {
            const state = makeState({ outcomeScore: 0.5 });
            const allGather = makeDecisions(5, { action: 'gather_info' });
            const mixedDecisions = [
                ...makeDecisions(2, { action: 'gather_info' }),
                ...makeDecisions(3, { action: 'proceed' }),
            ];
            const allGatherEff = informationEfficiency(state, allGather);
            const mixedEff = informationEfficiency(state, mixedDecisions);
            expect(mixedEff).toBeGreaterThan(allGatherEff);
        });
    });

    describe('regret()', () => {
        it('returns 0 when quality equals reference', () => {
            const state = makeState({ outcomeScore: 1.0 });
            expect(regret(state, baseScenario as ScenarioDefinition)).toBe(0);
        });

        it('returns 0.5 when quality is half of reference', () => {
            const state = makeState({ outcomeScore: 0.5 });
            expect(regret(state, baseScenario as ScenarioDefinition)).toBeCloseTo(0.5);
        });
    });

    describe('robustness()', () => {
        it('returns 1.0 for identical outcomes', () => {
            expect(robustness([0.8, 0.8, 0.8, 0.8])).toBe(1);
        });

        it('returns less than 1.0 for variable outcomes', () => {
            expect(robustness([0.0, 1.0, 0.0, 1.0])).toBeLessThan(1);
        });

        it('returns outcome score as proxy for single trial', () => {
            expect(robustness([0.75])).toBeCloseTo(0.75);
        });

        it('returns 0.5 for empty array', () => {
            expect(robustness([])).toBe(0.5);
        });
    });

    describe('decisionTime()', () => {
        it('returns 1.0 for automated runs (0ms decisions)', () => {
            const decisions = makeDecisions(5, { decision_time_ms: 0 });
            expect(decisionTime(decisions)).toBe(1);
        });

        it('returns lower values for slower decisions', () => {
            const fast = makeDecisions(5, { decision_time_ms: 1000 });
            const slow = makeDecisions(5, { decision_time_ms: 20000 });
            expect(decisionTime(fast)).toBeGreaterThan(decisionTime(slow));
        });

        it('returns 1 for empty decisions', () => {
            expect(decisionTime([])).toBe(1);
        });
    });

    describe('resourceEfficiency()', () => {
        it('higher score when resources are conserved', () => {
            const conserved = makeState({ resources: 18, maxResources: 20, outcomeScore: 0.8 });
            const spent = makeState({ resources: 2, maxResources: 20, outcomeScore: 0.8 });
            expect(resourceEfficiency(conserved)).toBeGreaterThan(resourceEfficiency(spent));
        });
    });

    describe('taskCompletion()', () => {
        it('returns outcomeScore for completed tasks', () => {
            const state = makeState({ terminationReason: 'completed', outcomeScore: 0.9 });
            expect(taskCompletion(state)).toBeCloseTo(0.9);
        });

        it('returns 0.1 for out_of_resources', () => {
            const state = makeState({ terminationReason: 'out_of_resources' });
            expect(taskCompletion(state)).toBe(0.1);
        });

        it('returns partial credit for withdrawal based on progress', () => {
            const state = makeState({ terminationReason: 'withdrew', currentLayer: 3, totalLayers: 5 });
            const v = taskCompletion(state);
            expect(v).toBeGreaterThan(0);
            expect(v).toBeLessThan(0.3);
        });

        it('returns 0 for non-terminated state', () => {
            const state = makeState({ terminated: false });
            expect(taskCompletion(state)).toBe(0);
        });
    });

    describe('computeAllMetrics()', () => {
        it('returns all 8 metrics', () => {
            const state = makeState();
            const decisions = makeDecisions(5);
            const metrics = computeAllMetrics(state, decisions, baseScenario as ScenarioDefinition);
            expect(metrics).toHaveProperty('decisionQuality');
            expect(metrics).toHaveProperty('riskExposure');
            expect(metrics).toHaveProperty('informationEfficiency');
            expect(metrics).toHaveProperty('regret');
            expect(metrics).toHaveProperty('robustness');
            expect(metrics).toHaveProperty('decisionTime');
            expect(metrics).toHaveProperty('resourceEfficiency');
            expect(metrics).toHaveProperty('taskCompletion');

            // All should be in [0,1]
            for (const [, v] of Object.entries(metrics)) {
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThanOrEqual(1);
            }
        });
    });
});
