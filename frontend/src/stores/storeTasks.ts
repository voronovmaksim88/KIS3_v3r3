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
    status_id: number;
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

// Интерфейс для ответа обновления задачи
interface TaskResponse {
    id: number;
    name: string;
    description: string | null;
    status_id: number;
    payment_status_id: number | null;
    executor_uuid: string | null;
    planned_duration: string | null;
    actual_duration: string | null;
    creation_moment: string | null;
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

    // Метод для обновления статуса задачи
    async function updateTaskStatus(taskId: number, statusId: number): Promise<void> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.patch<TaskResponse>(
                `${getApiUrl()}tasks/update_status/${taskId}`,
                {},
                { params: { status_id: statusId } }
            );

            // Обновляем задачу в локальном состоянии
            const updatedTask = response.data;
            const taskIndex = tasks.value.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                tasks.value[taskIndex] = updatedTask;
                console.log(`Task ${taskId} status updated to ${statusId}`);
            } else {
                console.warn(`Task ${taskId} not found in local state`);
                // Если задача не найдена в локальном состоянии, перезагружаем список
                void fetchTasks();
            }
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                error.value = err.response?.data?.detail || 'Failed to update task status';
            } else {
                error.value = 'Unexpected error occurred';
            }
            console.error('Error updating task status:', err);
        } finally {
            isLoading.value = false;
        }
    }

    // Метод для обновления страницы (пагинация)
    function updatePagination(newSkip: number, newLimit: number): void {
        skip.value = newSkip;
        limit.value = newLimit;
        void fetchTasks();
    }

    // Метод для обновления фильтров
    function updateFilters(newFilters: Partial<TaskFilters>): void {
        filters.value = { ...filters.value, ...newFilters };
        skip.value = 0; // Сбрасываем пагинацию при изменении фильтров
        void fetchTasks();
    }

    // Метод для сброса фильтров
    function resetFilters(): void {
        filters.value = {
            status_id: null,
            order_serial: null,
            executor_uuid: null,
        };
        skip.value = 0;
        void fetchTasks();
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
        updateTaskStatus,
        updatePagination,
        updateFilters,
        resetFilters,
    };
});