<!-- src/components/OrderDetails.vue -->
<script setup lang="ts">
import OrderCommentBlock from '@/components/OrderCommentBlock.vue';
import OrderDateBlock from '@/components/OrderDateBlock.vue';
import OrderFinanceBlock from '@/components/OrderFinanceBlock.vue';
import TaskList from '@/components/TaskList.vue';

// Определение props
defineProps<{
  orderSerial: string;
  orderDetail: any; // Замените на конкретный тип, например, OrderDetail
  isDetailLoading: boolean;
  theme: 'light' | 'dark';
  detailsContainerClass: string;
  detailBlockClass: string;
  detailHeaderClass: string;
  tdBaseTextClass: string;
}>();

// Опционально: определение событий, если нужно
defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <tr :class="[ theme === 'dark' ? 'border-b border-gray-600' : 'border-b border-gray-200' ]">
    <td :colspan="6" :class="detailsContainerClass" style="position: relative;">
      <div v-if="isDetailLoading" class="absolute inset-0 flex justify-center items-center z-10">
        <div
            class="absolute inset-0 backdrop-blur-sm"
            :class="theme === 'dark' ? 'bg-gray-900 bg-opacity-40' : 'bg-white bg-opacity-50'"
        ></div>
        <div
            class="z-20 px-4 py-2 rounded-lg shadow-lg flex items-center"
            :class="theme === 'dark' ? 'bg-gray-800' : 'bg-white'"
        >
          <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span :class="theme === 'dark' ? 'text-white' : 'text-gray-800'">
            Загрузка данных заказа...
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OrderCommentBlock
            :order_serial="orderSerial"
            :comments="orderDetail?.comments || []"
            :theme="theme"
        />
        <div class="flex flex-col gap-4">
          <OrderDateBlock
              :order="orderDetail || {}"
              :theme="theme"
              :detailBlockClass="detailBlockClass"
              :detailHeaderClass="detailHeaderClass"
              :tdBaseTextClass="tdBaseTextClass"
              :order-serial="orderSerial"
          />
          <OrderFinanceBlock
              :finance="orderDetail || {}"
              :theme="theme"
              :detailBlockClass="detailBlockClass"
              :detailHeaderClass="detailHeaderClass"
              :tdBaseTextClass="tdBaseTextClass"
              :order-serial="orderSerial"
          />
        </div>
        <TaskList
            :tasks="orderDetail?.tasks || []"
            :theme="theme"
            :order-serial="orderSerial"
        />
      </div>
    </td>
  </tr>
</template>

<style scoped>
/* Стили можно перенести из TheOrders.vue, если они специфичны для этого компонента */
.backdrop-blur-sm {
  background-color: rgba(0, 0, 0, 0.4); /* Fallback */
}

@supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
  .backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
}
</style>