import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyState, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { matchesOnDate, taskStats } from '../../lib/deskFilters';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskItem, type TaskPriority, type TaskStatus } from '../../types';

export default function TasksScreen() {
  const { data, saveTask, session } = useStore();
  const [query, setQuery] = useState('');
  const [onDate, setOnDate] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [dueDate, setDueDate] = useState(ymd(new Date()));
  const [assignedTo, setAssignedTo] = useState(session?.name ?? '');
  const [relatedTo, setRelatedTo] = useState('');
  const [error, setError] = useState('');

  const names = Array.from(new Set([session?.name, ...data.executives.map((person) => person.name)].filter(Boolean))) as string[];
  const rows = data.tasks.filter((task) => {
    if (!matchesOnDate(task.dueDate, onDate)) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${task.title} ${task.assignedTo} ${task.relatedTo ?? ''}`.toLowerCase().includes(needle);
  });
  const stats = taskStats(data.tasks, ymd(new Date()));

  function startCreate() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setStatus('Pending');
    setDueDate(ymd(new Date()));
    setAssignedTo(session?.name ?? names[0] ?? '');
    setRelatedTo('');
    setError('');
    setOpen(true);
  }

  function startEdit(task: TaskItem) {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.dueDate);
    setAssignedTo(task.assignedTo);
    setRelatedTo(task.relatedTo ?? '');
    setError('');
    setOpen(true);
  }

  return (
    <Screen>
      <PageHeader title="Tasks" subtitle={`${stats.open} open · ${stats.dueToday} due today · ${stats.overdue} overdue`} back />
      <View style={{ padding: 20, gap: 12 }}>
        <Button label="New task" onPress={startCreate} />
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search tasks" />
        <Field label="Due date" value={onDate} onChangeText={setOnDate} placeholder="YYYY-MM-DD, optional" />
        {rows.length === 0 ? <EmptyState title="No tasks" body="Add a task when a quotation, confirmation, or review needs a due date." /> : null}
        {rows.map((task) => (
          <Card key={task.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{task.title}</Text>
              <Pill label={task.status} />
            </View>
            <Text style={{ fontFamily: fonts.regular, color: colors.ink, marginTop: 6 }}>{task.description}</Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 8 }}>
              {task.priority} · due {task.dueDate} · {task.assignedTo}
              {task.relatedTo ? ` · ${task.relatedTo}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => startEdit(task)} style={chip}><Text style={chipText}>Edit</Text></Pressable>
              {task.status !== 'Completed' ? (
                <Pressable onPress={() => void saveTask({ ...task, status: 'Completed' }, false)} style={chip}>
                  <Text style={chipText}>Mark complete</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}
        {open ? (
          <Card>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>{editing ? 'Edit task' : 'New task'}</Text>
            <Field label="Title *" value={title} onChangeText={setTitle} placeholder="Send quotation to corporate client" />
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Action items and expected outcome" multiline />
            <ChoiceRow label="Priority" options={TASK_PRIORITIES} value={priority} onChange={setPriority} />
            <ChoiceRow label="Status" options={TASK_STATUSES} value={status} onChange={setStatus} />
            <Field label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
            <ChoiceRow label="Assigned to" options={names.length ? names : ['Unassigned']} value={assignedTo || names[0] || 'Unassigned'} onChange={setAssignedTo} />
            <Field label="Related to" value={relatedTo} onChangeText={setRelatedTo} placeholder="Customer, lead, or booking" />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label={editing ? 'Save task' : 'Create task'}
              onPress={async () => {
                if (!title.trim()) {
                  setError('Title is required.');
                  return;
                }
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
                  setError('Use date YYYY-MM-DD.');
                  return;
                }
                const row: TaskItem = {
                  id: editing?.id ?? makeId('T'),
                  title: title.trim(),
                  description: description.trim(),
                  priority,
                  status,
                  dueDate,
                  assignedTo: assignedTo || session?.name || 'Unassigned',
                  assignedToId: data.executives.find((person) => person.name === assignedTo)?.id ?? session?.id,
                  relatedTo: relatedTo.trim() || undefined,
                  syncState: 'local',
                };
                await saveTask(row, !editing);
                setOpen(false);
              }}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const chip = { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 };
const chipText = { fontFamily: fonts.semibold, color: colors.ink };
