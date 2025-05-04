<script setup lang="ts">
import {reactive, computed, ref, onMounted, nextTick} from 'vue'
import { useCommentStore } from '@/stores/storeComments'
import { useToast } from 'primevue/usetoast'
import BaseModal from '@/components/BaseModal.vue'

// PrimeVue компоненты
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'

// Пропсы
const props = defineProps<{
  orderId: string
}>()

// Эмиты
const emit = defineEmits(['cancel', 'success'])

// Сторы
const commentStore = useCommentStore()
const toast = useToast()

// Состояние формы
const formData = reactive({
  text: ''
})

// Состояние валидации
const errors = reactive({
  text: ''
})

// Состояние загрузки
const loading = computed(() => commentStore.status === 'loading')

// Ref для поля ввода
const commentInput = ref<typeof InputText>()

// Валидация формы
const validateForm = (): boolean => {
  let isValid = true

  if (!formData.text.trim()) {
    errors.text = 'Текст комментария обязателен'
    isValid = false
  } else {
    errors.text = ''
  }

  return isValid
}

// Отправка формы
const submitForm = async () => {
  if (!validateForm()) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка валидации',
      detail: 'Пожалуйста, заполните текст комментария',
      life: 3000
    })
    return
  }

  try {
    await commentStore.addComment(props.orderId, formData.text)

    toast.add({
      severity: 'success',
      summary: 'Комментарий добавлен',
      detail: 'Комментарий успешно сохранён',
      life: 3000
    })

    // Сброс формы
    formData.text = ''
    emit('success')
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: commentStore.error || 'Не удалось добавить комментарий',
      life: 5000
    })
  }
}

// Обработчик отмены
const handleCancelClick = () => {
  errors.text = ''
  emit('cancel')
}

// Установка фокуса при монтировании
onMounted(async () => {
  await nextTick() // Ждем, пока компонент будет отрендерен
  const inputElement = document.getElementById('comment-text') as HTMLInputElement
  if (inputElement) {
    inputElement.focus()
  }
})
</script>

<template>
  <BaseModal
      name="Добавить комментарий"
      :on-close="handleCancelClick"
  >
    <Toast />

    <form @submit.prevent="submitForm" class="space-y-4">
      <!-- Текст комментария -->
      <div class="grid grid-cols-[150px_1fr] gap-4 items-start">
        <label for="comment-text" class="text-sm font-medium pt-2">
          Текст комментария: <span class="text-red-500">*</span>
        </label>
        <div>
          <InputText
              id="comment-text"
              v-model="formData.text"
              class="w-full"
              :class="{ 'p-invalid': errors.text }"
              placeholder="Введите текст комментария"
              autocomplete="off"
              :disabled="loading"
              ref="commentInput"
          />
          <small v-if="errors.text" class="p-error block mt-1">{{ errors.text }}</small>
        </div>
      </div>

      <!-- Кнопки -->
      <div class="flex justify-end gap-2 mt-6">
        <Button
            type="button"
            label="Отмена"
            class="p-button-outlined"
            @click="handleCancelClick"
            :disabled="loading"
        />
        <Button
            type="submit"
            label="Добавить комментарий"
            icon="pi pi-check"
            :loading="loading"
        />
      </div>
    </form>
  </BaseModal>
</template>