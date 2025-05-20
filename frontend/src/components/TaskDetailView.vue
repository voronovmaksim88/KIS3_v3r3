<!-- TaskDetailView.vue -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useTasksStore } from '@/stores/storeTasks';
import { getTaskStatusColor } from '@/utils/getStatusColor.ts';
import BaseModal from '@/components/BaseModal.vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import 'primeicons/primeicons.css';
import { useThemeStore } from '@/stores/storeTheme.ts';
import { typeTask } from '@/types/typeTask.ts';
import Textarea from 'primevue/textarea';
import { usePeopleStore } from '@/stores/storePeople';
import { formatFIO } from '@/utils/formatFIO';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import TaskPlannedDurationEditDialog from '@/components/TaskPlannedDurationEditDialog.vue'; // Импортируем диалог

interface Props {
  onClose?: () => void;
}

const props = defineProps<Props>();

// Store для задач
const tasksStore = useTasksStore();
const currentTask = computed(() => tasksStore.currentTask as typeTask | null);
const isLoading = computed(() => tasksStore.isCurrentTaskLoading);

// Store темы
const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.theme);

// Toast для уведомлений
const toast = useToast();

// Опции для статуса
const statusOptions = [
  { value: 1, label: 'Не начата' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На паузе' },
  { value: 4, label: 'Завершена' },
  { value: 5, label: 'Отменена' },
];

const isStatusUpdated = ref(false); // Флаг для отслеживания изменения статуса
const isStatusLoading = ref(false); // Флаг для индикатора загрузки статуса

// Состояние для редактирования имени
const taskName = ref<string>(currentTask.value?.name || '');
const isNameLoading = ref(false);

// Обновление имени задачи
const isUpdating = ref(false);

// Состояние для редактирования описания
const taskDescription = ref<string | null>(currentTask.value?.description || null);
const isDescriptionLoading = ref(false);

// Состояние для загрузки исполнителя
const isExecutorLoading = ref(false);

// Store для людей
const peopleStore = usePeopleStore();
const { activeUsers } = storeToRefs(peopleStore);

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

const updateTaskName = async (taskId: number, newName: string) => {
  if (isUpdating.value) return; // Предотвращаем повторный вызов
  if (!newName.trim()) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Имя задачи не может быть пустым', life: 5000 });
    taskName.value = currentTask.value?.name || '';
    return;
  }
  if (newName.trim().length > 128) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Имя задачи не должно превышать 128 символов', life: 5000 });
    taskName.value = currentTask.value?.name || '';
    return;
  }

  isUpdating.value = true;
  isNameLoading.value = true;

  try {
    await tasksStore.updateTaskName(taskId, newName.trim());
    if (tasksStore.error) {
      toast.add({ severity: 'error', summary: 'Ошибка', detail: tasksStore.error || `Не удалось обновить имя задачи #${taskId}`, life: 5000 });
      taskName.value = currentTask.value?.name || '';
    } else {
      toast.add({ severity: 'success', summary: 'Успешно', detail: `Имя задачи #${taskId} обновлено`, life: 3000 });
      isStatusUpdated.value = true;
    }
  } catch (err) {
    console.error('Ошибка при обновлении имени задачи:', err);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: `Не удалось обновить имя задачи #${taskId}`, life: 5000 });
    taskName.value = currentTask.value?.name || '';
  } finally {
    isUpdating.value = false;
    isNameLoading.value = false;
  }
};

// Функция для обновления исполнителя
const updateExecutor = async (taskId: number, executorUuid: string | null) => {
  if (isUpdating.value) return;
  isUpdating.value = true;
  isExecutorLoading.value = true;

  try {
    await tasksStore.updateTaskExecutor(taskId, executorUuid);

    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || `Не удалось изменить исполнителя задачи #${taskId}`,
        life: 5000,
      });
    } else {
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: `Исполнитель задачи #${taskId} успешно изменён`,
        life: 3000,
      });
      isStatusUpdated.value = true;
    }
  } catch (err) {
    console.error('Ошибка при обновлении исполнителя:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось изменить исполнителя задачи #${taskId}`,
      life: 5000,
    });
  } finally {
    isUpdating.value = false;
    isExecutorLoading.value = false;
  }
};

// Синхронизация taskName с currentTask.name при изменении currentTask
watch(currentTask, (newTask) => {
  taskName.value = newTask?.name || '';
});

// Функция для обновления статуса задачи и заказа
const updateStatus = async (taskId: number, statusId: number) => {
  if (!currentTask.value) return; // Безопасная проверка
  isSaving.value = true;
  isStatusLoading.value = true;

  try {
    await tasksStore.updateTaskStatus(taskId, statusId);

    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || `Не удалось изменить статус задачи #${taskId}`,
        life: 5000,
      });
    } else {
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: `Статус задачи #${taskId} успешно изменен`,
        life: 3000,
      });
      isStatusUpdated.value = true;
    }
  } catch (err) {
    console.error('Unexpected error during status update:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось изменить статус задачи #${taskId}`,
      life: 5000,
    });
  } finally {
    isSaving.value = false;
    isStatusLoading.value = false;
  }
};

// Обновление описания задачи
const updateTaskDescription = async (taskId: number, newDescription: string | null) => {
  if (isUpdating.value) return; // Предотвращаем повторный вызов
  if (newDescription && newDescription.length > 1024) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: 'Описание задачи не должно превышать 1024 символа', life: 5000 });
    taskDescription.value = currentTask.value?.description || null;
    return;
  }
  if ((newDescription?.trim() || null) === (currentTask.value?.description?.trim() || null)) {
    return;
  }

  isUpdating.value = true;
  isDescriptionLoading.value = true;

  try {
    await tasksStore.updateTaskDescription(taskId, newDescription?.trim() || null);
    if (tasksStore.error) {
      toast.add({ severity: 'error', summary: 'Ошибка', detail: tasksStore.error || `Не удалось обновить описание задачи #${taskId}`, life: 5000 });
      taskDescription.value = currentTask.value?.description || null;
    } else {
      toast.add({ severity: 'success', summary: 'Успешно', detail: `Описание задачи #${taskId} обновлено`, life: 3000 });
      isStatusUpdated.value = true;
    }
  } catch (err) {
    console.error('Ошибка при обновлении описания задачи:', err);
    toast.add({ severity: 'error', summary: 'Ошибка', detail: `Не удалось обновить описание задачи #${taskId}`, life: 5000 });
    taskDescription.value = currentTask.value?.description || null;
  } finally {
    isUpdating.value = false;
    isDescriptionLoading.value = false;
  }
};

// Синхронизация taskDescription с currentTask.description при изменении currentTask
watch(currentTask, (newTask) => {
  taskDescription.value = newTask?.description || null;
});

// Для форматирования дат
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'Не указано';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Для форматирования длительности в ISO 8601 формате
const formatDuration = (durationString: string | null): string => {
  if (!durationString) return 'Не указано';
  if (durationString.startsWith('P')) {
    try {
      const dayMatch = durationString.match(/(\d+)D/);
      const hourMatch = durationString.match(/(\d+)H/);
      const minuteMatch = durationString.match(/(\d+)M/);
      const days = dayMatch ? parseInt(dayMatch[1]) : 0;
      const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      let result = '';
      if (days > 0) result += `${days} д. `;
      if (hours > 0 || days > 0) result += `${hours} ч. `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes} м. `;
      return result.trim() || '0 м.';
    } catch (error) {
      console.error('Ошибка при парсинге длительности:', error);
      return 'Ошибка формата';
    }
  }
  try {
    const hours = parseFloat(durationString);
    if (!isNaN(hours)) return `${hours} ч.`;
    return durationString;
  } catch {
    return durationString;
  }
};

// Определяем, просрочена ли задача
const isOverdue = computed(() => {
  if (!currentTask.value?.deadline_moment) return false;
  if (currentTask.value.status_id === 4) return false;
  const deadline = new Date(currentTask.value.deadline_moment);
  const now = new Date();
  return deadline < now;
});

// Вычисляемые свойства для цветов в зависимости от темы
const bgContentClass = computed(() => currentTheme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-50');
const textSecondaryClass = computed(() => currentTheme.value === 'dark' ? 'text-gray-300' : 'text-gray-600');
const borderClass = computed(() => currentTheme.value === 'dark' ? 'border-gray-700' : 'border-gray-200');

const isSaving = ref(false); // Флаг для блокировки кнопки

// Функция для закрытия формы
const closeForm = () => {
  if (props.onClose) {
    props.onClose();
  }
};

// Состояние для диалога редактирования длительности
const showDurationEditDialog = ref(false);

// Обработчик клика для открытия диалога длительности
const openDurationEditDialog = () => {
  if (currentTask.value) {
    showDurationEditDialog.value = true;
  }
};

// Обработчик успешного обновления длительности
const handleDurationUpdate = () => {
  showDurationEditDialog.value = false;
};

// Обработчик отмены редактирования длительности
const handleDurationEditCancel = () => {
  showDurationEditDialog.value = false;
};

// Выполняется при монтировании компонента
onMounted(() => {
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
</script>

<template>
  <BaseModal
      :name="currentTask ? `Задача #${currentTask.id}` : 'Детали задачи'"
      :onClose="props.onClose"
  >
    <Toast />

    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <!-- Содержимое при загруженных данных -->
    <div v-if="currentTask" class="grid grid-cols-1 gap-4 mb-6">
      <!-- Название -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Название:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-2 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <div v-if="isNameLoading" class="absolute inset-0 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <InputText
                  v-model="taskName"
                  class="w-full"
                  :class="{ 'opacity-50': isNameLoading }"
                  :disabled="isNameLoading"
                  placeholder="Введите название задачи"
                  @blur="updateTaskName(currentTask.id, taskName)"
                  @keyup.enter="updateTaskName(currentTask.id, taskName)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Статус -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Статус:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-2 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <div v-if="isStatusLoading" class="absolute inset-0 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>

              <Select
                  :modelValue="currentTask.status_id"
                  :options="statusOptions"
                  optionValue="value"
                  optionLabel="label"
                  placeholder="Выберите статус"
                  class="w-full"
                  :class="{ 'opacity-50': isStatusLoading }"
                  :disabled="isStatusLoading"
                  @update:modelValue="updateStatus(currentTask.id, $event)"
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
              <span v-if="isOverdue" class="ml-3 flex items-center text-red-400">
                <i class="pi pi-exclamation-circle mr-1"></i>
                <span>Просрочена</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Описание -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Описание:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-2 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <div v-if="isDescriptionLoading" class="absolute inset-0 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <Textarea
                  v-model="taskDescription"
                  class="w-full"
                  :class="{ 'opacity-50': isDescriptionLoading }"
                  :disabled="isDescriptionLoading"
                  placeholder="Введите описание задачи"
                  rows="5"
                  autoResize
                  @blur="updateTaskDescription(currentTask.id, taskDescription)"
                  @keyup.ctrl.enter="updateTaskDescription(currentTask.id, taskDescription)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Исполнитель -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Исполнитель:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-2 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <div v-if="isExecutorLoading" class="absolute inset-0 flex items-center justify-center z-10">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <Select
                  :modelValue="currentTask.executor?.uuid"
                  :options="executorOptions"
                  optionValue="value"
                  optionLabel="label"
                  placeholder="Выберите исполнителя"
                  class="w-full"
                  :class="{ 'opacity-50': isExecutorLoading }"
                  :disabled="isExecutorLoading"
                  @update:modelValue="updateExecutor(currentTask.id, $event)"
              >
                <template #value="slotProps">
                  <span v-if="slotProps.value">
                    {{ executorOptions.find(opt => opt.value === slotProps.value)?.label ||
                  (currentTask.executor ? formatFIO(currentTask.executor) : 'Неизвестный исполнитель') }}
                  </span>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <!-- Временные показатели -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Время:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <div class="grid grid-cols-1 gap-2">
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">Создана:</div>
                <div>{{ formatDateTime(currentTask.creation_moment) }}</div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">Начата:</div>
                <div>{{ formatDateTime(currentTask.start_moment) }}</div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">Дедлайн:</div>
                <div :class="{ 'text-red-400': isOverdue }">
                  {{ formatDateTime(currentTask.deadline_moment) }}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">Завершена:</div>
                <div>{{ formatDateTime(currentTask.end_moment) }}</div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">План. длительность:</div>
                <div
                    class="cursor-pointer hover:bg-gray-100 transition-colors duration-300 p-1 rounded"
                    @click="openDurationEditDialog"
                >
                  {{ formatDuration(currentTask.planned_duration) }}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div :class="textSecondaryClass" class="transition-colors duration-300">Факт. длительность:</div>
                <div>{{ formatDuration(currentTask.actual_duration) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-else-if="!isLoading && !currentTask" class="text-center py-8 text-red-500">
      Не удалось загрузить данные задачи
    </div>

    <!-- Загрузка активных пользователей -->
    <div v-if="peopleStore.isLoading && !activeUsers.length" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <!-- Диалог редактирования плановой длительности -->
    <TaskPlannedDurationEditDialog
        v-model:visible="showDurationEditDialog"
        :task-id="currentTask?.id ?? null"
        :initial-duration="currentTask?.planned_duration ?? null"
        @update-duration="handleDurationUpdate"
        @cancel="handleDurationEditCancel"
    />

    <div class="flex justify-end mt-4">
      <Button
          @click="closeForm"
          label="OK"
          icon="pi pi-check"
          severity="success"
          class="p-button-sm"
      />
    </div>
  </BaseModal>
</template>

<style scoped>
.relative {
  position: relative;
}
</style>