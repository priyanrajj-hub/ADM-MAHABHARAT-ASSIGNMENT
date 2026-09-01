from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json
import os

from database import engine, Base, get_db
import models
import schemas

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chakravyūha Simulator API")

# Explicit CORS is handled by Vite proxy, but add standard allowance for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/session")
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db)):
    db_sess = models.Session(id=session.id)
    db.add(db_sess)
    db.commit()
    return {"status": "ok"}

@app.get("/api/scenarios")
def get_scenarios():
    # Read from filesystem proxy since actual data is in JSONs (this matches TS engine logic)
    scenario_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'scenarios')
    files = [f for f in os.listdir(scenario_dir) if f.endswith('.json')]
    return {"scenarios": [f.replace('.json', '') for f in files]}

@app.post("/api/decision")
def log_decision(decision: schemas.DecisionCreate, db: Session = Depends(get_db)):
    # Create Trial if it doesn't exist
    trial = db.query(models.Trial).filter(models.Trial.id == decision.trial_id).first()
    if not trial:
        trial = models.Trial(
            id=decision.trial_id,
            session_id=decision.session_id,
            scenario_id=decision.scenario_id,
            seed=42 # Or actual seed if passed
        )
        db.add(trial)
        db.commit()
        db.refresh(trial)
    
    db_decision = models.Decision(
        trial_id=trial.id,
        step=decision.step,
        timestamp_ms=int(1000 * __import__('datetime').datetime.fromisoformat(decision.timestamp.replace('Z', '+00:00')).timestamp()),
        decision_time_ms=decision.decision_time_ms,
        state_id=decision.state_id,
        layer=decision.layer,
        action=decision.action,
        risk_before=decision.risk_before,
        risk_after=decision.risk_after,
        resources_before=decision.resources_before,
        resources_after=decision.resources_after
    )
    db.add(db_decision)
    db.flush() # flush to get 'id'
    
    for info_id in decision.info_seen:
        db.add(models.InformationEvent(decision_id=db_decision.id, hidden_info_id=info_id))
    
    db.commit()
    return {"status": "ok"}

@app.post("/api/outcome")
def log_outcome(outcome: schemas.OutcomeCreate, db: Session = Depends(get_db)):
    
    db_outcome = models.Outcome(
        trial_id=outcome.trial_id,
        termination_reason=outcome.termination_reason,
        final_score=outcome.final_score
    )
    db.add(db_outcome)
    
    m = outcome.metrics
    db_metric = models.Metric(
        trial_id=outcome.trial_id,
        decision_quality=m.get('decisionQuality', 0),
        risk_exposure=m.get('riskExposure', 0),
        information_efficiency=m.get('informationEfficiency', 0),
        regret=m.get('regret', 0),
        robustness=m.get('robustness', 0),
        decision_time=m.get('decisionTime', 0),
        resource_efficiency=m.get('resourceEfficiency', 0),
        task_completion=m.get('taskCompletion', 0),
    )
    db.add(db_metric)
    db.commit()
    return {"status": "ok"}

@app.get("/api/results/{trial_id}")
def get_results(trial_id: str, db: Session = Depends(get_db)):
    outcome = db.query(models.Outcome).filter(models.Outcome.trial_id == trial_id).first()
    metrics = db.query(models.Metric).filter(models.Metric.trial_id == trial_id).first()
    decisions = db.query(models.Decision).filter(models.Decision.trial_id == trial_id).all()
    
    return {
        "outcome": {
            "termination_reason": outcome.termination_reason if outcome else None, 
            "final_score": outcome.final_score if outcome else None},
        "metrics": metrics.__dict__ if metrics else None,
        "decisions": [d.__dict__ for d in decisions]
    }

@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return {"status": "ok", "message": "Dashboard analytics not yet implemented (Milestone 4)"}
