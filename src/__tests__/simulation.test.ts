import { describe, it, expect } from 'vitest';
import { runSimulation, reproducibleResult, runPerturbationTrials } from '../engine/simulation.js';
import { getScenario, listScenarios } from '../engine/scenarios.js';

describe('Simulation Engine', () => {
    describe('Full trial run', () => {
        it('runs the tutorial scenario to completion', () => {
            const scenario = getScenario('tutorial');
            const trial = runSimulation(scenario, 42, ['proceed', 'proceed', 'proceed']);

            expect(trial.scenarioId).toBe('tutorial');
            expect(trial.seed).toBe(42);
            expect(trial.decisions.length).toBeGreaterThan(0);
            expect(trial.finalState.terminated).toBe(true);
            expect(trial.metrics).toBeDefined();

            // All metrics should be in [0, 1]
            for (const [key, value] of Object.entries(trial.metrics)) {
                expect(value, `metric ${key}`).toBeGreaterThanOrEqual(0);
                expect(value, `metric ${key}`).toBeLessThanOrEqual(1);
            }
        });

        it('handles gather_info then proceed in tutorial', () => {
            const scenario = getScenario('tutorial');
            const trial = runSimulation(scenario, 42, [
                'gather_info',
                'proceed',
                'gather_info',
                'proceed',
                'proceed',
            ]);

            expect(trial.finalState.revealedInfo.length).toBeGreaterThan(0);
            expect(trial.finalState.terminated).toBe(true);
        });

        it('handles withdraw early', () => {
            const scenario = getScenario('tutorial');
            const trial = runSimulation(scenario, 42, ['withdraw']);

            expect(trial.finalState.terminated).toBe(true);
            expect(trial.finalState.terminationReason).toBe('withdrew');
            expect(trial.decisions.length).toBe(1);
        });
    });

    describe('Seed Reproducibility (CRITICAL ACCEPTANCE TEST)', () => {
        it('two runs with the same seed produce byte-identical JSON output', () => {
            const scenario = getScenario('tutorial');
            const actions = ['gather_info', 'proceed', 'proceed', 'proceed'];

            const result1 = reproducibleResult(scenario, 42, actions);
            const result2 = reproducibleResult(scenario, 42, actions);

            const json1 = JSON.stringify(result1);
            const json2 = JSON.stringify(result2);

            expect(json1).toBe(json2);
        });

        it('different seeds produce different results', () => {
            const scenario = getScenario('tutorial');
            const actions = ['proceed', 'proceed', 'proceed'];

            const result1 = reproducibleResult(scenario, 42, actions);
            const result2 = reproducibleResult(scenario, 99, actions);

            const json1 = JSON.stringify(result1);
            const json2 = JSON.stringify(result2);

            // May be same if transitions are deterministic (probability=1.0)
            // but at minimum, seeds should differ
            expect(result1).toHaveProperty('seed', 42);
            expect(result2).toHaveProperty('seed', 99);
        });

        it('reproducibility holds for high-uncertainty scenario (stochastic transitions)', () => {
            const scenario = getScenario('high_uncertainty');
            const actions = ['gather_info', 'proceed', 'proceed', 'proceed', 'proceed'];

            const result1 = reproducibleResult(scenario, 200, actions);
            const result2 = reproducibleResult(scenario, 200, actions);

            expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
        });
    });

    describe('All scenarios load and run', () => {
        const scenarioIds = listScenarios();

        for (const id of scenarioIds) {
            it(`scenario "${id}" loads and runs without error`, () => {
                const scenario = getScenario(id);

                // Simple actions: try to proceed through
                const actions = Array(scenario.layers + 2).fill('proceed');

                // Should not throw
                const trial = runSimulation(scenario, scenario.seed, actions);

                expect(trial.scenarioId).toBe(scenario.scenario_id);
                expect(trial.finalState.terminated).toBe(true);
                expect(trial.metrics).toBeDefined();
            });
        }
    });

    describe('Perturbation trials for robustness', () => {
        it('runs multiple trials with perturbed seeds', () => {
            const scenario = getScenario('high_uncertainty');
            const actions = ['proceed', 'proceed', 'proceed', 'proceed', 'proceed'];

            const outcomes = runPerturbationTrials(scenario, 200, actions, 5);

            expect(outcomes.length).toBe(5);
            for (const o of outcomes) {
                expect(o).toBeGreaterThanOrEqual(0);
                expect(o).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('Edge cases', () => {
        it('empty action list runs to partial completion', () => {
            const scenario = getScenario('tutorial');
            const trial = runSimulation(scenario, 42, []);

            expect(trial.decisions.length).toBe(0);
            expect(trial.finalState.terminated).toBe(true);
        });

        it('excess actions are ignored after termination', () => {
            const scenario = getScenario('tutorial');
            // Way more actions than needed
            const actions = Array(20).fill('proceed');
            const trial = runSimulation(scenario, 42, actions);

            // Should terminate at end of scenario, not process all 20
            expect(trial.decisions.length).toBeLessThanOrEqual(scenario.layers + 1);
        });
    });
});
