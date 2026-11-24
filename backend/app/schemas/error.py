from typing import Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None
    status_code: int
