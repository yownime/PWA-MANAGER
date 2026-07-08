import TaskManager from './components/TaskManager';
import { getTodayTasks } from './actions';

export const revalidate = 0; // Disable static rendering to fetch tasks dynamically

export default async function Home() {
  const { tasks, error } = await getTodayTasks();

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TaskManager initialTasks={tasks} error={error} />
    </main>
  );
}
