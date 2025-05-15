// src/type/typeTask.ts

export interface typeTask {
    id: number;
    order_serial: string | null;
    name: string;
    description: string;
    status_id: number;
    payment_status_id: number;
    executor: string | null;
    planned_duration: string | null;
    actual_duration: string | null;
    creation_moment: string;
    start_moment: string;
    deadline_moment: string;
    end_moment: string | null;
    price: number | null;
    parent_task_id: number | null;
    root_task_id: number | null;
}