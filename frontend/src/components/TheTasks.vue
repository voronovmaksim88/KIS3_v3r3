// src/store/TheTasks.vue
<!-- src/components/TheTasks.vue -->
<template>
  <div class="container mx-auto p-4">
    <!-- Filters -->
    <div class="mb-4 flex flex-wrap gap-4">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <InputText
            v-model="statusIdInput"
            type="number"
            placeholder="Enter status ID"
            class="w-full"
            @update:modelValue="updateFilters"
        />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium text-gray-700 mb-1">Order Serial</label>
        <InputText
            v-model="localFilters.order_serial"
            placeholder="Enter order serial"
            class="w-full"
            @update:modelValue="updateFilters"
        />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium text-gray-700 mb-1">Executor UUID</label>
        <InputText
            v-model="localFilters.executor_uuid"
            placeholder="Enter executor UUID"
            class="w-full"
            @update:modelValue="updateFilters"
        />
      </div>
      <div class="flex items-end">
        <Button
            label="Reset Filters"
            icon="pi pi-times"
            severity="secondary"
            @click="tasksStore.resetFilters"
        />
      </div>
    </div>

    <!-- Loading and Error States -->
    <div v-if="tasksStore.loading" class="text-center py-4">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>
    <div v-else-if="tasksStore.error" class="text-red-500 text-center py-4">
      {{ tasksStore.error }}
    </div>

    <!-- Tasks Table -->
    <DataTable
        v-else
        :value="tasksStore.tasks"
        :paginator="true"
        :rows="tasksStore.limit"
        :totalRecords="tasksStore.total"
        :lazy="true"
        @page="onPage($event)"
        class="p-datatable-sm"
        tableStyle="min-width: 50rem"
        showGridlines
    >
      <Column field="id" header="ID" />
      <Column field="name" header="Name" />
      <Column field="description" header="Description">
        <template #body="{ data }">
          {{ data.description || '-' }}
        </template>
      </Column>
      <Column field="status.name" header="Status">
        <template #body="{ data }">
          {{ data.status?.name || '-' }}
        </template>
      </Column>
      <Column field="executor.name" header="Executor">
        <template #body="{ data }">
          {{ data.executor ? `${data.executor.name} ${data.executor.surname}` : '-' }}
        </template>
      </Column>
      <Column field="order.serial" header="Order">
        <template #body="{ data }">
          {{ data.order?.serial || '-' }}
        </template>
      </Column>
      <Column field="price" header="Price">
        <template #body="{ data }">
          {{ data.price ? `$${data.price}` : '-' }}
        </template>
      </Column>
      <Column field="deadline_moment" header="Deadline">
        <template #body="{ data }">
          {{ formatDate(data.deadline_moment) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTasksStore } from '../stores/storeTasks';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { type TaskFilters } from '../stores/storeTasks';

const statusIdInput = ref<string | null>(null);

// Initialize store
const tasksStore = useTasksStore();

// Local filters for two-way binding
const localFilters = ref<TaskFilters>({
  status_id: null,
  order_serial: null,
  executor_uuid: null,
});

// Format date for display
const formatDate = (isoDate: string | null): string => {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Handle pagination
const onPage = (event: { first: number; rows: number }) => {
  tasksStore.updatePagination(event.first, event.rows);
};

// Update filters with debouncing
const updateFilters = () => {
  tasksStore.updateFilters(localFilters.value);
};

// Watch for store filter changes to sync with local filters
watch(
    () => tasksStore.filters,
    (newFilters) => {
      localFilters.value = { ...newFilters };
    },
    { deep: true }
);

// Initial fetch
tasksStore.fetchTasks();
</script>

<style scoped>
/* Additional TailwindCSS styling if needed */
</style>