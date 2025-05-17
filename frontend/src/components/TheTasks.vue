<!-- src/components/TheTasks.vue -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useTasksStore } from '../stores/storeTasks';
import { useOrdersStore } from '../stores/storeOrders';
import { type TaskFilters } from '../stores/storeTasks';
import { useThemeStore } from '../stores/storeTheme';
import { useTableStyles } from '../composables/useTableStyles';
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { getTaskStatusColor } from '@/utils/getStatusColor.ts';
import TaskNameEditDialog from '@/components/TaskNameEditDialog.vue';


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

// Состояние для диалога изменения имени задачи
const showNameEditDialog = ref(false);
const selectedTaskId = ref<number | null>(null);
const selectedTaskName = ref('');

// Состояние загрузки для каждого статуса задачи
const loadingStatuses = ref<Record<number, boolean>>({});

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
    // Устанавливаем флаг загрузки для задачи
    loadingStatuses.value[taskId] = true;

    await tasksStore.updateTaskStatus(taskId, statusId);

    if (tasksStore.error) {
      throw new Error(tasksStore.error);
    }

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
  } catch (err) {
    console.error('Error updating task status:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || `Не удалось изменить статус задачи #${taskId}`,
      life: 5000,
    });
  } finally {
    // Сбрасываем флаг загрузки после завершения запроса
    loadingStatuses.value[taskId] = false;
  }
};

// Обработчик клика на имя задачи для открытия диалога
const openNameEditDialog = (taskId: number, taskName: string) => {
  selectedTaskId.value = taskId;
  selectedTaskName.value = taskName;
  showNameEditDialog.value = true;
};

// Обработчик успешного обновления имени
const handleNameUpdate = ({ taskId, newName }: { taskId: number; newName: string }) => {
  console.log(`Task ${taskId} name updated to ${newName}`);
  showNameEditDialog.value = false;
  if (tasksStore.error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || `Не удалось изменить имя задачи #${taskId}`,
      life: 5000,
    });
  } else {
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Имя задачи #${taskId} обновлено`,
      life: 3000,
    });
  }
};

// Обработчик отмены редактирования
const handleNameEditCancel = () => {
  console.log('Task name edit cancelled');
  showNameEditDialog.value = false;
};

// Выполняется при монтировании компонента
onMounted(() => {
  if (!tasksStore.tasks.length && !tasksStore.isLoading) {
    tasksStore.fetchTasks();
  }
});

// Очистка задач при размонтировании компонента
onBeforeUnmount(() => {
  tasksStore.$patch({ tasks: [] });
});
</script>

<template>
  <TaskNameEditDialog
      v-model:visible="showNameEditDialog"
      :task-id="selectedTaskId"
      :initial-name="selectedTaskName"
      @update-name="handleNameUpdate"
      @cancel="handleNameEditCancel"
  />

  <div class="w-full p-4">
    <!-- Компонент Toast для уведомлений -->
    <Toast />

    <!-- Индикатор загрузки для всей таблицы -->
    <div v-if="tasksStore.isLoading && tasksStore.tasks.length === 0" class="w-full flex justify-center my-4">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="tasksStore.error" class="text-red-500 text-center py-4">
      {{ tasksStore.error }}
    </div>

    <div v-if="(!tasksStore.isLoading) || (tasksStore.isLoading && tasksStore.tasks.length > 0)" >
      <table :class="tableBaseClass">
        <colgroup>
          <col style="width: 3%" />
          <col style="width: 4%" />
          <col style="width: 15%" />
          <col style="width: 20%" />
          <col style="width: 10%" />
          <col style="width: 23%" />
          <col style="width: 20%" />
        </colgroup>
        <thead>
        <!-- Строка управления на самом верху таблицы -->
        <tr :class="thClasses">
          <th colspan="7" :class="tableHeaderRowClass">
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
          <th :class="thClasses">Заказ</th>
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

            <!-- id задачи -->
            <td :class="tdBaseTextClass">{{ task.id }}</td>

            <!-- заказ к которому принадлежит задача -->
            <td :class="tdBaseTextClass"> {{ task.order?.serial }}  </td>

            <!-- Имя задачи -->
            <td
                :class="tdBaseTextClass"
                class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="openNameEditDialog(task.id, task.name)"
            >
              {{ task.name }}
            </td>

            <!-- Описание задачи -->
            <td :class="tdBaseTextClass">{{ task.description }}</td>

            <!-- Статус задачи -->
            <td class="px-4 py-2" :class="tdBaseTextClass">
              <div class="relative flex items-center">
                <!-- Спиннер загрузки -->
                <div
                    v-if="loadingStatuses[task.id]"
                    class="absolute inset-0 flex items-center justify-center"
                >
                  <div
                      class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"
                  ></div>
                </div>
                <!-- Селектор статуса -->
                <Select
                    :modelValue="task.status_id"
                    :options="statusOptions"
                    optionValue="value"
                    optionLabel="label"
                    placeholder="Выберите статус"
                    class="w-full"
                    :class="{ 'opacity-50 pointer-events-none': loadingStatuses[task.id] }"
                    @update:modelValue="updateStatus(task.id, $event)"
                >
                  <template #value="slotProps">
                      <span
                          v-if="slotProps.value"
                          :style="{ color: getTaskStatusColor(slotProps.value) }"
                      >
                        {{ statusOptions.find(opt => opt.value === slotProps.value)?.label || 'Неизвестный статус' }}
                      </span>
                    <span v-else>{{ slotProps.placeholder }}</span>
                  </template>
                  <template #option="slotProps">
                    <div class="flex items-center">
                        <span :style="{ color: getTaskStatusColor(slotProps.option.value) }">
                          {{ slotProps.option.label }}
                        </span>
                    </div>
                  </template>
                </Select>
              </div>
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
/* Стили для спиннера загрузки статуса */
.relative {
  position: relative;
}
</style>