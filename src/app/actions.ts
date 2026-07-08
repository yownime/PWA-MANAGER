'use server';

import { sql } from '../lib/db';
import { revalidatePath } from 'next/cache';

export interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  due_date: string;
  created_at: string;
}

// Ensures the task table exists
async function ensureTableExists() {
  if (!process.env.DATABASE_URL) return false;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        priority VARCHAR(10) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
        completed BOOLEAN DEFAULT FALSE,
        due_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    return true;
  } catch (e) {
    console.error('Error creating table:', e);
    return false;
  }
}

export async function getTodayTasks(): Promise<{ tasks: Task[]; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { tasks: [], error: 'DATABASE_URL is not configured.' };
  }

  const tableReady = await ensureTableExists();
  if (!tableReady) {
    return { tasks: [], error: 'Failed to verify database table structure.' };
  }

  try {
    // Fetch all uncompleted tasks + any tasks due from yesterday onwards (to show recently completed ones)
    const rows = await sql`
      SELECT id, title, priority, completed, due_date::text, created_at::text
      FROM tasks
      WHERE completed = false OR due_date >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY 
        due_date ASC,
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END ASC, 
        created_at DESC
    `;

    return { tasks: rows as Task[] };
  } catch (e) {
    console.error('Error fetching tasks:', e);
    return { tasks: [], error: 'Failed to retrieve tasks from Neon.' };
  }
}

export async function addTask(
  title: string, 
  priority: 'high' | 'medium' | 'low',
  dueDate?: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Database is not configured.' };
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return { success: false, error: 'Task title cannot be empty.' };
  }

  try {
    if (dueDate) {
      await sql`
        INSERT INTO tasks (title, priority, due_date)
        VALUES (${cleanTitle}, ${priority}, ${dueDate}::date)
      `;
    } else {
      await sql`
        INSERT INTO tasks (title, priority)
        VALUES (${cleanTitle}, ${priority})
      `;
    }
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error('Error adding task:', e);
    return { success: false, error: 'Failed to add task.' };
  }
}

export async function toggleTask(id: string, completed: boolean): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    await sql`
      UPDATE tasks
      SET completed = ${completed}
      WHERE id = ${id}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error('Error toggling task:', e);
    return { success: false, error: 'Failed to update task.' };
  }
}

export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    await sql`
      DELETE FROM tasks
      WHERE id = ${id}
    `;
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error('Error deleting task:', e);
    return { success: false, error: 'Failed to delete task.' };
  }
}
