<!--src/components/TheMain.vue-->
<script setup lang="ts">
import { usePagesStore } from "../stores/storePages.ts";
import { useThemeStore } from "../stores/storeTheme";
import { computed } from "vue"; // Добавим импорт ref
import Button from "primevue/button";


// Получаем текущую тему из хранилища
const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.theme);

const pageStore = usePagesStore();

</script>

<template>
  <div class="w-full min-h-screen flex flex-col items-center p-4"
       :class="[
         currentTheme === 'dark'
           ? 'bg-gray-700'
           : 'bg-gray-200'
       ]"
  >
    <div class="flex flex-col w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6 space-y-4">
      <Button
          severity="info"
          label="Учёт шкафов"
          @click="pageStore.setPage('box-serial-num')"
          raised
          size="large"
      />

      <Button
          severity="info"
          label="Заказы"
          @click="pageStore.setPage('orders')"
          raised
          size="large"
      />


      <Button
          severity="info"
          label="Задачи"
          @click="pageStore.setPage('tasks')"
          raised
          size="large"
      />

      <Button
          severity="info"
          label="Тайминги"
          @click="pageStore.setPage('')"
          disabled="true"
          raised
          size="large"
      />

      <Button
          severity="info"
          label="Склад"
          @click="pageStore.setPage('warehouse')"
          raised
          size="large"
      />

      <Button
          severity="info"
          label="Тест FastAPI"
          @click="pageStore.setPage('test-fastapi')"
          raised
          size="large"
      />

      <Button
          severity="info"
          label="Тест базы данных"
          @click="pageStore.setPage('test-db')"
          raised
          size="large"
      />

    </div>
  </div>


</template>
