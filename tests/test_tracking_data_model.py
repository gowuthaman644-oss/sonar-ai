import unittest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database.database import Base, SessionLocal, engine
from backend.database.models import Scan, Detection, Analysis, ContactTrack
from backend.database.migration import run_db_migrations

class TestTrackingDataModel(unittest.TestCase):
    """
    Phase 5.1 Unit Tests: Additive Temporal Tracking Data Model.
    Verifies:
    1. Existing records without track_id
    2. New tracked records
    3. Multiple observations belonging to one track
    4. Observation count & persistence after restart
    5. Database migration idempotency
    """

    def test_existing_records_integrity(self):
        """Verifies that existing database records remain intact with track_id = NULL."""
        db = SessionLocal()
        try:
            scans_count = db.query(Scan).count()
            detections_count = db.query(Detection).count()
            analyses_count = db.query(Analysis).count()
            tracks_count = db.query(ContactTrack).count()

            # Strict preservation assertions
            self.assertEqual(scans_count, 119, "Scans count must remain 119")
            self.assertEqual(detections_count, 302, "Detections count must remain 302")
            self.assertEqual(analyses_count, 114, "Analyses count must remain 114")

            # All existing historical detections must have track_id is NULL
            historical_with_track = db.query(Detection).filter(Detection.track_id.isnot(None)).count()
            self.assertEqual(historical_with_track, 0, "Historical detections must have track_id = NULL")

            # Contact tracks table exists
            self.assertGreaterEqual(tracks_count, 0)
        finally:
            db.close()

    def test_new_tracked_records_isolated(self):
        """Tests creating a ContactTrack and linking a detection in an isolated SQLite engine."""
        test_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=test_engine)
        TestSession = sessionmaker(bind=test_engine)
        db = TestSession()

        try:
            # 1. Create scan
            scan = Scan(scan_id="SCAN-TEST-01", filename="test.png", file_path="test.png")
            db.add(scan)
            db.commit()

            # 2. Create track
            track = ContactTrack(
                track_id="TRK-0001",
                class_name="mine",
                observation_count=1,
                status="NEW",
                latest_confidence=0.85,
                latest_evidence=78.2
            )
            db.add(track)
            db.commit()

            # 3. Create detection linked to track
            det = Detection(
                scan_id=scan.id,
                class_name="mine",
                confidence=0.85,
                x=100.0,
                y=120.0,
                width=45.0,
                height=45.0,
                track_id=track.track_id
            )
            db.add(det)
            db.commit()

            # Query back
            queried_track = db.query(ContactTrack).filter_by(track_id="TRK-0001").first()
            self.assertIsNotNone(queried_track)
            self.assertEqual(len(queried_track.detections), 1)
            self.assertEqual(queried_track.detections[0].track_id, "TRK-0001")
            self.assertEqual(queried_track.detections[0].class_name, "mine")
        finally:
            db.close()

    def test_multiple_observations_belonging_to_one_track(self):
        """Tests that multiple detections across sequential scans link to a single ContactTrack."""
        test_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=test_engine)
        TestSession = sessionmaker(bind=test_engine)
        db = TestSession()

        try:
            # Create two sequential scans
            scan1 = Scan(scan_id="SCAN-001", filename="s1.png", file_path="s1.png")
            scan2 = Scan(scan_id="SCAN-002", filename="s2.png", file_path="s2.png")
            db.add_all([scan1, scan2])
            db.commit()

            # Create persistent track
            track = ContactTrack(
                track_id="TRK-0042",
                class_name="wreck",
                observation_count=2,
                status="RECURRENT"
            )
            db.add(track)
            db.commit()

            # Observation 1 in Scan 1
            det1 = Detection(
                scan_id=scan1.id,
                class_name="wreck",
                confidence=0.74,
                x=200.0, y=150.0, width=80.0, height=60.0,
                track_id="TRK-0042"
            )
            # Observation 2 in Scan 2
            det2 = Detection(
                scan_id=scan2.id,
                class_name="wreck",
                confidence=0.82,
                x=205.0, y=154.0, width=82.0, height=61.0,
                track_id="TRK-0042"
            )
            db.add_all([det1, det2])
            db.commit()

            # Query track detections
            queried_track = db.query(ContactTrack).filter_by(track_id="TRK-0042").first()
            self.assertEqual(queried_track.observation_count, 2)
            self.assertEqual(len(queried_track.detections), 2)
            scan_ids = [d.scan.scan_id for d in queried_track.detections]
            self.assertIn("SCAN-001", scan_ids)
            self.assertIn("SCAN-002", scan_ids)
        finally:
            db.close()

    def test_observation_count_and_persistence_after_restart(self):
        """Tests that track records persist across new database connections/sessions."""
        test_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=test_engine)
        TestSession = sessionmaker(bind=test_engine)

        # Session 1: write
        db1 = TestSession()
        scan = Scan(scan_id="SCAN-P", filename="p.png", file_path="p.png")
        db1.add(scan)
        db1.commit()

        track = ContactTrack(
            track_id="TRK-0099",
            class_name="airplane",
            observation_count=3,
            status="ACTIVE"
        )
        db1.add(track)
        db1.commit()
        db1.close()

        # Session 2: read back (simulating restart)
        db2 = TestSession()
        loaded_track = db2.query(ContactTrack).filter_by(track_id="TRK-0099").first()
        self.assertIsNotNone(loaded_track)
        self.assertEqual(loaded_track.class_name, "airplane")
        self.assertEqual(loaded_track.observation_count, 3)
        self.assertEqual(loaded_track.status, "ACTIVE")
        db2.close()

    def test_migration_idempotency(self):
        """Calling run_db_migrations repeatedly must succeed without error or side-effects."""
        try:
            run_db_migrations()
            run_db_migrations()
            run_db_migrations()
        except Exception as e:
            self.fail(f"run_db_migrations failed during idempotency test: {e}")

if __name__ == "__main__":
    unittest.main()
