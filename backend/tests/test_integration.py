import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
import models

# Recreate DB for tests
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_full_session_flow():
    # 1. Create Session
    session_id = "test_sess_123"
    r1 = client.post("/api/session", json={"id": session_id})
    assert r1.status_code == 200
    
    # 2. Assert DB
    db = SessionLocal()
    sess = db.query(models.Session).first()
    assert sess.id == session_id
    
    # 3. List scenarios
    r_scen = client.get("/api/scenarios")
    assert r_scen.status_code == 200
    assert "tutorial" in r_scen.json()["scenarios"]
    
    # 4. Log Decision
    trial_id = "test_trial_123"
    dec_payload = {
        "session_id": session_id,
        "scenario_id": "tutorial",
        "trial_id": trial_id,
        "timestamp": "2026-09-01T22:00:00.000Z",
        "state_id": "start",
        "info_seen": ["hint_1"],
        "action": "gather_info",
        "decision_time_ms": 1500,
        "risk_before": 0.1,
        "risk_after": 0.1,
        "resources_before": 10,
        "resources_after": 9,
        "step": 0,
        "layer": 0
    }
    r2 = client.post("/api/decision", json=dec_payload)
    assert r2.status_code == 200
    
    # 5. DB query sanity check for acceptance criteria
    dt = db.query(models.Decision).filter(models.Decision.trial_id == trial_id).first()
    assert dt is not None
    assert dt.action == "gather_info"
    
    # 6. Log Outcome
    out_payload = {
        "session_id": session_id,
        "scenario_id": "tutorial",
        "trial_id": trial_id,
        "seed": 42,
        "termination_reason": "completed",
        "final_score": 1.0,
        "metrics": {
            "decisionQuality": 0.9,
            "riskExposure": 0.2
        }
    }
    r3 = client.post("/api/outcome", json=out_payload)
    assert r3.status_code == 200
    
    # 7. Get Results
    r4 = client.get(f"/api/results/{trial_id}")
    assert r4.status_code == 200
    res = r4.json()
    assert res["outcome"]["termination_reason"] == "completed"
    assert res["metrics"]["decision_quality"] == 0.9
    assert len(res["decisions"]) == 1
    
    print("ALL TESTS PASSED. Flow round trips cleanly to SQLite.")

test_full_session_flow()
