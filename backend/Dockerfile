# Используем официальный образ Python в качестве базового
FROM python:3.12-slim AS builder

# Устанавливаем переменную окружения, чтобы вывод Python не буферизировался
ENV PYTHONUNBUFFERED=1

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Обновляем pip и устанавливаем uv
RUN pip install --upgrade pip && \
    pip install uv

# Копируем pyproject.toml вместо requirements.txt (лучшая практика для uv)
COPY pyproject.toml ./

# Устанавливаем зависимости в отдельную директорию
RUN uv pip install --no-cache-dir --target=/dependencies .

# -------------------------------
# Второй этап: минимальный runtime
# -------------------------------
FROM python:3.12-slim

# Устанавливаем переменную окружения, чтобы вывод Python не буферизировался
ENV PYTHONUNBUFFERED=1

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только необходимые файлы из первого этапа
COPY --from=builder /dependencies /usr/local/lib/python3.12/site-packages
COPY . ./

# Сообщаем Docker, что контейнер будет слушать порт 8000
EXPOSE 8000

# Указываем команду для запуска приложения
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]