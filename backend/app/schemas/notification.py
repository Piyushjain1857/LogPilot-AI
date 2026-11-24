from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    severity: str = Field("INFO", description="INFO, WARNING, CRITICAL")
    category: str = Field("SYSTEM", description="INCIDENT, ANOMALY, PLAYBOOK, SYSTEM")
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
