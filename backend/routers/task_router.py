# routers/task_router.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
import logging
from models import Person
from fastapi import Body

from database import get_async_db
from models import Task
from schemas.task_schem import PaginatedTaskResponse
from schemas.task_schem import TaskRead
from datetime import timedelta
from datetime import datetime
from isodate import parse_duration
from sqlalchemy import cast, Integer, desc, asc

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)


def get_task_order_sort(ascending=True):
    direction_func = asc if ascending else desc
    return [
        direction_func(cast(func.substring(Task.order_serial, 9, 4), Integer)),  # Year
        direction_func(cast(func.substring(Task.order_serial, 5, 2), Integer)),  # Month
        direction_func(cast(func.substring(Task.order_serial, 1, 3), Integer))   # Number
    ]

@router.get("/read", response_model=PaginatedTaskResponse)
async def read_tasks(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(10, ge=1, le=100, description="Number of items to return per page"),
    status_id: Optional[int] = Query(None, description="Filter by task status ID"),
    order_serial: Optional[str] = Query(None, description="Filter by order serial"),
    executor_uuid: Optional[UUID] = Query(None, description="Filter by executor UUID"),
    sort_field: str = Query("id", description="Field to sort by: 'id', 'order', or 'status'", regex="^(id|order|status)$"),
    sort_direction: str = Query("asc", description="Sort order: 'asc' for ascending, 'desc' for descending", regex="^(asc|desc)$"),
    session: AsyncSession = Depends(get_async_db)
):
    """
    Получить список задач с пагинацией и опциональной фильтрацией.

    Параметры:
    - skip: Количество задач, которые нужно пропустить для пагинации.
    - limit: Максимальное количество задач на странице.
    - status_id: Фильтр по ID статуса задачи (например, 1 для 'Не начата').
    - order_serial: Фильтр по серийному номеру заказа.
    - executor_uuid: Фильтр по UUID исполнителя.
    - sort_field: Поле для сортировки: 'id' (по ID задачи), 'order' (по серийному номеру заказа), 'status' (по статусу задачи).
    - sort_direction: Направление сортировки: 'asc' (по возрастанию, по умолчанию) или 'desc' (по убыванию).

    Возвращает:
    - PaginatedTaskResponse с общим количеством, параметрами пагинации и данными задач.
    """
    try:
        # Логируем входные параметры
        logger.info(f"Received request with skip={skip}, limit={limit}, status_id={status_id}, "
                    f"order_serial={order_serial}, executor_uuid={executor_uuid}, "
                    f"sort_field={sort_field}, sort_direction={sort_direction}")

        # Основной запрос с подгрузкой связанных моделей
        query = select(Task).options(
            selectinload(Task.payment_status),
            selectinload(Task.order),
            selectinload(Task.executor)
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

        # Добавляем сортировку
        is_ascending = sort_direction == "asc"

        if sort_field == "id":
            query = query.order_by(Task.id.asc() if sort_direction == "asc" else Task.id.desc())
        elif sort_field == "order":
            # Используем модифицированную функцию для сортировки по order_serial
            sort_exprs = get_task_order_sort(
                ascending=is_ascending,
            )
            query = query.order_by(*sort_exprs)
        elif sort_field == "status":
            query = query.order_by(Task.status_id.asc() if sort_direction == "asc" else Task.status_id.desc())

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


@router.patch("/update_description/{task_id}", response_model=TaskRead)
async def update_task_description(
        task_id: int,
        new_description: Optional[str] = Query(
            None,
            description="New description for the task",
            max_length=1024
        ),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить описание задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - new_description: Новое описание задачи (строка, может быть null).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        logger.info(f"Received request to update task {task_id} with new description={new_description}")

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

        # Преобразуем пустую строку или пробелы в None
        description_value = None if new_description is None or new_description.strip() == "" else new_description.strip()

        # Обновляем описание задачи
        update_query = update(Task).where(Task.id == task_id).values(description=description_value)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} description updated to {description_value}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task description: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении описания задачи: {str(e)}"
        )


@router.patch("/{task_id}/executor", response_model=TaskRead)
async def update_task_executor(
        task_id: int,
        executor_uuid: Optional[UUID] = Body(None, description="New executor UUID for the task"),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить исполнителя задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - executor_uuid: Новый UUID исполнителя (может быть null для удаления исполнителя).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        # Логируем входные параметры
        logger.info(f"Received request to update task {task_id} with executor_uuid={executor_uuid}")

        # Проверяем, существует ли указанный исполнитель, если UUID предоставлен
        if executor_uuid is not None:
            person_query = select(Person).where(Person.uuid == executor_uuid)  # type: ignore
            person_result = await session.execute(person_query)
            person = person_result.scalars().first()
            if not person:
                logger.warning(f"Person with uuid {executor_uuid} not found")
                raise HTTPException(status_code=404, detail="Person not found")

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

        # Обновляем исполнителя задачи
        update_query = update(Task).where(Task.id == task_id).values(executor_uuid=executor_uuid)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} executor updated to {executor_uuid}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task executor: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении исполнителя задачи: {str(e)}"
        )


@router.patch("/{task_id}/planned_duration", response_model=TaskRead)
async def update_task_planned_duration(
        task_id: int,
        new_planned_duration: Optional[str] = Body(
            None,
            description="New planned duration for the task in ISO 8601 format (e.g., P1D, P1DT2H30M)"
        ),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить плановую длительность задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - new_planned_duration: Новая плановая длительность в формате ISO 8601 (может быть null).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        logger.info(f"Received request to update task {task_id} with new planned_duration={new_planned_duration}")

        # Валидация и преобразование ISO 8601 в timedelta
        duration_value = None
        if new_planned_duration is not None and new_planned_duration.strip():
            cleaned_duration = new_planned_duration.strip().strip('"\'')
            try:
                duration = parse_duration(cleaned_duration)  # Парсим ISO 8601
                # Преобразуем в timedelta
                duration_value = duration if isinstance(duration, timedelta) else timedelta(
                    seconds=duration.total_seconds())
            except Exception:
                logger.warning(f"Invalid ISO 8601 duration format: {cleaned_duration}")
                raise HTTPException(status_code=400, detail="Invalid ISO 8601 duration format")

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

        # Обновляем плановую длительность задачи
        update_query = update(Task).where(Task.id == task_id).values(planned_duration=duration_value)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} planned duration updated to {duration_value}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as _:
        logger.error("Error updating task planned duration", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Ошибка при обновлении плановой длительности задачи"
        )


@router.patch("/{task_id}/start_moment", response_model=TaskRead)
async def update_task_start_moment(
        task_id: int,
        new_start_moment: Optional[datetime] = Body(
            None,
            description="New start moment for the task in ISO 8601 format (e.g., 2023-10-01T12:00:00Z)"
        ),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить время начала задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - new_start_moment: Новое время начала задачи в формате ISO 8601 (может быть null).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        logger.info(f"Received request to update task {task_id} with new start_moment={new_start_moment}")

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

        # Преобразуем offset-aware datetime в offset-naive
        start_moment_value = new_start_moment.replace(tzinfo=None) if new_start_moment else None

        # Обновляем время начала задачи
        update_query = update(Task).where(Task.id == task_id).values(start_moment=start_moment_value)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} start moment updated to {new_start_moment}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task start moment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении времени начала задачи: {str(e)}"
        )


@router.patch("/{task_id}/deadline_moment", response_model=TaskRead)
async def update_task_deadline_moment(
        task_id: int,
        new_deadline_moment: Optional[datetime] = Body(
            None,
            description="New deadline moment for the task in ISO 8601 format (e.g., 2023-10-01T12:00:00Z)"
        ),
        session: AsyncSession = Depends(get_async_db)
):
    """
    Обновить дедлайн задачи по её ID.

    Параметры:
    - task_id: ID задачи, которую нужно обновить.
    - new_deadline_moment: Новый дедлайн задачи в формате ISO 8601 (может быть null).

    Возвращает:
    - TaskRead: Обновлённые данные задачи.
    """
    try:
        logger.info(f"Received request to update task {task_id} with new deadline_moment={new_deadline_moment}")

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

        # Преобразуем offset-aware datetime в offset-naive
        new_deadline_moment_value = new_deadline_moment.replace(tzinfo=None) if new_deadline_moment else None

        # Обновляем дедлайн задачи
        update_query = update(Task).where(Task.id == task_id).values(deadline_moment=new_deadline_moment_value)
        await session.execute(update_query)
        await session.commit()

        # Обновляем объект задачи для возврата актуальных данных
        await session.refresh(task)

        logger.info(f"Task {task_id} deadline moment updated to {new_deadline_moment}")
        return TaskRead.model_validate(task)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating task deadline moment: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при обновлении дедлайна задачи: {str(e)}"
        )
