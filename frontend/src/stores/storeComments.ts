// stores/storeComments.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import { getApiUrl } from '../utils/apiUrlHelper';
import { useAuthStore } from './storeAuth';

// Интерфейс комментария, как возвращает бэкенд
interface Comment {
    id: number;
    order_id: string;
    text: string;
    person_uuid: string;
    moment_of_creation: string | null;
}

// Типы состояния для комментариев
type Status = 'idle' | 'loading' | 'success' | 'error';

export const useCommentStore = defineStore('comments', {
    state: () => ({
        status: 'idle' as Status,
        error: null as string | null,
        comments: [] as Comment[],
    }),

    getters: {
        isLoading: (state) => state.status === 'loading',
        hasError: (state) => state.status === 'error',
        lastCommentId: (state) => {
            if (state.comments.length > 0) {
                return state.comments[state.comments.length - 1].id;
            }
            return null;
        },
    },

    actions: {
        async addComment(orderId: string, text: string) {
            const authStore = useAuthStore();
            const apiUrl = getApiUrl();

            this.status = 'loading';
            this.error = null;

            try {
                const response = await axios.post(
                    `${apiUrl}comments/create`,
                    {
                        order_id: orderId,
                        text,
                        user_id: authStore.userId // Берём ID из стора авторизации
                    },
                    {
                        withCredentials: true
                    }
                );

                this.comments.push(response.data);
                this.status = 'success';
                return response.data;
            } catch (error: any) {
                this.status = 'error';
                this.error = error.response?.data?.detail || 'Ошибка при добавлении комментария';
                console.error('Ошибка добавления комментария:', error);
                throw error;
            }
        },

        resetState() {
            this.status = 'idle';
            this.error = null;
            this.comments = [];
        }
    }
});