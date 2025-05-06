<!-- src/components/OrderFinanceBlock.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useOrdersStore } from '@/stores/storeOrders';
import InputNumber from 'primevue/inputnumber';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

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

// Функция для обновления финансовых данных
const updateFinanceField = async (fieldName: string, value: number | boolean) => {
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
    // Создаем объект с обновляемым полем
    const updateData: Record<string, any> = {};
    updateData[fieldName] = value;

    // Вызываем метод обновления из хранилища
    await ordersStore.updateOrder(props.orderSerial, updateData);

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

// Обработчики изменений полей
const handlePlanValueChange = async (fieldPrefix: string, value: number) => {
  await updateFinanceField(`${fieldPrefix}_cost`, value);
};

const handleFactValueChange = async (fieldPrefix: string, value: number) => {
  await updateFinanceField(`${fieldPrefix}_cost_fact`, value);
};

const handlePaidChange = async (fieldPrefix: string, value: boolean) => {
  await updateFinanceField(`${fieldPrefix}_paid`, value);
};

// Специальные обработчики для долга
const handleDebtPlanChange = async () => {
  await updateFinanceField('debt', debt.value.plan);
};

const handleDebtFactChange = async () => {
  await updateFinanceField('debt_fact', debt.value.fact);
};

const handleDebtPaidChange = async (value: boolean) => {
  await updateFinanceField('debt_paid', value);
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
  }
}, { deep: true, immediate: true });
</script>
<template>
  <div :class="detailBlockClass">
    <Toast />
    <h4 :class="detailHeaderClass">Финансы</h4>

    <div class="overflow-auto">
      <table class="w-full">
        <thead>
        <tr>
          <th class="text-left py-2">Категория</th>
          <th class="text-right py-2">План (руб.)</th>
          <th class="text-right py-2">Факт (руб.)</th>
        </tr>
        </thead>
        <tbody>
        <!-- Материалы -->
        <tr>
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex items-center">
              <span>Материалы</span>
              <div class="ml-2 cursor-pointer" @click="handlePaidChange('materials', !materials.paid)">
                <i class="pi" :class="materials.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="materials.plan"
                :class="{'line-through opacity-60': materials.paid}"
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || materials.paid"
                @keyup.enter="() => handlePlanValueChange('materials', materials.plan)"
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
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || materials.paid"
                @keyup.enter="() => handleFactValueChange('materials', materials.fact)"
                :min="0"
                :title="materials.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Товары -->
        <tr>
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex items-center">
              <span>Товары</span>
              <div class="ml-2 cursor-pointer" @click="handlePaidChange('products', !products.paid)">
                <i class="pi" :class="products.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="products.plan"
                :class="{'line-through opacity-60': products.paid}"
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || products.paid"
                @keyup.enter="() => handlePlanValueChange('products', products.plan)"
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
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || products.paid"
                @keyup.enter="() => handleFactValueChange('products', products.fact)"
                :min="0"
                :title="products.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Работы -->
        <tr>
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex items-center">
              <span>Работы</span>
              <div class="ml-2 cursor-pointer" @click="handlePaidChange('work', !work.paid)">
                <i class="pi" :class="work.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="work.plan"
                :class="{'line-through opacity-60': work.paid}"
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || work.paid"
                @keyup.enter="() => handlePlanValueChange('work', work.plan)"
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
                inputClass="text-red-300 text-right w-full"
                :disabled="isLoading || work.paid"
                @keyup.enter="() => handleFactValueChange('work', work.fact)"
                :min="0"
                :title="work.paid ? 'Оплачено, редактирование заблокировано' : ''"
            />
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </td>
        </tr>

        <!-- Нам должны -->
        <tr>
          <td class="py-2" :class="tdBaseTextClass">
            <div class="flex items-center">
              <span>Нам должны</span>
              <div class="ml-2 cursor-pointer" @click="handleDebtPaidChange(!debt.paid)">
                <i class="pi" :class="debt.paid ? 'pi-check-circle text-green-500' : 'pi-times-circle text-gray-400'"></i>
              </div>
            </div>
          </td>
          <td class="py-2 text-right relative">
            <InputNumber
                v-model="debt.plan"
                :class="{'line-through opacity-60': debt.paid}"
                inputClass="text-green-400 text-right w-full"
                :disabled="isLoading || debt.paid"
                @keyup.enter="handleDebtPlanChange"
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
                inputClass="text-green-400 text-right w-full"
                :disabled="isLoading || debt.paid"
                @keyup.enter="handleDebtFactChange"
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

/* Позиционирование иконок оплаты */
.cursor-pointer {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.p-inputnumber-input:disabled) {
  cursor: not-allowed;
}
</style>

