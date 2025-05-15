<!-- src/components/TheTasks.vue -->
<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, watch} from 'vue';
import { storeToRefs } from 'pinia';
import { useTasksStore } from '../stores/storeTasks';
import { useOrdersStore } from '../stores/storeOrders'; // Добавляем импорт storeOrders
import ProgressSpinner from 'primevue/progressspinner';
import { type TaskFilters } from '../stores/storeTasks';
import { useThemeStore } from '../stores/storeTheme';
import { useTableStyles } from '../composables/useTableStyles';
import Select from 'primevue/select';
import Toast from 'primevue/toast'; // Импортируем Toast
import { useToast } from 'primevue/usetoast'; // Импортируем хук useToast
import { getTaskStatusColor } from '@/utils/getStatusColor.ts';

// Композитные компоненты
const {
  tableBaseClass,
  thClasses,
  tdBaseTextClass,
  tableHeaderRowClass,
  trBaseClass,
} = useTableStyles();

// Всплывающие уведомления
const toast = useToast();

// Store темы
const themeStore = useThemeStore();
const { theme: currentTheme } = storeToRefs(themeStore);

// Store задач
const tasksStore = useTasksStore();

// Store заказов
const ordersStore = useOrdersStore();

// Local filters for two-way binding
const localFilters = ref<TaskFilters>({
  status_id: null,
  order_serial: null,
  executor_uuid: null,
});

// Watch for store filter changes to sync with local filters
watch(
    () => tasksStore.filters,
    (newFilters) => {
      localFilters.value = { ...newFilters };
    },
    { deep: true }
);



// Опции для статуса
const statusOptions = [
  { value: 1, label: 'Не начата' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На паузе' },
  { value: 4, label: 'Завершена' },
  { value: 5, label: 'Отменена' },
];

// Функция для обновления статуса задачи
const updateStatus = async (taskId: number, statusId: number) => {
  try {
    await tasksStore.updateTaskStatus(taskId, statusId);
    if (tasksStore.error) {
      console.error('Error updating task status:', tasksStore.error);
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: `Не удалось изменить статус задачи #${taskId}`,
        life: 5000,
      });
    } else {
      console.log(`Status for task ${taskId} updated successfully`);
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: `Статус задачи #${taskId} успешно изменен`,
        life: 3000,
      });

      // Проверяем, есть ли связанный заказ
      const task = tasksStore.tasks.find(t => t.id === taskId);
      if (task?.order?.serial) {
        await ordersStore.fetchOrderDetail(task.order.serial);
        if (ordersStore.error) {
          console.error('Error updating order:', ordersStore.error);
          toast.add({
            severity: 'error',
            summary: 'Ошибка',
            detail: `Не удалось обновить данные заказа #${task.order.serial}`,
            life: 5000,
          });
        } else {
          console.log(`Order ${task.order.serial} details updated successfully`);
        }
      }
    }
  } catch (err) {
    console.error('Unexpected error during status update:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Произошла непредвиденная ошибка при обновлении статуса',
      life: 5000,
    });
  }
};

// Выполняется при монтировании компонента
onMounted(() => {
  if (!tasksStore.tasks.length && !tasksStore.isLoading) {
    tasksStore.fetchTasks(); // Предполагается, что такой метод существует в store
  }
});

// Очистка задач при размонтировании компонента
onBeforeUnmount(() => {
  tasksStore.$patch({ tasks: [] });
});
</script>

<template>
  <div class="container mx-auto p-4">
    <!-- Добавляем компонент Toast -->
    <Toast />

    <!-- Loading and Error States -->
    <div v-if="tasksStore.isLoading && tasksStore.tasks.length === 0" class="text-center py-4">
      <ProgressSpinner style="width: 50px; height: 50px" fill="transparent" aria-label="Loading"/>
    </div>
    <div v-else-if="tasksStore.error" class="text-red-500 text-center py-4">
      {{ tasksStore.error }}
    </div>

    <div v-if="(!tasksStore.isLoading) || (tasksStore.isLoading && tasksStore.tasks.length > 0)" class="w-full">
      <table :class="tableBaseClass">
        <colgroup>
          <col style="width: 3%" />
          <col style="width: 12%" />
          <col style="width: 20%" />
          <col style="width: 10%" />
          <col style="width: 30%" />
          <col style="width: 20%" />
        </colgroup>
        <thead>
        <!-- Строка управления на самом верху таблицы -->
        <tr :class="thClasses">
          <th colspan="6" :class="tableHeaderRowClass">
            <div class="px-1 py-1 flex justify-between items-center">
              <div class="card flex flex-wrap justify-left gap-4 font-medium">
                <!-- Чекбокс все/активные -->
                <div class="flex items-center gap-2">
                  <label class="text-middle">Завершённые</label>
                </div>
                <!-- Чекбокс поиска -->
                <div class="flex items-center gap-2">
                  <label>Поиск</label>
                </div>
              </div>
              <span class="flex"></span>
            </div>
          </th>
        </tr>

        <!-- Строка с заголовками таблицы -->
        <tr>
          <th :class="thClasses">id</th>
          <th :class="thClasses">Имя</th>
          <th :class="thClasses">Описание</th>
          <th :class="thClasses">Статус</th>
          <th :class="thClasses">Статус оплаты</th>
          <th :class="thClasses"></th>
        </tr>
        </thead>

        <tbody>
        <template v-for="task in tasksStore.tasks" :key="task.id">
          <tr :class="trBaseClass">
            <td :class="tdBaseTextClass">{{ task.id }}</td>
            <td :class="tdBaseTextClass">{{ task.name }}</td>
            <!-- Описание задачи -->
            <td :class="tdBaseTextClass">{{ task.description }}</td>
            <!-- Статус задачи -->
            <td class="px-4 py-2" :class="tdBaseTextClass">
              <Select
                  :modelValue="task.status_id"
                  :options="statusOptions"
                  optionValue="value"
                  optionLabel="label"
                  placeholder="Выберите статус"
                  class="w-full"
                  @update:modelValue="updateStatus(task.id, $event)"
              >
                <template #value="slotProps">
                    <span
                        v-if="slotProps.value"
                        :style="{ color: getTaskStatusColor(slotProps.value, currentTheme) }"
                    >
                      {{ statusOptions.find(opt => opt.value === slotProps.value)?.label || 'Неизвестный статус' }}
                    </span>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex items-center">
                      <span :style="{ color: getTaskStatusColor(slotProps.option.value, currentTheme) }">
                        {{ slotProps.option.label }}
                      </span>
                  </div>
                </template>
              </Select>
            </td>
            <td :class="tdBaseTextClass"></td>
            <td :class="tdBaseTextClass"></td>
          </tr>
          <tr></tr>
        </template>

        <tr v-if="tasksStore.tasks.length === 0 && !tasksStore.isLoading && !tasksStore.error">
          <td
              colspan="6"
              class="py-6 text-center text-lg text-gray-400 italic"
              :class="currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'"
          >
            Задач не найдено
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>

</style>