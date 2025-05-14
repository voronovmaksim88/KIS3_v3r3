# schemas/work_schem.py
"""
Схемы для заказов
"""

from pydantic import BaseModel
from typing import Optional
from pydantic import ConfigDict

# --- WorkSchema (убедитесь, что она есть и настроена) ---
class WorkSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    active: bool = True

    # Убедитесь, что конфигурация соответствует вашей версии Pydantic
    model_config = ConfigDict(from_attributes=True) # Для Pydantic v2+
