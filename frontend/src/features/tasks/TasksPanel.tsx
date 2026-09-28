import { useRef, useState } from 'react';
import { TaskForm } from './TaskForm';
import { TaskRow } from './TaskRow';
import { useTasksApi } from './tasks.api';
import type { TaskDraft, TaskRecord } from './task.types';

export function TasksPanel({
  dayId,
  initialTasks,
}: {
  dayId: string;
  initialTasks: TaskRecord[];
}) {
  const api = useTasksApi();
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAdd = () =>
    requestAnimationFrame(() => addButton.current?.focus());
  async function create(input: TaskDraft, signal: AbortSignal) {
    const saved = await api.create(
      dayId,
      { title: input.title, description: input.description },
      signal,
    );
    if (!signal.aborted) {
      setTasks((current) => [...current, saved]);
      setAdding(false);
      setNotice('Görev eklendi.');
      focusAdd();
    }
  }
  return (
    <section className="day-content" aria-labelledby="tasks-heading">
      <div className="tasks-heading">
        <h2 id="tasks-heading">Görevler</h2>
        <button
          ref={addButton}
          className="primary-button"
          disabled={adding}
          onClick={() => {
            setNotice('');
            setAdding(true);
          }}
        >
          Görev ekle
        </button>
      </div>
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      {adding && (
        <TaskForm
          initial={{ title: '', description: '', status: 'TODO' }}
          onSave={create}
          onCancel={() => {
            setAdding(false);
            focusAdd();
          }}
        />
      )}
      {tasks.length ? (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              announce={setNotice}
              onChange={(saved) =>
                setTasks((current) =>
                  current.map((item) => (item.id === saved.id ? saved : item)),
                )
              }
              onDelete={(id) => {
                setTasks((current) => current.filter((item) => item.id !== id));
                focusAdd();
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="muted">
          Bu güne bağlı görev bulunmuyor. İlk görevini ekleyerek
          başlayabilirsin.
        </p>
      )}
    </section>
  );
}
