import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database.database import get_db, Base
from backend.database.models import Scan, Detection, Analysis, ContactTrack, OperatorFeedback


class TestOperatorFeedback(unittest.TestCase):
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

        # Create a fixture scan and detections
        self.scan = Scan(
            scan_id='SCAN-FB-001',
            filename='sonar_fb_001.png',
            file_path='uploads/sonar_fb_001.png',
            status='ANALYZED'
        )
        self.db.add(self.scan)
        self.db.commit()

        self.det1 = Detection(
            scan_id=self.scan.id,
            class_name='WRECK',
            confidence=0.874,
            x=288.8,
            y=31.7,
            width=84.2,
            height=84.2,
            track_id='TRK-0042'
        )
        self.det2 = Detection(
            scan_id=self.scan.id,
            class_name='MINE',
            confidence=0.640,
            x=150.0,
            y=150.0,
            width=40.0,
            height=40.0
        )
        self.det3 = Detection(
            scan_id=self.scan.id,
            class_name='PLANE',
            confidence=0.550,
            x=400.0,
            y=400.0,
            width=60.0,
            height=60.0
        )
        self.db.add_all([self.det1, self.det2, self.det3])
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_01_valid_confirm_feedback(self):
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'CONFIRM',
                'reason': 'Strong object-shadow consistency',
                'notes': 'Confirmed wreck structure per sobel and TBCR.'
            }
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['decision'], 'CONFIRM')
        self.assertEqual(data['detection_id'], self.det1.id)
        self.assertEqual(data['reason'], 'Strong object-shadow consistency')

    def test_02_valid_reject_feedback(self):
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det2.id,
                'decision': 'REJECT',
                'reason': 'Acoustic clutter',
                'notes': 'Likely seabed reverberation noise.'
            }
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['decision'], 'REJECT')

    def test_03_valid_uncertain_feedback(self):
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det3.id,
                'decision': 'UNCERTAIN',
                'reason': 'Ambiguous acoustic return',
                'notes': 'Requires higher-frequency pass.'
            }
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['decision'], 'UNCERTAIN')

    def test_04_invalid_decision_rejected(self):
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'NOT_A_VALID_DECISION'
            }
        )
        self.assertEqual(res.status_code, 422)

    def test_05_nonexistent_detection_rejected(self):
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': 999999,
                'decision': 'CONFIRM'
            }
        )
        self.assertEqual(res.status_code, 404)
        self.assertIn('not found', res.json()['detail'].lower())

    def test_06_duplicate_feedback_safely_rejected(self):
        # First submission
        res1 = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'CONFIRM'
            }
        )
        self.assertEqual(res1.status_code, 201)

        # Second submission on same detection
        res2 = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'REJECT'
            }
        )
        self.assertEqual(res2.status_code, 409)
        self.assertIn('already recorded', res2.json()['detail'].lower())

    def test_07_feedback_retrieval_by_detection_id(self):
        # Unverified should return 404
        res_none = self.client.get(f'/api/feedback/{self.det1.id}')
        self.assertEqual(res_none.status_code, 404)

        # Submit feedback
        self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'CONFIRM',
                'reason': 'Verified Wreck'
            }
        )

        # Now retrieval should succeed
        res = self.client.get(f'/api/feedback/{self.det1.id}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['decision'], 'CONFIRM')
        self.assertEqual(data['detection_id'], self.det1.id)

    def test_08_list_feedback(self):
        self.client.post(
            '/api/feedback',
            json={'detection_id': self.det1.id, 'decision': 'CONFIRM'}
        )
        self.client.post(
            '/api/feedback',
            json={'detection_id': self.det2.id, 'decision': 'REJECT'}
        )

        res = self.client.get('/api/feedback')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)

    def test_09_original_detection_and_ai_predictions_strictly_immutable(self):
        orig_cls = self.det1.class_name
        orig_conf = self.det1.confidence
        orig_x = self.det1.x
        orig_y = self.det1.y
        orig_w = self.det1.width
        orig_h = self.det1.height
        orig_track = self.det1.track_id

        # Operator REJECTS this detection
        res = self.client.post(
            '/api/feedback',
            json={
                'detection_id': self.det1.id,
                'decision': 'REJECT',
                'reason': 'Acoustic Clutter'
            }
        )
        self.assertEqual(res.status_code, 201)

        # Query back from DB
        db_det = self.db.query(Detection).filter(Detection.id == self.det1.id).first()
        self.assertEqual(db_det.class_name, orig_cls)
        self.assertEqual(db_det.confidence, orig_conf)
        self.assertEqual(db_det.x, orig_x)
        self.assertEqual(db_det.y, orig_y)
        self.assertEqual(db_det.width, orig_w)
        self.assertEqual(db_det.height, orig_h)
        self.assertEqual(db_det.track_id, orig_track)
        self.assertIsNotNone(db_det.operator_feedback)
        self.assertEqual(db_det.operator_feedback.decision, 'REJECT')


if __name__ == '__main__':
    unittest.main()
