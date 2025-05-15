<!-- src/components/TheTasks.vue -->

<script setup lang="ts">
import {ref, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useTasksStore} from '../stores/storeTasks';
import ProgressSpinner from 'primevue/progressspinner';
import {type TaskFilters} from '../stores/storeTasks';
import {useThemeStore} from '../stores/storeTheme';
import {useTableStyles} from '../composables/useTableStyles';
import Select from "primevue/select";
import {getTaskStatusColor} from "@/utils/getStatusColor.ts";


// композитные компоненты
const {
  tableBaseClass,
  thClasses,
  tdBaseTextClass,
  tableHeaderRowClass,
  trBaseClass,
} = useTableStyles();

// Store темы
const themeStore = useThemeStore();
const {theme: currentTheme} = storeToRefs(themeStore);

const tasksStore = useTasksStore();

// Local filters for two-way binding
const localFilters = ref<TaskFilters>({
  status_id: null,
  order_serial: null,
  executor_uuid: null,
});




// Watch for store filter changes to sync with local filters
watch(
    () => tasksStore.filters,
    (newFilters) => {
      localFilters.value = {...newFilters};
    },
    {deep: true}
);

// Initial fetch
tasksStore.fetchTasks();

// Опции для статуса
const statusOptions = [
  {value: 1, label: 'Не начата'},
  {value: 2, label: 'В работе'},
  {value: 3, label: 'На паузе'},
  {value: 4, label: 'Завершена'},
  {value: 5, label: 'Отменена'},
];

// Функция для обновления статуса задачи
const updateStatus = async (taskId: number, statusId: number) => {
  await tasksStore.updateTaskStatus(taskId, statusId);
  if (tasksStore.error) {
    console.error('Error updating status:', tasksStore.error);
  } else {
    console.log(`Status for task ${taskId} updated successfully`);
  }
};
</script>


<template>
  <div class="container mx-auto p-4">

    <!-- Loading and Error States -->
    <div v-if="tasksStore.isLoading" class="text-center py-4">
      <ProgressSpinner style="width: 50px; height: 50px"/>
    </div>
    <div v-else-if="tasksStore.error" class="text-red-500 text-center py-4">
      {{ tasksStore.error }}
    </div>

  </div>


  <!--  <div v-if="(tasksStore.isLoading && !tasksStore.error) || (tasksStore.isLoading && tasksStore.tasks.length > 0)" class="w-full">-->
  <div class="w-full">
    <table :class="tableBaseClass">
      <colgroup>
        <col style="width: 3%">
        <col style="width: 12%">
        <col style="width: 20%">
        <col style="width: 10%">
        <col style="width: 30%">
        <col style="width: 20%">
      </colgroup>
      <thead>


      <!--строка управления на самом верху таблицы-->
      <tr
          :class="thClasses"
      >
        <th colspan="6" :class="tableHeaderRowClass">
          <div class="px-1 py-1 flex justify-between items-center">

            <div class="card flex flex-wrap justify-left gap-4 font-medium">

              <!--чекбокс все/активные-->
              <div class="flex items-center gap-2">
                <label class="class='text-middle'"> Завершённые </label>
              </div>

              <!--чекбокс поиска-->
              <div class="flex items-center gap-2">
                <label> Поиск </label>
              </div>

            </div>


            <span class="flex">
            </span>
          </div>
        </th>
      </tr>


      <!--строка с заголовками таблицы-->
      <tr>
        <th :class="thClasses">
          id
        </th>

        <th :class="thClasses">
          Имя
        </th>

        <th :class="thClasses">
          Описание
        </th>

        <th :class="thClasses">
          Статус
        </th>

        <th :class="thClasses">
          Статус оплаты
        </th>


        <th :class="thClasses">
        </th>

      </tr>


      <tr>
      </tr>


      </thead>


      <tbody>
      <template v-for="task in tasksStore.tasks" :key="task.id">
        <tr :class="trBaseClass">

          <td :class="tdBaseTextClass">
            {{ task.id }}
          </td>


          <td :class="tdBaseTextClass">
            {{ task.name }}
          </td>

          <!--описание задачи-->
          <td :class="tdBaseTextClass">
            {{ task.description }}
          </td>


          <!--статус заказа-->
          <td class="px-4 py-2" :class="tdBaseTextClass">
            <Select
                :modelValue="task.status_id"
                :options="statusOptions"
                optionValue="value"
                optionLabel="label"
                placeholder="Выберите статус"
                class="w-full"
                @update:modelValue="updateStatus(task.id, $event)"
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
          </td>


          <td :class="tdBaseTextClass">

          </td>


          <td :class="tdBaseTextClass">

          </td>
        </tr>


        <tr>
        </tr>
      </template>

      <tr v-if="tasksStore.tasks.length === 0 && !tasksStore.isLoading && !tasksStore.error">
        <td
            colspan="6"
            class="py-6 text-center text-lg text-gray-400 italic"
            :class="currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'"
        >
          Заказов не найдено
        </td>
      </tr>

      </tbody>
    </table>
  </div>

</template>


<style scoped>
</style>