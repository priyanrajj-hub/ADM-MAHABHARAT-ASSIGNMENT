from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Experiment(Base):
    """Aggregate model for grouping trials into higher-level research runs."""
    __tablename__ = "experiments"
    id = Column(String, primary_key=True, index=True)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Session(Base):
    """Anonymous user session containing individual settings/browser data but ZERO PII."""
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    
class Scenario(Base):
    """Database representation of the static JSON definitions to allow join analytics."""
    __tablename__ = "scenarios"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    layers = Column(Integer)
    risk_level = Column(Float)
    uncertainty_level = Column(Float)

class Trial(Base):
    """A full run of a scenario executed in a session."""
    __tablename__ = "trials"
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    scenario_id = Column(String, ForeignKey("scenarios.id"))
    seed = Column(Integer)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

class Decision(Base):
    """Individual action event log."""
    __tablename__ = "decisions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.id"))
    step = Column(Integer)
    timestamp_ms = Column(Integer)
    decision_time_ms = Column(Integer)
    state_id = Column(String)
    layer = Column(Integer)
    action = Column(String)
    risk_before = Column(Float)
    risk_after = Column(Float)
    resources_before = Column(Integer)
    resources_after = Column(Integer)

class InformationEvent(Base):
    """Log of what was known during a specific decision step."""
    __tablename__ = "information_events"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    decision_id = Column(Integer, ForeignKey("decisions.id"))
    hidden_info_id = Column(String)

class Outcome(Base):
    """Termination results for a given trial."""
    __tablename__ = "outcomes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.id"))
    termination_reason = Column(String)
    final_score = Column(Float)

class Metric(Base):
    """Computed analytics scores resulting from a trial."""
    __tablename__ = "metrics"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.id"))
    decision_quality = Column(Float)
    risk_exposure = Column(Float)
    information_efficiency = Column(Float)
    regret = Column(Float)
    robustness = Column(Float)
    decision_time = Column(Float)
    resource_efficiency = Column(Float)
    task_completion = Column(Float)
