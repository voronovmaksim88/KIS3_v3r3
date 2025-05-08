// utils/getStatusColor.ts
export function getStatusColor(statusId: number, theme: 'light' | 'dark' = 'light') {
    if (statusId === 1) return '#FACC15'; // Не определён
    if (statusId === 2) return '#60A5FA'; // На согласовании
    if (statusId === 3) return '#34D399'; // В работе
    if (statusId === 4) return '#F87171'; // Просрочено
    if (statusId === 5) return '#64748B'; // Выполнено в срок
    if (statusId === 6) return '#64748B'; // Выполнено НЕ в срок
    if (statusId === 7) return '#64748B'; // Не согласовано
    if (statusId === 8) return theme === 'dark' ? '#FFFFFF' : '#000000'; // На паузе

    return '#64748B'; // По умолчанию
}