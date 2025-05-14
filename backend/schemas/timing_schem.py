# schemas/timing_schem.py
"""
Схемы для таймингов
"""

from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timedelta
import uuid


# Схема для тайминга
class TimingSchema(BaseModel):
    id: int
    task_id: int
    executor_id: Optional[uuid.UUID] = None
    time: timedelta
    timing_date: Optional[datetime] = None

    class Config:
        from_attributes = True
