/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, TaskStatus } from '../types';

/**
 * Validates whether all dependencies for a task are completed.
 * A task cannot be marked completed or ready if its prerequisites are incomplete.
 */
export function canCompleteTask(
  taskId: string,
  tasks: Task[]
): { canComplete: boolean; reason?: string; missingPrerequisites: string[] } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const targetTask = taskMap.get(taskId);

  if (!targetTask) {
    return { canComplete: false, reason: 'Task does not exist', missingPrerequisites: [] };
  }

  const missingPrerequisites: string[] = [];

  for (const depId of targetTask.dependencies) {
    const prerequisite = taskMap.get(depId);
    if (!prerequisite) {
      missingPrerequisites.push(`Unknown Task (${depId})`);
    } else if (prerequisite.status !== 'completed') {
      missingPrerequisites.push(`"${prerequisite.title}" (Status: ${prerequisite.status})`);
    }
  }

  if (missingPrerequisites.length > 0) {
    return {
      canComplete: false,
      reason: `Mandatory prerequisite tasks are not yet completed: ${missingPrerequisites.join(', ')}`,
      missingPrerequisites,
    };
  }

  return { canComplete: true, missingPrerequisites: [] };
}

/**
 * Evaluates the entire task dependency graph for circular dependencies or broken links.
 */
export function validateDependencyGraph(tasks: Task[]): {
  isValid: boolean;
  circularDependencyPaths: string[][];
  orphanedDependencies: Array<{ taskId: string; missingDepId: string }>;
} {
  const taskIds = new Set(tasks.map((t) => t.id));
  const orphanedDependencies: Array<{ taskId: string; missingDepId: string }> = [];

  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (!taskIds.has(depId)) {
        orphanedDependencies.push({ taskId: task.id, missingDepId: depId });
      }
    }
  }

  // Detect cycles using DFS
  const visited = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  tasks.forEach((t) => visited.set(t.id, 'unvisited'));

  const circularDependencyPaths: string[][] = [];
  const recursionStack: string[] = [];

  function dfs(currId: string): boolean {
    visited.set(currId, 'visiting');
    recursionStack.push(currId);

    const task = tasks.find((t) => t.id === currId);
    if (task) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) continue;
        const state = visited.get(depId);
        if (state === 'visiting') {
          const cycleStartIndex = recursionStack.indexOf(depId);
          circularDependencyPaths.push([...recursionStack.slice(cycleStartIndex), depId]);
        } else if (state === 'unvisited') {
          dfs(depId);
        }
      }
    }

    recursionStack.pop();
    visited.set(currId, 'visited');
    return false;
  }

  for (const task of tasks) {
    if (visited.get(task.id) === 'unvisited') {
      dfs(task.id);
    }
  }

  const isValid = circularDependencyPaths.length === 0 && orphanedDependencies.length === 0;
  return { isValid, circularDependencyPaths, orphanedDependencies };
}

/**
 * Identifies overdue tasks given a reference date string (YYYY-MM-DD).
 */
export function getOverdueTasks(tasks: Task[], referenceDateStr?: string): Task[] {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  refDate.setHours(23, 59, 59, 999);

  return tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const due = new Date(t.dueDate);
    return !isNaN(due.getTime()) && due < refDate;
  });
}

/**
 * Computes high-level task metrics and progress statistics.
 */
export function getTaskStats(tasks: Task[]): {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  blocked: number;
  completionRate: number;
} {
  const total = tasks.length;
  if (total === 0) {
    return { total: 0, completed: 0, inProgress: 0, todo: 0, blocked: 0, completionRate: 0 };
  }

  let completed = 0;
  let inProgress = 0;
  let todo = 0;
  let blocked = 0;

  for (const t of tasks) {
    if (t.status === 'completed') completed++;
    else if (t.status === 'in_progress') inProgress++;
    else if (t.status === 'blocked') blocked++;
    else todo++;
  }

  const completionRate = Math.round((completed / total) * 100);

  return { total, completed, inProgress, todo, blocked, completionRate };
}

/**
 * Calculates how a delay in one task propagates down the dependency chain to impact downstream activities.
 */
export function calculateDelayCascade(
  sourceTaskId: string,
  delayHours: number,
  tasks: Task[]
): import('../types').TaskDelayImpact {
  const affected = new Set<string>();
  const queue = [sourceTaskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    // Find all tasks that depend directly on currentId
    for (const t of tasks) {
      if (t.dependencies.includes(currentId) && !affected.has(t.id)) {
        affected.add(t.id);
        queue.push(t.id);
      }
    }
  }

  const affectedTaskIds = Array.from(affected);
  let scheduleRisk: 'minor' | 'moderate' | 'critical' = 'minor';
  if (delayHours >= 4 || affectedTaskIds.length >= 3) {
    scheduleRisk = 'critical';
  } else if (delayHours >= 2 || affectedTaskIds.length >= 1) {
    scheduleRisk = 'moderate';
  }

  let mitigationStrategy = 'Monitor progress closely; buffers absorb the minor variance.';
  if (scheduleRisk === 'critical') {
    mitigationStrategy = 'Parallelize independent staging workstreams and shift vocal checks into auxiliary green rooms.';
  } else if (scheduleRisk === 'moderate') {
    mitigationStrategy = 'Compress vendor sound check duration by 15 mins to maintain on-time guest curtain rise.';
  }

  return {
    sourceTaskId,
    delayHours,
    affectedTaskIds,
    scheduleRisk,
    mitigationStrategy,
  };
}

