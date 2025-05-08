// src/types/typeOrder.ts
import { typeTask} from "@/types/typeTask.ts";

export interface typeOrderSerial {
    serial: string;
}

// Определение интерфейса для типа работы
export interface typeWork {
    id: number;
    name: string;
    description: string;
    active: boolean;
}

//
export interface typeOrderRead {
    serial: string;
    name: string;
    customer: string; // Ожидаем строку 'Форма Имя'
    customer_id: number;
    priority: number | null;
    status_id: number;
    start_moment: string | null; // Даты приходят как строки ISO 8601
    deadline_moment: string | null;
    end_moment: string | null;
    works: typeWork[]; // Добавленное поле для списка работ
}

// Новый тип для ответа API с пагинацией (соответствует Pydantic PaginatedOrderResponse)
export interface typePaginatedOrderResponse {
    total: number;
    limit: number;
    skip: number;
    data: typeOrderRead[];
}

// --- ВЫНЕСЕННЫЕ ТИПЫ ДЛЯ СОРТИРОВКИ ---
// определяем возможные поля сортировки для заказов, как указано в описании API
export type OrderSortField = 'serial' | 'priority' | 'status'; // Используем 'status' согласно описанию API

// Определяем возможные направления сортировки
export type OrderSortDirection = 'asc' | 'desc';
// --- КОНЕЦ ВЫНЕСЕННЫХ ТИПОВ ---


// тип для параметров запроса fetchOrders
export interface typeFetchOrdersParams {
    skip?: number;
    limit?: number;
    statusId?: number | null; // Используем это для фильтрации, маппится в queryParams.status_id
    searchSerial?: string | null;
    searchCustomer?: string | null;
    searchPriority?: number | null;
    showEnded?: boolean;
    // Используем вынесенные типы для полей и направлений сортировки
    sortField?: OrderSortField;
    sortDirection?: OrderSortField;
    filter_status?: number | null; // фильтрация по статусу (дублирует statusId? Уточните API)
}

// Типы для вложенных структур
export interface typeOrderComment {
    id: number;
    moment_of_creation: string;
    text: string;
    person: string;
}

export interface typeOrderWork {
    id: number;
    name: string;
    description: string;
    active: boolean;
}

export interface typeOrderTiming {
    id: number;
    task_id: number;
    executor_id: string;
    time: string;
    timing_date: string;
}

// Тип для детальной информации о заказе
export interface typeOrderDetail {
    serial: string;
    name: string;
    customer: string;
    priority: number;
    status_id: number;
    start_moment: string | null;
    deadline_moment: string | null;
    end_moment: string | null;
    materials_cost: number | null;
    materials_cost_fact: number | null;
    materials_paid: boolean;
    products_cost: number | null;
    products_cost_fact: number | null;
    products_paid: boolean;
    work_cost: number | null;
    work_cost_fact: number | null;
    work_paid: boolean;
    debt: number | null;
    debt_fact: number | null;
    debt_paid: boolean;
    works: typeOrderWork[];
    comments: typeOrderComment[];
    tasks: typeTask[];
    timings: typeOrderTiming[];
}

// Тип для создания нового заказа
export interface typeOrderCreate {
    name: string;
    customer_id: number;
    priority?: number | null;
    status_id: number;
    start_moment?: string | null;
    deadline_moment?: string | null;
    end_moment?: string | null;
    materials_cost?: number | null;
    materials_paid?: boolean;
    products_cost?: number | null;
    products_paid?: boolean;
    work_cost?: number | null;
    work_cost_fact?: number | null; // Добавлено
    work_paid?: boolean;
    debt?: number | null;
    debt_fact?: number | null; // Добавлено
    debt_paid?: boolean;
    work_ids?: number[];
}

// Тип для редактирования заказа (все поля опциональные)
export interface typeOrderEdit {
    name?: string;
    customer_id?: number | null;
    priority?: number | null;
    status_id?: number;
    start_moment?: string | null;
    deadline_moment?: string | null;
    end_moment?: string | null;
    materials_cost?: number | null;
    materials_cost_fact?: number | null;
    materials_paid?: boolean;
    products_cost?: number | null;
    products_cost_fact?: number | null;
    products_paid?: boolean;
    work_cost?: number | null;
    work_cost_fact?: number | null;
    work_paid?: boolean;
    debt?: number | null;
    debt_fact?: number | null;
    debt_paid?: boolean;
    work_ids?: number[];
}
