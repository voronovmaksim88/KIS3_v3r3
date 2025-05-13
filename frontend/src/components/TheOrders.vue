<!-- src/components/TheOrders.vue -->
<script setup lang="ts">
import {onMounted, ref, computed} from 'vue';
import {watch} from 'vue';
import {storeToRefs} from 'pinia';
import {useOrdersStore} from '../stores/storeOrders';
import {useOrdersTableStore} from '@/stores/storeOrdersTable'; // Импорт нового стора
import {getStatusColor} from "@/utils/getStatusColor";

// Импортируем типы
import {OrderSortField} from '@/types/typeOrder'; //  для сортировки

// импорт других сторов
import {useThemeStore} from '../stores/storeTheme';
import {useCounterpartyStore} from '@/stores/storeCounterparty';
import {useWorksStore} from "@/stores/storeWorks";

// мои компоненты
import OrderCreateForm from '@/components/OrderCreateForm.vue';
import OrderCommentBlock from '@/components/OrderCommentBlock.vue';
import TaskList from "@/components/TaskList.vue";
import OrderFinanceBlock from '@/components/OrderFinanceBlock.vue';
import OrderDateBlock from '@/components/OrderDateBlock.vue';
import OrderNameEditDialog from '@/components/OrderNameEditDialog.vue';
import OrderWorksEditDialog from '@/components/OrderWorksEditDialog.vue';

// primevue компоненты
import Toast from 'primevue/toast'
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import {useToast} from 'primevue/usetoast';
import Button from "primevue/button";
import {Checkbox} from "primevue";
import MultiSelect from 'primevue/multiselect';


// всплывающие уведомления
const toast = useToast();


// Store темы
const themeStore = useThemeStore();
const {theme: currentTheme} = storeToRefs(themeStore);

// Store для заказов и Store для состояния таблицы заказов
const ordersStore = useOrdersStore();
const ordersTableStore = useOrdersTableStore(); // Получаем экземпляр стора таблицы


// Извлекаем реактивные переменные из стора заказов (данные и флаги загрузки)
const {
  orders,
  isLoading,
  error,
  totalOrders,
  currentPage,
  totalPages,
  currentOrderDetail,
  isDetailLoading,
} = storeToRefs(ordersStore);

// Извлекаем реактивные переменные из стора таблицы (состояние отображения)
const {
  currentLimit,
  currentSkip,
  currentSortField,
  currentSortDirection,
  currentFilterStatus,
  showEndedOrders,
  searchPriority,
  searchSerial,
  searchCustomer,
  searchName,
  searchWorks
} = storeToRefs(ordersTableStore);


// Действия из стора таблицы заказов
const {
  setLimit,
  setSkip,
  setSort, // Новое действие для установки сортировки
  resetTableState,
} = ordersTableStore;


// Действия из стора заказов
const {
  fetchOrders,
  clearError,
  fetchOrderDetail,
  resetOrderDetail,
  resetOrders, // Сбрасывает только данные заказов
} = ordersStore;

// Состояние для модального окна создания заказа
const showCreateDialog = ref(false);

// store контрагентов
const counterpartyStore = useCounterpartyStore();

// store работ
const worksStore = useWorksStore();



const workOptions = computed(() => {
  return worksStore.works.map(work => ({
    id: work.id,
    name: work.name
  }));
});

// Управляет отображением строки поиска
const showSearchRow = ref(false);


// Методы для управления прокруткой страницы
function disableScroll() {
  document.body.style.overflow = 'hidden';
}

function enableScroll() {
  document.body.style.overflow = '';
}

// Модифицируем функцию addNewOrder
function addNewOrder() {
  showCreateDialog.value = true;
  disableScroll(); // Блокируем прокрутку при открытии модального окна
}

// Обработчики закрытия модального окна создания заказа
const handleOrderCreated = () => {
  showCreateDialog.value = false;
  enableScroll(); // Восстанавливаем прокрутку
  // После создания, просто перезагружаем текущую страницу с текущими параметрами таблицы
  fetchOrders();
}

const handleCreateCancel = () => {
  showCreateDialog.value = false;
  enableScroll(); // Восстанавливаем прокрутку
}

// функция поиска по заказам
// обновляем функцию поиска
function findOrders() {
  ordersTableStore.setSkip(0);
  ordersStore.fetchOrders();
}


// для хранения серийного номера заказа, чья дополнительная строка должна быть показана.
const expandedOrderSerial = ref<string | null>(null);

const toggleOrderDetails = async (serial: string) => {
  if (expandedOrderSerial.value === serial) {
    expandedOrderSerial.value = null;
    resetOrderDetail(); // Сбрасываем детали заказа в ordersStore
  } else {
    expandedOrderSerial.value = serial;
    // Просто вызываем fetchOrderDetail, данные сохранятся в ordersStore
    await fetchOrderDetail(serial);
  }
};


// --- Watcher для отслеживания изменений состояния таблицы и вызова fetchOrders ---
// Теперь один watcher отслеживает все параметры, которые влияют на запрос
watch(
    [
      currentLimit,
      currentSkip,
      currentSortField,
      currentSortDirection,
      currentFilterStatus,
      showEndedOrders,
      // Добавьте сюда другие параметры поиска/фильтрации, если они появятся в ordersTableStore
    ],
    () => {
      console.log('Table state changed, fetching orders...');
      // При любом изменении состояния таблицы, вызываем fetchOrders без параметров.
      // fetchOrders сам прочитает актуальное состояние из ordersTableStore.
      fetchOrders();
    },
    {deep: true} // Глубокое отслеживание, если state содержит объекты
);


// Вызываем действие fetchOrders при монтировании компонента
onMounted(() => {
  // Сбрасываем данные заказов
  resetOrders();
  // Сбрасываем состояние таблицы к дефолтным значениям
  resetTableState();

  // Загружаем список контрагентов
  counterpartyStore.fetchCounterparties();

  // Загружаем работы
  worksStore.fetchWorks();

  // загружаем заказы
  fetchOrders();


});

// Функции для пагинации (вызывают setSkip в ordersTableStore)
const goToPreviousPage = () => {
  if (currentPage.value > 0) {
    const newSkip = currentSkip.value - currentLimit.value;
    setSkip(newSkip); // Обновляем skip в ordersTableStore
    // Watcher отловит изменение currentSkip и вызовет fetchOrders()
  }
};

const goToNextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    const newSkip = currentSkip.value + currentLimit.value;
    setSkip(newSkip); // Обновляем skip в ordersTableStore
    // Watcher отловит изменение currentSkip и вызовет fetchOrders()
  }
};

// Обработчик изменения лимита на странице
const handleLimitChange = (limit: number) => {
  setLimit(limit); // Обновляем limit в ordersTableStore
  setSkip(0); // Сбрасываем на первую страницу при смене лимита
  // Watcher отловит изменения и вызовет fetchOrders()
}

// Обработчик изменения сортировки
const handleSortClick = (field: OrderSortField, event: MouseEvent) => {
  // Проверяем, был ли клик совершен внутри SelectButton
  // Используем event.target.closest() для проверки, является ли кликнутый элемент или его родитель
  // частью компонента SelectButton (у него есть базовый класс p-selectbutton)
  if ((event.target as HTMLElement).closest('.p-selectbutton')) {
    console.log('Click originated from SelectButton, preventing sort.');
    return; // Если клик из SelectButton, останавливаем выполнение сортировки
  }

  // Если клик не из SelectButton, выполняем логику сортировки
  setSort(field); // Обновляем поле и направление сортировки в ordersTableStore
  setSkip(0); // Обычно сбрасываем на первую страницу при смене сортировки
  // Watcher отловит изменения и вызовет fetchOrders()
}

// Обработчик изменения фильтра по статусу (для SelectButton)
const handleStatusFilterChange = () => {
  // setFilterStatus(statusId); // setFilterStatus в сторе уже содержит логику toggle
  // V-model на SelectButton уже обновил currentFilterStatus.
  // Watcher отловит изменение currentFilterStatus и вызовет fetchOrders().
  // Если нужна логика сброса skip при фильтрации, добавьте ее сюда:
  setSkip(0);
}


// Классы для заголовков таблицы (<th>)
const thClasses = computed(() => {
  const base = 'px-4 py-2 text-left text-sm font-semibold uppercase tracking-wider'; // Общие стили
  if (currentTheme.value === 'dark') {
    return `${base} border-1 border-gray-300 text-gray-300 bg-gray-600`; // Стили для темной темы
  } else {
    return `${base} border-1 border-gray-300 text-gray-600 bg-gray-100`; // Стили для светлой темы
  }
});

// Базовый цвет текста для обычных ячеек таблицы (<td>)
const tdBaseTextClass = computed(() => {
  return currentTheme.value === 'dark' ? 'text-gray-100' : 'text-gray-800';
});

// Классы для контейнера раскрытых деталей (<td> colspan="6")
const detailsContainerClass = computed(() => {
  const base = 'p-4 transition-colors duration-300 ease-in-out';
  return currentTheme.value === 'dark'
      ? `${base} bg-gray-750 text-gray-300` // Используем bg-gray-750 для отличия
      : `${base} bg-gray-50 text-gray-700`; // Используем bg-gray-50 для отличия
});

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

// Классы для кнопок пагинации
const paginationButtonClass = computed(() => {
  const base = 'px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300';
  return currentTheme.value === 'dark'
      ? `${base} bg-blue-600 hover:bg-blue-500 text-white`
      : `${base} bg-blue-500 hover:bg-blue-600 text-white`;
});

// Классы для текста пагинации
const paginationTextClass = computed(() => {
  const base = 'text-lg transition-colors duration-300';
  return currentTheme.value === 'dark' ? `${base} text-gray-300` : `${base} text-gray-700`;
});

// Классы для текста "Показано N из M заказов"
const totalInfoTextClass = computed(() => {
  const base = 'text-center mt-2 text-sm transition-colors duration-300';
  return currentTheme.value === 'dark' ? `${base} text-gray-400` : `${base} text-gray-500`;
});

// Классы для основного контейнера компонента
const mainContainerClass = computed(() => {
  const base = 'w-full min-h-screen flex flex-col items-center p-4 transition-colors duration-300 ease-in-out';
  // Используем bg-gray-900 для темной темы для лучшего контраста с таблицей bg-gray-700
  return currentTheme.value === 'dark' ? `${base} bg-gray-900 text-gray-100` : `${base} bg-gray-100 text-gray-900`;
});

// Классы для фона основной таблицы
const tableBaseClass = computed(() => {
  const base = 'min-w-full rounded-lg mb-4 table-fixed shadow-md';
  return currentTheme.value === 'dark' ? `${base} bg-gray-700` : `${base} bg-gray-100 border border-gray-200`;
});

// Классы для шапки таблицы (<th> colspan=6)
const tableHeaderRowClass = computed(() => {
  const base = 'px-2 py-2 text-center rounded-t-lg';
  return currentTheme.value === 'dark' ? `${base} bg-gray-600` : `${base} bg-gray-200`;
});

// Классы для строки таблицы (<tr>)
const trBaseClass = computed(() => {
  const base = 'transition-colors duration-100';
  return currentTheme.value === 'dark' ? `${base} border-t border-gray-600` : `${base} border-t border-gray-200`;
});

// Классы для hover эффекта ячейки с номером
const tdNumberHoverClass = computed(() => {
  return currentTheme.value === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100';
});

// Классы для блока ошибки
const errorBlockClass = computed(() => {
  const base = 'w-full p-4 rounded mb-4 flex justify-between items-center transition-colors duration-300 ease-in-out';
  return currentTheme.value === 'dark' ? `${base} bg-red-800 text-red-100` : `${base} bg-red-100 text-red-800 border border-red-300`;
});

// Классы для кнопки "Повторить" в ошибке
const errorRepeatButtonClass = computed(() => {
  const base = 'ml-4 p-1 px-2 rounded text-xs transition-colors duration-300';
  return currentTheme.value === 'dark' ? `${base} bg-red-600 hover:bg-red-500 text-white` : `${base} bg-red-500 hover:bg-red-600 text-white`;
});

// Классы для кнопки "Скрыть" в ошибке
const errorHideButtonClass = computed(() => {
  const base = 'ml-2 p-1 px-2 rounded text-xs transition-colors duration-300';
  return currentTheme.value === 'dark' ? `${base} bg-gray-600 hover:bg-gray-500 text-white` : `${base} bg-gray-300 hover:bg-gray-400 text-gray-800`;
});


// Функция для определения иконки сортировки
const getSortIcon = (field: OrderSortField): string => {
  if (currentSortField.value === field) {
    return currentSortDirection.value === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }
  return 'pi pi-sort text-gray-400';
};


/**
 * Обработчик изменения заказчика заказа
 * @param orderId - ID заказа
 * @param customerId - ID нового заказчика
 */
const handleCustomerChange = async (orderId: string, customerId: number) => {
  try {
    console.log(`Заказчик для заказа ${orderId} изменен на ${customerId}`);

    // Используем существующий метод updateOrder, передавая только изменение customer_id
    // updateOrder в ordersStore сам обновит список заказов после успешного изменения
    await ordersStore.updateOrder(orderId, {customer_id: customerId});

    // Показываем уведомление об успехе через PrimeVue Toast
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Заказчик заказа #${orderId} успешно изменен`,
      life: 3000
    });
  } catch (error) {
    console.error('Ошибка при изменении заказчика:', error);
    // Показываем уведомление об ошибке
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось изменить заказчика заказа #${orderId}`,
      life: 5000
    });
  }
};


/**
 * Обработчик изменения приоритета заказа
 * @param orderId - ID заказа
 * @param priority - Новый приоритет
 */
const handlePriorityChange = async (orderId: string, priority: number | null) => {
  try {
    console.log(`Приоритет для заказа ${orderId} изменен на ${priority}`);

    // Используем существующий метод updateOrder.
    // updateOrder в ordersStore сам обновит список заказов
    await ordersStore.updateOrder(orderId, {priority});

    // Показываем уведомление об успехе через PrimeVue Toast
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Приоритет заказа #${orderId} успешно изменен`,
      life: 3000
    });
  } catch (error) {
    console.error('Ошибка при изменении приоритета:', error);
    // Показываем уведомление об ошибке
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось изменить приоритет заказа #${orderId}`,
      life: 5000
    });
  }
};

// Функция для получения опций для выпадающего списка контрагентов
const getCustomerOptions = computed(() => {
  return counterpartyStore.sortedCounterparties.map(cp => ({
    name: counterpartyStore.getFullName(cp),
    value: cp.id,
    code: cp.id.toString()
  }));
});

// Вспомогательная функция для получения имени по ID
const getCustomerNameById = (id: number): string => {
  const customer = counterpartyStore.getCounterpartyById(id);
  return customer ? counterpartyStore.getFullName(customer) : 'Заказчик не найден';
};

// Опции для приоритета
const priorityOptions = [
  { label: 'Любой', value: undefined },
  { label: 'Нет', value: null },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: (i + 1).toString(),
    value: i + 1,
  }))
];

// Новые опции для отображения приоритета в строках таблицы
const priorityDisplayOptions = [
  { label: 'Нет', value: null },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: (i + 1).toString(),
    value: i + 1,
  }))
];


// Состояние для диалога изменения названия
const showNameEditDialog = ref(false);
const selectedOrderForNameEdit = ref<{ id: string | null, name: string }>({id: null, name: ''});

/**
 * Открывает диалог изменения названия заказа
 * @param orderId - ID заказа
 * @param currentName - Текущее название заказа
 */
const openNameEditDialog = (orderId: string, currentName: string) => {
  selectedOrderForNameEdit.value = {id: orderId, name: currentName};
  showNameEditDialog.value = true;
};


/**
 * Обработчик успешного обновления названия заказа из диалога
 */
const handleNameUpdated = async () => {
  // updateOrder в ordersStore уже вызван из диалога и обновил список заказов
  console.log("Заказ обновлен через диалог OrderNameEditDialog");
  // Нет необходимости вызывать fetchOrders() или показывать toast здесь,
  // так как это уже сделано в логике updateOrder в ordersStore.
};

// Обработчик отмены редактирования названия
const handleNameEditCancel = () => {
  selectedOrderForNameEdit.value = {id: null, name: ''};
};


// --- State for Works Edit Dialog ---
const showWorksEditDialog = ref(false);
const selectedOrderForWorksEdit = ref<{ id: string | null, workIds: number[] }>({id: null, workIds: []});


/**
 * Открывает диалог редактирования списка работ для заказа
 * @param orderId - ID заказа
 * @param currentWorks - Массив объектов текущих работ [{id: number, name: string}, ...]
 */
const openWorksEditDialog = (orderId: string, currentWorks: { id: number, name?: string }[]) => {
  selectedOrderForWorksEdit.value = {
    id: orderId,
    workIds: currentWorks ? currentWorks.map(w => w.id) : [] // Извлекаем только ID
  };
  // Предзагрузка списка работ, если он пуст (проверяем основной массив 'works')
  // Это запасной вариант, так как fetchWorks вызывается в onMounted
  if (worksStore.works.length === 0 && !worksStore.isLoading) {
    worksStore.fetchWorks();
  }
  showWorksEditDialog.value = true;
  disableScroll(); // Блокируем прокрутку
};


/**
 * Обработчик успешного обновления списка работ из диалога
 */
const handleWorksUpdated = async () => {
  enableScroll(); // Восстанавливаем прокрутку
  // updateOrder в ordersStore уже вызван из диалога и обновил список заказов
  console.log("Работы заказа обновлены через диалог OrderWorksEditDialog");
};

// Обработчик отмены редактирования списка работ
const handleWorksEditCancel = () => {
  enableScroll(); // Восстанавливаем прокрутку
};

// Опции для статуса
const statusOptions = [
  {value: 1, label: 'Не определён'},
  {value: 2, label: 'На согласовании'},
  {value: 3, label: 'В работе'},
  {value: 4, label: 'Просрочено'},
  {value: 5, label: 'Выполнено в срок'},
  {value: 6, label: 'Выполнено НЕ в срок'},
  {value: 7, label: 'Не согласовано'},
  {value: 8, label: 'На паузе'},
];


/**
 * Обработчик изменения статуса заказа
 * @param orderId - ID заказа
 * @param statusId - ID нового статуса
 */
const handleStatusChange = async (orderId: string, statusId: number) => {
  try {
    console.log(`Статус для заказа ${orderId} изменен на ${statusId}`);

    // Используем существующий метод updateOrder.
    // updateOrder в ordersStore сам обновит список заказов
    await ordersStore.updateOrder(orderId, {status_id: statusId});

    // Показываем уведомление об успехе через PrimeVue Toast
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: `Статус заказа #${orderId} успешно изменен`,
      life: 3000
    });

  } catch (error) {
    console.error('Ошибка при изменении статуса:', error);
    // Показываем уведомление об ошибке
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось изменить статус заказа #${orderId}`,
      life: 5000
    });
  }
};

// Опции для кнопок фильтрации по статусу
const statusFilterButtons = [
  {label: 'НО', statusId: 1, tooltip: 'Не определён'},
  {label: 'НС', statusId: 2, tooltip: 'На согласовании'},
  {label: 'ВР', statusId: 3, tooltip: 'В работе'},
  {label: 'Пр', statusId: 4, tooltip: 'Просрочено'},
  // Добавьте другие статусы, если нужно фильтровать по ним
  // {label: 'ВВ', statusId: 5, tooltip: 'Выполнено в срок'},
  // {label: 'ВН', statusId: 6, tooltip: 'Выполнено НЕ в срок'},
  // {label: 'НС', statusId: 7, tooltip: 'Не согласовано'},
  {label: 'НП', statusId: 8, tooltip: 'На паузе'},
];

// Обработчик сброса состояния таблицы и данных
const handleResetTableAndData = () => {
  resetTableState();
  resetOrders();
  fetchOrders();
}

// Опции для выбора лимита на странице
const limitOptions = [
  {label: '10', value: 10},
  {label: '25', value: 25},
  {label: '50', value: 50},
  {label: '100', value: 100},
];


const handleWorksSearchChange = () => {
  ordersTableStore.setSearchWorks(searchWorks.value);
  ordersTableStore.setSkip(0); // Сбрасываем на первую страницу
  // Запрос будет вызван через watch с дебаунсингом
};


// наблюдатель, который будет обновлять noPriority на основе значения searchPriority:
watch(
    searchPriority,
    (newPriority) => {
      ordersTableStore.setNoPriority(newPriority === null);
      ordersTableStore.setSkip(0);
      fetchOrders();
    }
);


// Переменная для хранения ID тайм-аута для дебаунсинга
let searchDebounceTimer: number | undefined;
watch(
    () => [searchSerial.value, searchCustomer.value, searchName.value, searchWorks.value],
    () => {
      // Очищаем ранее запланированный тайм-аут (если он есть)
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      // Планируем новый тайм-аут
      searchDebounceTimer = setTimeout(() => {
        console.log('Сработал поиск с дебаунсом'); // Для отладки
        findOrders();
      }, 500); // Выполнить findOrders через 500 мс после последнего изменения
    },
    { flush: 'post', deep: true } // deep: true для наблюдения за массивом searchWorks
);


// Сброс фильтров поиска при отключении строки поиска
watch(
    () => showSearchRow.value,
    (newVal) => {
      if (!newVal) {
        handleResetTableAndData();
      }
    }
);
</script>


<template>
  <div :class="mainContainerClass">
    <Toast/>


    <OrderNameEditDialog
        v-model:visible="showNameEditDialog"
        :order-id="selectedOrderForNameEdit.id"
        :initial-name="selectedOrderForNameEdit.name"
        @update-name="handleNameUpdated"
        @cancel="handleNameEditCancel"
    />


    <OrderWorksEditDialog
        v-model:visible="showWorksEditDialog"
        :order-id="selectedOrderForWorksEdit.id"
        :initial-work-ids="selectedOrderForWorksEdit.workIds"
        @update-works="handleWorksUpdated"
        @cancel="handleWorksEditCancel"
    />


    <transition name="fade">
      <div v-if="showCreateDialog"
           class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="max-w-4xl w-full">
          <OrderCreateForm
              @success="handleOrderCreated"
              @cancel="handleCreateCancel"
          />
        </div>
      </div>
    </transition>

    <div v-if="isLoading && orders.length === 0" class="w-full flex justify-center my-4">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>


    <div v-if="!isLoading && error" :class="errorBlockClass">
      <span>Ошибка: {{ error }}</span>
      <div>

        <button
            @click="fetchOrders()"
            :class="errorRepeatButtonClass"
        >
          Повторить
        </button>
        <button
            @click="clearError"
            :class="errorHideButtonClass"
        >
          Скрыть
        </button>
      </div>
    </div>


    <div v-if="(!isLoading && !error) || (isLoading && orders.length > 0)" class="w-full">
      <table :class="tableBaseClass">
        <colgroup>
          <col style="width: 9%">
          <col style="width: 24%">
          <col style="width: 7%">
          <col style="width: 25%">
          <col style="width: 15%">
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

              <!--чекбокс заказов все/активные-->
              <div class="flex items-center gap-2">
                <label class="class='text-middle'"> Завершённые </label>
                <Checkbox
                    v-model="showEndedOrders"
                    binary
                />
              </div>

              <!--чекбокс поиска-->
              <div class="flex items-center gap-2">
                <label > Поиск </label>
                <Checkbox
                    v-model="showSearchRow"
                    binary
                />
              </div>


              <!--переключатель количества строк таблицы-->
              <Select
                  v-model="currentLimit"
                  :options="limitOptions"
                  optionLabel="label"
                  optionValue="value"
                  @change="handleLimitChange(currentLimit)"
                  class="w-24 text-sm"
              />

              <Button
                  @click="handleResetTableAndData"
                  label="Сброс"
                  severity="secondary"
                  outlined
                  class="text-sm"
              />
              </div>


              <span class="flex">
                <Button
                    @click="findOrders"
                    :disabled="isLoading || (
                        searchSerial.trim() === '' &&
                        searchCustomer.trim() === '' &&
                        searchPriority === undefined &&
                        searchName.trim() === '' &&
                        searchWorks.length === 0
                    )"
                    severity="secondary"
                    raised
                    class="mr-2 flex items-center gap-2"
                >
                  <span v-if="isLoading">
                    <!-- Простой спиннер -->
                    <i class="pi pi-spin pi-spinner text-sm"></i>
                  </span>
                  <span>Поиск</span>
                </Button>

                  <Button
                      @click="addNewOrder"
                      :label="'Добавить'"
                      severity="primary"
                      raised
                  />
                </span>
            </div>
          </th>
        </tr>


        <!--строка с заголовками таблицы-->
        <tr>
          <th
              :class="thClasses"
              class="cursor-pointer"
              @click="(event) => {
                // Проверяем, был ли клик по самому элементу input
                if ((event.target as HTMLElement).tagName !== 'INPUT') {
                  handleSortClick('serial', event);
                }
              }"
          >
            <div class="flex items-center">
              Номер
              <span class="ml-1">
                <i :class="getSortIcon('serial')"></i>
              </span>
            </div>
          </th>

          <th :class="thClasses">
            Заказчик
          </th>

          <th :class="thClasses" class="cursor-pointer" @click="handleSortClick('priority', $event)">
            <div class="flex items-center">
              Приоритет
              <span class="ml-1">
                <i :class="getSortIcon('priority')"></i>
              </span>
            </div>
          </th>

          <th :class="thClasses">
            Название
          </th>

          <th :class="thClasses">Виды работ</th>


          <th :class="thClasses" class="cursor-pointer" @click="handleSortClick('status', $event)">
            <div class="flex items-center justify-between">
              <span class="flex items-center">
                Статус
                <span class="ml-1">
                  <i :class="getSortIcon('status')"></i>
                </span>
              </span>
            </div>
          </th>
        </tr>


        <!--строка с поисками и фильтрами-->
        <tr v-if="showSearchRow">
          <th
              :class="thClasses"
              class="cursor-pointer"
              @click="(event) => {
                // Проверяем, был ли клик по самому элементу input
                if ((event.target as HTMLElement).tagName !== 'INPUT') {
                  handleSortClick('serial', event);
                }
              }"
          >
            <div class="mt-2">
              <InputText
                  v-model="searchSerial"
                  placeholder="Поиск"
                  class="w-full text-sm font-medium"
              />
            </div>
          </th>

          <th :class="thClasses">
            <div class="mt-2">
              <InputText
                  v-model="searchCustomer"
                  placeholder="Поиск по заказчику"
                  class="w-full text-sm font-medium"
              />
            </div>
          </th>

          <!--поиск по приоритету-->
          <th :class="thClasses">
            <div class="mt-2">
              <Select
                  v-model="searchPriority"
                  :options="priorityOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full text-sm font-medium"
              >
                <!-- Отображение текущего значения -->
                <template #value="slotProps">
                  <span v-if="slotProps.value === undefined">Любой</span>
                  <span v-else-if="slotProps.value === null">Нет</span>
                  <span v-else>{{ slotProps.value }}</span>
                </template>

                <!-- Отображение элементов списка -->
                <template #option="slotProps">
                  <div class="flex items-center">
                    <div v-if="slotProps.option.value !== null && slotProps.option.value !== undefined"
                         class="w-3 h-3 rounded-full mr-2"
                         :class="`priority-indicator priority-${slotProps.option.value}`"></div>
                    <span>{{ slotProps.option.label }}</span>
                  </div>
                </template>
              </Select>
            </div>
          </th>

          <!--поиск по названию-->
          <th :class="thClasses">
            <div class="mt-2">
              <InputText
                  v-model="searchName"
                  placeholder="Поиск по названию"
                  class="w-full text-sm font-medium"
              />
            </div>
          </th>

          <!--поиск по видам работ-->
          <th :class="thClasses">
            <div class="mt-2">
              <MultiSelect
                  v-model="searchWorks"
                  :options="workOptions"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Выберите работы"
                  class="w-full text-sm font-medium"
                  :loading="worksStore.isLoading"
                  :disabled="worksStore.isLoading || worksStore.works.length === 0"
                  filter
                  @change="handleWorksSearchChange"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value && slotProps.value.length > 0">
                    <span>{{ slotProps.value.length }} работ выбрано</span>
                  </div>
                  <span v-else>Выберите работы</span>
                </template>
              </MultiSelect>
            </div>
          </th>


          <th :class="thClasses" class="cursor-pointer" @click="handleSortClick('status', $event)">
            <div class="flex items-center justify-between">
              <span class="flex items-center space-x-1">

                <SelectButton
                    v-model="currentFilterStatus"
                    :options="statusFilterButtons"
                    optionLabel="label"
                    optionValue="statusId"
                    aria-labelledby="status-filter-label"
                    class="text-sm"
                    @change="handleStatusFilterChange"
                >
                  <template #option="slotProps">
                    <span
                        class="px-2 py-1 rounded border"
                        :style="{
                          color: getStatusColor(slotProps.option.statusId, currentTheme),
                          borderColor: getStatusColor(slotProps.option.statusId, currentTheme)
                        }"
                    >
                      {{ slotProps.option.label }}
                    </span>
                  </template>
                </SelectButton>
              </span>
            </div>
          </th>
        </tr>


        </thead>
        <tbody>
        <template v-for="order in orders" :key="order.serial">
          <tr :class="trBaseClass">

            <td
                class="px-4 py-2 cursor-pointer transition duration-300"
                :class="[
                    tdNumberHoverClass,
                    tdBaseTextClass,
                    { 'font-bold': [1, 2, 3, 4, 8].includes(order.status_id) }
                ]"
                :style="{ color: getStatusColor(order.status_id, currentTheme) }"
                @click="toggleOrderDetails(order.serial)"
            >
              {{ order.serial }}
            </td>


            <td class="px-4 py-2" :class="tdBaseTextClass">
              <div v-if="counterpartyStore.isLoading" class="flex items-center">
                <span>{{ order.customer }}</span>
              </div>
              <Select
                  v-else
                  v-model="order.customer_id"
                  :options="getCustomerOptions"
                  optionValue="value"
                  filter
                  optionLabel="name"
                  :placeholder="order.customer"
                  class="w-full"
                  :autoFilterFocus="true"
                  @change="handleCustomerChange(order.serial, order.customer_id)"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center">
                    <div>
                      {{
                        typeof slotProps.value === 'object' && slotProps.value.name
                            ? slotProps.value.name
                            : getCustomerNameById(slotProps.value)
                      }}
                    </div>
                  </div>
                  <span v-else>
                     {{ order.customer }}
                   </span>
                </template>

                <template #option="slotProps">
                  <div class="flex items-center">
                    <div>{{ slotProps.option.name }}</div>
                  </div>
                </template>
              </Select>
            </td>


            <!-- приоритет заказа -->

            <td class="px-4 py-2" :class="tdBaseTextClass">
              <Select
                  v-model="order.priority"
                  :options="priorityDisplayOptions"
                  optionValue="value"
                  optionLabel="label"
                  placeholder="Нет"
                  class="w-full"
                  :clearable="true"
                  @change="handlePriorityChange(order.serial, order.priority)"
              >
                <template #option="slotProps">
                  <div class="flex items-center">
                    <div v-if="slotProps.option.value !== null" class="w-3 h-3 rounded-full mr-2"
                         :class="`priority-indicator priority-${slotProps.option.value}`"></div>
                    <span>{{ slotProps.option.label }}</span>
                  </div>
                </template>
                <template #value="">

                  <div class="flex items-center">
                    <template v-if="order.priority !== null">
                      <div class="w-3 h-3 rounded-full mr-2"
                           :class="`priority-indicator priority-${order.priority}`"></div>
                      <span>{{ order.priority }}</span>
                    </template>
                    <template v-else>
                      <span>Нет</span>
                    </template>
                  </div>
                </template>
              </Select>
            </td>



            <td class="px-4 py-2 cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                :class="tdBaseTextClass"
                @click="openNameEditDialog(order.serial, order.name)">
              <div class="flex items-center">
                {{ order.name }}
                <i class="ml-2 text-xs opacity-50"></i>
              </div>
            </td>


            <td class="px-4 py-2 cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 transition-colors"
                :class="tdBaseTextClass"
                @click="openWorksEditDialog(order.serial, order.works)">
              <div class="flex items-center justify-between">
                <div v-if="order.works && order.works.length > 0">
                  <p v-for="work in order.works" :key="work.id" class="text-sm leading-tight"> • {{ work.name }} </p>
                </div>
                <div v-else class="text-xs text-gray-400 italic">
                  Нет работ
                </div>
                <i class="ml-2 text-xs opacity-30 flex-shrink-0"></i>
              </div>
            </td>


            <td class="px-4 py-2" :class="tdBaseTextClass">
              <Select
                  v-model="order.status_id"
                  :options="statusOptions"
                  optionValue="value"
                  optionLabel="label"
                  placeholder="Выберите статус"
                  class="w-full"
                  @change="handleStatusChange(order.serial, order.status_id)"
              >
                <template #value="slotProps">
                   <span v-if="slotProps.value" :style="{ color: getStatusColor(slotProps.value, currentTheme) }">
                     {{ statusOptions.find(opt => opt.value === slotProps.value)?.label || 'Неизвестный статус' }}
                   </span>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>

                <template #option="slotProps">
                  <div class="flex items-center">
                      <span :style="{ color: getStatusColor(slotProps.option.value, currentTheme) }">
                        {{ slotProps.option.label }}
                      </span>
                  </div>
                </template>
              </Select>
            </td>
          </tr>


          <tr
              v-if="expandedOrderSerial === order.serial"
              :class="[ currentTheme === 'dark' ? 'border-b border-gray-600' : 'border-b border-gray-200' ]"
          >
            <td colspan="6" :class="detailsContainerClass" style="position: relative;">

              <div v-if="isDetailLoading" class="absolute inset-0 flex justify-center items-center z-10">
                <div class="absolute inset-0 backdrop-blur-sm"
                     :class="currentTheme === 'dark' ? 'bg-gray-900 bg-opacity-40' : 'bg-white bg-opacity-50'">
                </div>
                <div class="z-20 px-4 py-2 rounded-lg shadow-lg flex items-center"
                     :class="currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'">
                  <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  <span :class="currentTheme === 'dark' ? 'text-white' : 'text-gray-800'">
          Загрузка данных заказа...
        </span>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <OrderCommentBlock
                    :order_serial="order.serial"
                    :comments="currentOrderDetail?.comments || []"
                    :theme="currentTheme"
                />
                <div class="flex flex-col gap-4">
                  <OrderDateBlock
                      :order="currentOrderDetail || {}"
                      :theme="currentTheme"
                      :detailBlockClass="detailBlockClass"
                      :detailHeaderClass="detailHeaderClass"
                      :tdBaseTextClass="tdBaseTextClass"
                      :order-serial="order.serial"
                  />
                  <OrderFinanceBlock
                      :finance="currentOrderDetail || {}"
                      :theme="currentTheme"
                      :detailBlockClass="detailBlockClass"
                      :detailHeaderClass="detailHeaderClass"
                      :tdBaseTextClass="tdBaseTextClass"
                      :order-serial="order.serial"
                  />
                </div>
                <TaskList
                    :tasks="currentOrderDetail?.tasks || []"
                    :theme="currentTheme"
                    :order-serial="order.serial"
                />
              </div>
            </td>
          </tr>
        </template>

        <tr v-if="orders.length === 0 && !isLoading && !error">
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


      <div v-if="totalPages > 1" class="mt-6 flex justify-center items-center space-x-3">
        <button
            @click="goToPreviousPage"
            :disabled="currentPage === 0"
            :class="paginationButtonClass"
        >
          Назад
        </button>
        <span :class="paginationTextClass">
          Страница {{ currentPage + 1 }} из {{ totalPages }}
        </span>
        <button
            @click="goToNextPage"
            :disabled="currentPage >= totalPages - 1"
            :class="paginationButtonClass"
        >
          Вперед
        </button>
      </div>

      <div v-if="!isLoading && orders.length > 0" :class="totalInfoTextClass">
        Показано {{ orders.length }} из {{ totalOrders }} заказов.
      </div>
    </div>
  </div>

  <!-- Элемент, который формально использует классы для успокоения линтера.
     Он не отображается, так как имеет display: none; -->
  <div
      v-if="false"
      class="p-dialog p-dialog-header p-dialog-content p-dialog-header-close"
      style="display: none;"
  ></div>
</template>

<style scoped>
/* Добавляем стили для модального окна PrimeVue Dialog с использованием v-bind */
:deep(.p-dialog) {
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
  /* Динамическая рамка для светлой темы */
  border: 1px solid v-bind('currentTheme === "dark" ? "transparent" : "rgba(209, 213, 219, 1)"'); /* border-gray-300 */
  /* Тень для светлой темы */
  box-shadow: v-bind('currentTheme === "dark" ? "none" : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"');
}

:deep(.p-dialog-header) {
  padding: 1rem;
  border-bottom: 1px solid v-bind('currentTheme === "dark" ? "rgba(75, 85, 99, 1)" : "rgba(229, 231, 235, 1)"');
}

:deep(.p-dialog-content) {
  padding: 0;
}

/* Поддержка backdrop-blur для браузеров */
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
