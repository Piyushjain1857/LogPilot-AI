from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

DEFAULT_NOTIFICATIONS = [
    {
        "title": "AIOps Command Center Active",
        "message": "Real-time telemetry pulse synchronized across 7 distributed services.",
        "severity": "INFO",
        "category": "SYSTEM",
        "link": "/app",
    },
    {
        "title": "Remediation Playbook PB-101 Available",
        "message": "PostgreSQL connection pool recovery runbook configured with HITL safety gate.",
        "severity": "INFO",
        "category": "PLAYBOOK",
        "link": "/app/remediation",
    },
    {
        "title": "Multi-Signal Anomaly Engine Initialized",
        "message": "Z-score, Rolling MAD, and Isolation Forest monitors active on log ingestion stream.",
        "severity": "INFO",
        "category": "ANOMALY",
        "link": "/app/anomalies",
    },
]


def _seed_notifications_if_empty(db: Session):
    count = db.query(Notification).count()
    if count == 0:
        for n in DEFAULT_NOTIFICATIONS:
            notif = Notification(
                title=n["title"],
                message=n["message"],
                severity=n["severity"],
                category=n["category"],
                link=n["link"],
                is_read=False,
            )
            db.add(notif)
        db.commit()


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread alerts"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Returns recent notification alerts for the operator."""
    _seed_notifications_if_empty(db)
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/clear")
def clear_all_notifications(db: Session = Depends(get_db)):
    """Marks all notifications as read."""
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
