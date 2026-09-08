import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database.database import get_db, Base
from backend.database.models import Scan, Detection, ContactTrack
from backend.services.tracking_service import TargetAssociator, calculate_track_trends


class TestPhase5RegressionValidation(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite:///:memory:',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool
        )
        self.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        
        self.db = self.TestingSessionLocal()
        
        def override_get_db():
            db = self.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()
                
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.associator = TargetAssociator()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_part5_tracking_lifecycle_recurrent(self):
        # Scan 1
        scan1 = Scan(scan_id='SCAN-001', filename='s1.png', file_path='p1', status='ANALYZED', created_at=datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc))
        self.db.add(scan1)
        self.db.commit()
        
        det1 = {'class_name': 'WRECK', 'confidence': 0.75, 'x': 300.0, 'y': 300.0, 'width': 80.0, 'height': 80.0}
        trk1, is_new1, tel1 = self.associator.associate_detection(self.db, det1, scan1, 640.0, 640.0, evidence_score=65.0, risk_level='MEDIUM')
        self.assertTrue(is_new1)
        self.assertEqual(trk1.observation_count, 1)
        self.assertEqual(trk1.status, 'NEW')
        
        # Link detection to db
        db_det1 = Detection(scan_id=scan1.id, track_id=trk1.track_id, class_name='WRECK', confidence=0.75, x=300.0, y=300.0, width=80.0, height=80.0)
        self.db.add(db_det1)
        self.db.commit()

        # Scan 2 (compatible displacement)
        scan2 = Scan(scan_id='SCAN-002', filename='s2.png', file_path='p2', status='ANALYZED', created_at=datetime(2026, 9, 5, 10, 5, tzinfo=timezone.utc))
        self.db.add(scan2)
        self.db.commit()

        det2 = {'class_name': 'WRECK', 'confidence': 0.82, 'x': 305.0, 'y': 302.0, 'width': 82.0, 'height': 81.0}
        trk2, is_new2, tel2 = self.associator.associate_detection(self.db, det2, scan2, 640.0, 640.0, evidence_score=78.0, risk_level='HIGH')
        self.assertFalse(is_new2)
        self.assertEqual(trk2.track_id, trk1.track_id)
        self.assertEqual(trk2.observation_count, 2)
        self.assertEqual(trk2.status, 'ACTIVE')

        db_det2 = Detection(scan_id=scan2.id, track_id=trk2.track_id, class_name='WRECK', confidence=0.82, x=305.0, y=302.0, width=82.0, height=81.0)
        self.db.add(db_det2)
        self.db.commit()

        # Scan 3 (third observation -> RECURRENT)
        scan3 = Scan(scan_id='SCAN-003', filename='s3.png', file_path='p3', status='ANALYZED', created_at=datetime(2026, 9, 5, 10, 10, tzinfo=timezone.utc))
        self.db.add(scan3)
        self.db.commit()

        det3 = {'class_name': 'WRECK', 'confidence': 0.89, 'x': 308.0, 'y': 304.0, 'width': 79.0, 'height': 83.0}
        trk3, is_new3, tel3 = self.associator.associate_detection(self.db, det3, scan3, 640.0, 640.0, evidence_score=88.5, risk_level='HIGH')
        self.assertFalse(is_new3)
        self.assertEqual(trk3.track_id, trk1.track_id)
        self.assertEqual(trk3.observation_count, 3)
        self.assertEqual(trk3.status, 'RECURRENT')

        db_det3 = Detection(scan_id=scan3.id, track_id=trk3.track_id, class_name='WRECK', confidence=0.89, x=308.0, y=304.0, width=79.0, height=83.0)
        self.db.add(db_det3)
        self.db.commit()

        # Check detail endpoint
        res = self.client.get(f'/api/tracks/{trk1.track_id}')
        self.assertEqual(res.status_code, 200)
        detail = res.json()
        self.assertEqual(detail['track_id'], trk1.track_id)
        self.assertEqual(detail['status'], 'RECURRENT')
        self.assertEqual(detail['observation_count'], 3)
        self.assertEqual(len(detail['observations']), 3)
        self.assertEqual(detail['confidence_trend'], [0.75, 0.82, 0.89])

    def test_part6_new_track_creation_spatial_isolation(self):
        scan1 = Scan(scan_id='SCAN-S1', filename='s1.png', file_path='p1', status='ANALYZED')
        self.db.add(scan1)
        self.db.commit()

        det_center = {'class_name': 'WRECK', 'confidence': 0.80, 'x': 200.0, 'y': 200.0, 'width': 60.0, 'height': 60.0}
        trk1, is_new1, _ = self.associator.associate_detection(self.db, det_center, scan1, 640.0, 640.0)

        # Distant detection (far corner)
        det_distant = {'class_name': 'WRECK', 'confidence': 0.85, 'x': 550.0, 'y': 550.0, 'width': 60.0, 'height': 60.0}
        trk2, is_new2, _ = self.associator.associate_detection(self.db, det_distant, scan1, 640.0, 640.0)

        self.assertTrue(is_new1)
        self.assertTrue(is_new2)
        self.assertNotEqual(trk1.track_id, trk2.track_id)

    def test_part7_class_compatibility_strict_isolation(self):
        scan1 = Scan(scan_id='SCAN-C1', filename='c1.png', file_path='p1', status='ANALYZED')
        self.db.add(scan1)
        self.db.commit()

        det_wreck = {'class_name': 'WRECK', 'confidence': 0.90, 'x': 320.0, 'y': 320.0, 'width': 70.0, 'height': 70.0}
        trkW, _, _ = self.associator.associate_detection(self.db, det_wreck, scan1, 640.0, 640.0)

        # Same location, different class (MINE)
        det_mine = {'class_name': 'MINE', 'confidence': 0.85, 'x': 321.0, 'y': 320.0, 'width': 68.0, 'height': 71.0}
        trkM, is_newM, _ = self.associator.associate_detection(self.db, det_mine, scan1, 640.0, 640.0)

        self.assertTrue(is_newM)
        self.assertNotEqual(trkW.track_id, trkM.track_id)
        self.assertEqual(trkW.class_name, 'WRECK')
        self.assertEqual(trkM.class_name, 'MINE')

    def test_part8_ambiguity_protection_creates_new_track(self):
        # Create two equidistant candidate tracks
        t1 = ContactTrack(track_id='TRK-A1', class_name='WRECK', observation_count=1, status='NEW', latest_cx_norm=0.48, latest_cy_norm=0.50, latest_w_norm=0.10, latest_h_norm=0.10)
        t2 = ContactTrack(track_id='TRK-A2', class_name='WRECK', observation_count=1, status='NEW', latest_cx_norm=0.52, latest_cy_norm=0.50, latest_w_norm=0.10, latest_h_norm=0.10)
        self.db.add_all([t1, t2])
        self.db.commit()

        scan = Scan(scan_id='SCAN-AMB', filename='amb.png', file_path='p1', status='ANALYZED')
        self.db.add(scan)
        self.db.commit()

        # Candidate exactly in the middle (cx_norm = 0.50)
        det_amb = {'class_name': 'WRECK', 'confidence': 0.85, 'x': 288.0, 'y': 288.0, 'width': 64.0, 'height': 64.0}
        trk, is_new, tel = self.associator.associate_detection(self.db, det_amb, scan, 640.0, 640.0)

        self.assertTrue(is_new)
        self.assertNotIn(trk.track_id, ['TRK-A1', 'TRK-A2'])

    def test_part9_repeated_sequential_association(self):
        # Repetitive scans for the same contact
        scan = Scan(scan_id='SCAN-REP', filename='rep.png', file_path='p1', status='ANALYZED')
        self.db.add(scan)
        self.db.commit()

        det = {'class_name': 'PLANE', 'confidence': 0.80, 'x': 100.0, 'y': 100.0, 'width': 50.0, 'height': 50.0}
        t1, is_new1, _ = self.associator.associate_detection(self.db, det, scan, 640.0, 640.0)
        self.assertTrue(is_new1)
        
        # Subsequent observation of same plane in subsequent scan
        scan2 = Scan(scan_id='SCAN-REP-2', filename='rep2.png', file_path='p2', status='ANALYZED')
        self.db.add(scan2)
        self.db.commit()

        t2, is_new2, _ = self.associator.associate_detection(self.db, det, scan2, 640.0, 640.0)
        self.assertFalse(is_new2)
        self.assertEqual(t1.track_id, t2.track_id)
        self.assertEqual(t2.observation_count, 2)
        
        # Verify total tracks in DB is strictly 1 (no uncontrolled duplicate tracks)
        total_tracks = self.db.query(ContactTrack).count()
        self.assertEqual(total_tracks, 1)

    def test_part10_tracking_failure_isolation_in_analyze(self):
        # Simulate tracking service exception during scan analysis
        with patch('backend.services.tracking_service.default_associator.associate_detection', side_effect=RuntimeError('Database disk I/O lock')):
            with patch('backend.api.analyze.analyze_image') as mock_ai:
                mock_ai.return_value = {
                    'status': 'success',
                    'detections': [{
                        'class_id': 3,
                        'class_name': 'wreck',
                        'confidence': 0.92,
                        'bbox': {'x1': 200.0, 'y1': 200.0, 'x2': 250.0, 'y2': 250.0}
                    }]
                }
                
                # Mock a small 100x100 grayscale image payload
                import io
                from PIL import Image
                img_byte_arr = io.BytesIO()
                Image.new('L', (100, 100), color=128).save(img_byte_arr, format='PNG')
                img_byte_arr.seek(0)
                
                res = self.client.post(
                    '/api/analyze',
                    files={'image': ('mock_sonar.png', img_byte_arr.getvalue(), 'image/png')}
                )
                
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertEqual(len(data['detections']), 1)
                self.assertEqual(data['detections'][0]['class_name'], 'wreck')
                self.assertEqual(data['detections'][0]['tracking'], None)
                self.assertIsNotNone(data['analysis']['risk_level'])

    def test_part11_read_api_comprehensive_suite(self):
        # 1. Zero tracks
        res_empty = self.client.get('/api/tracks')
        self.assertEqual(res_empty.status_code, 200)
        self.assertEqual(res_empty.json(), [])

        # 2. Invalid track ID -> 404
        res_404 = self.client.get('/api/tracks/TRK-NONEXISTENT')
        self.assertEqual(res_404.status_code, 404)

        # 3. Multiple tracks with chronological order
        scan_a = Scan(scan_id='SCAN-A', filename='a.png', file_path='p1', status='ANALYZED', created_at=datetime(2026, 9, 5, 8, 0, tzinfo=timezone.utc))
        scan_b = Scan(scan_id='SCAN-B', filename='b.png', file_path='p2', status='ANALYZED', created_at=datetime(2026, 9, 5, 9, 0, tzinfo=timezone.utc))
        self.db.add_all([scan_a, scan_b])
        self.db.commit()

        trk1 = ContactTrack(track_id='TRK-0001', class_name='WRECK', observation_count=1, status='NEW', first_observed=datetime(2026, 9, 5, 8, 0, tzinfo=timezone.utc), last_observed=datetime(2026, 9, 5, 8, 0, tzinfo=timezone.utc), latest_confidence=0.80)
        trk2 = ContactTrack(track_id='TRK-0002', class_name='MINE', observation_count=1, status='NEW', first_observed=datetime(2026, 9, 5, 9, 0, tzinfo=timezone.utc), last_observed=datetime(2026, 9, 5, 9, 0, tzinfo=timezone.utc), latest_confidence=0.95)
        self.db.add_all([trk1, trk2])
        self.db.commit()

        d1 = Detection(scan_id=scan_a.id, track_id='TRK-0001', class_name='WRECK', confidence=0.80, x=100.0, y=100.0, width=50.0, height=50.0)
        d2 = Detection(scan_id=scan_b.id, track_id='TRK-0002', class_name='MINE', confidence=0.95, x=200.0, y=200.0, width=30.0, height=30.0)
        self.db.add_all([d1, d2])
        self.db.commit()

        res_list = self.client.get('/api/tracks')
        self.assertEqual(res_list.status_code, 200)
        tracks = res_list.json()
        self.assertEqual(len(tracks), 2)
        # Should be sorted by last_observed descending -> TRK-0002 first, TRK-0001 second
        self.assertEqual(tracks[0]['track_id'], 'TRK-0002')
        self.assertEqual(tracks[1]['track_id'], 'TRK-0001')

        # Single observation trend check
        res_det1 = self.client.get('/api/tracks/TRK-0001')
        self.assertEqual(res_det1.status_code, 200)
        det_data1 = res_det1.json()
        self.assertEqual(det_data1['confidence_trend'], [0.80])
        self.assertEqual(len(det_data1['observations']), 1)


if __name__ == '__main__':
    unittest.main()
