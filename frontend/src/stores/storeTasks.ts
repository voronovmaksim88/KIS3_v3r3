// src/stores/storeTasks.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios, { AxiosError } from 'axios';
import type { Ref } from 'vue';
import { getApiUrl } from '../utils/apiUrlHelper';

// Интерфейс для задачи (основан на TaskRead из backend)
export interface typeTask {
    id: number;
    name: string;
    description: string | null;
    status_id: number | null;
    payment_status_id: number | null;
    executor_uuid: string | null; // UUID как строка
    planned_duration: string | null; // ISO duration (e.g., "PT2H")
    actual_duration: string | null;
    creation_moment: string | null; // ISO datetime
    start_moment: string | null;
    deadline_moment: string | null;
    end_moment: string | null;
    price: number | null;
    order_serial: string | null;
    parent_task_id: number | null;
    root_task_id: number | null;
    status: { id: number; name: string } | null;
    payment_status: { id: number; name: string } | null;
    executor: { uuid: string; name: string; surname: string } | null;
    order: { serial: string; name: string } | null;
}

// Интерфейс для ответа пагинации
interface PaginatedTaskResponse {
    total: number;
    limit: number;
    skip: number;
    data: typeTask[];
}

// Интерфейс для параметров фильтрации
export interface TaskFilters {
    status_id: number | null;
    order_serial: string | null;
    executor_uuid: string | null;
}

// Определение Pinia store
export const useTasksStore = defineStore('tasks', () => {
    // Состояние
    const tasks: Ref<typeTask[]> = ref([]);
    const total: Ref<number> = ref(0);
    const skip: Ref<number> = ref(0);
    const limit: Ref<number> = ref(10);
    const filters: Ref<TaskFilters> = ref({
        status_id: null,
        order_serial: null,
        executor_uuid: null,
    });
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    // Метод для получения задач
    async function fetchTasks(): Promise<void> {
        isLoading.value = true;
        error.value = null;

        try {
            const params: Record<string, any> = {
                skip: skip.value,
                limit: limit.value,
            };

            // Добавляем фильтры, если они заданы
            if (filters.value.status_id !== null) {
                params.status_id = filters.value.status_id;
            }
            if (filters.value.order_serial) {
                params.order_serial = filters.value.order_serial;
            }
            if (filters.value.executor_uuid) {
                params.executor_uuid = filters.value.executor_uuid;
            }

            const response = await axios.get<PaginatedTaskResponse>(
                `${getApiUrl()}tasks/read`,
                { params }
            );

            tasks.value = response.data.data;
            total.value = response.data.total;
            skip.value = response.data.skip;
            limit.value = response.data.limit;

            console.log(`Fetched ${tasks.value.length} tasks, total: ${total.value}`);
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                error.value = err.response?.data?.detail || 'Failed to fetch tasks';
            } else {
                error.value = 'Unexpected error occurred';
            }
            console.error('Error fetching tasks:', err);
        } finally {
            isLoading.value = false;
        }
    }

    // Метод для обновления страницы (пагинация)
    function updatePagination(newSkip: number, newLimit: number): void {
        skip.value = newSkip;
        limit.value = newLimit;
        fetchTasks();
    }

    // Метод для обновления фильтров
    function updateFilters(newFilters: Partial<TaskFilters>): void {
        filters.value = { ...filters.value, ...newFilters };
        skip.value = 0; // Сбрасываем пагинацию при изменении фильтров
        fetchTasks();
    }

    // Метод для сброса фильтров
    function resetFilters(): void {
        filters.value = {
            status_id: null,
            order_serial: null,
            executor_uuid: null,
        };
        skip.value = 0;
        fetchTasks();
    }

    return {
        tasks,
        total,
        skip,
        limit,
        filters,
        isLoading,
        error,
        fetchTasks,
        updatePagination,
        updateFilters,
        resetFilters,
    };
});