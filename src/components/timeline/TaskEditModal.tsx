/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Task, TaskPriority } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface TaskEditModalProps {
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  onClose: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  onSave,
  onClose,
}) => {
  const trapRef = useFocusTrap({ isOpen: Boolean(task), onClose });
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [role, setRole] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description);
      setRole(task.assignedRole);
      setDueDate(task.dueDate);
      setPriority(task.priority);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...task,
      title: title.trim(),
      description: desc.trim(),
      assignedRole: role.trim() || task.assignedRole,
      dueDate: dueDate || task.dueDate,
      priority,
    });
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-modal-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[rgba(26,29,32,0.12)]">
        <h3 id="edit-task-modal-title" className="text-base font-semibold text-[#181B1E] mb-4">
          Edit Task: {task.title}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Assigned Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs capitalize"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-medium text-[#4A5056] hover:bg-[#FAF8F5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0D3B2E] text-white rounded-lg text-xs font-medium hover:bg-[#165342] cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
