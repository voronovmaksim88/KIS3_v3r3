// src/stores/storeOrders.ts
import {defineStore} from 'pinia';
// import {storeToRefs} from 'pinia'; // Не используется здесь
import axios from 'axios';
import {ref, computed} from 'vue';
// Импортируем все необходимые типы
import {
    typeOrderSerial,
    typeOrderRead,
    typePaginatedOrderResponse,
    typeFetchOrdersParams,
    typeOrderDetail,
    typeOrderCreate, typeOrderEdit
} from "../types/typeOrder";
import {getApiUrl} from '../utils/apiUrlHelper';
import {useOrdersTableStore} from '@/stores/storeOrdersTable'; // Используется для showEnded

export const useOrdersStore = defineStore('orders', () => {
    // === Состояние ===
    const orderSerials = ref<typeOrderSerial[]>([]); // Список только серийных номеров (если нужен)
    const orders = ref<typeOrderRead[]>([]);         // Полные данные заказов для текущей страницы
    const totalOrders = ref<number>(0);             // Общее количество заказов для пагинации
    const currentLimit = ref<number>(50);           // Лимит заказов на странице
    const currentSkip = ref<number>(0);              // Смещение для пагинации
    const currentOrderDetail = ref<typeOrderDetail | null>(null); // Детали выбранного заказа
    const currentSortField = ref<string>('serial');     // Поле сортировки
    const currentSortDirection = ref<string>('asc');    // Направление сортировки
    const newOrderSerial = ref<string>('');             // Сгенерированный серийный номер для нового заказа
    const error = ref<string | null>(null);             // Общая ошибка стора (можно разделить при необходимости)
    const currentFilterStatus = ref<number | null>(null);

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

    const fetchOrders = async (params: typeFetchOrdersParams = {}) => {
        loading.value = true; // Используем основной флаг
        error.value = null;

        const queryParams: Record<string, any> = {};
        queryParams.skip = params.skip !== undefined ? params.skip : currentSkip.value;
        queryParams.limit = params.limit !== undefined ? params.limit : currentLimit.value;

        // --- ЛОГИКА ФИЛЬТРАЦИИ ПО СТАТУСУ ---
        // используем статус из параметров, если предоставлен, иначе используем статус из состояния
        const effectiveStatusId = (params.statusId !== undefined && params.statusId !== null)
            ? params.statusId
            : currentFilterStatus.value; // Используем новое состояние

        if (effectiveStatusId !== null) {
            queryParams.status_id = effectiveStatusId;
        }
        // --- КОНЕЦ ЛОГИКИ ФИЛЬТРАЦИИ ---


        if (params.searchSerial !== undefined && params.searchSerial !== null) queryParams.search_serial = params.searchSerial;
        if (params.searchCustomer !== undefined && params.searchCustomer !== null) queryParams.search_customer = params.searchCustomer;
        if (params.searchPriority !== undefined && params.searchPriority !== null) queryParams.search_priority = params.searchPriority;

        // Логика для showEnded (используем значение из OrdersTableStore по умолчанию)
        if (params.showEnded !== undefined) {
            queryParams.show_ended = params.showEnded;
        } else {
            const ordersTableStore = useOrdersTableStore();
            queryParams.show_ended = ordersTableStore.showEndedOrders;
        }

        // Логика для сортировки (используем значение из параметров, если предоставлено, иначе из состояния)
        if (params.sortField !== undefined) {
            queryParams.sort_field = params.sortField;
        } else {
            queryParams.sort_field = currentSortField.value;
        }
        if (params.sortDirection !== undefined) {
            queryParams.sort_direction = params.sortDirection;
        } else {
            queryParams.sort_direction = currentSortDirection.value;
        }

        try {
            const response = await axios.get<typePaginatedOrderResponse>(`${getApiUrl()}order/read`, {
                params: queryParams,
                withCredentials: true
            });
            orders.value = response.data.data;
            totalOrders.value = response.data.total;
            // Обновляем текущие skip и limit только если они были установлены через params
            currentSkip.value = queryParams.skip;
            if (queryParams.limit !== undefined) {
                currentLimit.value = queryParams.limit;
            }
            // currentFilterStatus обновляется только через setFilterStatus
        } catch (err) {
            handleAxiosError(err, 'Failed to fetch orders');
            orders.value = [];
            totalOrders.value = 0;
        } finally {
            loading.value = false; // Сбрасываем основной флаг
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

    // --- ДЕЙСТВИЕ для установки фильтра по статусу ---
    const setFilterStatus = async (statusId: number | null) => {
        // Проверяем, если нажатый статус уже является текущим фильтром
        if (currentFilterStatus.value === statusId) {
            // Если да, сбрасываем фильтр (устанавливаем null)
            currentFilterStatus.value = null;
            console.log("Filter status unset"); // Опциональный лог для отладки
        } else {
            // В противном случае устанавливаем новый фильтр
            currentFilterStatus.value = statusId;
            console.log("Filter status set to:", statusId); // Опциональный лог для отладки
        }
        // Применяем новый фильтр, сбрасываем пагинацию на первую страницу.
        // Сохраняем текущий лимит, сортировку и showEnded
        const ordersTableStore = useOrdersTableStore();
        await fetchOrders({
            skip: 0,
            limit: currentLimit.value,
            // searchSerial, searchCustomer, searchPriority - эти параметры поиска
            // не хранятся в состоянии стора, поэтому при смене фильтра они сбросятся,
            // если компонент их не передаст явно при вызове setFilterStatus.
            // В текущей реализации fetchOrders они берутся только из params.
            // Если нужно сохранять состояние поиска, их тоже нужно добавить в стейт.
            showEnded: ordersTableStore.showEndedOrders, // Передаем текущее состояние showEnded
            sortField: currentSortField.value, // Передаем текущее поле сортировки
            sortDirection: currentSortDirection.value, // Передаем текущее направление сортировки
            // statusId здесь не передаем, так как fetchOrders уже берет его из состояния currentFilterStatus.value
            // Если бы fetchOrders брал статус *только* из params, мы бы передали его сюда.
        });
    };

    // --- Действия связанные с изменением данных (CRUD) ---

    const createOrder = async (orderData: typeOrderCreate): Promise<typeOrderRead | null> => {
        loading.value = true; // Используем основной флаг
        error.value = null;
        try {
            const response = await axios.post<typeOrderRead>(
                `${getApiUrl()}order/create`, orderData, {withCredentials: true}
            );
            // После создания успешно, обновляем список заказов, сохраняя текущий фильтр и сортировку
            const ordersTableStore = useOrdersTableStore();
            await fetchOrders({
                skip: currentSkip.value,
                limit: currentLimit.value,
                showEnded: ordersTableStore.showEndedOrders,
                sortField: currentSortField.value,
                sortDirection: currentSortDirection.value,
                // currentFilterStatus.value будет автоматически использован fetchOrders
            });
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

            // Всегда обновляем список заказов в таблице, чтобы изменения были видны
            const ordersTableStore = useOrdersTableStore();
            await fetchOrders({
                skip: currentSkip.value,
                limit: currentLimit.value,
                showEnded: ordersTableStore.showEndedOrders,
                sortField: currentSortField.value,
                sortDirection: currentSortDirection.value,
                // currentFilterStatus.value будет автоматически использован fetchOrders
            });

            return response.data; // Возвращаем ответ от PATCH (если он нужен вызывающей стороне)
        } catch (err) {
            handleAxiosError(err, `Failed to update order ${serial}`);
            throw err; // Пробрасываем ошибку дальше
        } finally {
            loading.value = false;
        }
    };


    // --- Действия связанные с состоянием UI (Сортировка, Сброс) ---

    const setSortField = async (field: string) => {
        const newDirection = (currentSortField.value === field && currentSortDirection.value === 'asc') ? 'desc' : 'asc';
        currentSortField.value = field;
        currentSortDirection.value = newDirection;
        try {
            // fetchOrders сам установит loading = true/false
            const ordersTableStore = useOrdersTableStore();
            await fetchOrders({
                skip: 0, // Сортировка часто сбрасывает на первую страницу
                limit: currentLimit.value,
                sortField: currentSortField.value, // Используем новое поле сортировки
                sortDirection: currentSortDirection.value, // Используем новое направление сортировки
                showEnded: ordersTableStore.showEndedOrders, // Сохраняем состояние showEnded
                // currentFilterStatus.value будет автоматически использован fetchOrders
            });
        } catch (err) {
            console.error('Error occurred while applying sorting:', err);
        }
    };

    const resetSorting = () => {
        currentSortField.value = 'serial';
        currentSortDirection.value = 'asc';
    };

    const resetOrderDetail = () => {
        currentOrderDetail.value = null;
        detailLoading.value = false;
    };

    const resetOrders = () => {
        orders.value = [];
        totalOrders.value = 0;
        currentLimit.value = 50;
        currentSkip.value = 0;
        resetSorting();
        currentFilterStatus.value = null; // --- СБРОС ФИЛЬТРА СТАТУСА ---
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
    const currentPage = computed(() => currentLimit.value > 0 ? Math.floor(currentSkip.value / currentLimit.value) : 0);
    const totalPages = computed(() => currentLimit.value > 0 ? Math.ceil(totalOrders.value / currentLimit.value) : 0);
    const serialsCount = computed(() => orderSerials.value.length); // Если используется

    // === Возвращаем все элементы стора ===
    return {
        // Состояния (State)
        orders, totalOrders, currentLimit, currentSkip, currentOrderDetail,
        currentSortField, currentSortDirection, newOrderSerial, orderSerials,
        error,
        currentFilterStatus, //

        // --- Флаги загрузки ---
        loading,          // Основной
        detailLoading,    // Детали
        newSerialLoading, //
        isNewSerialLoading, // computed getter for newSerialLoading
        serialsLoading,   //
        isSerialsLoading, // computed getter for serialsLoading


        // Действия (Actions)
        fetchOrders, fetchOrderDetail, fetchNewOrderSerial, fetchOrderSerials,
        createOrder, updateOrder, setSortField, clearError, getStatusText,
        resetOrders, resetOrderDetail, resetOrderSerials, resetSorting,
        setFilterStatus,

        // Вычисляемые свойства (Getters/Computed)
        isLoading,          // Основной флаг загрузки
        isDetailLoading,    // Детали
        hasOrderDetail, currentPage, totalPages, serialsCount,
        // currentFilterStatus можно получить напрямую из состояния, getter не нужен
    };
});
