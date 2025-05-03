# config.py
from dotenv import load_dotenv
import os
from pathlib import Path
from pydantic import BaseModel
from pydantic_settings import BaseSettings

# Определяем BASE_DIR как директорию текущего файла config.py
BASE_DIR = Path(__file__).resolve().parent

# Указываем точный путь к .env
dotenv_path = BASE_DIR / ".env"

# Загружаем .env по указанному пути
load_dotenv(dotenv_path=dotenv_path)

DB_HOST = os.environ.get("DB_HOST")
DB_PORT = os.environ.get("DB_PORT")
DB_NAME = os.environ.get("DB_NAME")
DB_USER = os.environ.get("DB_USER")
DB_PASS = os.environ.get("DB_PASS")

class AuthJWT(BaseModel):
    private_key_path: Path = BASE_DIR / "certs" / "jwt-private.pem"
    public_key_path: Path = BASE_DIR / "certs" / "jwt-public.pem"
    algorithm: str = "RS256"
    access_token_expire_minutes: int = 525600  # 365 дней, т.е на год


class Settings(BaseSettings):
    api_v1_prefix: str = ""
    auth_jwt: AuthJWT = AuthJWT()


# Создаем экземпляр настроек
settings = Settings()
