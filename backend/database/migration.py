import logging
from sqlalchemy import inspect, text
from backend.database.database import Base, engine
from backend.database import models  # Ensure all model tables are registered in Base.metadata

logger = logging.getLogger(__name__)

def run_db_migrations():
    """
    Idempotent database migration for SONAR-AI 2.0.
    1. Creates newly introduced tables (e.g. contact_tracks) if missing.
    2. Additively adds nullable track_id column to detections if missing.
    3. Strictly guarantees existing row counts and record semantics are preserved.
    """
    # 1. Create any missing tables (e.g. contact_tracks)
    Base.metadata.create_all(bind=engine)

    # 2. Inspect detections table columns
    with engine.connect() as conn:
        inspector = inspect(conn)
        columns = [col["name"] for col in inspector.get_columns("detections")]
        
        if "track_id" not in columns:
            logger.info("Migrating detections table: adding nullable track_id column...")
            conn.execute(text("ALTER TABLE detections ADD COLUMN track_id VARCHAR(50)"))
            conn.commit()
            logger.info("Migration complete: track_id column added.")
        else:
            logger.info("Database schema up to date: track_id column already exists.")

        # 3. Inspect contact_tracks table columns
        track_cols = [col["name"] for col in inspector.get_columns("contact_tracks")]
        for geom_col in ["latest_cx_norm", "latest_cy_norm", "latest_w_norm", "latest_h_norm"]:
            if geom_col not in track_cols:
                logger.info(f"Adding {geom_col} column to contact_tracks...")
                conn.execute(text(f"ALTER TABLE contact_tracks ADD COLUMN {geom_col} FLOAT"))
                conn.commit()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_db_migrations()
