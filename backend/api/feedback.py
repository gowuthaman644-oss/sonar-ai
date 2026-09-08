from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Detection, OperatorFeedback
from backend.schemas.analysis import (
    OperatorFeedbackCreate,
    OperatorFeedbackResponse,
    OperatorDecision,
)

router = APIRouter(
    prefix='/api',
    tags=['Operator Feedback']
)


@router.post(
    '/feedback',
    response_model=OperatorFeedbackResponse,
    status_code=status.HTTP_201_CREATED
)
def create_operator_feedback(
    payload: OperatorFeedbackCreate,
    db: Session = Depends(get_db)
):
    detection = db.query(Detection).filter(Detection.id == payload.detection_id).first()
    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Detection with ID {payload.detection_id} not found.'
        )

    existing_feedback = db.query(OperatorFeedback).filter(
        OperatorFeedback.detection_id == payload.detection_id
    ).first()
    if existing_feedback:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Verification feedback already recorded for detection {payload.detection_id}.'
        )

    feedback = OperatorFeedback(
        detection_id=payload.detection_id,
        decision=payload.decision.value,
        reason=payload.reason.strip() if payload.reason else None,
        notes=payload.notes.strip() if payload.notes else None,
        created_at=datetime.utcnow()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return feedback


@router.get(
    '/feedback/{detection_id}',
    response_model=OperatorFeedbackResponse
)
def get_operator_feedback(
    detection_id: int,
    db: Session = Depends(get_db)
):
    feedback = db.query(OperatorFeedback).filter(
        OperatorFeedback.detection_id == detection_id
    ).first()
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'No verification feedback found for detection {detection_id}.'
        )
    return feedback


@router.get(
    '/feedback',
    response_model=List[OperatorFeedbackResponse]
)
def list_operator_feedback(
    db: Session = Depends(get_db)
): 
    return db.query(OperatorFeedback).order_by(OperatorFeedback.created_at.desc()).all()
