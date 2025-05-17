from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
import logging

from database import get_async_db
from models import Task
from schemas.task_schem import PaginatedTaskResponse
from schemas.task_schem import TaskRead

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

        # Добавляем сортировку по id по умолчанию (по возрастанию)
        query = query.order_by(Task.id.asc())

        # Применяем пагинацию
        query = query.offset(skip).limit(limit)

        # Выполняем основной запрос
        result = await session.execute(query)
        tasks = result.scalars().unique().all()
        logger.info(f"Retrieved {len(tasks)} tasks")

        # Проверяем, есть ли задачи
        if not tasks and total == 0:
            logger.warning("No tasks found matching the criteria")

        # Преобразуем ORM-объекты Task в Pydantic-объекты TaskRead
        tasks_data = [TaskRead.model_validate(task) for task in tasks]

        return PaginatedTaskResponse(
            total=total,
            limit=limit,
            skip=skip,
            data=tasks_data
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving tasks: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении задач: {str(e)}"
        )


@router.get("/read/{task_id}", response_model=TaskRead)
async def read_current_task(
        task_id: int,
        session: AsyncSession = Depends(get_async_db)
):
    """
    Получить детальную информацию об одной задаче по её ID.

    Параметры:
    - task_id: ID задачи

    Возвращает:
    - TaskRead: Полная информация о задаче, включая связанные данные
    """
    try:
        # Логируем входные параметры
        logger.info(f"Received request to get task with id={task_id}")

        # Формируем запрос с подгрузкой связанных моделей
        query = select(Task).where(Task.id == task_id).options(
            selectinload(Task.payment_status),
            selectinload(Task.order),
            selectinload(Task.executor)
        )

        # Выполняем запрос
        result = await session.execute(query)
        task = result.scalars().first()

        if not task:
            logger.warning(f"Task with id {task_id} not found")
            raise HTTPException(status_code=404, detail="Task not found")

        logger.info(f"Successfully retrieved task {task_id}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error retrieving task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при получении задачи: {str(e)}"
        )


@router.patch("/update_status/{task_id}", response_model=TaskRead)
async def update_task_status(
        task_id: int,
        status_id: int = Query(..., ge=1, le=5, description="New status ID for the task"),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить статус задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - status_id: Новый ID статуса задачи (1-5).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        # Логируем входные параметры
        logger.info(f"Received request to update task {task_id} with new status_id={status_id}")

        # Проверяем валидность status_id
        if status_id not in [1, 2, 3, 4, 5]:
            raise HTTPException(status_code=400, detail="Invalid status_id. Must be between 1 and 5.")

        # Ищем задачу по ID
        query = select(Task).where(Task.id == task_id).options(
            selectinload(Task.payment_status),
            selectinload(Task.order),
            selectinload(Task.executor)
        )
        result = await session.execute(query)
        task = result.scalars().first()

        if not task:
            logger.warning(f"Task with id {task_id} not found")
            raise HTTPException(status_code=404, detail="Task not found")

        # Обновляем статус задачи
        update_query = update(Task).where(Task.id == task_id).values(status_id=status_id)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} status updated to {status_id}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении статуса задачи: {str(e)}"
        )



@router.patch("/update_name/{task_id}", response_model=TaskRead)
async def update_task_name(
        task_id: int,
        new_name: str = Query(..., description="New name for the task", min_length=1, max_length=128),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить имя задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - new_name: Новое имя задачи (строка).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        logger.info(f"Received request to update task {task_id} with new name={new_name}")

        # Проверяем, что имя предоставлено и не пустое
        if not new_name or new_name.strip() == "":
            raise HTTPException(status_code=400, detail="Task name cannot be empty")

        # Ищем задачу по ID
        query = select(Task).where(Task.id == task_id).options(
            selectinload(Task.payment_status),
            selectinload(Task.order),
            selectinload(Task.executor)
        )
        result = await session.execute(query)
        task = result.scalars().first()

        if not task:
            logger.warning(f"Task with id {task_id} not found")
            raise HTTPException(status_code=404, detail="Task not found")

        # Обновляем имя задачи
        update_query = update(Task).where(Task.id == task_id).values(name=new_name.strip())
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} name updated to {new_name}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task name: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении имени задачи: {str(e)}"
        )
