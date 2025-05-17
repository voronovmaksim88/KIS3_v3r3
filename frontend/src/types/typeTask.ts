// src/type/typeTask.ts
// Интерфейс для задачи (основан на TaskRead из backend)
export interface typeTask {
    id: number;
    order: { serial: string; name: string } | null;
    name: string;
    description: string | null;
    status_id: number;
    payment_status_id: number | null;
    executor_uuid: string | null; // UUID как строка
    planned_duration: string | null; // ISO duration (e.g., "PT2H")
    actual_duration: string | null;
    creation_moment: string | null; // ISO datetime
    start_moment: string | null;
    deadline_moment: string | null;
    end_moment: string | null;
    price: number | null;
    parent_task_id: number | null;
    root_task_id: number | null;
    // status: { id: number; name: string } | null;
    payment_status: { id: number; name: string } | null;
    executor: { uuid: string; name: string; surname: string } | null;
}