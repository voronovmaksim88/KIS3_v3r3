// utils/getStatusColor.ts
import {storeToRefs} from 'pinia';
import {useThemeStore} from '../stores/storeTheme';


// Store темы
const themeStore = useThemeStore(); // <--- 2. Получаем экземпляр Theme Store
const {theme: currentTheme} = storeToRefs(themeStore); // <--- 3. Получаем реактивную ссылку на тему

// Функция для выбора цвета текста (как в таблице)
export function getStatusColor(statusId: number) {
    if (statusId === 1) return '#FACC15'; // Не определён, text-yellow-400
    if (statusId === 2) return '#60A5FA'; // На согласовании, text-blue-400
    if (statusId === 3) return '#34D399'; // В работе, text-green-400
    if (statusId === 4) return '#F87171'; // Просрочено, text-red-400
    if (statusId === 5) return '#64748B'; // Выполнено в срок, text-gray-500
    if (statusId === 6) return '#64748B'; // Выполнено НЕ в срок, text-gray-500
    if (statusId === 7) return '#64748B'; // Не согласовано, text-gray-500
    if (statusId === 8) {
        if (currentTheme.value === 'dark') {
            return '#FFFFFF'; // Стили для темной темы
        } else {
            return '#000000'; // Стили для светлой темы
        }

    } // На паузе, text-white
    return '#64748B'; // text-gray-500
}
