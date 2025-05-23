// src/stores/storeTaskTable.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';


export const useTasksTableStore = defineStore('ordersTable', () => {
    // Состояние для отображения завершенных заказов
    const showEndedTasks = ref(false); // По умолчанию скрываем завершённые задачи

    function resetTableState() {
        showEndedTasks.value = false;
    }


    return {
        // Состояния
        showEndedTasks,

        // Действия
        resetTableState,
    };
});
