import json
from typing import Optional
from math import ceil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.upload_service import UploadService
from app.services.log_service import LogService
from app.ingestion.ingestion_errors import FileValidationError, DuplicateFileError
from app.schemas.upload import (
    UploadPreviewResponse,
    UploadAcceptedResponse,
    UploadBatchResponse,
    UploadBatchListResponse,
    UploadErrorsResponse,
    UploadRecordError,
)
from app.schemas.log import LogListResponse, LogEntryResponse

router = APIRouter(prefix="/uploads", tags=["Log Ingestion"])


@router.post(
    "/preview",
    response_model=UploadPreviewResponse,
    summary="Preview uploaded log file contents",
)
async def preview_upload(
    file: UploadFile = File(...),
    field_mappings_json: Optional[str] = Form(None),
):
    field_mappings = None
    if field_mappings_json:
        try:
            field_mappings = json.loads(field_mappings_json)
        except Exception:
            field_mappings = None

    try:
        return await UploadService.generate_preview(file, field_mappings)
    except FileValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to preview file: {str(e)}")


@router.post(
    "",
    response_model=UploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload log file for background processing",
)
async def create_upload(
    file: UploadFile = File(...),
    source_id: Optional[str] = Form(None),
    source_name: Optional[str] = Form(None),
    service_name: Optional[str] = Form(None),
    source_description: Optional[str] = Form(None),
    field_mappings_json: Optional[str] = Form(None),
    confirm_duplicate: bool = Form(False),
    db: Session = Depends(get_db),
):
    field_mappings = None
    if field_mappings_json:
        try:
            field_mappings = json.loads(field_mappings_json)
        except Exception:
            field_mappings = None

    try:
        batch = await UploadService.create_upload(
            db=db,
            file=file,
            source_id=source_id,
            source_name=source_name,
            service_name=service_name,
            source_description=source_description,
            field_mappings=field_mappings,
            confirm_duplicate=confirm_duplicate,
        )
        return UploadAcceptedResponse(
            upload_id=batch.id,
            status=batch.status,
            filename=batch.original_filename,
            message="File accepted for background ingestion processing.",
        )
    except DuplicateFileError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": str(e),
                "is_duplicate": True,
                "file_hash": e.file_hash,
                "existing_upload_id": e.existing_batch_id,
                "existing_filename": e.existing_filename,
                "existing_uploaded_at": e.existing_time.isoformat() if e.existing_time else None,
            },
        )
    except FileValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload ingestion error: {str(e)}")


@router.get(
    "",
    response_model=UploadBatchListResponse,
    summary="List upload batch ingestion history",
)
def list_uploads(
    source_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    file_format: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = UploadService.list_uploads(
        db=db,
        source_id=source_id,
        status=status_filter,
        file_format=file_format,
        page=page,
        page_size=page_size,
    )
    total_pages = ceil(total / page_size) if total > 0 else 1
    return UploadBatchListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{upload_id}",
    response_model=UploadBatchResponse,
    summary="Get upload batch processing status and statistics",
)
def get_upload_detail(
    upload_id: str,
    db: Session = Depends(get_db),
):
    batch = UploadService.get_upload(db, upload_id)
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Upload batch '{upload_id}' not found.")
    return batch


@router.get(
    "/{upload_id}/errors",
    response_model=UploadErrorsResponse,
    summary="Get record-level validation errors for an upload batch",
)
def get_upload_errors(
    upload_id: str,
    db: Session = Depends(get_db),
):
    batch = UploadService.get_upload(db, upload_id)
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Upload batch '{upload_id}' not found.")
    raw_errors = UploadService.get_upload_errors(db, upload_id) or []
    errors = [
        UploadRecordError(
            line_number=err.get("line_number"),
            raw_content=err.get("raw_content"),
            error_reason=err.get("error_reason", "Invalid structure"),
        )
        for err in raw_errors
    ]
    return UploadErrorsResponse(
        upload_id=upload_id,
        total_errors=len(errors),
        errors=errors,
    )


@router.get(
    "/{upload_id}/logs",
    response_model=LogListResponse,
    summary="Get paginated logs imported by a specific upload batch",
)
def get_upload_logs(
    upload_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    batch = UploadService.get_upload(db, upload_id)
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Upload batch '{upload_id}' not found.")
    items, total = LogService.list_logs(db=db, upload_batch_id=upload_id, page=page, page_size=page_size)
    total_pages = ceil(total / page_size) if total > 0 else 1
    return LogListResponse(
        items=[LogEntryResponse.model_validate(it) for it in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "/{upload_id}/cancel",
    summary="Cancel active upload batch processing",
)
def cancel_upload(
    upload_id: str,
    db: Session = Depends(get_db),
):
    batch = UploadService.get_upload(db, upload_id)
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Upload batch '{upload_id}' not found.")
    if batch.status in ("COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel upload in '{batch.status}' status.",
        )
    cancelled = UploadService.cancel_upload(db, upload_id)
    if not cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to cancel upload batch.")
    return {"message": "Upload cancellation requested", "upload_id": upload_id, "status": "CANCELLED"}
