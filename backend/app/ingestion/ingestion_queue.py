import asyncio
from typing import NamedTuple, List, Dict, Any, Optional
from datetime import datetime
from app.core.config import settings


class IngestionJob(NamedTuple):
    receipt_id: str
    source_id: str
    batch_id: Optional[str]
    ingestion_method: str
    records: List[Dict[str, Any]]
    submitted_at: datetime


class IngestionQueue:
    """Bounded, thread-safe asynchronous queue for pending log ingestion jobs."""

    def __init__(self, maxsize: int = settings.MAX_INGESTION_QUEUE_SIZE):
        self._maxsize = maxsize
        self._queue: Optional[asyncio.Queue] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _ensure_queue(self) -> asyncio.Queue:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._queue is None or (current_loop and self._loop != current_loop):
            self._loop = current_loop
            self._queue = asyncio.Queue(maxsize=self._maxsize)
        return self._queue

    @property
    def qsize(self) -> int:
        if self._queue is None:
            return 0
        return self._queue.qsize()

    @property
    def maxsize(self) -> int:
        return self._maxsize

    @property
    def is_full(self) -> bool:
        if self._queue is None:
            return False
        return self._queue.full()

    async def put(self, job: IngestionJob) -> None:
        """Pushes an ingestion job into the bounded queue. Raises QueueFull if full."""
        q = self._ensure_queue()
        q.put_nowait(job)

    async def get(self) -> IngestionJob:
        """Pulls the next ingestion job from the queue."""
        q = self._ensure_queue()
        return await q.get()

    def task_done(self) -> None:
        if self._queue is not None:
            self._queue.task_done()


ingestion_queue = IngestionQueue()
