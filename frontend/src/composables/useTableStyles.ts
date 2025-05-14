// src/composables/useTableStyles.ts
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '../stores/storeTheme';

export function useTableStyles() {
    const themeStore = useThemeStore();
    const { theme: currentTheme } = storeToRefs(themeStore);

    // Классы для фона основной таблицы
    const tableBaseClass = computed(() => {
        const base = 'min-w-full rounded-lg mb-4 table-fixed shadow-md';
        return currentTheme.value === 'dark'
            ? `${base} bg-gray-700`
            : `${base} bg-gray-100 border border-gray-200`;
    });

    // Классы для заголовков таблицы (<th>)
    const thClasses = computed(() => {
        const base = 'px-4 py-2 text-left text-sm font-semibold uppercase tracking-wider';
        return currentTheme.value === 'dark'
            ? `${base} border-1 border-gray-300 text-gray-300 bg-gray-600`
            : `${base} border-1 border-gray-300 text-gray-600 bg-gray-100`;
    });

    // Базовый цвет текста для обычных ячеек таблицы (<td>)
    const tdBaseTextClass = computed(() => {
        return currentTheme.value === 'dark' ? 'text-gray-100' : 'text-gray-800';
    });

    // Классы для шапки таблицы (<th> colspan=6)
    const tableHeaderRowClass = computed(() => {
        const base = 'px-2 py-2 text-center rounded-t-lg';
        return currentTheme.value === 'dark' ? `${base} bg-gray-600` : `${base} bg-gray-200`;
    });

    // Классы для строки таблицы (<tr>)
    const trBaseClass = computed(() => {
        const base = 'transition-colors duration-100';
        return currentTheme.value === 'dark' ? `${base} border-t border-gray-600` : `${base} border-t border-gray-200`;
    });

    return {
        tableBaseClass,
        thClasses,
        tdBaseTextClass,
        tableHeaderRowClass,
        trBaseClass,
    };
}