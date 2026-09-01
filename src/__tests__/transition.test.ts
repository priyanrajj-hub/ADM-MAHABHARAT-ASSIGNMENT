import { describe, it, expect } from 'vitest';
import { createPRNG } from '../engine/prng.js';
import { createInitialState, transition, buildObservation } from '../engine/transition.js';
import type { ScenarioDefinition, SimulationState } from '../engine/types.js';

// Minimal scenario for testing transitions
const testScenario: ScenarioDefinition = {
    scenario_id: 'test_transitions',
    title: 'Transition Test Scenario',
    description: 'Minimal scenario for unit testing transitions.',
    layers: 3,
    states: [
        { id: 's0', layer: 0, name: 'Start', description: 'Starting state', availableActions: ['proceed', 'gather_info', 'change_strategy', 'withdraw'], irreversible: false },
        { id: 's1', layer: 1, name: 'Mid', description: 'Middle state', availableActions: ['proceed', 'gather_info', 'withdraw'], irreversible: false },
        { id: 's2', layer: 2, name: 'End', description: 'End state', availableActions: ['proceed'], irreversible: false },
        { id: 's_win', layer: 3, name: 'Win', description: 'Winning outcome', availableActions: [], irreversible: false },
        { id: 's_lose', layer: 3, name: 'Lose', description: 'Losing outcome', availableActions: [], irreversible: false },
    ],
    actions: [],
    hidden_information: [
        { id: 'h1', layer: 0, description: 'Secret info 1', value: 'Hidden value 1', revealCost: 2 },
        { id: 'h2', layer: 1, description: 'Secret info 2', value: 'Hidden value 2', revealCost: 3 },
    ],
    risk_level: 0.2,
    uncertainty_level: 0.5,
    resources: 15,
    time_limit: 10,
    information_cost: 2,
    transition_rules: [
        { fromState: 's0', action: 'proceed', toState: 's1', toLayer: 1, resourceCost: 3, timeCost: 1, riskDelta: 0.1, irreversible: false, probability: 1.0, narrative: 'Advance to middle.' },
        { fromState: 's1', action: 'proceed', toState: 's2', toLayer: 2, resourceCost: 3, timeCost: 2, riskDelta: 0.1, irreversible: false, probability: 1.0, narrative: 'Advance to end.' },
        { fromState: 's2', action: 'proceed', toState: 's_win', toLayer: 3, resourceCost: 4, timeCost: 2, riskDelta: 0.15, irreversible: false, probability: 1.0, narrative: 'Victory!' },
    ],
    outcomes: [
        { stateId: 's_win', score: 1.0, description: 'Full victory', success: true },
        { stateId: 's_lose', score: 0.1, description: 'Defeat', success: false },
    ],
    strategies: [
        { id: 'default', name: 'Default', description: 'Standard approach' },
        { id: 'alt', name: 'Alternative', description: 'Different approach' },
    ],
    reference_policy: ['proceed', 'proceed', 'proceed'],
    reference_score: 1.0,
    seed: 42,
};

describe('Transition Engine', () => {
    describe('createInitialState()', () => {
        it('creates a valid initial state from scenario', () => {
            const state = createInitialState(testScenario);
            expect(state.currentLayer).toBe(0);
            expect(state.stateId).toBe('s0');
            expect(state.resources).toBe(15);
            expect(state.timeRemaining).toBe(10);
            expect(state.riskLevel).toBe(0.2);
            expect(state.terminated).toBe(false);
            expect(state.revealedInfo).toEqual([]);
            expect(state.decisionCount).toBe(0);
        });
    });

    describe('buildObservation()', () => {
        it('shows correct observation for initial state', () => {
            const state = createInitialState(testScenario);
            const obs = buildObservation(state, testScenario);
            expect(obs.currentLayer).toBe(0);
            expect(obs.unknownCount).toBe(2);
            expect(obs.knownInfo).toEqual([]);
            expect(obs.availableActions).toContain('proceed');
            expect(obs.availableActions).toContain('gather_info');
        });
    });

    describe('transition() — proceed', () => {
        it('advances layer and costs resources/time', () => {
            const state = createInitialState(testScenario);
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'proceed', prng);

            expect(result.nextState.currentLayer).toBe(1);
            expect(result.nextState.stateId).toBe('s1');
            expect(result.nextState.resources).toBe(15 - 3);
            expect(result.nextState.timeRemaining).toBe(10 - 1);
            expect(result.nextState.decisionCount).toBe(1);
            expect(result.terminated).toBe(false);
        });
    });

    describe('transition() — gather_info', () => {
        it('reveals hidden info and costs resources', () => {
            const state = createInitialState(testScenario);
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'gather_info', prng);

            expect(result.nextState.revealedInfo.length).toBe(1);
            expect(result.nextState.resources).toBeLessThan(15);
            expect(result.nextState.timeRemaining).toBe(9);
            expect(result.nextState.decisionCount).toBe(1);
        });

        it('is a no-op (wastes resources) when all info already revealed', () => {
            const state: SimulationState = {
                ...createInitialState(testScenario),
                revealedInfo: ['h1', 'h2'], // All revealed
            };
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'gather_info', prng);

            // Still consumes resources (a deliberate design choice)
            expect(result.nextState.revealedInfo).toEqual(['h1', 'h2']);
            expect(result.nextState.resources).toBe(state.resources - testScenario.information_cost);
            expect(result.nextState.decisionCount).toBe(1);
        });
    });

    describe('transition() — withdraw', () => {
        it('terminates the simulation', () => {
            const state = createInitialState(testScenario);
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'withdraw', prng);

            expect(result.terminated).toBe(true);
            expect(result.nextState.terminated).toBe(true);
            expect(result.nextState.terminationReason).toBe('withdrew');
            expect(result.nextState.outcomeScore).toBeDefined();
        });
    });

    describe('transition() — change_strategy', () => {
        it('changes the strategy', () => {
            const state = createInitialState(testScenario);
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'change_strategy', prng);

            expect(result.nextState.currentStrategy).not.toBe(state.currentStrategy);
            expect(result.nextState.timeRemaining).toBe(state.timeRemaining - 1);
        });
    });

    describe('Edge cases', () => {
        it('zero resources forces termination', () => {
            const state: SimulationState = {
                ...createInitialState(testScenario),
                resources: 1, // Will go to <= 0 after any action
            };
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'proceed', prng);

            expect(result.nextState.terminated).toBe(true);
            expect(result.nextState.terminationReason).toBe('out_of_resources');
        });

        it('zero time forces termination', () => {
            const state: SimulationState = {
                ...createInitialState(testScenario),
                timeRemaining: 1, // Will go to 0 after action
            };
            const prng = createPRNG(42);
            const result = transition(state, testScenario, 'proceed', prng);

            expect(result.nextState.terminated).toBe(true);
            expect(result.nextState.terminationReason).toBe('out_of_time');
        });

        it('throws on invalid action', () => {
            const state = createInitialState(testScenario);
            const prng = createPRNG(42);

            expect(() =>
                transition(state, testScenario, 'nonexistent_action', prng)
            ).toThrow('not available');
        });

        it('throws when transitioning from terminated state', () => {
            const state: SimulationState = {
                ...createInitialState(testScenario),
                terminated: true,
                terminationReason: 'completed',
            };
            const prng = createPRNG(42);

            expect(() =>
                transition(state, testScenario, 'proceed', prng)
            ).toThrow('terminated');
        });

        it('reaching an outcome state sets the correct score and terminates', () => {
            let state = createInitialState(testScenario);
            const prng = createPRNG(42);

            // Advance through all layers to reach outcome
            const result1 = transition(state, testScenario, 'proceed', prng); // s0 -> s1
            const result2 = transition(result1.nextState, testScenario, 'proceed', prng); // s1 -> s2
            const result3 = transition(result2.nextState, testScenario, 'proceed', prng); // s2 -> s_win

            expect(result3.terminated).toBe(true);
            expect(result3.nextState.terminationReason).toBe('completed');
            expect(result3.nextState.outcomeScore).toBe(1.0);
        });
    });
});
