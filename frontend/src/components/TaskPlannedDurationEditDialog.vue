<!-- TaskPlannedDurationEditDialog.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTasksStore } from '@/stores/storeTasks';
import { useToast } from 'primevue/usetoast';

// PrimeVue компоненты
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber'; // Используем InputNumber для ввода чисел
import Button from 'primevue/button';

// Определяем пропсы
const props = defineProps<{
  visible: boolean; // Для v-model
  taskId: number | null;
  initialDuration: string | null; // Начальное значение в формате ISO 8601 (например, P1DT1H1M)
}>();

// Определяем события, которые компонент может emit'ить
const emit = defineEmits(['update:visible', 'update-duration', 'cancel']);

// Локальное состояние для диалога
const hours = ref<number>(0); // Часы
const minutes = ref<number>(0); // Минуты
const originalHours = ref<number>(0); // Исходное значение часов
const originalMinutes = ref<number>(0); // Исходное значение минут
const isDurationUpdateLoading = ref(false); // Индикатор загрузки

// Store и утилиты
const tasksStore = useTasksStore();
const toast = useToast();

// Функция для преобразования ISO 8601 в часы и минуты
const parseDurationToHoursMinutes = (isoDuration: string | null): { hours: number; minutes: number } => {
  if (!isoDuration) return { hours: 0, minutes: 0 };

  // Простая парсинг логика для P[days]DT[hours]H[minutes]M
  const match = isoDuration.match(/^P(\d+D)?T?(\d+H)?(\d+M)?$/);
  if (!match) return { hours: 0, minutes: 0 };

  let totalHours = 0;
  let totalMinutes = 0;

  // Извлекаем дни
  if (match[1]) {
    const days = parseInt(match[1].replace('D', ''), 10);
    totalHours += days * 24;
  }
  // Извлекаем часы
  if (match[2]) {
    totalHours += parseInt(match[2].replace('H', ''), 10);
  }
  // Извлекаем минуты
  if (match[3]) {
    totalMinutes += parseInt(match[3].replace('M', ''), 10);
  }

  // Корректируем минуты, если больше 60
  const extraHours = Math.floor(totalMinutes / 60);
  totalHours += extraHours;
  totalMinutes = totalMinutes % 60;

  return { hours: totalHours, minutes: totalMinutes };
};

// Инициализация локального состояния при изменении initialDuration или открытии диалога
watch(() => props.initialDuration, (newDuration) => {
  const { hours: h, minutes: m } = parseDurationToHoursMinutes(newDuration);
  hours.value = h;
  minutes.value = m;
  originalHours.value = h;
  originalMinutes.value = m;
}, { immediate: true });

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    // Сброс состояния при открытии
    const { hours: h, minutes: m } = parseDurationToHoursMinutes(props.initialDuration);
    hours.value = h;
    minutes.value = m;
    originalHours.value = h;
    originalMinutes.value = m;
    isDurationUpdateLoading.value = false;
  }
});

/**
 * Преобразование часов и минут обратно в ISO 8601
 */
const formatToISO8601 = (hours: number, minutes: number): string => {
  const totalMinutes = hours * 60 + minutes;
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hoursLeft = Math.floor(remainingMinutes / 60);
  const minutesLeft = remainingMinutes % 60;

  let isoString = 'P';
  if (days > 0) isoString += `${days}D`;
  if (hoursLeft > 0 || minutesLeft > 0) isoString += 'T';
  if (hoursLeft > 0) isoString += `${hoursLeft}H`;
  if (minutesLeft > 0) isoString += `${minutesLeft}M`;

  return isoString || 'PT0M'; // Минимальный формат, если всё равно 0
};

/**
 * Обработчик сохранения новой длительности задачи
 */
const handleUpdateTaskPlannedDuration = async () => {
  if (!props.taskId) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Задача не выбрана',
      life: 5000,
    });
    return;
  }

  const isoDuration = formatToISO8601(hours.value, minutes.value);
  try {
    isDurationUpdateLoading.value = true;

    // Обновляем длительность задачи через store
    await tasksStore.updateTaskPlannedDuration(props.taskId, isoDuration);

    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || `Не удалось обновить длительность задачи #${props.taskId}`,
        life: 5000,
      });
      return;
    }

    // Уведомление об успехе
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Длительность задачи #${props.taskId} обновлена`,
      life: 3000,
    });

    // Оповещаем родителя об успешном обновлении и закрываем диалог
    emit('update-duration', { taskId: props.taskId, newDuration: isoDuration });
    emit('update:visible', false);
  } catch (error) {
    console.error('Ошибка при изменении длительности задачи:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || `Не удалось обновить длительность задачи #${props.taskId}`,
      life: 5000,
    });
  } finally {
    isDurationUpdateLoading.value = false;
  }
};

/**
 * Отменяет редактирование длительности и закрывает диалог
 */
const cancelEdit = () => {
  emit('update:visible', false);
  emit('cancel');
};

// Проверка, изменилась ли длительность для активации кнопки "Сохранить"
const isSaveDisabled = computed(() => {
  return hours.value === originalHours.value && minutes.value === originalMinutes.value || isDurationUpdateLoading.value;
});
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="(value) => $emit('update:visible', value)"
      modal
      header="Изменение плановой длительности задачи"
      :style="{ width: '450px' }"
      :closable="true"
      :dismissableMask="true"
  >
    <template #header>
      <div :class="['p-dialog-header']">
        <span class="text-lg font-bold">Плановая длительность задачи</span>
      </div>
    </template>

    <div :class="['p-4']">
      <div class="mb-4">
        <label for="durationHours" class="block mb-2">Часы</label>
        <InputNumber
            id="durationHours"
            v-model.number="hours"
            :min="0"
            :max="9999"
            class="w-full p-2"
            @keyup.enter="!isSaveDisabled && handleUpdateTaskPlannedDuration()"
        />
      </div>
      <div class="mb-4">
        <label for="durationMinutes" class="block mb-2">Минуты</label>
        <InputNumber
            id="durationMinutes"
            v-model.number="minutes"
            :min="0"
            :max="59"
            class="w-full p-2"
            @keyup.enter="!isSaveDisabled && handleUpdateTaskPlannedDuration()"
        />
      </div>
    </div>

    <template #footer>
      <div :class="['flex justify-end space-x-2 p-3']">
        <Button
            @click="cancelEdit"
            label="Отмена"
            severity="secondary"
            :disabled="isDurationUpdateLoading"
        />
        <Button
            @click="handleUpdateTaskPlannedDuration"
            label="Сохранить"
            :loading="isDurationUpdateLoading"
            :disabled="isSaveDisabled"
            icon="pi pi-check"
            iconPos="right"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
/* Стили для диалога, если нужны, или использовать TailwindCSS классы */
</style>