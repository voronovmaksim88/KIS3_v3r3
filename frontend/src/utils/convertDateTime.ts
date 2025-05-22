/**
 * Преобразует строку даты в формате ISO 8601 в локальную дату и время
 * @param isoDateString - Строка даты в формате ISO 8601 или null/undefined
 * @param includeHourAndMinute - Включать ли часы и минуты в результат (по умолчанию: true)
 * @param includeSeconds - Включать ли секунды в результат (по умолчанию: false)
 * @returns Отформатированная строка с локальными датой и временем
 */
export function formatLocalDateTime(
    isoDateString: string | null | undefined,
    includeHourAndMinute: boolean = true,
    includeSeconds: boolean = false
): string {
    // Проверка на пустую строку или null/undefined
    if (!isoDateString) {
        return '';
    }

    try {
        // Создаем объект Date из строки ISO
        const date = new Date(isoDateString);

        // Проверяем, является ли дата валидной
        if (isNaN(date.getTime())) {
            console.error('Invalid date string:', isoDateString);
            return isoDateString; // Возвращаем исходную строку в случае ошибки
        }

        // ВАЖНО: Не применяем смещение часового пояса здесь,
        // так как ISO строка уже содержит информацию о поясе (или подразумевает UTC).
        // Date() парсит это корректно. Форматирование в ЛОКАЛЬНОЕ время
        // должно происходить при выводе компонентов (getFullYear, getMonth и т.д.)

        // Извлекаем компоненты даты (они будут локальными)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Формируем строку с датой
        let formattedDate = `${day}-${month}-${year}`;

        // Добавляем часы и минуты, если необходимо
        if (includeHourAndMinute) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            formattedDate += ` ${hours}:${minutes}`;

            // Добавляем секунды, если они нужны и если включены часы/минуты
            if (includeSeconds) {
                const seconds = String(date.getSeconds()).padStart(2, '0');
                formattedDate += `:${seconds}`;
            }
        }

        return formattedDate;
    } catch (error) {
        console.error('Error formatting date:', error);
        return isoDateString; // Возвращаем исходную строку в случае ошибки
    }
}