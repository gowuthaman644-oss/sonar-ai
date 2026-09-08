import unittest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database.database import Base, SessionLocal
from backend.database.models import ContactTrack, Detection, Scan, Analysis
from backend.services.tracking_service import (
    TargetAssociator,
    normalize_bbox,
    compute_dimension_similarity,
    compute_normalized_iou,
    calculate_track_trends,
    generate_next_track_id,
    determine_track_status,
    evaluate_association
)

class TestTrackingService(unittest.TestCase):
    """
    Phase 5.2 Unit Test Suite: Multi-Signal Temporal Target Associator Service.
    Tests all 20+ operational scenarios for safe, conservative target tracking.
    """

    def setUp(self):
        # Isolated in-memory database for tracking tests
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.associator = TargetAssociator()

    def tearDown(self):
        self.db.close()

    def _create_scan(self, scan_id="SCAN-001", offset_seconds=0):
        scan = Scan(
            scan_id=scan_id,
            filename=f"{scan_id}.png",
            file_path=f"outputs/{scan_id}.png",
            created_at=datetime.utcnow() + timedelta(seconds=offset_seconds)
        )
        self.db.add(scan)
        self.db.commit()
        return scan

    # -------------------------------------------------------------------------
    # 1. Same Target Across Consecutive Scans
    # -------------------------------------------------------------------------
    def test_01_same_target_consecutive_scans(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 60)

        # Scan 1: Candidate detection
        c1 = {"class_name": "mine", "confidence": 0.85, "x": 100, "y": 100, "width": 40, "height": 40}
        track1, is_new1, tel1 = self.associator.associate_detection(self.db, c1, s1, 640, 640, 75.0, "HIGH")
        self.assertTrue(is_new1)
        self.assertEqual(track1.track_id, "TRK-0001")

        # Link detection to track (as done in analyze pipeline)
        d1 = Detection(scan_id=s1.id, class_name="mine", confidence=0.85, x=100, y=100, width=40, height=40, track_id=track1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Scan 2: Same location
        c2 = {"class_name": "mine", "confidence": 0.88, "x": 102, "y": 101, "width": 41, "height": 39}
        track2, is_new2, tel2 = self.associator.associate_detection(self.db, c2, s2, 640, 640, 80.0, "HIGH")

        self.assertFalse(is_new2, "Should associate with existing track")
        self.assertEqual(track2.track_id, track1.track_id)
        self.assertEqual(track2.observation_count, 2)
        self.assertEqual(track2.status, "ACTIVE")

    # -------------------------------------------------------------------------
    # 2. Same Target with Moderate Spatial Displacement
    # -------------------------------------------------------------------------
    def test_02_moderate_displacement(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)

        c1 = {"class_name": "wreck", "confidence": 0.80, "x": 200, "y": 200, "width": 60, "height": 50}
        track1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640, 70.0)
        d1 = Detection(scan_id=s1.id, class_name="wreck", confidence=0.80, x=200, y=200, width=60, height=50, track_id=track1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Moderate displacement (~5% of frame: 32 pixels out of 640)
        c2 = {"class_name": "wreck", "confidence": 0.84, "x": 230, "y": 215, "width": 58, "height": 52}
        track2, is_new2, tel2 = self.associator.associate_detection(self.db, c2, s2, 640, 640, 76.0)

        self.assertFalse(is_new2)
        self.assertEqual(track2.track_id, track1.track_id)
        self.assertEqual(track2.observation_count, 2)

    # -------------------------------------------------------------------------
    # 3. Same Target with Different Image Resolution
    # -------------------------------------------------------------------------
    def test_03_different_image_resolution(self):
        s1 = self._create_scan("SCAN-RES1", 0)
        s2 = self._create_scan("SCAN-RES2", 30)

        # Resolution 640x640: target at center (320, 320), size (64, 64) -> norm center (0.55, 0.55)
        c1 = {"class_name": "airplane", "confidence": 0.90, "x": 320, "y": 320, "width": 64, "height": 64}
        track1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640, 85.0)
        d1 = Detection(scan_id=s1.id, class_name="airplane", confidence=0.90, x=320, y=320, width=64, height=64, track_id=track1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Resolution 1280x1280: target at center (645, 642), size (128, 126) -> same normalized coords
        c2 = {"class_name": "airplane", "confidence": 0.92, "x": 645, "y": 642, "width": 128, "height": 126}
        track2, is_new2, _ = self.associator.associate_detection(self.db, c2, s2, 1280, 1280, 88.0)

        self.assertFalse(is_new2, "Normalized scale invariance should correctly match across resolutions")
        self.assertEqual(track2.track_id, track1.track_id)

    # -------------------------------------------------------------------------
    # 4. Same Class but Different Nearby Target
    # -------------------------------------------------------------------------
    def test_04_different_nearby_target(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)

        # Target 1: at (100, 100)
        c1 = {"class_name": "mine", "confidence": 0.85, "x": 100, "y": 100, "width": 30, "height": 30}
        t1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640)
        d1 = Detection(scan_id=s1.id, class_name="mine", confidence=0.85, x=100, y=100, width=30, height=30, track_id=t1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Target 2: 180 pixels away (> 25% of frame, beyond 0.15 threshold)
        c2 = {"class_name": "mine", "confidence": 0.82, "x": 280, "y": 100, "width": 32, "height": 30}
        t2, is_new2, _ = self.associator.associate_detection(self.db, c2, s2, 640, 640)

        self.assertTrue(is_new2, "Distinct nearby target outside threshold must create separate track")
        self.assertNotEqual(t1.track_id, t2.track_id)

    # -------------------------------------------------------------------------
    # 5. Different Classes (Strict Hard Gate)
    # -------------------------------------------------------------------------
    def test_05_different_classes_never_merge(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)

        # Scan 1: mine at (150, 150)
        c1 = {"class_name": "mine", "confidence": 0.75, "x": 150, "y": 150, "width": 40, "height": 40}
        t1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640)
        d1 = Detection(scan_id=s1.id, class_name="mine", confidence=0.75, x=150, y=150, width=40, height=40, track_id=t1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Scan 2: wreck at exact same coordinates (150, 150)
        c2 = {"class_name": "wreck", "confidence": 0.80, "x": 150, "y": 150, "width": 40, "height": 40}
        t2, is_new2, _ = self.associator.associate_detection(self.db, c2, s2, 640, 640)

        self.assertTrue(is_new2, "Different classes must NEVER be merged into the same track")
        self.assertNotEqual(t1.track_id, t2.track_id)
        self.assertEqual(t2.class_name, "wreck")

    # -------------------------------------------------------------------------
    # 6. Large Spatial Displacement
    # -------------------------------------------------------------------------
    def test_06_large_spatial_displacement(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)

        c1 = {"class_name": "drowning victim", "confidence": 0.81, "x": 50, "y": 50, "width": 30, "height": 30}
        t1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640)
        d1 = Detection(scan_id=s1.id, class_name="drowning victim", confidence=0.81, x=50, y=50, width=30, height=30, track_id=t1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Far away across the image
        c2 = {"class_name": "drowning victim", "confidence": 0.83, "x": 500, "y": 500, "width": 30, "height": 30}
        t2, is_new2, _ = self.associator.associate_detection(self.db, c2, s2, 640, 640)

        self.assertTrue(is_new2)
        self.assertNotEqual(t1.track_id, t2.track_id)

    # -------------------------------------------------------------------------
    # 7. Dimension Mismatch
    # -------------------------------------------------------------------------
    def test_07_dimension_mismatch(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)

        # Target 1: small object (width 20, height 20)
        c1 = {"class_name": "wreck", "confidence": 0.70, "x": 200, "y": 200, "width": 20, "height": 20}
        t1, _, _ = self.associator.associate_detection(self.db, c1, s1, 640, 640)
        d1 = Detection(scan_id=s1.id, class_name="wreck", confidence=0.70, x=200, y=200, width=20, height=20, track_id=t1.track_id)
        self.db.add(d1)
        self.db.commit()

        # Target 2: same center, but 5x larger box (width 120, height 120) -> ratio < 0.50
        c2 = {"class_name": "wreck", "confidence": 0.75, "x": 150, "y": 150, "width": 120, "height": 120}
        t2, is_new2, _ = self.associator.associate_detection(self.db, c2, s2, 640, 640)

        self.assertTrue(is_new2, "Severe dimension mismatch must not merge")
        self.assertNotEqual(t1.track_id, t2.track_id)

    # -------------------------------------------------------------------------
    # 8. Ambiguous Candidate Rejection
    # -------------------------------------------------------------------------
    def test_08_ambiguous_candidate_rejection(self):
        s1 = self._create_scan("SCAN-01", 0)
        s2 = self._create_scan("SCAN-02", 30)
        s3 = self._create_scan("SCAN-03", 60)

        # Create two existing tracks of same class equidistant from center
        # Track 1 at x=145 (dist to candidate = 55 px = 0.0859 < 0.15)
        t1, _, _ = self.associator.associate_detection(self.db, {"class_name": "mine", "confidence": 0.8, "x": 125, "y": 200, "width": 40, "height": 40}, s1, 640, 640)
        self.db.add(Detection(scan_id=s1.id, class_name="mine", confidence=0.8, x=125, y=200, width=40, height=40, track_id=t1.track_id))
        
        # Track 2 at x=255 (dist between t1 and t2 = 110 px = 0.1718 > 0.15, so they don't merge)
        t2, _, _ = self.associator.associate_detection(self.db, {"class_name": "mine", "confidence": 0.8, "x": 235, "y": 200, "width": 40, "height": 40}, s2, 640, 640)
        self.db.add(Detection(scan_id=s2.id, class_name="mine", confidence=0.8, x=235, y=200, width=40, height=40, track_id=t2.track_id))
        self.db.commit()

        # Candidate exactly halfway: x=180 (center at 200, dist to t1 is 55px, dist to t2 is 55px)
        c_ambiguous = {"class_name": "mine", "confidence": 0.85, "x": 180, "y": 200, "width": 40, "height": 40}
        t3, is_new3, tel3 = self.associator.associate_detection(self.db, c_ambiguous, s3, 640, 640)

        # Must trigger ambiguity protection and create new track instead of arbitrarily picking
        self.assertTrue(is_new3)
        self.assertEqual(tel3.get("reason"), "AMBIGUOUS_MATCH")
        self.assertNotIn(t3.track_id, [t1.track_id, t2.track_id])

    # -------------------------------------------------------------------------
    # 9. Observation Count and Status Progression (NEW -> ACTIVE -> RECURRENT)
    # -------------------------------------------------------------------------
    def test_09_observation_count_and_status_progression(self):
        s1 = self._create_scan("S1", 0)
        s2 = self._create_scan("S2", 10)
        s3 = self._create_scan("S3", 20)

        # Pass 1: NEW
        c = {"class_name": "airplane", "confidence": 0.70, "x": 300, "y": 300, "width": 50, "height": 50}
        t, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640)
        self.assertEqual(t.status, "NEW")
        self.assertEqual(t.observation_count, 1)
        self.db.add(Detection(scan_id=s1.id, class_name="airplane", confidence=0.70, x=300, y=300, width=50, height=50, track_id=t.track_id))
        self.db.commit()

        # Pass 2: ACTIVE
        t, _, _ = self.associator.associate_detection(self.db, c, s2, 640, 640)
        self.assertEqual(t.status, "ACTIVE")
        self.assertEqual(t.observation_count, 2)
        self.db.add(Detection(scan_id=s2.id, class_name="airplane", confidence=0.75, x=300, y=300, width=50, height=50, track_id=t.track_id))
        self.db.commit()

        # Pass 3: RECURRENT
        t, _, _ = self.associator.associate_detection(self.db, c, s3, 640, 640)
        self.assertEqual(t.status, "RECURRENT")
        self.assertEqual(t.observation_count, 3)

    # -------------------------------------------------------------------------
    # 10. Single-Observation Trend Handling
    # -------------------------------------------------------------------------
    def test_10_single_observation_trend(self):
        obs = [{"confidence": 0.85, "evidence": 78.0, "risk": "HIGH"}]
        trends = calculate_track_trends(obs)
        self.assertEqual(trends["confidence_direction"], "unavailable")
        self.assertEqual(trends["evidence_direction"], "unavailable")
        self.assertIn("unavailable", trends["trend_summary"].lower())

    # -------------------------------------------------------------------------
    # 11. Multi-Observation Confidence & Evidence Trends
    # -------------------------------------------------------------------------
    def test_11_multi_observation_trends(self):
        obs = [
            {"confidence": 0.71, "evidence": 62.0, "risk": "MEDIUM"},
            {"confidence": 0.754, "evidence": 69.5, "risk": "HIGH"},
            {"confidence": 0.862, "evidence": 91.0, "risk": "CRITICAL"}
        ]
        trends = calculate_track_trends(obs)
        self.assertEqual(trends["observation_count"], 3)
        self.assertEqual(trends["confidence_direction"], "increasing")
        self.assertEqual(trends["evidence_direction"], "increasing")
        self.assertEqual(trends["confidence_trend"], [0.71, 0.754, 0.862])
        self.assertEqual(trends["evidence_trend"], [62.0, 69.5, 91.0])
        self.assertEqual(trends["risk_trend"], ["MEDIUM", "HIGH", "CRITICAL"])

    # -------------------------------------------------------------------------
    # 12. Missing Evidence / Confidence / Risk
    # -------------------------------------------------------------------------
    def test_12_missing_telemetry_fields(self):
        obs = [
            {"confidence": 0.70, "evidence": None, "risk": None},
            {"confidence": 0.80, "evidence": 85.0, "risk": "HIGH"}
        ]
        trends = calculate_track_trends(obs)
        self.assertEqual(trends["confidence_trend"], [0.70, 0.80])
        self.assertEqual(trends["evidence_trend"], [85.0])
        self.assertEqual(trends["risk_trend"], ["HIGH"])
        self.assertEqual(trends["confidence_direction"], "increasing")
        # Evidence has only 1 point, so evidence direction cannot be calculated
        self.assertEqual(trends["evidence_direction"], "unavailable")

    # -------------------------------------------------------------------------
    # 13. Track ID Uniqueness and Non-Collision
    # -------------------------------------------------------------------------
    def test_13_track_id_uniqueness(self):
        t1 = generate_next_track_id(self.db)
        self.assertEqual(t1, "TRK-0001")
        self.db.add(ContactTrack(track_id=t1, class_name="mine"))
        self.db.commit()

        t2 = generate_next_track_id(self.db)
        self.assertEqual(t2, "TRK-0002")

    # -------------------------------------------------------------------------
    # 14. Restart & Persistence Behavior
    # -------------------------------------------------------------------------
    def test_14_persistence_after_restart(self):
        s1 = self._create_scan("SCAN-RESTART", 0)
        c = {"class_name": "mine", "confidence": 0.82, "x": 100, "y": 100, "width": 40, "height": 40}
        t, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640)
        track_id_str = t.track_id
        self.db.add(Detection(scan_id=s1.id, class_name="mine", confidence=0.82, x=100, y=100, width=40, height=40, track_id=track_id_str))
        self.db.commit()
        self.db.close()

        # Simulate new session
        db2 = self.Session()
        loaded = db2.query(ContactTrack).filter_by(track_id=track_id_str).first()
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.class_name, "mine")
        self.assertEqual(len(loaded.detections), 1)
        db2.close()

    # -------------------------------------------------------------------------
    # 15. Absolute Integrity of Historical Database (302 legacy detections)
    # -------------------------------------------------------------------------
    def test_15_legacy_database_integrity(self):
        db = SessionLocal()
        try:
            scans_count = db.query(Scan).count()
            detections_count = db.query(Detection).count()
            analyses_count = db.query(Analysis).count()

            self.assertEqual(scans_count, 119)
            self.assertEqual(detections_count, 302)
            self.assertEqual(analyses_count, 114)

            # Assert all legacy detections have NULL track_id
            null_count = db.query(Detection).filter(Detection.track_id.is_(None)).count()
            self.assertEqual(null_count, 302, "All 302 legacy detections must retain track_id = NULL")
        finally:
            db.close()

    # -------------------------------------------------------------------------
    # 16. Tracking Never Alters Original YOLO Confidence
    # -------------------------------------------------------------------------
    def test_16_tracking_does_not_alter_yolo_confidence(self):
        s1 = self._create_scan("SCAN-CONF", 0)
        c = {"class_name": "mine", "confidence": 0.88723, "x": 100, "y": 100, "width": 40, "height": 40}
        original_conf = c["confidence"]
        track, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640)
        self.assertEqual(c["confidence"], original_conf, "Tracking must NEVER alter candidate YOLO confidence")

    # -------------------------------------------------------------------------
    # 17. Tracking Never Alters Original Acoustic Evidence Score
    # -------------------------------------------------------------------------
    def test_17_tracking_does_not_alter_evidence_score(self):
        s1 = self._create_scan("SCAN-EV", 0)
        c = {"class_name": "wreck", "confidence": 0.75, "x": 200, "y": 200, "width": 60, "height": 50}
        evidence_score = 83.456
        track, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640, evidence_score=evidence_score)
        self.assertEqual(track.latest_evidence, evidence_score)

    # -------------------------------------------------------------------------
    # 18. Tracking Never Alters Authoritative Risk Level
    # -------------------------------------------------------------------------
    def test_18_tracking_does_not_alter_risk_score(self):
        s1 = self._create_scan("SCAN-RISK", 0)
        c = {"class_name": "drowning victim", "confidence": 0.91, "x": 150, "y": 150, "width": 35, "height": 35}
        track, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640, risk_level="HIGH")
        self.assertEqual(track.latest_risk, "HIGH", "Authoritative Risk Engine level must be preserved")

    # -------------------------------------------------------------------------
    # 19. Chronological Scan Order Handling
    # -------------------------------------------------------------------------
    def test_19_chronological_ordering(self):
        t0 = datetime(2026, 9, 3, 9, 0, 0)
        t1 = datetime(2026, 9, 3, 9, 15, 0)
        s1 = Scan(scan_id="SCAN-T1", filename="t1.png", file_path="t1.png", created_at=t0)
        s2 = Scan(scan_id="SCAN-T2", filename="t2.png", file_path="t2.png", created_at=t1)
        self.db.add_all([s1, s2])
        self.db.commit()

        c = {"class_name": "airplane", "confidence": 0.80, "x": 250, "y": 250, "width": 50, "height": 50}
        track, _, _ = self.associator.associate_detection(self.db, c, s1, 640, 640)
        self.assertEqual(track.first_observed, t0)
        self.assertEqual(track.last_observed, t0)

        # Observation 2 at t1
        track, _, _ = self.associator.associate_detection(self.db, c, s2, 640, 640)
        self.assertEqual(track.first_observed, t0)
        self.assertEqual(track.last_observed, t1)

    # -------------------------------------------------------------------------
    # 20. Lookback Limit Respects Boundary
    # -------------------------------------------------------------------------
    def test_20_lookback_limit_respects_boundary(self):
        associator_short = TargetAssociator(lookback_limit=2)
        s = self._create_scan("SCAN-LIMIT", 0)
        # Create 3 distinct tracks
        for i in range(3):
            c = {"class_name": "mine", "confidence": 0.80, "x": 50 + (i * 120), "y": 100, "width": 30, "height": 30}
            associator_short.associate_detection(self.db, c, s, 640, 640)
        
        tracks_count = self.db.query(ContactTrack).count()
        self.assertEqual(tracks_count, 3)

if __name__ == "__main__":
    unittest.main()
