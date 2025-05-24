<!-- src/components/OrderDateBlock.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DatePicker from 'primevue/datepicker';
import { useOrdersStore } from '@/stores/storeOrders.ts';
import { useToast } from 'primevue/usetoast';
import { formatLocalDateTime } from "@/utils/convertDateTime.ts";
import { useTableStyles } from '@/composables/useTableStyles'; // для установки стилей
import {useThemeStore} from '@/stores/storeTheme';
import {storeToRefs} from "pinia";


// Store темы
const themeStore = useThemeStore();
const {theme: currentTheme} = storeToRefs(themeStore);

// композитные компоненты
const {
  tdBaseTextClass,
} = useTableStyles();

// Добавляем emit событие для обновления даты дедлайна
const emit = defineEmits(['updateDeadline']);

// Получаем доступ к хранилищу и toast уведомлениям
const ordersStore = useOrdersStore();
const toast = useToast();

// Переменная для хранения даты дедлайна
const tempDeadline = ref<Date | null>(
    ordersStore.currentOrder?.deadline_moment
        ? new Date(ordersStore.currentOrder.deadline_moment)
        : null
);
if (tempDeadline.value) {
  tempDeadline.value.setHours(0, 0, 0, 0);
}

// Синхронизация tempDeadline с currentOrderDetail.deadline_moment
watch(
    () => ordersStore.currentOrder?.deadline_moment,
    (newDeadline) => {
      tempDeadline.value = newDeadline ? new Date(newDeadline) : null;
      if (tempDeadline.value) {
        tempDeadline.value.setHours(0, 0, 0, 0);
      }
    },
    { immediate: true }
);

// Функция для сохранения изменений в БД
const saveDeadline = async (newValue: Date | null) => {
  if (!ordersStore.currentOrder?.serial) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось определить заказ для обновления',
      life: 3000
    });
    return;
  }

  try {
    // Формируем объект для обновления заказа
    const orderData = {
      deadline_moment: newValue
          ? new Date(Date.UTC(
              newValue.getFullYear(),
              newValue.getMonth(),
              newValue.getDate()
          )).toISOString()
          : null
    };

    // Вызываем метод обновления из хранилища
    await ordersStore.updateOrder(ordersStore.currentOrder.serial, orderData);

    // Эмитим событие для родительского компонента (если нужно)
    emit('updateDeadline', newValue ? newValue.toISOString() : null);

    // Показываем уведомление об успешном обновлении
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: newValue
          ? `Дедлайн обновлен на ${formatLocalDateTime(newValue.toISOString(), false)}`
          : 'Дедлайн удален',
      life: 3000
    });
  } catch (error) {
    // Показываем сообщение об ошибке
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: ordersStore.error || 'Не удалось обновить дедлайн',
      life: 5000
    });
  }
};

// Обработчик события DatePicker
const handleDateUpdate = (value: Date | Date[] | (Date | null)[] | null | undefined) => {
  if (value instanceof Date || value === null) {
    saveDeadline(value); // Вызываем асинхронную функцию
  } else {
    console.warn('Unsupported DatePicker value:', value);
    // Можно добавить toast или другую обработку ошибки
  }
};

// Минимальная допустимая дата (сегодня)
const today = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
});

// Рассчитывает разницу между двумя датами в годах, месяцах и днях
interface DateDifference {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/**
 * Рассчитывает разницу между двумя датами в годах, месяцах и днях.
 * @param date1 - Первая дата (объект Date)
 * @param date2 - Вторая дата (объект Date)
 * @returns Объект с разницей {years, months, days, totalDays}
 */
function calculateDateDifference(date1: Date, date2: Date): DateDifference {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const diffTime = d2.getTime() - d1.getTime();
  const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Округляем для случая "сегодня"

  // Определяем, какая дата раньше, для корректного расчета
  let startDate = d1 < d2 ? d1 : d2;
  let endDate = d1 < d2 ? d2 : d1;

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  // Корректировка отрицательных значений
  if (days < 0) {
    // Берем дни из предыдущего месяца конечной даты
    const prevMonthEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
    days += prevMonthEndDate.getDate();
    months--; // Уменьшаем количество месяцев, так как заняли дни
  }

  if (months < 0) {
    months += 12; // Добавляем 12 месяцев
    years--; // Уменьшаем количество лет
  }

  // Если даты были переданы в обратном порядке, totalDays будет отрицательным
  // years, months, days всегда положительны или 0 из-за startDate/endDate
  return {years, months, days, totalDays};
}

// Вспомогательные функции для склонения слов
function getYearsText(years: number): string {
  const lastDigit = years % 10;
  const lastTwoDigits = years % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}

function getMonthsText(months: number): string {
  const lastDigit = months % 10;
  const lastTwoDigits = months % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'месяцев';
  if (lastDigit === 1) return 'месяц';
  if (lastDigit >= 2 && lastDigit <= 4) return 'месяца';
  return 'месяцев';
}

function getDaysText(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

/**
 * Форматирует разницу дат в строку "X лет, Y месяцев, Z дней"
 * @param diff - Объект DateDifference
 * @returns Отформатированная строка
 */
function formatRelativeTimeDetailed(diff: DateDifference): string {
  const parts: string[] = [];
  if (diff.years > 0) {
    parts.push(`${diff.years} ${getYearsText(diff.years)}`);
  }
  if (diff.months > 0) {
    parts.push(`${diff.months} ${getMonthsText(diff.months)}`);
  }
  // Показываем дни, только если нет лет и месяцев, или если они есть и дни не 0
  if (diff.days > 0 && (parts.length < 2 || (diff.years > 0 || diff.months > 0))) {
    parts.push(`${diff.days} ${getDaysText(diff.days)}`);
  }
  // Если все по нулям (или только дни = 0), но totalDays не 0 (редкий случай из-за округления)
  // Или если years/months есть, а days=0, показываем 0 дней для ясности? Решил не показывать.
  if (parts.length === 0 && diff.totalDays !== 0) {
    // Если разница меньше дня, но не 0
    return `менее дня`; // Или можно вернуть пустую строку, чтобы скобки не отображались
  }
  if (parts.length === 0 && diff.totalDays === 0) {
    return 'сегодня'; // Для случая дедлайна
  }


  return parts.join(', ');
}

// Вычисляемые свойства для времени
const timeSinceCreation = computed((): DateDifference | null => {
  if (!ordersStore.currentOrder?.start_moment) return null;
  try {
    const startDate = new Date(ordersStore.currentOrder.start_moment);
    const now = new Date();
    if (isNaN(startDate.getTime())) return null;
    return calculateDateDifference(startDate, now);
  } catch {
    return null;
  }
});

const timeUntilDeadline = computed((): DateDifference | null => {
  if (!ordersStore.currentOrder?.deadline_moment) return null;
  try {
    const deadlineDate = new Date(ordersStore.currentOrder.deadline_moment);
    const now = new Date();
    if (isNaN(deadlineDate.getTime())) return null;
    return calculateDateDifference(now, deadlineDate);
  } catch {
    return null;
  }
});

const timeSinceCompletion = computed((): DateDifference | null => {
  if (!ordersStore.currentOrder?.end_moment) return null;
  try {
    const endDate = new Date(ordersStore.currentOrder.end_moment);
    const now = new Date();
    if (isNaN(endDate.getTime())) return null;
    return calculateDateDifference(endDate, now);
  } catch {
    return null;
  }
});

// Проверка, просрочен ли дедлайн
const isDeadlineOverdue = computed(() => {
  // totalDays отрицательный, если deadlineDate < now
  return timeUntilDeadline.value !== null && timeUntilDeadline.value.totalDays < 0;
});

// Состояние загрузки из хранилища
// const isLoading = computed(() => ordersStore.isLoading);

// Классы для основных блоков внутри деталей (Комментарии, Даты, Финансы, Задачи)
const detailBlockClass = computed(() => {
  const base = 'border rounded-md p-3 h-full transition-colors duration-300 ease-in-out';
  return currentTheme.value === 'dark'
      ? `${base} bg-gray-800 border-gray-600`
      : `${base} bg-white border-gray-200 shadow-sm`;
});

// Классы для заголовков (<h4>) внутри блоков деталей
const detailHeaderClass = computed(() => {
  const base = 'font-semibold mb-2';
  return currentTheme.value === 'dark'
      ? `${base} text-white`
      : `${base} text-gray-800`;
});
</script>

<template>
  <div :class="detailBlockClass">
    <Toast />
    <h4 :class="detailHeaderClass">Даты</h4>

    <table class="w-full border-none table-fixed border-collapse">
      <tbody>
      <tr>
        <td :class="tdBaseTextClass" class="text-left pr-2 align-top">
          создан:
        </td>
        <td :class="tdBaseTextClass" class="text-left align-top">
          {{ formatLocalDateTime(ordersStore.currentOrder?.start_moment, false) || 'не определено' }}
        </td>
        <td
            v-if="timeSinceCreation && (timeSinceCreation.years > 0 || timeSinceCreation.months > 0 || timeSinceCreation.days > 0)"
            class="text-xs text-gray-500 pl-2 text-left align-top"
        >
          ({{ formatRelativeTimeDetailed(timeSinceCreation) }} назад)
        </td>
        <td v-else class="w-px"></td>
      </tr>

      <tr>
        <td :class="tdBaseTextClass" class="text-left pr-2 align-top">
          дедлайн:
        </td>
        <td :class="[tdBaseTextClass, 'text-left align-top']">
          <div class="relative" v-if="ordersStore.currentOrder?.serial">
            <DatePicker
                v-model="tempDeadline"
                dateFormat="dd.mm.yy"
                placeholder="Выберите дату"
                :showIcon="true"
                :minDate="today"
                class="deadline-picker"
                :disabled="ordersStore.isDeadlineLoading"
                @update:modelValue="handleDateUpdate"
            />
            <div v-if="ordersStore.isDeadlineLoading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
              <i class="pi pi-spinner pi-spin text-blue-500"></i>
            </div>
          </div>
          <span v-else class="text-gray-400 italic">Не установлен</span>
        </td>
        <td
            v-if="timeUntilDeadline !== null"
            class="text-xs pl-2 text-left align-top"
            :class="isDeadlineOverdue ? 'text-red-400' : 'text-gray-500'"
        >
          <template v-if="timeUntilDeadline.totalDays > 0">
            (через {{ formatRelativeTimeDetailed(timeUntilDeadline) }})
          </template>
          <template v-else-if="timeUntilDeadline.totalDays === 0">
            (сегодня)
          </template>
          <template v-else>
            (просрочен на {{ formatRelativeTimeDetailed(timeUntilDeadline) }})
          </template>
        </td>
        <td v-else class="w-px"></td>
      </tr>

      <tr v-if="ordersStore.currentOrder?.end_moment">
        <td :class="tdBaseTextClass" class="text-left pr-2 align-top">
          завершён:
        </td>
        <td :class="tdBaseTextClass" class="text-left align-top">
          {{ formatLocalDateTime(ordersStore.currentOrder?.end_moment, false) || 'не определено' }}
        </td>
        <td
            v-if="timeSinceCompletion && (timeSinceCompletion.years > 0 || timeSinceCompletion.months > 0 || timeSinceCompletion.days > 0)"
            class="text-xs text-gray-500 pl-2 text-left align-top"
        >
          ({{ formatRelativeTimeDetailed(timeSinceCompletion) }} назад)
        </td>
        <td v-else class="w-px"></td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
table {
  border: none;
  border-collapse: collapse;
}

table tr {
  /* height: 2rem; /* Убрал фикс. высоту, т.к. текст может переноситься */
  border: none;
  vertical-align: top; /* Выравнивание по верху строки */
}

table td {
  padding: 4px 0; /* Вертикальный отступ внутри ячеек */
  border: none;
  vertical-align: middle; /* Выравнивание по верху ячейки */
}

table td:nth-child(1) {
  width: 20%;
}

table td:nth-child(2) {
  width: 45%;
}

table td:nth-child(3) {
  width: 35%;
}

/* Добавил класс для пустой ячейки, чтобы она не коллапсировала */
.w-px {
  width: 1px;
}

/* Добавьте эту строку в секцию <style scoped> */
.deadline-picker {
  width: auto;
  max-width: 180px; /* Ограничивает максимальную ширину */
}

/* Также можно добавить стили для контейнера DatePicker */
.relative {
  display: inline-block; /* Чтобы контейнер не растягивался на всю ширину */
}


</style>
