import { typeTask } from "@/types/typeTask.ts";

export interface typeOrderSerial {
    serial: string;
}

// Тип для работ по заказу
export interface typeOrderWork {
    id: number;
    name: string;
    description: string;
    active: boolean;
}

// Тип для заказов в таблице, без подробностей
export interface typeOrderBase {
    serial: string;
    name: string;
    customer: string; // Ожидаем строку 'Форма Имя'
    customer_id: number;
    priority: number | null;
    status_id: number;
    start_moment: string | null; // Даты приходят как строки ISO 8601
    deadline_moment: string | null;
    end_moment: string | null;
    works: typeOrderWork[]; // список работ по заказу
}

// Новый тип для ответа API с пагинацией (соответствует Pydantic PaginatedOrderResponse)
export interface typePaginatedOrderResponse {
    total: number;
    limit: number;
    skip: number;
    data: typeOrderBase[];
}

// Определяем возможные поля сортировки для заказов, как указано в описании API
export type OrderSortField = 'serial' | 'priority' | 'status'; // Используем 'status' согласно описанию API

// Определяем возможные направления сортировки
export type OrderSortDirection = 'asc' | 'desc';

// Тип для параметров запроса fetchOrders
export interface typeFetchOrdersParams {
    skip?: number;
    limit?: number;
    statusId?: number | null; // Используем это для фильтрации, маппится в queryParams.status_id
    searchSerial?: string | null;
    searchCustomer?: string | null;
    searchPriority?: number | null;
    searchName?: string | null;
    showEnded?: boolean;
    // Используем вынесенные типы для полей и направлений сортировки
    sortField?: OrderSortField;
    sortDirection?: OrderSortField;
    filter_status?: number | null; // фильтрация по статусу (дублирует statusId? Уточните API)
    no_priority?: boolean;
}

// Типы для вложенных структур
export interface typeOrderComment {
    id: number;
    moment_of_creation: string;
    text: string;
    person: { uuid: string; name: string; surname: string } | null;
}

export interface typeOrderTiming {
    id: number;
    task_id: number;
    executor_id: string;
    time: string;
    timing_date: string;
}

// Тип для детальной информации о заказе, расширяет typeOrderBase
export interface typeOrderDetail extends typeOrderBase {
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
    work_cost_fact?: number | null;
    work_paid?: boolean;
    debt?: number | null;
    debt_fact?: number | null;
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