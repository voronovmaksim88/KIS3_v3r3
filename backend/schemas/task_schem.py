# schemas/task_schem.py
"""
Схемы для заказов
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID


# Схема для задачи
class TaskSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status_id: Optional[int] = None
    payment_status_id: Optional[int] = None
    executor: str = None
    planned_duration: Optional[timedelta] = None
    actual_duration: Optional[timedelta] = None
    creation_moment: Optional[datetime] = None
    start_moment: Optional[datetime] = None
    deadline_moment: Optional[datetime] = None
    end_moment: Optional[datetime] = None
    price: Optional[int] = None
    parent_task_id: Optional[int] = None
    root_task_id: Optional[int] = None

    class Config:
        from_attributes = True


class TaskStatusSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TaskPaymentStatusSchema(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class OrderSchema(BaseModel):
    serial: str
    name: str

    class Config:
        from_attributes = True


class PersonSchema(BaseModel):
    uuid: UUID
    name: str
    surname: str
    patronymic: Optional[str] = None

    class Config:
        from_attributes = True


class TaskRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status_id: Optional[int] = None
    payment_status: Optional[TaskPaymentStatusSchema] = None
    executor: Optional[PersonSchema] = None
    planned_duration: Optional[timedelta] = None
    actual_duration: Optional[timedelta] = None
    creation_moment: Optional[datetime] = None
    start_moment: Optional[datetime] = None
    deadline_moment: Optional[datetime] = None
    end_moment: Optional[datetime] = None
    price: Optional[int] = None
    order: Optional[OrderSchema] = None
    parent_task_id: Optional[int] = None
    root_task_id: Optional[int] = None

    class Config:
        from_attributes = True


class PaginatedTaskResponse(BaseModel):
    total: int
    limit: int
    skip: int
    data: List[TaskRead]
