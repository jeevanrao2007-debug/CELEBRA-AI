/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, TaskPriority } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface AddTaskModalProps {
  isOpen: boolean;
  defaultDate: string;
  onAdd: (newTask: Task) => void;
  onClose: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  defaultDate,
  onAdd,
  onClose,
}) => {
  const trapRef = useFocusTrap({ isOpen, onClose });
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Logistics');
  const [role, setRole] = useState('Event Coordinator');
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState<TaskPriority>('medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: title.trim(),
      description: desc.trim(),
      category: category.trim() || 'Logistics',
      assignedRole: role.trim() || 'Event Coordinator',
      startDate: defaultDate,
      dueDate,
      priority,
      status: 'todo',
      dependencies: [],
      estimatedCost: 0,
    };

    onAdd(newTask);
    setTitle('');
    setDesc('');
    onClose();
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-[rgba(26,29,32,0.12)]">
        <h3 id="add-task-modal-title" className="text-base font-semibold text-[#181B1E] mb-4">
          Add Run-Sheet Task
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Task Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Master Audio FOH Sound Check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[#4A5056] font-medium mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Detailed operational steps or briefing instructions..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Assigned Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#4A5056] font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(26,29,32,0.15)] rounded-lg text-xs font-mono"
              />
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
