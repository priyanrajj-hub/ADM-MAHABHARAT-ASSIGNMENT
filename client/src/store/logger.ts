import type { Action } from '@engine/types';

export interface EventLog {
    session_id: string;
    scenario_id: string;
    trial_id: string;
    timestamp: string;
    state_id: string;
    info_seen: string[];
    action: Action | string;
    decision_time_ms: number;
    risk_before: number;
    risk_after: number;
    resources_before: number;
    resources_after: number;
    layer: number;
    step: number;
    outcome?: string;
}

export async function logDecision(event: EventLog) {
    // Keep local mirror for fallback / debug if needed
    const existing = JSON.parse(localStorage.getItem('chakravyuha_logs') || '[]');
    existing.push(event);
    localStorage.setItem('chakravyuha_logs', JSON.stringify(existing));

    try {
        await fetch('/api/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    } catch (e) {
        console.error("Failed to sync log to API", e);
    }
}

export async function logOutcome(outcomePayload: any) {
    try {
        await fetch('/api/outcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(outcomePayload)
        });
    } catch (e) {
        console.error("Failed to sync outcome to API", e);
    }
}

export async function initializeSession(sessionId: string) {
    try {
        await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sessionId })
        });
    } catch (e) {
        console.error("Failed to initialize session", e);
    }
}

export function getLogs(): EventLog[] {
    return JSON.parse(localStorage.getItem('chakravyuha_logs') || '[]');
}

export function dumpLogsToConsole() {
    const logs = getLogs();
    console.log("=== CHAKRAVYUHA EVENT LOG DUMP ===");
    console.table(logs);
}
