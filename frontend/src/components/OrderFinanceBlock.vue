<!-- src/components/OrderFinanceBlock.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOrdersStore } from '@/stores/storeOrders';
import InputNumber from 'primevue/inputnumber';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';

// Определение типов
type CategoryData = {
  plan: number;
  fact: number;
  paid: boolean;
};

type CategoryKey = 'materials' | 'products' | 'work' | 'debt';

type FinanceDataStructure = {
  [key in CategoryKey]: CategoryData;
};

interface FinanceData {
  materials_cost?: number | null;
  materials_cost_fact?: number | null;
  materials_paid?: boolean | null;
  products_cost?: number | null;
  products_cost_fact?: number | null;
  products_paid?: boolean | null;
  work_cost?: number | null;
  work_cost_fact?: number | null;
  work_paid?: boolean | null;
  debt?: number | null;
  debt_fact?: number | null;
  debt_paid?: boolean | null;
}

// Вспомогательные функции
const deepCopy = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const areObjectsEqual = <T>(obj1: T, obj2: T): boolean => JSON.stringify(obj1) === JSON.stringify(obj2);

// Определяем пропсы
const props = defineProps<{
  finance: FinanceData | null;
  theme: string;
  detailBlockClass: string;
  detailHeaderClass: string;
  tdBaseTextClass: string;
  orderSerial: string;
}>();

// Доступ к стору и toast
const ordersStore = useOrdersStore();
const toast = useToast();

// Состояние загрузки из стора
const isLoading = computed(() => ordersStore.isLoading);

// Создаем единую структуру для финансовых данных
const financeData = ref<FinanceDataStructure>({
  materials: {
    plan: props.finance?.materials_cost ?? 0,
    fact: props.finance?.materials_cost_fact ?? 0,
    paid: props.finance?.materials_paid ?? false
  },
  products: {
    plan: props.finance?.products_cost ?? 0,
    fact: props.finance?.products_cost_fact ?? 0,
    paid: props.finance?.products_paid ?? false
  },
  work: {
    plan: props.finance?.work_cost ?? 0,
    fact: props.finance?.work_cost_fact ?? 0,
    paid: props.finance?.work_paid ?? false
  },
  debt: {
    plan: props.finance?.debt ?? 0,
    fact: props.finance?.debt_fact ?? 0,
    paid: props.finance?.debt_paid ?? false
  }
});

// Создаем копию оригинальных данных
const originalData = ref<FinanceDataStructure>(deepCopy(financeData.value));

// Флаг для отслеживания изменений
const hasChanges = ref(false);

// Конфигурация категорий для отображения
const categories: Array<{key: CategoryKey; label: string; colorClass: string}> = [
  { key: 'materials', label: 'Материалы', colorClass: 'text-red-300' },
  { key: 'products', label: 'Товары', colorClass: 'text-red-300' },
  { key: 'work', label: 'Работы', colorClass: 'text-red-300' },
  { key: 'debt', label: 'Нам должны', colorClass: 'text-green-400' }
];

// Вотчер для отслеживания изменений
watch(
    financeData,
    () => {
      hasChanges.value = !areObjectsEqual(financeData.value, originalData.value);
    },
    { deep: true }
);

// Функция для обработки изменения статуса оплаты
const handlePaidChange = (category: CategoryKey, value: boolean) => {
  financeData.value[category].paid = value;
};

// Функция для сохранения изменений
const saveChanges = async () => {
  if (!props.orderSerial) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось определить заказ для обновления',
      life: 3000
    });
    return;
  }

  try {
    // Создаем объект с обновляемыми полями
    const updateData = {
      materials_cost: financeData.value.materials.plan,
      materials_cost_fact: financeData.value.materials.fact,
      materials_paid: financeData.value.materials.paid,
      products_cost: financeData.value.products.plan,
      products_cost_fact: financeData.value.products.fact,
      products_paid: financeData.value.products.paid,
      work_cost: financeData.value.work.plan,
      work_cost_fact: financeData.value.work.fact,
      work_paid: financeData.value.work.paid,
      debt: financeData.value.debt.plan,
      debt_fact: financeData.value.debt.fact,
      debt_paid: financeData.value.debt.paid
    };

    // Вызываем метод обновления из хранилища
    await ordersStore.updateOrder(props.orderSerial, updateData);

    // Обновляем оригинальные данные
    originalData.value = deepCopy(financeData.value);
    hasChanges.value = false;

    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'Финансовые данные обновлены',
      life: 3000
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: ordersStore.error || 'Не удалось обновить финансовые данные',
      life: 5000
    });
  }
};

// Функция для отмены изменений
const cancelChanges = () => {
  financeData.value = deepCopy(originalData.value);
  hasChanges.value = false;

  toast.add({
    severity: 'info',
    summary: 'Отменено',
    detail: 'Изменения были отменены',
    life: 3000
  });
};

// Следим за изменениями в props.finance
watch(() => props.finance, (newFinance) => {
  if (newFinance) {
    financeData.value = {
      materials: {
        plan: newFinance.materials_cost ?? 0,
        fact: newFinance.materials_cost_fact ?? 0,
        paid: newFinance.materials_paid ?? false
      },
      products: {
        plan: newFinance.products_cost ?? 0,
        fact: newFinance.products_cost_fact ?? 0,
        paid: newFinance.products_paid ?? false
      },
      work: {
        plan: newFinance.work_cost ?? 0,
        fact: newFinance.work_cost_fact ?? 0,
        paid: newFinance.work_paid ?? false
      },
      debt: {
        plan: newFinance.debt ?? 0,
        fact: newFinance.debt_fact ?? 0,
        paid: newFinance.debt_paid ?? false
      }
    };

    originalData.value = deepCopy(financeData.value);
    hasChanges.value = false;
  }
}, { deep: true, immediate: true });
</script>

<template>
  <div :class="detailBlockClass">
    <Toast />
    <h4 :class="detailHeaderClass">Финансы</h4>

    <div class="overflow-auto">
      <table class="w-full border-collapse">
        <colgroup>
          <col style="width: 40%">
          <col style="width: 30%">
          <col style="width: 30%">
        </colgroup>
        <thead>
        <tr>
          <th class="text-left py-2 text-sm text-gray-500 font-medium">Категория</th>
          <th class="text-right py-2 text-sm text-gray-500 font-medium">План (руб.)</th>
          <th class="text-right py-2 text-sm text-gray-500 font-medium">Факт (руб.)</th>
        </tr>
        </thead>
        <tbody>

        <tr v-for="cat in categories" :key="cat.key" class="border-b border-gray-200">
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex justify-between items-center">
              <span class="whitespace-nowrap">{{ cat.label }}</span>
              <div class="cursor-pointer flex items-center justify-center"
                   @click="handlePaidChange(cat.key, !financeData[cat.key].paid)">
                <i class="pi" :class="financeData[cat.key].paid ?
                     'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="financeData[cat.key].plan"
                :class="{'line-through opacity-60': financeData[cat.key].paid}"
                :inputClass="`${cat.colorClass} text-right w-full min-w-[90px] px-2 py-1`"
                :disabled="isLoading || financeData[cat.key].paid"
                :min="0"
                :title="financeData[cat.key].paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="financeData[cat.key].fact"
                :class="{'line-through opacity-60': financeData[cat.key].paid}"
                :inputClass="`${cat.colorClass} text-right w-full min-w-[90px] px-2 py-1`"
                :disabled="isLoading || financeData[cat.key].paid"
                :min="0"
                :title="financeData[cat.key].paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-end mt-4 space-x-2">
      <Button
          label="Отмена"
          severity="secondary"
          :disabled="!hasChanges || isLoading"
          @click="cancelChanges"
          raised
      />
      <Button
          label="ОК"
          severity="primary"
          :disabled="!hasChanges || isLoading"
          @click="saveChanges"
          raised
      />
    </div>
  </div>


  <div class="custom-input-number" v-if="false">
    <input type="number" class="p-inputnumber-input" value="123" />
  </div>
</template>

<style scoped>
/* Стили для таблицы */
table {
  border-collapse: collapse;
}

th {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

tr {
  border-bottom: 1px solid #e5e7eb;
}

/* Уменьшаем ширину полей ввода */
:deep(.p-inputnumber-input) {
  width: 100%;
  min-width: 90px;
  padding: 0.25rem 0.5rem;
}

:deep(.p-inputnumber-input:disabled) {
  cursor: not-allowed;
}
</style>
