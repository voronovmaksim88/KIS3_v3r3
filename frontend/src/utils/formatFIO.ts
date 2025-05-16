import { typeTask } from '../types/typeTask.ts';

type Executor = NonNullable<typeTask['executor']>;

export function formatFIO(executor: Executor | null): string {
    if (!executor) {
        return 'Не назначен';
    }
    
    const initial = executor.name[0].toUpperCase();
    return `${executor.surname} ${initial}.`;
}