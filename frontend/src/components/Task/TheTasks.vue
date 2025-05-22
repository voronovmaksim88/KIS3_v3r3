<!-- src/components/TheTasks.vue -->
<script setup lang="ts">
// Базовые хуки Vue
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue';

// Хук Pinia для рефакторинга стореджей
import { storeToRefs } from 'pinia';

// Сторежки (Pinia stores)
import { useTasksStore } from '@/stores/storeTasks.ts';
import { useOrdersStore } from '@/stores/storeOrders.ts';
import { usePeopleStore } from '@/stores/storePeople.ts';
import { useThemeStore } from '@/stores/storeTheme.ts';

// Композиционные хуки (Composables)
import { useTableStyles } from '@/composables/useTableStyles.ts';
import { useToast } from 'primevue/usetoast';

// Вспомогательные функции
import { getOrderStatusColor, getTaskStatusColor } from '@/utils/getStatusColor.ts';
import { formatFIO } from '@/utils/formatFIO.ts';
import {formatLocalDateTime} from "@/utils/convertDateTime.ts";

// Диалоговые окна (модальные компоненты)
import TaskNameEditDialog from '@/components/Task/TaskNameEditDialog.vue';
import TaskDescriptionEditDialog from '@/components/Task/TaskDescriptionEditDialog.vue';
import TaskPlannedDurationEditDialog from '@/components/Task/TaskPlannedDurationEditDialog.vue'; // Импортируем диалог длительности

// Компоненты PrimeVue UI
import Select from 'primevue/select';
import Toast from 'primevue/toast';
import Paginator from 'primevue/paginator';
import DatePicker from 'primevue/datepicker';

// Дополнительные типы
import { type TaskFilters } from '@/stores/storeTasks.ts';
import { type TaskSortField } from '@/types/typeTask';

// Состояние загрузки для каждого DatePicker
const loadingStartMoments = ref<Record<number, boolean>>({});
const loadingDeadlineMoments = ref<Record<number, boolean>>({});

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

// Store людей
const peopleStore = usePeopleStore();
const { activeUsers } = storeToRefs(peopleStore); // Получаем активных пользователей

// Опции для исполнителей
const executorOptions = computed(() => {
  return [
    { value: null, label: 'Без исполнителя' },
    ...activeUsers.value.map(user => ({
      value: user.uuid,
      label: formatFIO(user),
    })),
  ];
});

// Состояние загрузки для каждого исполнителя
const loadingExecutors = ref<Record<number, boolean>>({});

// Сортировка
const { sortField, sortDirection } = storeToRefs(tasksStore);

// Локальные фильтры для двусторонней привязки
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

// Состояние для диалога изменения описания задачи
const showDescriptionEditDialog = ref(false);
const selectedTaskDescription = ref<string | null>(null);

// Состояние для диалога изменения плановой длительности
const showDurationEditDialog = ref(false); // Новое состояние для диалога длительности
const selectedTaskDuration = ref<string | null>(null); // Хранит planned_duration

// Состояние пагинации
const currentPage = ref(0); // Текущая страница (0-based для вычислений)
const rowsPerPage = ref(10); // Количество строк на странице

// Вычисляем skip на основе текущей страницы и строк на странице
const skip = computed(() => currentPage.value * rowsPerPage.value);


// Утилита для преобразования ISO строки в Date и обратно
const convertIsoToDate = (isoString: string | null): Date | null => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
};

const startDates = ref<Record<number, Date | null>>({});
const deadlineDates = ref<Record<number, Date | null>>({});


// Универсальная функция для обновления задачи с обработкой ошибок и заказов
const updateTaskField = async <T>(
    taskId: number,
    updateFn: () => Promise<T>,
    successMessage: string,
    errorMessage: string
) => {
  try {
    loadingStatuses.value[taskId] = true;
    await updateFn();
    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || errorMessage,
        life: 5000,
      });
      return;
    }
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: successMessage,
      life: 3000,
    });
    const task = tasksStore.tasks.find(t => t.id === taskId);
    if (task?.order?.serial) {
      await ordersStore.fetchOrderDetail(task.order.serial);
      if (ordersStore.error) {
        toast.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: `Не удалось обновить данные заказа #${task.order.serial}`,
          life: 5000,
        });
      }
    }
  } catch (err) {
    console.error(`Error updating task ${taskId}:`, err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || errorMessage,
      life: 5000,
    });
  } finally {
    loadingStatuses.value[taskId] = false;
  }
};


// Синхронизация пагинации с хранилищем
watch([currentPage, rowsPerPage], () => {
  tasksStore.updatePagination(skip.value, rowsPerPage.value);
});

// Watch за изменениями фильтров магазина для синхронизации с локальными фильтрами
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
  await updateTaskField(
      taskId,
      () => tasksStore.updateTaskStatus(taskId, statusId),
      `Статус задачи #${taskId} успешно изменён`,
      `Не удалось изменить статус задачи #${taskId}`
  );
};

// Функция для обновления исполнителя задачи
const updateExecutor = async (taskId: number, executorUuid: string | null) => {
  await updateTaskField(
      taskId,
      () => tasksStore.updateTaskExecutor(taskId, executorUuid),
      `Исполнитель задачи #${taskId} успешно изменён`,
      `Не удалось изменить исполнителя задачи #${taskId}`
  );
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
};

// Обработчик отмены редактирования
const handleNameEditCancel = () => {
  console.log('Task name edit cancelled');
  showNameEditDialog.value = false;
};

// Обработчик клика на описание задачи для открытия диалога
const openDescriptionEditDialog = (taskId: number, description: string | null) => {
  selectedTaskId.value = taskId;
  selectedTaskDescription.value = description;
  showDescriptionEditDialog.value = true;
};

// Обработчик успешного обновления описания
const handleDescriptionUpdate = ({ taskId, newDescription }: { taskId: number; newDescription: string | null }) => {
  console.log(`Task ${taskId} description updated to ${newDescription}`);
  showDescriptionEditDialog.value = false;
};

// Обработчик отмены редактирования описания
const handleDescriptionEditCancel = () => {
  console.log('Task description edit cancelled');
  showDescriptionEditDialog.value = false;
};


// Функция для преобразования ISO 8601 длительности в часы и минуты
const formatDurationToHours = (isoDuration: string | null): string => {
  if (!isoDuration) return '—';
  try {
    const match = isoDuration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
    if (!match) return '---';
    const days = parseInt(match[1] || '0');
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[3] || '0');
    const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (totalHours >= 1) {
      return remainingMinutes === 0
          ? `${totalHours}ч`
          : `${totalHours}ч ${remainingMinutes}м`;
    }
    return `${totalMinutes}м`;
  } catch {
    return 'Неверный формат';
  }
};

// Обработчик клика на плановую длительность для открытия диалога
const openDurationEditDialog = (taskId: number, duration: string | null) => {
  selectedTaskId.value = taskId;
  selectedTaskDuration.value = duration;
  showDurationEditDialog.value = true;
};

// Обработчик успешного обновления длительности
const handleDurationUpdate = ({ taskId, newDuration }: { taskId: number; newDuration: string }) => {
  console.log(`Task ${taskId} duration updated to ${newDuration}`);
  showDurationEditDialog.value = false;
};

// Обработчик отмены редактирования длительности
const handleDurationEditCancel = () => {
  console.log('Task duration edit cancelled');
  showDurationEditDialog.value = false;
};

// Функция для обновления времени начала задачи
const updateTaskStartMoment = async (taskId: number, newStartMoment: Date | null) => {
  const isoDate = newStartMoment
      ? new Date(Date.UTC(
          newStartMoment.getFullYear(),
          newStartMoment.getMonth(),
          newStartMoment.getDate()
      )).toISOString()
      : null;
  await updateTaskField(
      taskId,
      () => tasksStore.updateTaskStartMoment(taskId, isoDate),
      `Дата начала задачи #${taskId} обновлена`,
      `Не удалось обновить дату начала задачи #${taskId}`
  );
};

// Функция для обновления дедлайна задачи
const updateTaskDeadlineMoment = async (taskId: number, newDeadlineMoment: Date | null) => {
  const isoDate = newDeadlineMoment
      ? new Date(Date.UTC(
          newDeadlineMoment.getFullYear(),
          newDeadlineMoment.getMonth(),
          newDeadlineMoment.getDate()
      )).toISOString()
      : null;
  await updateTaskField(
      taskId,
      () => tasksStore.updateTaskDeadlineMoment(taskId, isoDate),
      `Дедлайн задачи #${taskId} обновлён`,
      `Не удалось обновить дедлайн задачи #${taskId}`
  );
};


// Минимальная допустимая дата (сегодня)
const today = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
});

// Выполняется при монтировании компонента
onMounted(() => {
  if (!tasksStore.tasks.length && !tasksStore.isLoading) {
    tasksStore.updatePagination(skip.value, rowsPerPage.value);
  }
  // Загружаем активных пользователей
  peopleStore.fetchActiveUsers().catch(err => {
    console.error('Error fetching active users:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось загрузить список активных пользователей',
      life: 5000,
    });
  });
});


// Функция для определения иконки сортировки
const getSortIcon = (field: TaskSortField): string => {
  if (sortField.value === field) {
    return sortDirection.value === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }
  return 'pi pi-sort text-gray-400';
};

// Обработчик изменения сортировки
const handleSortClick = (field: TaskSortField, event: MouseEvent) => {
  if ((event.target as HTMLElement).closest('.p-selectbutton, .p-inputtext, .p-datepicker, .p-select')) {
    console.log('Click originated from interactive element, preventing sort.');
    return;
  }
  tasksStore.updateSort(field, sortField.value === field && sortDirection.value === 'asc' ? 'desc' : 'asc');
};


watch(() => tasksStore.tasks, (tasks) => {
  for (const task of tasks) {
    startDates.value[task.id] = convertIsoToDate(task.start_moment);
    deadlineDates.value[task.id] = convertIsoToDate(task.deadline_moment);
  }
}, { immediate: true });


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

  <TaskDescriptionEditDialog
      v-model:visible="showDescriptionEditDialog"
      :task-id="selectedTaskId"
      :initial-description="selectedTaskDescription"
      @update-description="handleDescriptionUpdate"
      @cancel="handleDescriptionEditCancel"
  />

  <TaskPlannedDurationEditDialog
      v-model:visible="showDurationEditDialog"
      :task-id="selectedTaskId"
      :initial-duration="selectedTaskDuration"
      @update-duration="handleDurationUpdate"
      @cancel="handleDurationEditCancel"
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

    <div v-if="(!tasksStore.isLoading) || (tasksStore.isLoading && tasksStore.tasks.length > 0)">
      <table :class="tableBaseClass">
        <colgroup>
          <col class="w-[3%]" />    <!-- столбец id задачи -->
          <col class="w-[4%]" />    <!-- столбец номер заказа -->
          <col class="w-[10%]" />   <!-- имя задачи -->
          <col class="w-[15%]" />   <!-- описание -->
          <col class="w-[8%]" />    <!-- статус -->
          <col class="w-[10%]" />   <!-- исполнитель -->
          <col class="w-[5%]" />    <!-- время план -->
          <col class="w-[5%]" />    <!-- время факт -->
          <col class="w-[10%]" />   <!-- столбец дата создания -->
          <col class="w-[10%]" />   <!-- столбец дата начала -->
          <col class="w-[10%]" />   <!-- столбец дедлайн -->
          <col class="w-[10%]" />   <!-- столбец завершена -->
        </colgroup>
        <thead>
        <!-- Строка управления на самом верху таблицы -->
        <tr :class="thClasses">
          <th colspan="12" :class="tableHeaderRowClass">
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
          <th
              :class="thClasses"
              class="cursor-pointer"
              @click="(event) => handleSortClick('id', event)"
          >
            <div class="flex items-center">
              id
              <span class="ml-1">
                <i :class="getSortIcon('id')"></i>
              </span>
            </div>
          </th>

          <th
              :class="thClasses"
              class="cursor-pointer"
              @click="(event) => handleSortClick('order', event)"
          >
            <div class="flex items-center">
              Заказ
              <span class="ml-1">
                <i :class="getSortIcon('order')"></i>
              </span>
            </div>
          </th>
          <th :class="thClasses">Имя</th>
          <th :class="thClasses">Описание</th>
          <th
              :class="thClasses"
              class="cursor-pointer"
              @click="(event) => handleSortClick('status', event)"
          >
            <div class="flex items-center">
              Статус
              <span class="ml-1">
                <i :class="getSortIcon('status')"></i>
              </span>
            </div>
          </th>
          <th :class="thClasses">Исполнитель</th>
          <th :class="thClasses">План</th>
          <th :class="thClasses">Факт</th>
          <th :class="thClasses">Создана</th>
          <th :class="thClasses">Дата начала</th>
          <th :class="thClasses">Дедлайн</th>
          <th :class="thClasses">Завершена</th>
        </tr>

        </thead>

        <tbody>
        <template v-for="task in tasksStore.tasks" :key="task.id">
          <tr :class="trBaseClass">
            <!-- id задачи -->
            <td :class="tdBaseTextClass">{{ task.id }}</td>

            <!-- номер заказа -->
            <td
                class="px-4 py-2 cursor-pointer transition duration-300"
                :class="[
                    tdBaseTextClass,
                    { 'font-bold': task.order && [1, 2, 3, 4, 8].includes(task.order.status_id) }
                ]"
                :style="{ color: getOrderStatusColor(task.order?.status_id ?? null, currentTheme) }"
            >
              {{ task.order?.serial }}
            </td>

            <!-- Имя задачи -->
            <td
                :class="tdBaseTextClass"
                class="cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-700"
                @click="openNameEditDialog(task.id, task.name)"
            >
              {{ task.name }}
            </td>

            <!-- Описание задачи -->
            <td
                :class="[
                    tdBaseTextClass,
                    'cursor-pointer',
                    'hover:bg-gray-500',
                    'dark:hover:bg-gray-700',
                    {'text-sm text-gray-400 italic': !task.description}
                ]"
                @click="openDescriptionEditDialog(task.id, task.description)"
            >
              {{ task.description || 'Нет описания' }}
            </td>

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

            <!-- Выбор исполнителя -->
            <td class="px-4 py-2" :class="tdBaseTextClass">
              <div class="relative flex items-center">
                <!-- Спиннер загрузки -->
                <div
                    v-if="loadingExecutors[task.id]"
                    class="absolute inset-0 flex items-center justify-center"
                >
                  <div
                      class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"
                  ></div>
                </div>
                <!-- Селектор исполнителя -->
                <Select
                    :modelValue="task.executor?.uuid"
                    :options="executorOptions"
                    optionValue="value"
                    optionLabel="label"
                    placeholder="Выберите исполнителя"
                    class="w-full"
                    :class="{ 'opacity-50 pointer-events-none': loadingExecutors[task.id] }"
                    @update:modelValue="updateExecutor(task.id, $event)"
                >
                  <template #value="slotProps">
                    <span v-if="slotProps.value">
                      {{ executorOptions.find(opt => opt.value === slotProps.value)?.label ||
                    (task.executor ? formatFIO(task.executor) : 'Неизвестный исполнитель') }}
                    </span>
                    <span v-else>{{ slotProps.placeholder }}</span>
                  </template>
                </Select>
              </div>
            </td>

            <!-- Плановая длительность -->
            <td
                :class="tdBaseTextClass"
                class="cursor-pointer hover:bg-gray-500 dark:hover:bg-gray-700"
                @click="openDurationEditDialog(task.id, task.planned_duration)"
            >
              {{ formatDurationToHours(task.planned_duration) }}
            </td>

            <!-- Фактическая длительность -->
            <td
                :class="tdBaseTextClass"
            >
              {{ formatDurationToHours(task.actual_duration) }}
            </td>


            <!-- Дата создания -->
            <td :class="tdBaseTextClass" class="px-4 py-2">
              {{ formatLocalDateTime(task.creation_moment) }}
            </td>


            <!-- Дата начала -->
            <td :class="tdBaseTextClass" class="px-4 py-2">
              <div class="relative flex items-center">
                <div
                    v-if="loadingStartMoments[task.id]"
                    class="absolute inset-0 flex items-center justify-center"
                >
                  <div
                      class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"
                  ></div>
                </div>
                <DatePicker
                    v-model="startDates[task.id]"
                    dateFormat="dd.mm.yy"
                    placeholder="Выберите дату"
                    :showIcon="false"
                    :minDate="today"
                    class="w-full"
                    :class="{ 'opacity-50 pointer-events-none': loadingStartMoments[task.id] }"
                    @update:modelValue="updateTaskStartMoment(task.id, startDates[task.id])"
                />
              </div>
            </td>

            <!-- Дедлайн -->
            <td :class="tdBaseTextClass" class="px-4 py-2">
              <div class="relative flex items-center">
                <div
                    v-if="loadingDeadlineMoments[task.id]"
                    class="absolute inset-0 flex items-center justify-center"
                >
                  <div
                      class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"
                  ></div>
                </div>
                <DatePicker
                    v-model="deadlineDates[task.id]"
                    dateFormat="dd.mm.yy"
                    placeholder="Выберите дату"
                    :showIcon="false"
                    :minDate="today"
                    class="w-full"
                    :class="{ 'opacity-50 pointer-events-none': loadingDeadlineMoments[task.id] }"
                    @update:modelValue="updateTaskDeadlineMoment(task.id, deadlineDates[task.id])"
                />
              </div>
            </td>

            <!-- Дата завершения -->
            <td :class="tdBaseTextClass" class="px-4 py-2">
              {{ formatLocalDateTime(task.end_moment) }}
            </td>

          </tr>

        </template>

        <tr v-if="tasksStore.tasks.length === 0 && !tasksStore.isLoading && !tasksStore.error">
          <td
              colspan="10"
              class="py-6 text-center text-lg text-gray-400 italic"
              :class="currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'"
          >
            Задач не найдено
          </td>
        </tr>



        </tbody>
      </table>

      <div class="mt-4 flex justify-center">
        <Paginator
            :rows="rowsPerPage"
            :totalRecords="tasksStore.total"
            :rowsPerPageOptions="[10, 20, 50, 100]"
            v-model:first="skip"
            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
            :class="[
              'p-paginator',
              currentTheme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-300'
            ]"
            @update:first="currentPage = Math.floor($event / rowsPerPage)"
            @update:rows="rowsPerPage = $event"
        />
      </div>
      <span class="text-sm font-medium" :class="currentTheme === 'light' ? 'text-gray-700' : 'text-gray-300'">
        Всего задач: {{ tasksStore.total }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Стили для спиннера загрузки статуса */
.relative {
  position: relative;
}
</style>