import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database.database import get_db, Base
from backend.database.models import Scan, Detection, ContactTrack


class TestTrackingReadAPI(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite:///:memory:',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool
        )
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        
        self.db = TestingSessionLocal()
        
        def override_get_db():
            db = TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()
                
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)

    def test_get_tracks_empty(self):
        res = self.client.get('/api/tracks')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_get_track_detail_not_found(self):
        res = self.client.get('/api/tracks/TRK-9999')
        self.assertEqual(res.status_code, 404)
        self.assertIn('not found', res.json()['detail'])

    def test_get_tracks_and_detail_with_data(self):
        scan = Scan(
            scan_id='SCAN-TEST-001',
            filename='sonar_001.png',
            file_path='uploads/sonar_001.png',
            status='ANALYZED',
            created_at=datetime(2026, 9, 3, 10, 0, 0, tzinfo=timezone.utc)
        )
        self.db.add(scan)
        self.db.commit()

        track = ContactTrack(
            track_id='TRK-0001',
            class_name='WRECK',
            first_observed=datetime(2026, 9, 3, 10, 0, 0, tzinfo=timezone.utc),
            last_observed=datetime(2026, 9, 3, 10, 5, 0, tzinfo=timezone.utc),
            observation_count=2,
            status='ACTIVE',
            latest_confidence=0.88,
            latest_evidence=84.5,
            latest_risk='HIGH',
            latest_cx_norm=0.5,
            latest_cy_norm=0.5,
            latest_w_norm=0.1,
            latest_h_norm=0.1
        )
        self.db.add(track)
        self.db.commit()

        det1 = Detection(
            scan_id='SCAN-TEST-001',
            track_id='TRK-0001',
            class_name='WRECK',
            confidence=0.82,
            x=300.0,
            y=300.0,
            width=60.0,
            height=60.0
        )
        det2 = Detection(
            scan_id='SCAN-TEST-001',
            track_id='TRK-0001',
            class_name='WRECK',
            confidence=0.88,
            x=305.0,
            y=302.0,
            width=62.0,
            height=61.0
        )
        self.db.add_all([det1, det2])
        self.db.commit()

        res = self.client.get('/api/tracks')
        self.assertEqual(res.status_code, 200)
        tracks_data = res.json()
        self.assertEqual(len(tracks_data), 1)
        self.assertEqual(tracks_data[0]['track_id'], 'TRK-0001')
        self.assertEqual(tracks_data[0]['class_name'], 'WRECK')
        self.assertEqual(tracks_data[0]['status'], 'ACTIVE')
        self.assertEqual(tracks_data[0]['observation_count'], 2)

        res_det = self.client.get('/api/tracks/TRK-0001')
        self.assertEqual(res_det.status_code, 200)
        detail = res_det.json()
        self.assertEqual(detail['track_id'], 'TRK-0001')
        self.assertEqual(detail['observation_count'], 2)
        self.assertEqual(len(detail['observations']), 2)
        self.assertEqual(detail['observations'][0]['observation_index'], 1)
        self.assertEqual(detail['observations'][1]['observation_index'], 2)
        self.assertEqual(detail['confidence_trend'], [0.82, 0.88])


if __name__ == '__main__':
    unittest.main()
