<!-- TaskNameEditDialog.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTasksStore } from '@/stores/storeTasks.ts';
import { useToast } from 'primevue/usetoast';

// PrimeVue компоненты
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

// Определяем пропсы
const props = defineProps<{
  visible: boolean; // Для v-model
  taskId: number | null;
  initialName: string;
}>();

// Определяем события, которые компонент может emit'ить
const emit = defineEmits(['update:visible', 'update-name', 'cancel']);

// Локальное состояние для диалога
const newTaskName = ref('');
const originalTaskName = ref(''); // Храним исходное название для проверки изменений
const isNameUpdateLoading = ref(false);

// Store и утилиты
const tasksStore = useTasksStore();
const toast = useToast(); // Используем toast для уведомлений

// Инициализация локального состояния при изменении initialName или открытии диалога
watch(() => props.initialName, (newName) => {
  newTaskName.value = newName;
  originalTaskName.value = newName;
}, { immediate: true });

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    // Сброс состояния при открытии
    newTaskName.value = props.initialName;
    originalTaskName.value = props.initialName;
    isNameUpdateLoading.value = false;
  }
});

/**
 * Обработчик сохранения нового имени задачи
 */
/**
 * Обработчик сохранения нового имени задачи
 */
const handleUpdateTaskName = async () => {
  if (!props.taskId || newTaskName.value.trim() === '' || newTaskName.value.trim() === originalTaskName.value) {
    // Если нет ID, имя пустое или не изменилось, просто закрываем или ничего не делаем
    if (props.taskId && newTaskName.value.trim() === originalTaskName.value) {
      emit('update:visible', false); // Закрыть, если имя не изменилось
    } else if (newTaskName.value.trim() === '') {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Имя задачи не может быть пустым',
        life: 5000,
      });
    }
    return;
  }

  if (newTaskName.value.trim().length > 128) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Имя задачи не должно превышать 128 символов',
      life: 5000,
    });
    return;
  }

  try {
    isNameUpdateLoading.value = true;

    // Обновляем имя задачи через store
    await tasksStore.updateTaskName(props.taskId, newTaskName.value.trim());

    if (tasksStore.error) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: tasksStore.error || `Не удалось изменить имя задачи #${props.taskId}`,
        life: 5000,
      });
      return;
    }

    // Уведомление об успехе
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Имя задачи #${props.taskId} обновлено`,
      life: 3000,
    });

    // Оповещаем родителя об успешном обновлении и закрываем диалог
    emit('update-name', { taskId: props.taskId, newName: newTaskName.value.trim() });
    emit('update:visible', false);
  } catch (error) {
    console.error('Ошибка при изменении имени задачи:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: tasksStore.error || `Не удалось изменить имя задачи #${props.taskId}`,
      life: 5000,
    });
  } finally {
    isNameUpdateLoading.value = false;
  }
};

/**
 * Отменяет редактирование имени и закрывает диалог
 */
const cancelEdit = () => {
  emit('update:visible', false);
  emit('cancel');
};

// Проверка, изменилось ли имя и не пустое ли оно для кнопки "Сохранить"
const isSaveDisabled = computed(() => {
  return newTaskName.value.trim() === '' || newTaskName.value.trim() === originalTaskName.value || isNameUpdateLoading.value;
});
</script>

<template>
  <Dialog
      :visible="visible"
      @update:visible="(value) => $emit('update:visible', value)"
      modal
      header="Изменение имени задачи"
      :style="{ width: '450px' }"
      :closable="true"
      :dismissableMask="true"
  >
    <template #header>
      <div :class="['p-dialog-header']">
        <span class="text-lg font-bold">Изменение имени задачи</span>
      </div>
    </template>

    <div :class="['p-4']">
      <div class="mb-4">
        <label for="taskNameEdit" class="block mb-2">Имя задачи</label>
        <InputText
            id="taskNameEdit"
            v-model="newTaskName"
            class="w-full p-2"
            @keyup.enter="!isSaveDisabled && handleUpdateTaskName()"
        />
      </div>
    </div>

    <template #footer>
      <div :class="['flex justify-end space-x-2 p-3']">
        <Button
            @click="cancelEdit"
            label="Cancel"
            severity="secondary"
        >
          Отмена
        </Button>

        <Button
            @click="handleUpdateTaskName"
            label="Сохранить"
            :loading="isNameUpdateLoading"
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