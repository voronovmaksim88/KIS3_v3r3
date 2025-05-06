<!-- src/components/OrderFinanceBlock.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOrdersStore } from '@/stores/storeOrders';
import InputNumber from 'primevue/inputnumber';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
// После импортов добавить:
import Button from 'primevue/button';


// Определение интерфейса для финансовых данных с поддержкой null
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

// Определяем пропсы через деструктуризацию
const props = defineProps<{
  finance: FinanceData | null;
  theme: string;
  detailBlockClass: string;
  detailHeaderClass: string;
  tdBaseTextClass: string;
  orderSerial: string; // Добавляем serial для обновления данных
}>();


// Доступ к стору и toast
const ordersStore = useOrdersStore();
const toast = useToast();

// Создаем реактивные переменные для всех редактируемых значений
const materials = ref({
  plan: props.finance?.materials_cost ?? 0,
  fact: props.finance?.materials_cost_fact ?? 0,
  paid: props.finance?.materials_paid ?? false
});

const products = ref({
  plan: props.finance?.products_cost ?? 0,
  fact: props.finance?.products_cost_fact ?? 0,
  paid: props.finance?.products_paid ?? false
});

const work = ref({
  plan: props.finance?.work_cost ?? 0,
  fact: props.finance?.work_cost_fact ?? 0,
  paid: props.finance?.work_paid ?? false
});

const debt = ref({
  plan: props.finance?.debt ?? 0,
  fact: props.finance?.debt_fact ?? 0,
  paid: props.finance?.debt_paid ?? false
});

// Состояние загрузки из стора
const isLoading = computed(() => ordersStore.isLoading);


// После определения ref-объектов добавить:
// Добавляем оригинальные данные для восстановления при отмене
const originalData = ref({
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

// Флаг для отслеживания изменений
const hasChanges = ref(false);

// Добавляем вотчер, который отслеживает изменения во всех полях ввода
watch(
    [materials, products, work, debt],
    () => {
      // Проверяем, отличаются ли текущие значения от оригинальных
      hasChanges.value =
          JSON.stringify({
            materials: materials.value,
            products: products.value,
            work: work.value,
            debt: debt.value
          }) !==
          JSON.stringify(originalData.value);
    },
    { deep: true }
);

// Функция для сохранения всех изменений
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
    const updateData: Record<string, any> = {
      materials_cost: materials.value.plan,
      materials_cost_fact: materials.value.fact,
      materials_paid: materials.value.paid,
      products_cost: products.value.plan,
      products_cost_fact: products.value.fact,
      products_paid: products.value.paid,
      work_cost: work.value.plan,
      work_cost_fact: work.value.fact,
      work_paid: work.value.paid,
      debt: debt.value.plan,
      debt_fact: debt.value.fact,
      debt_paid: debt.value.paid
    };

    // Вызываем метод обновления из хранилища
    await ordersStore.updateOrder(props.orderSerial, updateData);

    // Обновляем оригинальные данные
    originalData.value = {
      materials: { ...materials.value },
      products: { ...products.value },
      work: { ...work.value },
      debt: { ...debt.value }
    };

    // Сбрасываем флаг изменений
    hasChanges.value = false;

    // Показываем уведомление об успешном обновлении
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'Финансовые данные обновлены',
      life: 3000
    });
  } catch (error) {
    // Показываем сообщение об ошибке
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
  // Восстанавливаем оригинальные значения
  materials.value = { ...originalData.value.materials };
  products.value = { ...originalData.value.products };
  work.value = { ...originalData.value.work };
  debt.value = { ...originalData.value.debt };

  // Сбрасываем флаг изменений
  hasChanges.value = false;

  toast.add({
    severity: 'info',
    summary: 'Отменено',
    detail: 'Изменения были отменены',
    life: 3000
  });
};


// Следим за изменениями в props.finance и обновляем локальные данные
watch(() => props.finance, (newFinance) => {
  if (newFinance) {
    materials.value = {
      plan: newFinance.materials_cost ?? 0,
      fact: newFinance.materials_cost_fact ?? 0,
      paid: newFinance.materials_paid ?? false
    };

    products.value = {
      plan: newFinance.products_cost ?? 0,
      fact: newFinance.products_cost_fact ?? 0,
      paid: newFinance.products_paid ?? false
    };

    work.value = {
      plan: newFinance.work_cost ?? 0,
      fact: newFinance.work_cost_fact ?? 0,
      paid: newFinance.work_paid ?? false
    };

    debt.value = {
      plan: newFinance.debt ?? 0,
      fact: newFinance.debt_fact ?? 0,
      paid: newFinance.debt_paid ?? false
    };

    // Обновляем оригинальные данные
    originalData.value = {
      materials: { ...materials.value },
      products: { ...products.value },
      work: { ...work.value },
      debt: { ...debt.value }
    };

    // Сбрасываем флаг изменений
    hasChanges.value = false;
  }
}, { deep: true, immediate: true });

// Обработчики изменений полей
const handlePaidChange = (fieldPrefix: string, value: boolean) => {
  if (fieldPrefix === 'materials') {
    materials.value.paid = value;
  } else if (fieldPrefix === 'products') {
    products.value.paid = value;
  } else if (fieldPrefix === 'work') {
    work.value.paid = value;
  }
};

// Специальные обработчики для долга
const handleDebtPaidChange = (value: boolean) => {
  debt.value.paid = value;
};

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
        <!-- Материалы -->
        <tr class="border-b border-gray-200">
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex justify-between items-center">
              <span class="whitespace-nowrap">Материалы</span>
              <div class="cursor-pointer flex items-center justify-center" @click="handlePaidChange('materials', !materials.paid)">
                <i class="pi" :class="materials.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="materials.plan"
                :class="{'line-through opacity-60': materials.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || materials.paid"
                :min="0"
                :title="materials.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="materials.fact"
                :class="{'line-through opacity-60': materials.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || materials.paid"
                :min="0"
                :title="materials.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Товары -->
        <tr class="border-b border-gray-200">
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex justify-between items-center">
              <span>Товары</span>
              <div class="ml-2 cursor-pointer flex items-center justify-center" @click="handlePaidChange('products', !products.paid)">
                <i class="pi" :class="products.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="products.plan"
                :class="{'line-through opacity-60': products.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || products.paid"
                :min="0"
                :title="products.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="products.fact"
                :class="{'line-through opacity-60': products.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || products.paid"
                :min="0"
                :title="products.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Работы -->
        <tr class="border-b border-gray-200">
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex justify-between items-center">
              <span>Работы</span>
              <div class="ml-2 cursor-pointer flex items-center justify-center" @click="handlePaidChange('work', !work.paid)">
                <i class="pi" :class="work.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="work.plan"
                :class="{'line-through opacity-60': work.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || work.paid"
                :min="0"
                :title="work.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="work.fact"
                :class="{'line-through opacity-60': work.paid}"
                inputClass="text-red-300 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || work.paid"
                :min="0"
                :title="work.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Нам должны -->
        <tr class="border-b border-gray-200">
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex justify-between items-center">
              <span>Нам должны</span>
              <div class="ml-2 cursor-pointer flex items-center justify-center" @click="handleDebtPaidChange(!debt.paid)">
                <i class="pi" :class="debt.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="debt.plan"
                :class="{'line-through opacity-60': debt.paid}"
                inputClass="text-green-400 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || debt.paid"
                :min="0"
                :title="debt.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="debt.fact"
                :class="{'line-through opacity-60': debt.paid}"
                inputClass="text-green-400 text-right w-full min-w-[90px] px-2 py-1"
                :disabled="isLoading || debt.paid"
                :min="0"
                :title="debt.paid ? 'Оплачено, редактирование заблокировано' : ''"
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

  <!-- Фиктивный div с полем ввода -->
  <div class="custom-input-number">
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

