// src/stores/storeOrders.ts
import {defineStore} from 'pinia';
import axios from 'axios';
import {ref, computed} from 'vue';
// Импортируем все необходимые типы
import {
    typeOrderSerial,
    typeOrderBase,
    typePaginatedOrderResponse,
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
    const orders = ref<typeOrderBase[]>([]);         // Полные данные заказов для текущей страницы
    const totalOrders = ref<number>(0);             // Общее количество заказов для пагинации
    const currentOrder = ref<typeOrderDetail | null>(null); // Детали выбранного заказа
    const newOrderSerial = ref<string>('');             // Сгенерированный серийный номер для нового заказа
    const error = ref<string | null>(null);             // Общая ошибка стора (можно разделить при необходимости)

    // --- Флаги загрузки ---
    const isLoading = ref(false);           // Основной флаг загрузки (для fetchOrders, create, update)
    const isDeadlineLoading = ref(false);   // Флаг обновления дедлайна по заказу
    const isDetailLoading = ref(false);     // Флаг загрузки деталей заказа (fetchOrderDetail)
    const isNewSerialLoading = ref(false);  // Загрузка нового серийного номера
    const isSerialsLoading = ref(false);    // Загрузка списка серийных номеров (fetchOrderSerials)
    const isFinInfoLoading = ref(false);                       // Загрузка данных о финансах по заказу


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
        isLoading.value = true;
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
            isLoading.value = false;
        }
    };

    // Получение всех данных об одном заказе
    const fetchOrderDetail = async (serial: string) => {
        isDetailLoading.value = true; // Используем флаг деталей
        error.value = null;
        currentOrder.value = null;
        try {
            const response = await axios.get<typeOrderDetail>(`${getApiUrl()}order/detail/${serial}`, {
                withCredentials: true
            });
            currentOrder.value = response.data;
        } catch (err) {
            handleAxiosError(err, `Failed to fetch order details for ${serial}`);
            currentOrder.value = null;
        } finally {
            isDetailLoading.value = false; // Сбрасываем флаг деталей
        }
    };

    // Получение нового серийного номера для создания заказа
    const fetchNewOrderSerial = async () => {
        isNewSerialLoading.value = true; // Устанавливаем НОВЫЙ флаг
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
            isNewSerialLoading.value = false; // Сбрасываем НОВЫЙ флаг
        }
    };

    // Получение только серийных номеров (если еще используется)
    const fetchOrderSerials = async (statusId: number | null = null) => {
        isSerialsLoading.value = true; // Устанавливаем НОВЫЙ флаг
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
            isSerialsLoading.value = false; // Сбрасываем НОВЫЙ флаг
        }
    };




    // --- Действия связанные с изменением данных (CRUD) ---

    const createOrder = async (orderData: typeOrderCreate): Promise<typeOrderBase | null> => {
        isLoading.value = true; // Используем основной флаг
        error.value = null;
        try {
            const response = await axios.post<typeOrderBase>(
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
            isLoading.value = false; // Сбрасываем основной флаг
        }
    };


    // Обновление заказа
    const updateOrder = async (serial: string, orderData: typeOrderEdit): Promise<typeOrderBase | null> => {
        if (orderData.deadline_moment != null) {
            isDeadlineLoading.value = true;
        }

        if (Object.keys(orderData).some(key => key.includes('cost') || key.includes('paid') || key.includes('debt'))) {
            isFinInfoLoading.value = true;
        }


        isLoading.value = true;
        error.value = null;
        try {
            const response = await axios.patch<typeOrderBase>(
                `${getApiUrl()}order/edit/${serial}`,
                { order_data: orderData },
                { withCredentials: true }
            );

            // Если текущий открытый заказ - это тот, что мы обновили, обновляем currentOrder
            if (currentOrder.value?.serial === serial) {
                // Обновляем только изменённые поля, сохраняя существующие данные
                currentOrder.value = {
                    ...currentOrder.value, // Сохраняем существующие поля typeOrderDetail
                    ...response.data,      // Перезаписываем поля из typeOrderRead
                    deadline_moment: orderData.deadline_moment ?? currentOrder.value.deadline_moment // Явно обновляем deadline_moment
                };
            }

            return response.data; // Возвращаем ответ от PATCH
        } catch (err) {
            handleAxiosError(err, `Failed to update order ${serial}`);
            throw err; // Пробрасываем ошибку дальше
        } finally {
            isLoading.value = false;
            isDeadlineLoading.value = false;
            isFinInfoLoading.value = false;
        }
    };


    const resetOrderDetail = () => {
        currentOrder.value = null;
        isDetailLoading.value = false;
    };


    // resetOrders теперь сбрасывает только данные заказов, НЕ состояние таблицы
    const resetOrders = () => {
        orders.value = [];
        totalOrders.value = 0;
    };

    const resetOrderSerials = () => {
        orderSerials.value = [];
        isSerialsLoading.value = false; // Сбрасываем и флаг загрузки
    };


    // === Вычисляемые свойства (Computed/Getters) ===
    const hasOrderDetail = computed(() => currentOrder.value !== null);

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
        // --- Состояния (State) ---
        orders,       // Полные данные заказов
        totalOrders,
        currentOrder, // Детали текущего выбранного заказа
        newOrderSerial,
        orderSerials,
        error,

        // --- Флаги загрузки ---
        isLoading,          // Основной
        isDetailLoading,    // Детали
        isNewSerialLoading, //
        isSerialsLoading,   //
        isDeadlineLoading,  // флаг обновления дедлайна
        isFinInfoLoading,   // флаг обновления финансов

        // --- Действия (Actions) ---
        fetchOrders, fetchOrderDetail, fetchNewOrderSerial, fetchOrderSerials,
        createOrder, updateOrder, clearError, getStatusText,
        resetOrders, resetOrderDetail, resetOrderSerials,

        // --- Вычисляемые свойства (Getters/Computed) ---
        hasOrderDetail,
        currentPage, // Теперь зависит от storeOrdersTable
        totalPages,  // Теперь зависит от storeOrdersTable
        serialsCount,

    };
});
