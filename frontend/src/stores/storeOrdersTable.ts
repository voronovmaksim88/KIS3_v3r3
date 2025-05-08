// src/stores/storeOrdersTable.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOrdersTableStore = defineStore('ordersTable', () => {
    // Состояние для отображения завершенных заказов
    const showEndedOrders = ref(false); // По умолчанию скрываем завершённые заказы
    const currentLimit = ref(50);
    const currentSkip = ref(0);
    const currentSortField = ref('serial');
    const currentSortDirection = ref('asc');
    const currentFilterStatus = ref<number | null>(null);

    // Действия для управления состоянием таблицы

    function toggleShowEndedOrders() {
        showEndedOrders.value = !showEndedOrders.value;
        // Note: Triggering data fetch based on this state change
        // will need to happen in the component or storeOrders action
    }

    function setLimit(limit: number) {
        currentLimit.value = limit;
        // console.log(`Table limit set to: ${limit}`); // Optional log
        // Skip often needs resetting when limit changes
        // setSkip(0); // Decide if limit change resets skip automatically
    }

    function setSkip(skip: number) {
        currentSkip.value = skip;
        // console.log(`Table skip set to: ${skip}`); // Optional log
    }

    function setSort(field: string) {
        const newDirection = (currentSortField.value === field && currentSortDirection.value === 'asc') ? 'desc' : 'asc';
        currentSortField.value = field;
        currentSortDirection.value = newDirection;
        // console.log(`Table sort set to: ${field}, direction: ${newDirection}`); // Optional log
        // Sorting often implies returning to the first page
        // setSkip(0); // Decide if sort change resets skip automatically
    }

    function setFilterStatus(statusId: number | null) {
        // Toggle logic: if already selected, unset; otherwise, set.
        if (currentFilterStatus.value === statusId) {
            currentFilterStatus.value = null;
            // console.log("Table filter status unset"); // Optional log
        } else {
            currentFilterStatus.value = statusId;
            // console.log("Table filter status set to:", statusId); // Optional log
        }
        // Filtering often implies returning to the first page
        // setSkip(0); // Decide if filter change resets skip automatically
    }

    function resetTableState() {
        showEndedOrders.value = false;
        currentLimit.value = 50;
        currentSkip.value = 0;
        currentSortField.value = 'serial';
        currentSortDirection.value = 'asc';
        currentFilterStatus.value = null;
        // console.log("Table state reset"); // Optional log
    }


    return {
        // State
        showEndedOrders,
        currentLimit,
        currentSkip,
        currentSortField,
        currentSortDirection,
        currentFilterStatus,

        // Actions
        toggleShowEndedOrders,
        setLimit,
        setSkip,
        setSort,
        setFilterStatus,
        resetTableState,

        // Computed (if any based on only table state, none currently)
    };
});
