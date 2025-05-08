// src/stores/storeOrdersTable.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { OrderSortField, OrderSortDirection } from '@/types/typeOrder';


export const useOrdersTableStore = defineStore('ordersTable', () => {
    // Состояние для отображения завершенных заказов
    const showEndedOrders = ref(false); // По умолчанию скрываем завершённые заказы
    const currentLimit = ref(50);
    const currentSkip = ref(0);

    // Указываем типы для полей и направлений сортировки, используя импортированные типы
    const currentSortField = ref<OrderSortField>('serial');
    const currentSortDirection = ref<OrderSortDirection>('asc');

    const currentFilterStatus = ref<number | null>(null);

    // Действия для управления состоянием таблицы

    function toggleShowEndedOrders() {
        showEndedOrders.value = !showEndedOrders.value;
    }

    function setLimit(limit: number) {
        currentLimit.value = limit;
    }

    function setSkip(skip: number) {
        currentSkip.value = skip;
    }

    // Используем импортированный тип OrderSortField для параметра field
    function setSort(field: OrderSortField) {
        const newDirection: OrderSortDirection = (currentSortField.value === field && currentSortDirection.value === 'asc') ? 'desc' : 'asc';
        currentSortField.value = field;
        currentSortDirection.value = newDirection;
    }

    function setFilterStatus(statusId: number | null) {
        // Toggle logic: if already selected, unset; otherwise, set.
        if (currentFilterStatus.value === statusId) {
            currentFilterStatus.value = null;
        } else {
            currentFilterStatus.value = statusId;
        }
    }

    function resetTableState() {
        showEndedOrders.value = false;
        currentLimit.value = 50;
        currentSkip.value = 0;
        // Убедимся, что дефолтные значения соответствуют типу OrderSortField
        currentSortField.value = 'serial';
        currentSortDirection.value = 'asc';
        currentFilterStatus.value = null;
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
    };
});
