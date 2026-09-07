import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import CleaningTaskBadge from '../components/dashboard/CleaningTaskBadge';
import MyTasksList from '../components/dashboard/MyTasksList';
import { type Machine, type CleaningStatus, getMachineStatus } from '../types/machine';
import { useAuth } from '../context/AuthContext';
import { getMachines, getTasks, isTaskVisible, type TaskRecord } from '../lib/supabase';
import '../styles/layout.css';
import '../styles/dashboard.css';

const FALLBACK_USER = {
  name: '',
  role: 'employee' as const,
};

type PageStatus = 'loading' | 'error' | 'ready';

// Accordion header title only — deliberately without the word "מכונות"
// (the count sits right next to it as a plain number), unlike the card
// labels below which keep their full "מכונות ..." text.
const STATUS_ACCORDION_TITLE: Record<CleaningStatus, string> = {
  clean: 'נקיות',
  due_soon: 'דורשות ניקוי',
  overdue: 'לנקות דחוף',
};

export default function Dashboard() {
  const { session, profile, loading } = useAuth();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  // Which of the 3 cleaning-status cards' accordion is open, if any —
  // clicking the already-active card closes it (see toggleStatusFilter).
  const [activeStatus, setActiveStatus] = useState<CleaningStatus | null>(null);
  // Which category the accordion is positioned under / showing content
  // for. Kept separate from activeStatus (and never reset to null) so
  // closing collapses it in place at the same grid column instead of
  // jumping elsewhere first — see toggleStatusFilter.
  const [displayedStatus, setDisplayedStatus] = useState<CleaningStatus | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    const [machinesRes, tasksRes] = await Promise.all([getMachines(), getTasks()]);
    if (machinesRes.error || tasksRes.error) {
      setStatus('error');
      return;
    }
    setMachines(machinesRes.machines);
    setTasks(tasksRes.tasks);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (loading) return;
    load();
  }, [loading, session, load]);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(isTaskVisible).filter(t => t.dueDate === today);
  // "המשימות שלי" — tasks assigned to whoever is logged in, filtered here
  // (not left to RLS) so this stays correct for a manager too: a manager's
  // getTasks() returns every task in the system, not just their own.
  const myTasks = tasks.filter(t => t.assignedToId === profile?.id);

  // Reuses getMachineStatus() — the single source of truth for the
  // cleaning-status thresholds — for both these counts and the accordion's
  // machine list below, so nothing here duplicates that logic.
  const machinesByStatus: Record<CleaningStatus, Machine[]> = {
    clean: machines.filter(m => getMachineStatus(m).status === 'clean'),
    due_soon: machines.filter(m => getMachineStatus(m).status === 'due_soon'),
    overdue: machines.filter(m => getMachineStatus(m).status === 'overdue'),
  };

  function toggleStatusFilter(clickedStatus: CleaningStatus) {
    setActiveStatus(prev => (prev === clickedStatus ? null : clickedStatus));
    setDisplayedStatus(clickedStatus);
  }

  const isAccordionOpen = activeStatus !== null && activeStatus === displayedStatus;

  return (
    <DashboardLayout title="ראשי" currentUser={FALLBACK_USER}>
      <div className="dashboard-page dashboard-overview-page">
        <div className="page-header">
          <img
            src="/logos/oboost-logo-transparent.png"
            alt="OBoost"
            className="page-header__logo"
          />
        </div>

        {status === 'loading' && (
          <p className="employee-empty">טוען סקירה…</p>
        )}

        {status === 'error' && (
          <div className="alert-banner">
            <span className="alert-banner__dot" />
            לא ניתן היה לטעון את הסקירה. אנא נסו שוב.
          </div>
        )}

        {status === 'ready' && (
          <>
            <div style={{ marginBottom: 28 }}>
              <MyTasksList tasks={myTasks} onChanged={load} className="today-tasks-section" />
            </div>

            {machines.length > 0 && (
              <div className="status-cards-grid" style={{ marginBottom: 28 }}>
                <StatCard
                  size="lg"
                  label="מכונות נקיות"
                  value={machinesByStatus.clean.length}
                  iconSrc="/icons/clean-up.png"
                  iconAlt=""
                  onClick={() => toggleStatusFilter('clean')}
                  expanded={activeStatus === 'clean'}
                  gridArea="clean"
                />
                <StatCard
                  size="lg"
                  label="מכונות שדורשות ניקוי"
                  value={machinesByStatus.due_soon.length}
                  iconSrc="/icons/broom.png"
                  iconAlt=""
                  onClick={() => toggleStatusFilter('due_soon')}
                  expanded={activeStatus === 'due_soon'}
                  gridArea="due_soon"
                />
                <StatCard
                  size="lg"
                  label="מכונות לנקות דחוף"
                  value={machinesByStatus.overdue.length}
                  iconSrc="/icons/urgent-cleaning.jpg"
                  iconAlt=""
                  onClick={() => toggleStatusFilter('overdue')}
                  expanded={activeStatus === 'overdue'}
                  gridArea="overdue"
                />

                {/* Shared accordion — one element, positioned via gridArea
                    onto the same column as whichever card it belongs to
                    (see .status-cards-grid's grid-template-areas), so it
                    always renders directly under that one card only, never
                    as a full-width row. Mounted once the first card is
                    ever clicked and never unmounted again, so every later
                    open/close (including collapsing back down) animates
                    smoothly via the same .collapsible__body mechanism used
                    everywhere else in the app. */}
                {displayedStatus && (
                  <div
                    className={`machine-section status-accordion${isAccordionOpen ? ' status-accordion--open' : ''}`}
                    style={{ gridArea: `acc-${displayedStatus}` }}
                  >
                    <div className={`collapsible__body${isAccordionOpen ? ' collapsible__body--open' : ''}`}>
                      <div className="collapsible__body-inner">
                        <div className="machine-section__header">
                          <span className="machine-section__title">{STATUS_ACCORDION_TITLE[displayedStatus]}</span>
                          <span className="machine-section__count">{machinesByStatus[displayedStatus].length}</span>
                        </div>
                        {machinesByStatus[displayedStatus].length === 0 ? (
                          <p className="employee-empty">אין מכונות בקטגוריה זו.</p>
                        ) : (
                          <ul className="status-machine-list">
                            {machinesByStatus[displayedStatus].map(m => (
                              <li key={m.id} className="status-machine-list__row machine-name">
                                {m.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="machine-section today-tasks-compact">
              <div className="machine-section__header">
                <span className="machine-section__title">המשימות להיום</span>
              </div>
              {todayTasks.length === 0 ? (
                <p className="employee-empty">אין משימות שנקבעו להיום.</p>
              ) : (
                <>
                  {/* Desktop: unchanged full table. Hidden on mobile — see
                      .today-tasks-table in dashboard.css. */}
                  <table className="machine-table today-tasks-table">
                    <thead>
                      <tr>
                        <th>כותרת</th>
                        <th>מוקצה ל</th>
                        <th>מכונה</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayTasks.map(task => (
                        <tr key={task.id}>
                          <td>
                            <div className="machine-name">{task.title}</div>
                            {task.taskType === 'cleaning' && <CleaningTaskBadge />}
                            {task.description && <div className="machine-location">{task.description}</div>}
                          </td>
                          <td>{task.assignedToName}</td>
                          <td>{task.machineName ?? '—'}</td>
                          <td>
                            <span className={`status-badge status-badge--${task.status === 'completed' ? 'clean' : 'maintenance'}`}>
                              <span className="status-badge__dot" />
                              {task.status === 'completed' ? 'הושלם' : 'ממתין'}
                            </span>
                            {task.completionNotes && <div className="machine-location">הערות: {task.completionNotes}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile: compact 1-2 line rows — title + status on one
                      line, assignee/machine as small muted meta on the
                      next, instead of the generic "every field its own
                      row" table-to-cards fallback. Hidden on desktop, where
                      the table above is shown instead. */}
                  <ul className="today-tasks-list">
                    {todayTasks.map(task => (
                      <li key={task.id} className="today-tasks-list__row">
                        <div className="today-tasks-list__top">
                          <span className="today-tasks-list__title">{task.title}</span>
                          <span className={`status-badge status-badge--${task.status === 'completed' ? 'clean' : 'maintenance'}`}>
                            <span className="status-badge__dot" />
                            {task.status === 'completed' ? 'הושלם' : 'ממתין'}
                          </span>
                        </div>
                        <div className="today-tasks-list__meta">
                          {task.taskType === 'cleaning' && <CleaningTaskBadge />}
                          <span>{task.assignedToName}</span>
                          {task.machineName && <span>· {task.machineName}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
