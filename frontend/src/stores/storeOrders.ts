// src/stores/storeOrders.ts
import {defineStore} from 'pinia';
import axios from 'axios';
import {ref, computed} from 'vue';
// Импортируем все необходимые типы
import {
    typeOrderSerial,
    typeOrderRead,
    typePaginatedOrderResponse,
    // typeFetchOrdersParams,
    typeOrderDetail,
    typeOrderCreate,
    typeOrderEdit
} from "../types/typeOrder";
import {getApiUrl} from '../utils/apiUrlHelper';
import {useOrdersTableStore} from '@/stores/storeOrdersTable'; // Используется для showEnded и других параметров таблицы

export const useOrdersStore = defineStore('orders', () => {
    // === Состояние ===
    // Состояние, специфичное для данных заказов, НЕ для отображения таблицы
    const orderSerials = ref<typeOrderSerial[]>([]); // Список только серийных номеров (если нужен)
    const orders = ref<typeOrderRead[]>([]);         // Полные данные заказов для текущей страницы
    const totalOrders = ref<number>(0);             // Общее количество заказов для пагинации
    const currentOrderDetail = ref<typeOrderDetail | null>(null); // Детали выбранного заказа
    const newOrderSerial = ref<string>('');             // Сгенерированный серийный номер для нового заказа
    const error = ref<string | null>(null);             // Общая ошибка стора (можно разделить при необходимости)

    // --- Флаги загрузки ---
    const loading = ref(false);                   // Основной флаг загрузки (для fetchOrders, create, update)
    const detailLoading = ref(false);             // Флаг загрузки деталей заказа (fetchOrderDetail)
    const newSerialLoading = ref(false);          // Загрузка нового серийного номера
    const serialsLoading = ref(false);            // Загрузка списка серийных номеров (fetchOrderSerials)

    // === Словарь статусов заказов ===
    const orderStatuses = {
        1: "Не определён", 2: "На согласовании", 3: "В работе", 4: "Просрочено",
        5: "Выполнено в срок", 6: "Выполнено НЕ в срок", 7: "Не согласовано", 8: "На паузе"
    };

    // === Хелпер для обработки ошибок Axios ===
    const handleAxiosError = (err: unknown, defaultMessage: string) => {
        if (axios.isAxiosError(err)) {
            error.value = err.response?.data?.detail || err.message || defaultMessage;
        } else if (err instanceof Error) {
            error.value = err.message;
        } else {
            error.value = 'An unknown error occurred';
        }
        console.error(`${defaultMessage}:`, err);
    };

    // === Действия (Actions) ===
    const clearError = () => {
        error.value = null;
    };

    const getStatusText = (statusId: number | null): string => {
        if (statusId === null || statusId === undefined) return "Неизвестный статус";
        return orderStatuses[statusId as keyof typeof orderStatuses] || "Неизвестный статус";
    };

    // --- Действия связанные с получением данных ---

    // fetchOrders теперь читает параметры отображения из storeOrdersTable
    const fetchOrders = async () => {
        loading.value = true;
        error.value = null;

        const ordersTableStore = useOrdersTableStore();

        const queryParams = {
            skip: ordersTableStore.currentSkip,
            limit: ordersTableStore.currentLimit,
            sort_field: ordersTableStore.currentSortField,
            sort_direction: ordersTableStore.currentSortDirection,
            show_ended: ordersTableStore.showEndedOrders,
            status_id: ordersTableStore.currentFilterStatus !== null ? ordersTableStore.currentFilterStatus : undefined,
            search_serial: ordersTableStore.searchSerial || undefined,
            search_customer: ordersTableStore.searchCustomer || undefined,
            search_name: ordersTableStore.searchName || undefined,
            no_priority: ordersTableStore.noPriority,
            search_priority: ordersTableStore.searchPriority || undefined,
            search_works: ordersTableStore.searchWorks.length > 0 ? ordersTableStore.searchWorks.join(',') : undefined
        };

        try {
            const response = await axios.get<typePaginatedOrderResponse>(`${getApiUrl()}order/read`, {
                params: queryParams,
                withCredentials: true
            });

            orders.value = response.data.data;
            totalOrders.value = response.data.total;

        } catch (err) {
            handleAxiosError(err, 'Failed to fetch orders');
            orders.value = [];
            totalOrders.value = 0;
        } finally {
            loading.value = false;
        }
    };

    // Получение всех данных об одном заказе
    const fetchOrderDetail = async (serial: string) => {
        detailLoading.value = true; // Используем флаг деталей
        error.value = null;
        currentOrderDetail.value = null;
        try {
            const response = await axios.get<typeOrderDetail>(`${getApiUrl()}order/detail/${serial}`, {
                withCredentials: true
            });
            currentOrderDetail.value = response.data;
        } catch (err) {
            handleAxiosError(err, `Failed to fetch order details for ${serial}`);
            currentOrderDetail.value = null;
        } finally {
            detailLoading.value = false; // Сбрасываем флаг деталей
        }
    };

    // Получение нового серийного номера для создания заказа
    const fetchNewOrderSerial = async () => {
        newSerialLoading.value = true; // Устанавливаем НОВЫЙ флаг
        error.value = null;
        newOrderSerial.value = '';

        try {
            const response = await axios.get<typeOrderSerial>(
                `${getApiUrl()}order/new-serial`,
                {withCredentials: true}
            );
            newOrderSerial.value = response.data.serial;
            return response.data.serial;
        } catch (err) {
            handleAxiosError(err, 'Failed to fetch new order serial');
            return '';
        } finally {
            newSerialLoading.value = false; // Сбрасываем НОВЫЙ флаг
        }
    };

    // Получение только серийных номеров (если еще используется)
    const fetchOrderSerials = async (statusId: number | null = null) => {
        serialsLoading.value = true; // Устанавливаем НОВЫЙ флаг
        error.value = null;
        orderSerials.value = []; // Сбрасываем перед запросом

        try {
            const params: Record<string, any> = {};
            if (statusId !== null) {
                params.status_id = statusId;
            }
            const response = await axios.get<typeOrderSerial[]>(`${getApiUrl()}order/read-serial`, {
                params,
                withCredentials: true
            });
            orderSerials.value = response.data;
        } catch (err) {
            handleAxiosError(err, 'Failed to fetch order serials');
            orderSerials.value = []; // Убедимся, что сброшено при ошибке
        } finally {
            serialsLoading.value = false; // Сбрасываем НОВЫЙ флаг
        }
    };

    // setFilterStatus удален, логика перенесена в storeOrdersTable.ts
    // Компонент должен вызвать storeOrdersTable.setFilterStatus()
    // а затем ordersStore.fetchOrders()

    // --- Действия связанные с изменением данных (CRUD) ---

    const createOrder = async (orderData: typeOrderCreate): Promise<typeOrderRead | null> => {
        loading.value = true; // Используем основной флаг
        error.value = null;
        try {
            const response = await axios.post<typeOrderRead>(
                `${getApiUrl()}order/create`, orderData, {withCredentials: true}
            );
            // После создания успешно, обновляем список заказов.
            // fetchOrders сам прочитает текущее состояние таблицы из storeOrdersTable.
            await fetchOrders();
            return response.data;
        } catch (err) {
            handleAxiosError(err, 'Failed to create order');
            throw err;
        } finally {
            loading.value = false; // Сбрасываем основной флаг
        }
    };

    const updateOrder = async (serial: string, orderData: typeOrderEdit): Promise<typeOrderRead | null> => {
        loading.value = true;
        error.value = null;
        try {
            const response = await axios.patch<typeOrderRead>( // Ответ от PATCH все еще typeOrderRead
                `${getApiUrl()}order/edit/${serial}`, {order_data: orderData}, {withCredentials: true}
            );

            // Если текущий открытый заказ - это тот, что мы обновили, перезапрашиваем его детали
            if (currentOrderDetail.value?.serial === serial) {
                await fetchOrderDetail(serial); // <--- Запрашиваем полные детали заново
            }

            // Всегда обновляем список заказов в таблице, чтобы изменения были видны.
            // fetchOrders сам прочитает текущее состояние таблицы из storeOrdersTable.
            await fetchOrders();

            return response.data; // Возвращаем ответ от PATCH (если он нужен вызывающей стороне)
        } catch (err) {
            handleAxiosError(err, `Failed to update order ${serial}`);
            throw err; // Пробрасываем ошибку дальше
        } finally {
            loading.value = false;
        }
    };

    const resetOrderDetail = () => {
        currentOrderDetail.value = null;
        detailLoading.value = false;
    };

    // resetOrders теперь сбрасывает только данные заказов, НЕ состояние таблицы
    const resetOrders = () => {
        orders.value = [];
        totalOrders.value = 0;
        // Состояние таблицы (limit, skip, sort, filter) сбрасывается через storeOrdersTable
        // Например, Component -> storeOrdersTable.resetTableState()
        // console.log("Order data reset (orders, totalOrders)"); // Optional log
    };

    const resetOrderSerials = () => {
        orderSerials.value = [];
        serialsLoading.value = false; // Сбрасываем и флаг загрузки
    };


    // === Вычисляемые свойства (Computed/Getters) ===
    const isLoading = computed(() => loading.value); // Основная загрузка
    const isDetailLoading = computed(() => detailLoading.value); // Загрузка деталей
    const isNewSerialLoading = computed(() => newSerialLoading.value); // Загрузка нового номера
    const isSerialsLoading = computed(() => serialsLoading.value); // Загрузка списка номеров
    const hasOrderDetail = computed(() => currentOrderDetail.value !== null);

    // Вычисляемые свойства для пагинации теперь зависят от storeOrdersTable
    const currentPage = computed(() => {
        const ordersTableStore = useOrdersTableStore();
        return ordersTableStore.currentLimit > 0 ? Math.floor(ordersTableStore.currentSkip / ordersTableStore.currentLimit) : 0;
    });

    const totalPages = computed(() => {
        const ordersTableStore = useOrdersTableStore();
        return ordersTableStore.currentLimit > 0 ? Math.ceil(totalOrders.value / ordersTableStore.currentLimit) : 0;
    });

    const serialsCount = computed(() => orderSerials.value.length); // Если используется

    // === Возвращаем все элементы стора ===
    return {
        // Состояния (State)
        orders, totalOrders, currentOrderDetail,
        newOrderSerial, orderSerials,
        error,

        // --- Флаги загрузки ---
        loading,          // Основной
        detailLoading,    // Детали
        newSerialLoading, //
        isNewSerialLoading, // computed getter for newSerialLoading
        serialsLoading,   //
        isSerialsLoading, // computed getter for serialsLoading


        // Действия (Actions)
        fetchOrders, fetchOrderDetail, fetchNewOrderSerial, fetchOrderSerials,
        createOrder, updateOrder, clearError, getStatusText,
        resetOrders, resetOrderDetail, resetOrderSerials,
        // setFilterStatus, setSortField, resetSorting - удалены, их логика в storeOrdersTable

        // Вычисляемые свойства (Getters/Computed)
        isLoading,          // Основной флаг загрузки
        isDetailLoading,    // Детали
        hasOrderDetail,
        currentPage, // Теперь зависит от storeOrdersTable
        totalPages,  // Теперь зависит от storeOrdersTable
        serialsCount,

        // currentFilterStatus, currentLimit, etc. - теперь доступны через useOrdersTableStore() в компонентах
    };
});
