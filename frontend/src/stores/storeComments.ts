// stores/useCommentStore.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import { getApiUrl } from '../utils/apiUrlHelper';
import { useAuthStore } from './storeAuth';
import {computed, ref} from "vue";

// Интерфейс комментария
interface Comment {
    id: number;
    order_id: string;
    text: string;
    person_uuid: string;
    moment_of_creation: string | null;
}

// Типы состояния
type Status = 'idle' | 'loading' | 'success' | 'error';

// Типы ошибок
interface ApiError {
    detail?: string;
}

export const useCommentStore = defineStore('commentStore', () => {
    // Состояние
    const status = ref<Status>('idle');
    const error = ref<string | null>(null);
    const comments = ref<Comment[]>([]);

    // Геттеры
    const isLoading = computed(() => status.value === 'loading');
    const hasError = computed(() => status.value === 'error');
    const lastCommentId = computed(() => {
        if (comments.value.length > 0) {
            return comments.value[comments.value.length - 1].id;
        }
        return null;
    });

    // Методы
    async function addComment(orderId: string, text: string) {
        const authStore = useAuthStore();
        const apiUrl = getApiUrl();

        status.value = 'loading';
        error.value = null;

        try {
            const response = await axios.post(
                `${apiUrl}comments/create`,
                {
                    order_id: orderId,
                    text,
                    user_id: authStore.userId
                },
                {
                    withCredentials: true
                }
            );

            comments.value.push(response.data);
            status.value = 'success';
            return response.data;
        } catch (err: any) {
            status.value = 'error';
            const apiError = err.response?.data as ApiError;
            error.value = apiError?.detail || 'Ошибка при добавлении комментария';
            console.error('Ошибка добавления комментария:', err);
            throw err;
        }
    }

    function resetState() {
        status.value = 'idle';
        error.value = null;
        comments.value = [];
    }

    return {
        // Состояние
        status,
        error,
        comments,

        // Геттеры
        isLoading,
        hasError,
        lastCommentId,

        // Методы
        addComment,
        resetState
    };
});