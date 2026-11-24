from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class UploadPreviewResponse(BaseModel):
    filename: str
    file_format: str
    file_size_bytes: int
    detected_columns: List[str] = Field(default_factory=list)
    suggested_mappings: Dict[str, str] = Field(default_factory=dict)
    preview_records: List[Dict[str, Any]] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    requires_manual_mapping: bool = False
    total_preview_count: int = 0


class UploadAcceptedResponse(BaseModel):
    upload_id: str
    status: str
    filename: str
    message: str


class DuplicateConflictResponse(BaseModel):
    detail: str
    is_duplicate: bool = True
    file_hash: str
    existing_upload_id: str
    existing_filename: str
    existing_uploaded_at: datetime
    message: str


class UploadBatchResponse(BaseModel):
    id: str
    source_id: str
    original_filename: str
    file_format: str
    file_size_bytes: int
    file_hash: str
    status: str
    total_records: int
    processed_records: int
    successful_records: int
    failed_records: int
    skipped_records: int
    redacted_records: int
    processing_duration_ms: float
    error_summary_json: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UploadBatchListResponse(BaseModel):
    items: List[UploadBatchResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class UploadRecordError(BaseModel):
    line_number: Optional[int] = None
    raw_content: Optional[str] = None
    error_reason: str


class UploadErrorsResponse(BaseModel):
    upload_id: str
    total_errors: int
    errors: List[UploadRecordError]
