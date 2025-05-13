from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
import logging

from database import get_async_db
from models import Task
from schemas.task_schem import PaginatedTaskResponse

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)


@router.get("/read", response_model=PaginatedTaskResponse)
async def read_tasks(
        skip: int = Query(0, ge=0, description="Number of items to skip"),
        limit: int = Query(10, ge=1, le=100, description="Number of items to return per page"),
        status_id: Optional[int] = Query(None, description="Filter by task status ID"),
        order_serial: Optional[str] = Query(None, description="Filter by order serial"),
        executor_uuid: Optional[UUID] = Query(None, description="Filter by executor UUID"),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Получить список задач с пагинацией и опциональной фильтрацией.

    Параметры:
    - skip: Количество задач, которые нужно пропустить для пагинации.
    - limit: Максимальное количество задач на странице.
    - status_id: Фильтр по ID статуса задачи (например, 1 для "Не начата").
    - order_serial: Фильтр по серийному номеру заказа.
    - executor_uuid: Фильтр по UUID исполнителя.

    Возвращает:
    - PaginatedTaskResponse с общим количеством, параметрами пагинации и данными задач.
    """
    try:
        # Логируем входные параметры
        logger.info(f"Received request with skip={skip}, limit={limit}, status_id={status_id}, "
                    f"order_serial={order_serial}, executor_uuid={executor_uuid}")

        # Основной запрос с подгрузкой связанных моделей
        query = select(Task).options(
            selectinload(Task.status),
            selectinload(Task.payment_status),
            selectinload(Task.order),
            selectinload(Task.executor)  # Теперь работает, так как отношение определено
        )

        # Запрос для подсчета общего количества задач
        count_query = select(func.count(Task.id))

        # Применяем фильтры
        if status_id is not None:
            if status_id not in [1, 2, 3, 4, 5]:
                raise HTTPException(status_code=400, detail="Invalid status_id. Must be between 1 and 5.")
            query = query.where(Task.status_id == status_id)
            count_query = count_query.where(Task.status_id == status_id)

        if order_serial is not None:
            query = query.where(Task.order_serial == order_serial)
            count_query = count_query.where(Task.order_serial == order_serial)

        if executor_uuid is not None:
            query = query.where(Task.executor_uuid == executor_uuid)
            count_query = count_query.where(Task.executor_uuid == executor_uuid)

        # Выполняем запрос на подсчет
        total_result = await session.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        logger.info(f"Total tasks found: {total}")

        # Применяем пагинацию
        query = query.offset(skip).limit(limit)

        # Выполняем основной запрос
        result = await session.execute(query)
        tasks = result.scalars().unique().all()
        logger.info(f"Retrieved {len(tasks)} tasks")

        # Проверяем, есть ли задачи
        if not tasks and total == 0:
            logger.warning("No tasks found matching the criteria")

        return PaginatedTaskResponse(
            total=total,
            limit=limit,
            skip=skip,
            data=tasks
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving tasks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении задач: {str(e)}"
        )