import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios, { AxiosError } from 'axios';
import type { Ref } from 'vue';
import { getApiUrl } from '../utils/apiUrlHelper';
import { typeTask } from "@/types/typeTask.ts";
import { useOrdersStore } from '@/stores/storeOrders'; // Импортируем useOrdersStore

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
    const currentTask: Ref<typeTask | null> = ref(null);
    const total: Ref<number> = ref(0);
    const skip: Ref<number> = ref(0);
    const limit: Ref<number> = ref(10);
    const filters: Ref<TaskFilters> = ref({
        status_id: null,
        order_serial: null,
        executor_uuid: null,
    });
    const isLoading: Ref<boolean> = ref(false);
    const isCurrentTaskLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    // Получаем доступ к ordersStore
    const ordersStore = useOrdersStore();

    // Вспомогательная функция для обновления currentOrderDetail.tasks
    const updateOrderDetailTask = (updatedTask: typeTask) => {
        if (!ordersStore.currentOrderDetail?.tasks) {
            return; // Если currentOrderDetail или tasks не существуют, выходим
        }

        const taskIndex = ordersStore.currentOrderDetail.tasks.findIndex(
            task => task.id === updatedTask.id
        );

        if (taskIndex !== -1) {
            // Обновляем задачу в массиве tasks, сохраняя реактивность
            ordersStore.currentOrderDetail.tasks[taskIndex] = { ...updatedTask };
            console.log(`Updated task ${updatedTask.id} in currentOrderDetail.tasks`);
        }
    };

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

    // Метод для получения информации об одной задаче
    async function fetchTaskById(taskId: number): Promise<void> {
        isCurrentTaskLoading.value = true;
        error.value = null;

        try {
            const response = await axios.get<typeTask>(
                `${getApiUrl()}tasks/read/${taskId}`
            );
            currentTask.value = response.data as typeTask;
            console.log(`Fetched task ${taskId}`);

            // Обновляем currentOrderDetail.tasks, если задача там есть
            if (currentTask.value) {
                updateOrderDetailTask(currentTask.value);
            }
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                error.value = err.response?.data?.detail || 'Failed to fetch task';
            } else {
                error.value = 'Unexpected error occurred';
            }
            console.error('Error fetching task:', err);
        } finally {
            isCurrentTaskLoading.value = false;
        }
    }

    // Вспомогательная функция для выполнения PATCH-запроса и обновления задачи
    async function patchTask(
        taskId: number,
        endpoint: string,
        body: Record<string, any> = {},
        params: Record<string, any> = {},
        successMessage: string
    ): Promise<void> {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await axios.patch<typeTask>(
                `${getApiUrl()}tasks/${endpoint}`,
                body,
                { params }
            );

            const updatedTask = response.data;

            // Обновляем задачу в списке tasks, если она там есть
            const taskIndex = tasks.value.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                tasks.value[taskIndex] = updatedTask;
            }

            // Обновляем currentTask, если это текущая задача
            if (currentTask.value && currentTask.value.id === taskId) {
                currentTask.value = updatedTask;
            }

            // Обновляем currentOrderDetail.tasks, если задача там есть
            updateOrderDetailTask(updatedTask);

            console.log(`Task ${taskId} updated successfully in store: ${successMessage}`);
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                error.value = err.response?.data?.detail || `Не удалось обновить задачу`;
            } else {
                error.value = 'Произошла непредвиденная ошибка при обновлении задачи';
            }
            console.error(`Error updating task in store:`, err);
        } finally {
            isLoading.value = false;
        }
    }

    // Метод для обновления статуса задачи
    async function updateTaskStatus(taskId: number, statusId: number): Promise<void> {
        if (statusId < 1 || statusId > 5) {
            error.value = 'Недопустимый статус. Должен быть от 1 до 5';
            return;
        }
        await patchTask(
            taskId,
            `update_status/${taskId}`,
            {},
            { status_id: statusId },
            `Статус задачи успешно обновлён`
        );
    }

    // Метод для обновления имени задачи
    async function updateTaskName(taskId: number, newName: string): Promise<void> {
        if (!newName || newName.trim() === '') {
            error.value = 'Имя задачи не может быть пустым';
            return;
        }

        if (newName.length > 128) {
            error.value = 'Имя задачи не должно превышать 128 символов';
            return;
        }

        await patchTask(
            taskId,
            `update_name/${taskId}`,
            {},
            { new_name: newName.trim() },
            `Имя задачи успешно обновлено`
        );
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

    // Метод для очистки данных текущей задачи
    function clearCurrentTask(): void {
        currentTask.value = null;
    }

    return {
        tasks,
        currentTask,
        total,
        skip,
        limit,
        filters,
        isLoading,
        isCurrentTaskLoading,
        error,
        fetchTasks,
        fetchTaskById,
        updateTaskStatus,
        updateTaskName,
        updatePagination,
        updateFilters,
        resetFilters,
        clearCurrentTask,
    };
});