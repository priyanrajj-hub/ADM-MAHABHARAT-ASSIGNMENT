from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# API Schemas for endpoints
class SessionCreate(BaseModel):
    id: str

class DecisionCreate(BaseModel):
    session_id: str
    scenario_id: str
    trial_id: str
    timestamp: str # ISO string from client
    state_id: str
    info_seen: List[str]
    action: str
    decision_time_ms: int
    risk_before: float
    risk_after: float
    resources_before: int
    resources_after: int
    step: int
    layer: int

class OutcomeCreate(BaseModel):
    session_id: str
    scenario_id: str
    trial_id: str
    seed: int
    termination_reason: str
    final_score: float
    metrics: dict # Using dict for the 8 metrics payload

class TrialResult(BaseModel):
    trial_id: str
    status: str
