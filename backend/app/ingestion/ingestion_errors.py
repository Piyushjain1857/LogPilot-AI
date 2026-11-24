class IngestionError(Exception):
    """Base exception for all log ingestion pipeline errors."""
    pass


class FileValidationError(IngestionError):
    """Raised when an uploaded file violates size, extension, encoding, or format constraints."""
    pass


class DuplicateFileError(IngestionError):
    """Raised when an uploaded file fingerprint matches a previously ingested file."""
    def __init__(self, message: str, file_hash: str, existing_batch_id: str, existing_filename: str, existing_time):
        super().__init__(message)
        self.file_hash = file_hash
        self.existing_batch_id = existing_batch_id
        self.existing_filename = existing_filename
        self.existing_time = existing_time


class ParsingError(IngestionError):
    """Raised when a file parser encounters fatal structural corruption."""
    pass
