'use client';

import React, { useState, useTransition } from 'react';
import { Task, addTask, toggleTask, deleteTask } from '../actions';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  AlertCircle, 
  Calendar
} from 'lucide-react';

interface TaskManagerProps {
  initialTasks: Task[];
  error?: string;
}

export default function TaskManager({ initialTasks, error: initError }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [inputHigh, setInputHigh] = useState('');
  const [inputMedium, setInputMedium] = useState('');
  const [inputLow, setInputLow] = useState('');
  const [, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState(initError);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'upcoming'>('today');

  // Helper for local date string YYYY-MM-DD
  const getLocalDateString = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);

  const [upcomingDate, setUpcomingDate] = useState(() => getLocalDateString(2));

  // Sync state if initialTasks prop changes during render (standard React pattern)
  if (initialTasks !== prevInitialTasks) {
    setTasks(initialTasks);
    setPrevInitialTasks(initialTasks);
  }


  // Indonesian Date Formatting for header
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('id-ID', options);
  };

  const formatTaskDate = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hari Ini';
    if (dateStr === tomorrowStr) return 'Besok';
    
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const handleAddTask = async (title: string, priority: 'high' | 'medium' | 'low', setInput: (v: string) => void) => {
    if (!title.trim()) return;

    let targetDate = todayStr;
    if (activeTab === 'tomorrow') {
      targetDate = tomorrowStr;
    } else if (activeTab === 'upcoming') {
      targetDate = upcomingDate;
    }
    
    // Create optimistic task
    const tempId = `temp-${tasks.length}-${title.trim()}`;
    const newTask: Task = {
      id: tempId,
      title: title.trim(),
      priority,
      completed: false,
      due_date: targetDate,
      created_at: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    setInput('');

    startTransition(async () => {
      const res = await addTask(title, priority, targetDate);
      if (!res.success) {
        setErrorMessage(res.error || 'Gagal menambahkan tugas');
        // Rollback optimistic update
        setTasks(prev => prev.filter(t => t.id !== tempId));
      } else {
        // Refresh with real database state
        window.location.reload();
      }
    });
  };

  const handleToggleTask = async (id: string, currentCompleted: boolean) => {
    // Optimistic toggle
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !currentCompleted } : t));

    startTransition(async () => {
      const res = await toggleTask(id, !currentCompleted);
      if (!res.success) {
        setErrorMessage(res.error || 'Gagal mengubah status tugas');
        // Rollback
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: currentCompleted } : t));
      }
    });
  };

  const handleDeleteTask = async (id: string) => {
    const originalTask = tasks.find(t => t.id === id);
    if (!originalTask) return;

    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id));

    startTransition(async () => {
      const res = await deleteTask(id);
      if (!res.success) {
        setErrorMessage(res.error || 'Gagal menghapus tugas');
        // Rollback
        setTasks(prev => [...prev, originalTask]);
      }
    });
  };

  const getDaysRemainingLabel = (dateStr: string) => {
    if (dateStr === todayStr) return '';
    try {
      const diffTime = new Date(dateStr).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return `Telat ${Math.abs(diffDays)} hari`;
      }
      return `${diffDays} hari lagi`;
    } catch {
      return '';
    }
  };

  // Filter tasks based on activeTab
  const getFilteredTasks = () => {
    return tasks.filter(t => {
      if (activeTab === 'today') {
        // Today's tasks + completed today
        if (t.completed) {
          return t.due_date === todayStr;
        }
        // Uncompleted tasks: show if they are due today, overdue, or due within 7 days
        const diffTime = new Date(t.due_date).getTime() - new Date(todayStr).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (activeTab === 'tomorrow') {
        return t.due_date === tomorrowStr;
      } else {
        return t.due_date > tomorrowStr;
      }
    });
  };

  const filteredTasks = getFilteredTasks();
  const highTasks = filteredTasks.filter(t => t.priority === 'high');
  const mediumTasks = filteredTasks.filter(t => t.priority === 'medium');
  const lowTasks = filteredTasks.filter(t => t.priority === 'low');

  // Progress calculations based on selected tab's tasks
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-info">
          <div className="date-wrapper">
            <Calendar size={14} className="text-secondary" />
            <span className="current-date">{getFormattedDate()}</span>
          </div>
          <h1 className="app-title">Hari Ini</h1>
          <p className="app-subtitle">
            {activeTab === 'today' && 'Selesaikan kerjaan harian Anda dengan praktis tanpa ribet.'}
            {activeTab === 'tomorrow' && 'Persiapan kerjaan untuk besok hari agar lebih santai.'}
            {activeTab === 'upcoming' && 'Daftar rencana tugas jangka panjang di masa mendatang.'}
          </p>
        </div>

        {totalTasks > 0 && (
          <div className="progress-section">
            <div className="progress-text-container">
              <span className="progress-count">{completedTasks} dari {totalTasks} selesai</span>
              <span className="progress-percentage">{progressPercent}%</span>
            </div>
            <div className="progress-bar-outer">
              <div 
                className="progress-bar-inner" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          onClick={() => setActiveTab('today')}
          className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
        >
          Hari Ini
        </button>
        <button 
          onClick={() => setActiveTab('tomorrow')}
          className={`tab-btn ${activeTab === 'tomorrow' ? 'active' : ''}`}
        >
          Besok
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          Mendatang
        </button>
      </div>

      {/* Inline Date Selector for Upcoming Tab */}
      {activeTab === 'upcoming' && (
        <div className="upcoming-date-picker">
          <label htmlFor="upcoming-date">Jadwal tugas baru untuk tanggal:</label>
          <input 
            id="upcoming-date"
            type="date"
            value={upcomingDate}
            onChange={(e) => setUpcomingDate(e.target.value)}
            min={getLocalDateString(2)}
            className="date-input"
          />
        </div>
      )}

      {errorMessage && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <div className="error-content">
            <p>{errorMessage}</p>
            {errorMessage.includes('DATABASE_URL') && (
              <div className="setup-instruction">
                <p><strong>Cara Setup Neon Database:</strong></p>
                <ol>
                  <li>Buat database gratis di <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">Neon.tech</a></li>
                  <li>Salin <strong>Connection String</strong></li>
                  <li>Buat file <code>.env.local</code> di folder project ini lalu isi:</li>
                  <pre>DATABASE_URL=&quot;postgresql://user:password@endpoint/dbname?sslmode=require&quot;</pre>
                  <li>Restart local server Anda!</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid columns for priorities */}
      <div className="priority-grid">
        {/* HIGH PRIORITY COLUMN */}
        <div className="priority-card priority-high">
          <div className="card-header">
            <div className="priority-label">
              <div className="priority-dot" />
              <span>Prioritas Utama</span>
            </div>
            <span className="task-badge">{highTasks.length}</span>
          </div>

          <div className="quick-input-wrapper">
            <input 
              type="text"
              placeholder="Tambah tugas utama..."
              value={inputHigh}
              onChange={(e) => setInputHigh(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask(inputHigh, 'high', setInputHigh)}
              className="quick-input"
            />
            <button 
              onClick={() => handleAddTask(inputHigh, 'high', setInputHigh)}
              className="quick-add-btn"
              title="Tambah Tugas"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="task-list">
            {highTasks.length === 0 ? (
              <div className="empty-state">Tidak ada tugas utama.</div>
            ) : (
              highTasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <button 
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="task-toggle"
                  >
                    {task.completed ? (
                      <CheckCircle className="icon-checked" size={18} />
                    ) : (
                      <Circle className="icon-unchecked" size={18} />
                    )}
                  </button>
                  {activeTab === 'upcoming' && (
                    <span className="task-date-tag">{formatTaskDate(task.due_date)}</span>
                  )}
                  {activeTab === 'today' && task.due_date !== todayStr && (
                    <span className="task-date-tag warning">{getDaysRemainingLabel(task.due_date)}</span>
                  )}
                  <span className="task-title">{task.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="task-delete"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MEDIUM PRIORITY COLUMN */}
        <div className="priority-card priority-medium">
          <div className="card-header">
            <div className="priority-label">
              <div className="priority-dot" />
              <span>Kerjakan Menyusul</span>
            </div>
            <span className="task-badge">{mediumTasks.length}</span>
          </div>

          <div className="quick-input-wrapper">
            <input 
              type="text"
              placeholder="Tambah tugas menyusul..."
              value={inputMedium}
              onChange={(e) => setInputMedium(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask(inputMedium, 'medium', setInputMedium)}
              className="quick-input"
            />
            <button 
              onClick={() => handleAddTask(inputMedium, 'medium', setInputMedium)}
              className="quick-add-btn"
              title="Tambah Tugas"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="task-list">
            {mediumTasks.length === 0 ? (
              <div className="empty-state">Tidak ada tugas menyusul.</div>
            ) : (
              mediumTasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <button 
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="task-toggle"
                  >
                    {task.completed ? (
                      <CheckCircle className="icon-checked" size={18} />
                    ) : (
                      <Circle className="icon-unchecked" size={18} />
                    )}
                  </button>
                  {activeTab === 'upcoming' && (
                    <span className="task-date-tag">{formatTaskDate(task.due_date)}</span>
                  )}
                  {activeTab === 'today' && task.due_date !== todayStr && (
                    <span className="task-date-tag warning">{getDaysRemainingLabel(task.due_date)}</span>
                  )}
                  <span className="task-title">{task.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="task-delete"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LOW PRIORITY COLUMN */}
        <div className="priority-card priority-low">
          <div className="card-header">
            <div className="priority-label">
              <div className="priority-dot" />
              <span>Lain-lain / Santai</span>
            </div>
            <span className="task-badge">{lowTasks.length}</span>
          </div>

          <div className="quick-input-wrapper">
            <input 
              type="text"
              placeholder="Tambah tugas santai..."
              value={inputLow}
              onChange={(e) => setInputLow(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask(inputLow, 'low', setInputLow)}
              className="quick-input"
            />
            <button 
              onClick={() => handleAddTask(inputLow, 'low', setInputLow)}
              className="quick-add-btn"
              title="Tambah Tugas"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="task-list">
            {lowTasks.length === 0 ? (
              <div className="empty-state">Tidak ada tugas santai.</div>
            ) : (
              lowTasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <button 
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className="task-toggle"
                  >
                    {task.completed ? (
                      <CheckCircle className="icon-checked" size={18} />
                    ) : (
                      <Circle className="icon-unchecked" size={18} />
                    )}
                  </button>
                  {activeTab === 'upcoming' && (
                    <span className="task-date-tag">{formatTaskDate(task.due_date)}</span>
                  )}
                  {activeTab === 'today' && task.due_date !== todayStr && (
                    <span className="task-date-tag warning">{getDaysRemainingLabel(task.due_date)}</span>
                  )}
                  <span className="task-title">{task.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="task-delete"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <p>Sederhana &bull; Cepat &bull; PWA</p>
      </footer>
    </div>
  );
}
