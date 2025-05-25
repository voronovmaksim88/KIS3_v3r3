// src/stores/storeOrdersTable.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { OrderSortField, OrderSortDirection } from '@/types/typeOrder';


export const useOrdersTableStore = defineStore('ordersTable', () => {
    // Состояние для отображения завершенных заказов
    const showEndedOrders = ref(false); // По умолчанию скрываем завершённые заказы
    const currentLimit = ref(50); //
    const currentSkip = ref(0);

    // Указываем типы для полей и направлений сортировки, используя импортированные типы
    const currentSortField = ref<OrderSortField>('serial');
    const currentSortDirection = ref<OrderSortDirection>('asc');

    const currentFilterStatus = ref<number | null>(null);

    // состояния для поиска
    const searchPriority = ref<number | null | undefined>(undefined);
    const searchSerial = ref('');
    const searchCustomer = ref('');
    const searchName = ref('');
    const noPriority = ref(false);
    const searchWorks = ref<number[]>([]); // Массив ID выбранных работ


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

    // Добавляем действие для установки значения поиска по приоритету
    function setSearchPriority(priority: number | null | undefined) {
        searchPriority.value = priority;
    }

    function setNoPriority(value: boolean) {
        noPriority.value = value;
    }

    function resetTableState() {
        showEndedOrders.value = false;
        currentLimit.value = 10;
        currentSkip.value = 0;
        // Убедимся, что дефолтные значения соответствуют типу OrderSortField
        currentSortField.value = 'serial';
        currentSortDirection.value = 'asc';
        currentFilterStatus.value = null;
        searchSerial.value = '';
        searchCustomer.value = '';
        searchName.value = '';
        searchPriority.value = undefined; // сброс поиска по приоритету
        searchWorks.value = []; // Сбрасываем поиск по работам
    }

    // действие для установки работ
    function setSearchWorks(workIds: number[]) {
        searchWorks.value = workIds;
    }


    return {
        // State
        showEndedOrders,
        currentLimit,
        currentSkip,
        currentSortField,
        currentSortDirection,
        currentFilterStatus,
        searchPriority,
        searchSerial,
        searchCustomer,
        searchName,
        noPriority,
        searchWorks,


        // Actions
        toggleShowEndedOrders,
        setLimit,
        setSkip,
        setSort,
        setFilterStatus,
        resetTableState,
        setSearchPriority,
        setNoPriority,
        setSearchWorks,
    };
});
