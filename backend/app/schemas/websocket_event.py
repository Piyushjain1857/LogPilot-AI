from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SubscriptionFilter(BaseModel):
    severities: Optional[List[str]] = Field(default_factory=list, description="Filter by severities (e.g. ERROR, CRITICAL)")
    services: Optional[List[str]] = Field(default_factory=list, description="Filter by service names")
    source_ids: Optional[List[str]] = Field(default_factory=list, description="Filter by source UUIDs")


class ClientSubscribeMessage(BaseModel):
    type: str = Field("subscribe", description="Message type: subscribe, unsubscribe, ping")
    filters: Optional[SubscriptionFilter] = None
    after_sequence: Optional[int] = Field(None, description="Sequence cursor for missed event recovery")


class WebSocketEvent(BaseModel):
    version: int = 1
    type: str
    sequence: int
    timestamp: str
    data: Dict[str, Any]
