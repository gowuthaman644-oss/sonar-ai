from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.database.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)

    scan_id = Column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    filename = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    status = Column(
        String(50),
        default="uploaded"
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    depth_m = Column(
        Float,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    detections = relationship(
        "Detection",
        back_populates="scan",
        cascade="all, delete-orphan"
    )

    analysis = relationship(
        "Analysis",
        back_populates="scan",
        uselist=False,
        cascade="all, delete-orphan"
    )


class ContactTrack(Base):
    __tablename__ = "contact_tracks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    track_id = Column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    class_name = Column(
        String(100),
        nullable=False
    )

    first_observed = Column(
        DateTime,
        default=datetime.utcnow
    )

    last_observed = Column(
        DateTime,
        default=datetime.utcnow
    )

    observation_count = Column(
        Integer,
        default=1
    )

    status = Column(
        String(50),
        default="NEW"
    )

    latest_confidence = Column(
        Float,
        nullable=True
    )

    latest_evidence = Column(
        Float,
        nullable=True
    )

    latest_risk = Column(
        String(50),
        nullable=True
    )

    latest_cx_norm = Column(
        Float,
        nullable=True
    )

    latest_cy_norm = Column(
        Float,
        nullable=True
    )

    latest_w_norm = Column(
        Float,
        nullable=True
    )

    latest_h_norm = Column(
        Float,
        nullable=True
    )

    detections = relationship(
        "Detection",
        back_populates="track",
        foreign_keys="[Detection.track_id]"
    )


class Detection(Base):
    __tablename__ = "detections"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    scan_id = Column(
        Integer,
        ForeignKey("scans.id"),
        nullable=False
    )

    class_name = Column(
        String(100),
        nullable=False
    )

    confidence = Column(
        Float,
        nullable=False
    )

    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)

    track_id = Column(
        String(50),
        ForeignKey("contact_tracks.track_id"),
        nullable=True
    )

    scan = relationship(
        "Scan",
        back_populates="detections"
    )

    track = relationship(
        "ContactTrack",
        back_populates="detections"
    )

    operator_feedback = relationship(
        "OperatorFeedback",
        back_populates="detection",
        uselist=False,
        cascade="all, delete-orphan"
    )


class OperatorFeedback(Base):
    __tablename__ = "operator_feedback"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    detection_id = Column(
        Integer,
        ForeignKey("detections.id"),
        unique=True,
        nullable=False,
        index=True
    )

    decision = Column(
        String(20),
        nullable=False
    )

    reason = Column(
        String(255),
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    detection = relationship(
        "Detection",
        back_populates="operator_feedback"
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    scan_id = Column(
        Integer,
        ForeignKey("scans.id"),
        unique=True,
        nullable=False
    )

    anomaly_score = Column(
        Float,
        default=0
    )

    risk_score = Column(
        Float,
        default=0
    )

    risk_level = Column(
        String(50),
        default="LOW"
    )

    explanation = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    scan = relationship(
        "Scan",
        back_populates="analysis"
    )
