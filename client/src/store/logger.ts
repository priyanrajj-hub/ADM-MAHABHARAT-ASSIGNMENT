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
    outcome?: string; // used for termination reason
}

export function logDecision(event: EventLog) {
    const existing = JSON.parse(localStorage.getItem('chakravyuha_logs') || '[]');
    existing.push(event);
    localStorage.setItem('chakravyuha_logs', JSON.stringify(existing));
}

export function getLogs(): EventLog[] {
    return JSON.parse(localStorage.getItem('chakravyuha_logs') || '[]');
}

export function dumpLogsToConsole() {
    const logs = getLogs();
    console.log("=== CHAKRAVYUHA EVENT LOG DUMP ===");
    console.table(logs);
}
