<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTasksStore } from '@/stores/storeTasks';
import { useToast } from 'primevue/usetoast';

// PrimeVue компоненты
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

// Определяем пропсы
const props = defineProps<{
  visible: boolean; // Для v-model
  taskId: number | null;
  initialDescription: string | null;
}>();

// Определяем события, которые компонент может emit'ить
const emit = defineEmits(['update:visible', 'update-description', 'cancel']);

// Локальное состояние для диалога
const newTaskDescription = ref<string | null>('');
const originalTaskDescription = ref<string | null>(''); // Храним исходное описание для проверки изменений
const isDescriptionUpdateLoading = ref(false);

// Store и утилиты
const tasksStore = useTasksStore();
const toast = useToast(); // Используем toast для уведомлений

// Инициализация локального состояния при изменении initialDescription или открытии диалога
watch(() => props.initialDescription, (newDescription) => {
  newTaskDescription.value = newDescription ?? '';
  originalTaskDescription.value = newDescription ?? '';
}, { immediate: true });

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    // Сброс состояния при открытии
    newTaskDescription.value = props.initialDescription ?? '';
    originalTaskDescription.value = props.initialDescription ?? '';
    isDescriptionUpdateLoading.value = false;
  }
});

/**
 * Обработчик сохранения нового описания задачи
 */
const handleUpdateTaskDescription = async () => {
  if (!props.taskId || newTaskDescription.value === originalTaskDescription.value) {
    // Если нет ID или описание не изменилось, закрываем диалог
    emit('update:visible', false);
    return;
  }

  if (newTaskDescription.value && newTaskDescription.value.length > 1024) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Описание задачи не должно превышать 1024 символа',
      life: 5000,
    });
    return;
  }

  try {
    isDescriptionUpdateLoading.value = true;

    // Обновляем описание задачи через store
    await tasksStore.updateTaskDescription(props.taskId, newTaskDescription.value?.trim() || null);

    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || `Не удалось изменить описание задачи #${props.taskId}`,
        life: 5000,
      });
      return;
    }

    // Уведомление об успехе
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Описание задачи #${props.taskId} обновлено`,
      life: 3000,
    });

    // Оповещаем родителя об успешном обновлении и закрываем диалог
    emit('update-description', { taskId: props.taskId, newDescription: newTaskDescription.value?.trim() || null });
    emit('update:visible', false);
  } catch (error) {
    console.error('Ошибка при изменении описания задачи:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || `Не удалось изменить описание задачи #${props.taskId}`,
      life: 5000,
    });
  } finally {
    isDescriptionUpdateLoading.value = false;
  }
};

/**
 * Отменяет редактирование описания и закрывает диалог
 */
const cancelEdit = () => {
  emit('update:visible', false);
  emit('cancel');
};

// Проверка, изменилось ли описание для кнопки "Сохранить"
const isSaveDisabled = computed(() => {
  return newTaskDescription.value === originalTaskDescription.value || isDescriptionUpdateLoading.value;
});
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="(value) => $emit('update:visible', value)"
      modal
      header="Изменение описания задачи"
      :style="{ width: '450px' }"
      :closable="true"
      :dismissableMask="true"
  >
    <template #header>
      <div :class="['p-dialog-header']">
        <span class="text-lg font-bold">Изменение описания задачи</span>
      </div>
    </template>

    <div :class="['p-4']">
      <div class="mb-4">
        <label for="taskDescriptionEdit" class="block mb-2">Описание задачи</label>
        <Textarea
            id="taskDescriptionEdit"
            v-model="newTaskDescription"
            class="w-full p-2"
            rows="5"
            autoResize
        />
      </div>
    </div>

    <template #footer>
      <div :class="['flex justify-end space-x-2 p-3']">
        <Button
            @click="cancelEdit"
            label="Отмена"
            severity="secondary"
        />
        <Button
            @click="handleUpdateTaskDescription"
            label="Сохранить"
            :loading="isDescriptionUpdateLoading"
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