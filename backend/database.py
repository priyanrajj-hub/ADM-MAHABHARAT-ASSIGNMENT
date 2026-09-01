from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Local development database using SQLite.
# For production (Milestone 5) migrating to Postgres is identical via:
# SQLALCHEMY_DATABASE_URL = "postgresql://user:password@postgresserver/db"
SQLALCHEMY_DATABASE_URL = "sqlite:///./research.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # check_same_thread=False is needed only for SQLite in FastAPI/multithreading
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
