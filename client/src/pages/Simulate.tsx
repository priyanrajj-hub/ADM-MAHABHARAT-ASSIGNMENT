import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { getScenario } from '@engine/scenarios';
import { createInitialState, transition, buildObservation } from '@engine/transition';
import { createPRNG } from '@engine/prng';
import { logDecision } from '../store/logger';
import { ChakravyuhaGraphic } from '../components/ChakravyuhaGraphic';
import type { Action, DecisionRecord, SimulationState } from '@engine/types';
import { computeAllMetrics } from '@engine/metrics';

export default function Simulate() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const scenario = getScenario(id || 'tutorial');

    const [sessionId] = useState(`session_${Date.now()}`);
    const [trialId] = useState(`trial_${scenario.scenario_id}_${Date.now()}`);

    const [state, setState] = useState<SimulationState>(() => createInitialState(scenario));
    const [obs, setObs] = useState(() => buildObservation(createInitialState(scenario), scenario));
    const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
    const [narrative, setNarrative] = useState<string>("You stand at the outer edge. Awaiting instructions.");

    const prngRef = useRef(createPRNG(scenario.seed + Date.now())); // slightly perturb seed for uniqueness in UI if desired, or keep deterministic
    const stepStartTime = useRef(Date.now());
    const trialStartTime = useRef(Date.now());

    // Handle Action
    const handleAction = (action: Action) => {
        if (state.terminated) return;

        const decisionTime = Date.now() - stepStartTime.current;
        const prng = prngRef.current;

        const riskBefore = state.riskLevel;
        const resourcesBefore = state.resources;

        // Execute transition
        const result = transition(state, scenario, action, prng);

        const record: DecisionRecord = {
            step: state.decisionCount,
            timestamp_ms: Date.now() - trialStartTime.current,
            decision_time_ms: decisionTime,
            stateId: state.stateId, // from state *before* transition per engine pattern
            layer: state.currentLayer,
            infoSeen: obs.knownInfo.map(k => k.id),
            action,
            riskBefore,
            riskAfter: result.nextState.riskLevel,
            resourcesBefore,
            resourcesAfter: result.nextState.resources,
            terminal: result.terminated
        };

        // Log event
        logDecision({
            session_id: sessionId,
            scenario_id: scenario.scenario_id,
            trial_id: trialId,
            timestamp: new Date().toISOString(),
            state_id: state.stateId,
            info_seen: record.infoSeen,
            action: record.action,
            decision_time_ms: record.decision_time_ms,
            risk_before: record.riskBefore,
            risk_after: record.riskAfter,
            outcome: result.nextState.terminationReason
        });

        const updatedDecisions = [...decisions, record];
        setDecisions(updatedDecisions);
        setState(result.nextState);
        setObs(result.observation);
        setNarrative(result.narrative);
        stepStartTime.current = Date.now();

        if (result.terminated) {
            // Complete trial
            const metrics = computeAllMetrics(result.nextState, updatedDecisions, scenario);
            const trialData = {
                trialId, sessionId, scenarioId: scenario.scenario_id,
                seed: scenario.seed, decisions: updatedDecisions,
                finalState: result.nextState, metrics
            };

            localStorage.setItem('last_trial', JSON.stringify(trialData));

            setTimeout(() => {
                navigate(`/results/${trialId}`);
            }, 2000); // Wait 2s to show final narrative before redirect
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row gap-6 mt-4">
            {/* Visual / Narrative Column */}
            <div className="flex-1 panel flex flex-col items-center">
                <h2 className="text-2xl font-bold text-white text-center mb-2">{scenario.title}</h2>
                <ChakravyuhaGraphic currentLayer={state.currentLayer} totalLayers={state.totalLayers} />

                <div className="w-full mt-4 p-4 bg-background border border-gray-800 rounded text-center">
                    <p className="text-gray-300 min-h-[4rem]">{narrative}</p>
                </div>
            </div>

            {/* Controls & State Column */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Meters */}
                <div className="panel grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-gray-500 uppercase">Resources</div>
                        <div className={`text-xl font-mono ${state.resources < 5 ? 'text-danger animate-pulse' : 'text-primary'}`}>
                            {state.resources} <span className="text-sm text-gray-500">/ {state.maxResources}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase">Time</div>
                        <div className={`text-xl font-mono ${state.timeRemaining < 3 ? 'text-warning' : 'text-primary'}`}>
                            {state.timeRemaining}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase">Risk</div>
                        <div className={`text-xl font-mono ${state.riskLevel > 0.7 ? 'text-danger' : 'text-primary'}`}>
                            {(state.riskLevel * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="panel">
                    <h3 className="text-sm text-gray-500 uppercase mb-2">Intelligence</h3>
                    <div className="space-y-2">
                        {obs.knownInfo.length === 0 ? (
                            <div className="text-sm text-gray-600 italic">No intelligence gathered.</div>
                        ) : (
                            obs.knownInfo.map((info, i) => (
                                <div key={i} className="text-sm bg-background p-2 rounded border border-gray-800">
                                    <span className="text-primary font-bold mr-2">{info.description}:</span>
                                    {String(info.value)}
                                </div>
                            ))
                        )}

                        {/* Unknown Indicator */}
                        {obs.unknownCount > 0 && (
                            <div className="text-sm text-warning flex items-center gap-2 mt-4 pt-2 border-t border-gray-800">
                                <div className="w-2 h-2 rounded-full bg-warning animate-ping" />
                                {obs.unknownCount} hidden intel {obs.unknownCount > 1 ? 'pieces remain' : 'piece remains'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="panel flex-1 flex flex-col justify-end">
                    <h3 className="text-sm text-gray-500 uppercase mb-2">Available Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {obs.availableActions.map(action => (
                            <button
                                key={action}
                                disabled={state.terminated}
                                className={`btn ${action === 'proceed' ? 'btn-primary' : action === 'withdraw' ? 'btn-danger' : ''}`}
                                onClick={() => handleAction(action)}
                            >
                                {action.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
