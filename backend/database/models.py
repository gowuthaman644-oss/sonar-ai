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

    scan = relationship(
        "Scan",
        back_populates="detections"
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
