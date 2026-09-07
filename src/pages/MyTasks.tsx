import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import MyTasksList from '../components/dashboard/MyTasksList';
import { useAuth } from '../context/AuthContext';
import { getTasks, type TaskRecord } from '../lib/supabase';
import '../styles/layout.css';
import '../styles/dashboard.css';

const FALLBACK_USER = { name: '', role: 'employee' as const };

type LoadStatus = 'loading' | 'error' | 'ready';

export default function MyTasks() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  const load = useCallback(async () => {
    setStatus('loading');
    const { tasks: rows, error } = await getTasks();
    if (error) {
      setStatus('error');
    } else {
      setTasks(rows);
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtered here rather than trusting the query alone: RLS already scopes
  // an employee's own getTasks() to their assigned tasks, but a manager's
  // call returns every task in the system — this keeps "My Tasks" showing
  // only the logged-in user's own tasks regardless of their role.
  const myTasks = tasks.filter(t => t.assignedToId === profile?.id);

  return (
    <DashboardLayout title="המשימות שלי" currentUser={FALLBACK_USER}>
      <div className="dashboard-page">
        <div className="page-header">
          <h2 className="page-header__title">המשימות שלי</h2>
          <p className="page-header__subtitle">עבודה שהוקצתה לכם.</p>
        </div>

        {status === 'loading' && <p className="employee-empty">טוען משימות…</p>}

        {status === 'error' && (
          <div className="alert-banner">
            <span className="alert-banner__dot" />
            לא ניתן היה לטעון את המשימות. אנא נסו שוב.
          </div>
        )}

        {status === 'ready' && <MyTasksList tasks={myTasks} onChanged={load} />}
      </div>
    </DashboardLayout>
  );
}
