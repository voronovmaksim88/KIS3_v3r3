<!-- TaskDetailView.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

// Функция для форматирования ФИО исполнителя
const formatExecutorName = (executor: { name: string; surname: string } | null): string => {
  if (!executor) return 'Не назначен';
  return `${executor.surname} ${executor.name}`;
};

const isSaving = ref(false); // Флаг для блокировки кнопки

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
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <!-- Индикатор загрузки имени -->
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
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <div class="relative">
              <!-- Индикатор загрузки статуса -->
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
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <p v-if="currentTask.description">{{ currentTask.description }}</p>
            <p v-else :class="currentTheme === 'dark' ? 'text-gray-400 italic' : 'text-gray-500 italic'">Описание отсутствует</p>
          </div>
        </div>
      </div>

      <!-- Исполнитель -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Исполнитель:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <p v-if="currentTask.executor">{{ formatExecutorName(currentTask.executor) }}</p>
            <p v-else :class="currentTheme === 'dark' ? 'text-gray-400 italic' : 'text-gray-500 italic'">Не назначен</p>
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
                <div>{{ formatDuration(currentTask.planned_duration) }}</div>
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

  </BaseModal>
</template>

<style scoped>
.relative {
  position: relative;
}
</style>