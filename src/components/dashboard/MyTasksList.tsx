import { useState, type ChangeEvent } from 'react';
import CleaningTaskBadge from './CleaningTaskBadge';
import { completeTask, uploadTaskCompletionPhoto, isTaskVisible, type TaskRecord } from '../../lib/supabase';

interface Props {
  tasks: TaskRecord[];
  onChanged: () => void;
  /** Extra class appended to the outer .machine-section — lets a caller
   *  (e.g. the manager dashboard) give this card the same visual weight
   *  as another .machine-section card via an existing CSS modifier,
   *  without this component knowing which one. */
  className?: string;
}

// "המשימות שלי" — a self-contained assigned-to-me task list with inline
// completion (notes + optional photo), shared between the My Tasks page
// and the manager dashboard's My Tasks section so both use one completion
// flow instead of two copies of the same state/handlers. Callers pass in
// whichever tasks belong to the current user; this component only ever
// applies the completed-tasks-hide-after-3-days visibility rule on top.
export default function MyTasksList({ tasks, onChanged, className }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState<string | null>(null);

  const visibleTasks = tasks.filter(isTaskVisible);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    setPhoto(e.target.files?.[0] ?? null);
  }

  async function handleComplete(taskId: string, isCleaningTask: boolean) {
    setActionError(null);
    setCompletionSuccess(null);
    setSaving(true);

    let photoUrl: string | null = null;
    if (photo) {
      const { url, error: uploadError } = await uploadTaskCompletionPhoto(photo);
      if (uploadError) {
        setSaving(false);
        setActionError(uploadError);
        return;
      }
      photoUrl = url;
    }

    const { error } = await completeTask(taskId, notes, photoUrl);
    setSaving(false);
    if (error) {
      setActionError(error);
    } else {
      setCompletingId(null);
      setNotes('');
      setPhoto(null);
      setCompletionSuccess(
        isCleaningTask ? 'המשימה הושלמה — המכונה סומנה כנוקתה.' : 'המשימה הושלמה.'
      );
      onChanged();
    }
  }

  return (
    <div className={`machine-section${className ? ` ${className}` : ''}`}>
      <div className="machine-section__header">
        <span className="machine-section__title">המשימות שלי</span>
        <span className="machine-section__count">{visibleTasks.length} משימות</span>
      </div>

      {actionError && (
        <div className="alert-banner">
          <span className="alert-banner__dot" />
          {actionError}
        </div>
      )}

      {completionSuccess && <p className="employee-form__success">{completionSuccess}</p>}

      {visibleTasks.length === 0 ? (
        <p className="employee-empty">עדיין לא הוקצו לכם משימות.</p>
      ) : (
        <table className="machine-table">
          <thead>
            <tr>
              <th>כותרת</th>
              <th>מכונה</th>
              <th>יעד</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map(task => (
              <tr key={task.id}>
                <td>
                  <div className="machine-name">{task.title}</div>
                  {task.taskType === 'cleaning' && <CleaningTaskBadge />}
                  {task.description && <div className="machine-location">{task.description}</div>}
                </td>
                <td>{task.machineName ?? '—'}</td>
                <td>{task.dueDate ?? '—'}</td>
                <td>
                  <span className={`status-badge status-badge--${task.status === 'completed' ? 'clean' : 'maintenance'}`}>
                    <span className="status-badge__dot" />
                    {task.status === 'completed' ? 'הושלם' : 'ממתין'}
                  </span>
                  {task.completionNotes && <div className="machine-location">הערות: {task.completionNotes}</div>}
                  {task.completionPhotoUrl && (
                    <a href={task.completionPhotoUrl} target="_blank" rel="noreferrer">
                      <img src={task.completionPhotoUrl} alt="תיעוד השלמה" className="employee-avatar" />
                    </a>
                  )}
                </td>
                <td>
                  {task.status === 'pending' && (
                    completingId === task.id ? (
                      <div className="table-actions">
                        <input
                          className="employee-form__input"
                          placeholder="הערות השלמה (אופציונלי)"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="employee-form__input"
                          onChange={handlePhotoChange}
                        />
                        <button
                          className="btn-mark-clean"
                          disabled={saving}
                          onClick={() => handleComplete(task.id, task.taskType === 'cleaning')}
                        >
                          {saving ? 'שומר…' : 'אישור'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-mark-clean"
                        onClick={() => {
                          setCompletingId(task.id);
                          setNotes('');
                          setPhoto(null);
                          setCompletionSuccess(null);
                        }}
                      >
                        סמן כהושלם
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
