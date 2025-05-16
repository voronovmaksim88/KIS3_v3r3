<!-- TaskDetailView.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useTasksStore } from '@/stores/storeTasks';
import { useOrdersStore } from '@/stores/storeOrders'; // Добавляем импорт storeOrders
import { getTaskStatusColor } from '@/utils/getStatusColor.ts';
import BaseModal from '@/components/BaseModal.vue';
import Select from 'primevue/select';
import 'primeicons/primeicons.css';
import { useThemeStore } from '@/stores/storeTheme.ts';

interface Props {
  onClose?: () => void;
}

const props = defineProps<Props>();

// Store для задач
const tasksStore = useTasksStore();
const currentTask = computed(() => tasksStore.currentTask);
const isLoading = computed(() => tasksStore.isCurrentTaskLoading);

// Store для заказов
const ordersStore = useOrdersStore();

// Store темы
const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.theme);

// Опции для статуса
const statusOptions = [
  { value: 1, label: 'Не начата' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На паузе' },
  { value: 4, label: 'Завершена' },
  { value: 5, label: 'Отменена' },
];

// Функция для обновления статуса задачи и заказа
const updateStatus = async (taskId: number, statusId: number) => {
  try {
    await tasksStore.updateTaskStatus(taskId, statusId);
    if (tasksStore.error) {
      console.error('Error updating task status:', tasksStore.error);
    } else {
      console.log(`Status for task ${taskId} updated successfully`);

      // Проверяем, есть ли связанный заказ и получаем его серийный номер ПРАВИЛЬНО
      const orderSerial = currentTask.value?.order?.serial;
      if (orderSerial) {
        console.log(`Attempting to refresh order: ${orderSerial}`);
        // Обновляем данные заказа
        await ordersStore.fetchOrderDetail(orderSerial);
        if (ordersStore.error) {
          console.error('Error refreshing order details:', ordersStore.error);
        } else {
          console.log(`Order ${orderSerial} details refreshed successfully`);
        }
      } else {
        console.log('No order serial found in current task to refresh order details.');
      }
    }
  } catch (err) {
    console.error('Unexpected error during status or order update process:', err);
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
      return result === '' ? '0 м.' : result.trim();
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
  if (currentTask.value?.status_id === 4) return false;
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
</script>

<template>
  <BaseModal
      :name="currentTask?.name || 'Детали задачи'"
      :onClose="props.onClose"
  >
    <!-- Индикатор загрузки -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <!-- Содержимое при загруженных данных -->
    <div v-else-if="currentTask" class="grid grid-cols-1 gap-4 mb-6">
      <!-- Статус -->
      <div class="grid grid-cols-4 gap-4">
        <div :class="textSecondaryClass" class="transition-colors duration-300 font-medium">Статус:</div>
        <div class="col-span-3">
          <div :class="[bgContentClass, 'rounded-md p-4 transition-colors duration-300 border', borderClass]">
            <Select
                :modelValue="currentTask.status_id"
                :options="statusOptions"
                optionValue="value"
                optionLabel="label"
                placeholder="Выберите статус"
                class="w-full"
                @update:modelValue="updateStatus(currentTask.id, $event)"
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
            <span v-if="isOverdue" class="ml-3 flex items-center text-red-400">
              <i class="pi pi-exclamation-circle mr-1"></i>
              <span>Просрочена</span>
            </span>
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
    <div v-else class="text-center py-8 text-red-500">
      Не удалось загрузить данные задачи
    </div>
  </BaseModal>
</template>