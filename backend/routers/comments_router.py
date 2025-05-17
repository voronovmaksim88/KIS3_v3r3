# comments_router.py
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import OrderComment, Order  # Импортируем Person и Order для проверки существования
from models import User
from database import get_async_db
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import joinedload
from schemas.person_schem import PersonSchema

router = APIRouter()


# --- Pydantic Schemas ---

# Схема для создания комментария (входные данные)
class CommentCreate(BaseModel):
    order_id: str
    text: str
    user_id: int


# Схема для ответа (выходные данные)
class CommentResponse(BaseModel):
    id: int
    order_id: str
    moment_of_creation: Optional[datetime]  # Момент создания может быть None, если default не сработал до commit
    text: str
    person: PersonSchema

    # Конфигурация для совместимости с ORM-моделями SQLAlchemy
    # Для Pydantic v2+
    model_config = ConfigDict(from_attributes=True)


# --- API Endpoint ---

@router.post(
    '/comments/create',
    response_model=CommentResponse,
    summary="Создать новый комментарий к заказу",
    tags=["comments"]
)
@router.post(
    '/comments/create',
    response_model=CommentResponse,
    summary="Создать новый комментарий к заказу",
    tags=["comments"]
)
async def create_comment(
        comment_data: CommentCreate,
        session: AsyncSession = Depends(get_async_db)
):
    """
    Создает новый комментарий для указанного заказа.

    - **order_id**: Серийный номер заказа (формат NNN-MM-YYYY).
    - **text**: Текст комментария.
    - **user_id**: ID пользователя, который создает комментарий.
    """
    # Получаем User по user_id с загруженным Person
    stmt = select(User).options(joinedload(User.person)).where(User.id == comment_data.user_id)
    result = await session.execute(stmt)
    author_user = result.scalars().first()
    if not author_user:
        raise HTTPException(status_code=404, detail=f"User with ID {comment_data.user_id} not found")

    # Проверяем наличие связанного Person
    if not author_user.person:
        raise HTTPException(status_code=404, detail=f"No associated Person for user ID {comment_data.user_id}")

    # Проверка существования заказа
    order = await session.get(Order, comment_data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with serial {comment_data.order_id} not found")

    # Создаем комментарий
    new_comment = OrderComment(
        order_id=comment_data.order_id,
        text=comment_data.text,
        person_uuid=author_user.person.uuid
    )

    try:
        session.add(new_comment)
        await session.commit()
        await session.refresh(new_comment,
                              attribute_names=["moment_of_creation"])  # Явно указываем атрибуты для обновления
    except Exception as e:
        await session.rollback()
        print(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail="Could not save comment to the database")

    # Создаём объект ответа вручную, включая данные Person
    comment_response = CommentResponse(
        id=new_comment.id,
        order_id=new_comment.order_id,
        moment_of_creation=new_comment.moment_of_creation,
        text=new_comment.text,
        person=PersonSchema.model_validate(author_user.person)  # Преобразуем Person в PersonSchema
    )

    return comment_response
