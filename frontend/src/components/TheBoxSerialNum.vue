<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useBoxAccountingStore } from '../stores/storeBoxAccounting';
import { useFormsVisibilityStore } from '../stores/storeVisibilityForms';
import { storeToRefs } from 'pinia';
import TheFormAddRowInBoxAccounting from "@/components/TheFormAddRowInBoxAccounting.vue";
import BaseButton from "@/components/Buttons/BaseButton.vue";
import { useThemeStore } from "../stores/storeTheme";

// Stores
const themeStore = useThemeStore();
const boxAccountingStore = useBoxAccountingStore();
const formsVisibilityStore = useFormsVisibilityStore();

// Refs
const { boxes, isLoading, error, pagination } = storeToRefs(boxAccountingStore);
const currentTheme = computed(() => themeStore.theme);

// Computed
const sortedBoxes = computed(() => [...boxes.value].sort((a, b) => b.serial_num - a.serial_num));

const tableClasses = computed(() => ({
  base: 'min-w-full rounded-lg mb-4 table-fixed shadow-md',
  theme: currentTheme.value === 'dark' ? 'bg-gray-700' : 'bg-gray-100 border border-gray-200'
}));

const thClasses = computed(() => ({
  base: 'px-4 py-2 text-left text-sm font-semibold uppercase tracking-wider',
  theme: currentTheme.value === 'dark'
      ? 'border-gray-300 text-gray-300 bg-gray-600'
      : 'border-gray-300 text-gray-600 bg-gray-100'
}));

const rowClasses = computed(() => ({
  base: 'border-t transition-colors duration-200',
  theme: currentTheme.value === 'dark'
      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
      : 'text-gray-600 bg-gray-100 hover:bg-gray-200',
  border: currentTheme.value === 'dark'
      ? 'border-gray-600'
      : 'border-gray-300'
}));

// Hooks
onMounted(async () => {
  await boxAccountingStore.fetchBoxes();
  console.log('Boxes loaded:', boxes.value.length);
});

// Methods
const addNewRow = () => {
  formsVisibilityStore.isFormAddRowInBoxAccountingVisible = true;
};

const formatPersonName = (person: any) => {
  if (!person) return '---';
  return `${person.surname} ${person.name[0]}.${person.patronymic[0]}.`;
};
</script>

<template>
  <div
      class="w-full min-h-screen flex flex-col items-center p-4"
      :class="currentTheme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'"
  >
    <!-- Loading indicator -->
    <div v-if="isLoading" class="w-full flex justify-center my-4">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="w-full bg-red-500 text-white p-4 rounded mb-4">
      {{ error }}
    </div>

    <!-- Add form with transition -->
    <transition name="fade-slide">
      <TheFormAddRowInBoxAccounting
          v-if="formsVisibilityStore.isFormAddRowInBoxAccountingVisible"
      />
    </transition>

    <!-- Data table -->
    <div v-if="!isLoading && boxes.length > 0" class="w-full">
      <div class="overflow-x-auto">
        <table :class="[tableClasses.base, tableClasses.theme]">
          <colgroup>
            <col style="width: 6%">  <!-- С/Н -->
            <col style="width: 15%"> <!-- Название -->
            <col style="width: 18%"> <!-- Заказ -->
            <col style="width: 16%"> <!-- Разработчик схемы -->
            <col style="width: 16%"> <!-- Сборщик -->
            <col style="width: 16%"> <!-- Программист -->
            <col style="width: 16%"> <!-- Тестировщик -->
          </colgroup>
          <thead>
          <tr :class="[thClasses.base, thClasses.theme]">
            <th colspan="7" class="px-2 py-2 text-center">
              <div class="px-1 py-1 flex justify-end items-center">
                <BaseButton
                    :action="addNewRow"
                    :text="'Добавить'"
                    :style="'Success'"
                />
              </div>
            </th>
          </tr>
          <tr :class="[thClasses.base, thClasses.theme]">
            <th class="px-4 py-2">С/Н</th>
            <th class="px-4 py-2">Название</th>
            <th class="px-4 py-2">Заказ</th>
            <th class="px-4 py-2">Разработчик схемы</th>
            <th class="px-4 py-2">Сборщик</th>
            <th class="px-4 py-2">Программист</th>
            <th class="px-4 py-2">Тестировщик</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="box in sortedBoxes"
              :key="box.serial_num"
              :class="[rowClasses.base, rowClasses.theme, rowClasses.border]"
          >
            <td class="px-4 py-2">{{ box.serial_num }}</td>
            <td class="px-4 py-2">{{ box.name }}</td>
            <td class="px-4 py-2">{{ box.order_id }}</td>
            <td class="px-4 py-2">{{ formatPersonName(box.scheme_developer) }}</td>
            <td class="px-4 py-2">{{ formatPersonName(box.assembler) }}</td>
            <td class="px-4 py-2">{{ formatPersonName(box.programmer) }}</td>
            <td class="px-4 py-2">{{ formatPersonName(box.tester) }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-4">
        <span>
          Показано {{ boxes.length }} из {{ pagination.total }} записей
          (Страница {{ pagination.page }} из {{ pagination.pages }})
        </span>
        <div class="flex space-x-2">
          <button
              @click="boxAccountingStore.changePage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
              @click="boxAccountingStore.changePage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.pages"
              class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!isLoading && boxes.length === 0" class="w-full text-center p-8">
      No boxes found. Please add some boxes to get started.
    </div>
  </div>

  <!-- Фиктивный элемент для линтера -->
  <div
      class=" fade-slide-enter-active fade-slide-leave-active fade-slide-enter-from fade-slide-leave-to"
      aria-hidden="true"
      style="display: none;"
  />
</template>

<style scoped>
/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease-in-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Table styles */
table {
  border-collapse: separate;
  border-spacing: 0;
}

th, td {
  border-bottom: 1px solid;
  @apply border-gray-400;
}

tr:last-child td {
  border-bottom: none;
}
</style>