/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  User,
  GitFork,
  Edit2,
} from 'lucide-react';
import { EventData, Task, TaskStatus, TaskDelayImpact } from '../../types';
import {
  canCompleteTask,
  getOverdueTasks,
  getTaskStats,
  calculateDelayCascade,
} from '../../logic/taskEngine';
import { DelayCascadePanel } from './DelayCascadePanel';
import { TaskEditModal } from './TaskEditModal';
import { AddTaskModal } from './AddTaskModal';

interface TimelineViewProps {
  event: EventData;
  onUpdateTasks: (newTasks: Task[]) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ event, onUpdateTasks }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delay Cascade Simulator State
  const [showCascadeSimulator, setShowCascadeSimulator] = useState(false);
  const [simulatedTaskId, setSimulatedTaskId] = useState<string>(event.tasks[0]?.id || '');
  const [simulatedDelayHours, setSimulatedDelayHours] = useState<number>(2);
  const [mitigationNotice, setMitigationNotice] = useState<string | null>(null);

  const cascadeImpact: TaskDelayImpact | null =
    showCascadeSimulator && simulatedTaskId
      ? calculateDelayCascade(simulatedTaskId, simulatedDelayHours, event.tasks)
      : null;

  const handleApplyMitigation = () => {
    if (!cascadeImpact) return;
    const updated = event.tasks.map((t) => {
      if (cascadeImpact.affectedTaskIds.includes(t.id)) {
        return {
          ...t,
          description: t.description.includes('[Mitigation:')
            ? t.description
            : `${t.description} [Mitigation: Parallel staging buffer applied]`,
        };
      }
      return t;
    });
    onUpdateTasks(updated);
    setMitigationNotice(
      `Mitigation applied: Buffers deployed across ${cascadeImpact.affectedTaskIds.length} downstream tasks.`
    );
    setTimeout(() => setMitigationNotice(null), 5000);
  };

  const handleSaveEdit = (updatedTask: Task) => {
    const updated = event.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    onUpdateTasks(updated);
    setEditingTask(null);
  };

  const handleAddTask = (newTask: Task) => {
    onUpdateTasks([...event.tasks, newTask]);
    setShowAddModal(false);
  };

  const taskStats = getTaskStats(event.tasks);
  const overdueTasks = getOverdueTasks(event.tasks);

  const filteredTasks = event.tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleToggleTaskStatus = (task: Task) => {
    setDependencyWarning(null);

    if (task.status === 'completed') {
      // Revert to in_progress
      const updated = event.tasks.map((t) =>
        t.id === task.id ? { ...t, status: 'in_progress' as TaskStatus } : t
      );
      onUpdateTasks(updated);
      return;
    }

    // Check prerequisites!
    const check = canCompleteTask(task.id, event.tasks);
    if (!check.canComplete) {
      setDependencyWarning(
        `Cannot complete "${task.title}": ${check.reason}`
      );
      return;
    }

    const updated = event.tasks.map((t) =>
      t.id === task.id ? { ...t, status: 'completed' as TaskStatus } : t
    );
    onUpdateTasks(updated);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleDeleteTask = (id: string) => {
    onUpdateTasks(event.tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Dependency Warning Notification */}
      {dependencyWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-medium">{dependencyWarning}</span>
          </div>
          <button
            onClick={() => setDependencyWarning(null)}
            className="text-amber-800 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Task Progress & Operational Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Total Tasks</div>
          <div className="text-2xl font-bold text-[#181B1E] tabular-nums">{taskStats.total}</div>
          <div className="text-xs text-[#7D858D] mt-1">{taskStats.completionRate}% finished</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Completed</div>
          <div className="text-2xl font-bold text-[#0D3B2E] tabular-nums">
            {taskStats.completed}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">Verified operational sign-offs</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">In Progress</div>
          <div className="text-2xl font-bold text-blue-800 tabular-nums">{taskStats.inProgress}</div>
          <div className="text-xs text-[#7D858D] mt-1">Active site assignments</div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm">
          <div className="text-xs text-[#7D858D] font-medium mb-1">Overdue / Blocked</div>
          <div
            className={`text-2xl font-bold tabular-nums ${
              overdueTasks.length > 0 || taskStats.blocked > 0 ? 'text-red-700' : 'text-[#7D858D]'
            }`}
          >
            {overdueTasks.length + taskStats.blocked}
          </div>
          <div className="text-xs text-[#7D858D] mt-1">Prerequisite delays</div>
        </div>
      </div>

      {/* Mitigation confirmation banner */}
      {mitigationNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{mitigationNotice}</span>
          </div>
          <button
            onClick={() => setMitigationNotice(null)}
            className="text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* DELAY CASCADE SIMULATOR CONTROL PANEL */}
      {showCascadeSimulator && (
        <DelayCascadePanel
          tasks={event.tasks}
          simulatedTaskId={simulatedTaskId}
          simulatedDelayHours={simulatedDelayHours}
          cascadeImpact={cascadeImpact}
          onSelectTask={setSimulatedTaskId}
          onSelectHours={setSimulatedDelayHours}
          onApplyMitigation={handleApplyMitigation}
          onClose={() => setShowCascadeSimulator(false)}
        />
      )}

      {/* Task List Workspace */}
      <div className="bg-white rounded-xl border border-[rgba(26,29,32,0.08)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[rgba(26,29,32,0.08)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#181B1E]">Event Execution Run-Sheet</span>
            <span className="text-xs text-[#7D858D] font-mono tabular-nums">
              ({filteredTasks.length} tasks)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCascadeSimulator(!showCascadeSimulator)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                showCascadeSimulator
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#FAF8F5] text-[#4A5056] border border-[rgba(26,29,32,0.12)] hover:bg-[#EBF4F0]'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-amber-700" />
              <span>Delay Simulator</span>
            </button>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2.5 py-1.5 rounded-lg text-[#4A5056]"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] px-2.5 py-1.5 rounded-lg text-[#4A5056]"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D3B2E] text-white rounded-lg text-xs font-medium hover:bg-[#165342] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>
        </div>

        <div className="divide-y divide-[rgba(26,29,32,0.06)]">
          {filteredTasks.map((task) => {
            const hasPrerequisites = task.dependencies.length > 0;
            const prereqs = task.dependencies
              .map((id) => event.tasks.find((t) => t.id === id)?.title)
              .filter(Boolean);

            const isDirectlySimulated = showCascadeSimulator && simulatedTaskId === task.id;
            const isCascaded = cascadeImpact?.affectedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-[#FAF8F5]/60 ${
                  isDirectlySimulated
                    ? 'bg-amber-100/40 border-l-4 border-amber-600'
                    : isCascaded
                    ? 'bg-amber-50/70 border-l-4 border-amber-400'
                    : task.isAffectedByCrisis
                    ? 'bg-amber-50/50'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleTaskStatus(task)}
                    className="mt-0.5 text-[#7D858D] hover:text-[#0D3B2E] transition-colors cursor-pointer"
                    title={
                      task.status === 'completed'
                        ? 'Mark incomplete'
                        : 'Mark complete (validates dependencies)'
                    }
                    aria-label={`Toggle status for ${task.title}`}
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        task.status === 'completed'
                          ? 'text-[#0D3B2E] fill-[#0D3B2E]/10'
                          : 'text-[#D0C9BD]'
                      }`}
                    />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          task.status === 'completed'
                            ? 'line-through text-[#7D858D]'
                            : 'text-[#181B1E]'
                        }`}
                      >
                        {task.title}
                      </span>
                      {isDirectlySimulated && (
                        <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold">
                          Delay Source (+{simulatedDelayHours}h)
                        </span>
                      )}
                      {isCascaded && !isDirectlySimulated && (
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Cascaded Delay (+{simulatedDelayHours}h)
                        </span>
                      )}
                      {task.isAffectedByCrisis && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                          Crisis Impacted
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#4A5056] max-w-2xl">{task.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7D858D]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {task.assignedRole} {task.assignedPerson && `(${task.assignedPerson})`}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due {task.dueDate}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{task.category}</span>
                      {hasPrerequisites && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700">
                            Prerequisites: {prereqs.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => {
                      setSimulatedTaskId(task.id);
                      setShowCascadeSimulator(true);
                    }}
                    className="p-1 text-[#7D858D] hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                    title="Simulate delay on this task"
                    aria-label={`Simulate delay on ${task.title}`}
                  >
                    <GitFork className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleStartEdit(task)}
                    className="p-1 text-[#7D858D] hover:text-[#0D3B2E] hover:bg-[#FAF8F5] rounded transition-colors cursor-pointer"
                    title="Edit task details"
                    aria-label={`Edit ${task.title}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${
                      task.priority === 'critical'
                        ? 'bg-red-50 text-red-800'
                        : task.priority === 'high'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {task.priority}
                  </span>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800'
                        : task.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-[#7D858D] hover:text-red-700 p-1 cursor-pointer"
                    title="Remove task"
                    aria-label={`Remove ${task.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="p-8 text-center text-xs text-[#7D858D]">
              No tasks found for current filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        defaultDate={event.date}
        onAdd={handleAddTask}
        onClose={() => setShowAddModal(false)}
      />

      {/* Edit Task Modal */}
      <TaskEditModal
        task={editingTask}
        onSave={handleSaveEdit}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
};
