/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  canCompleteTask,
  validateDependencyGraph,
  getOverdueTasks,
  getTaskStats,
  calculateDelayCascade,
} from '../src/logic/taskEngine';
import { Task } from '../src/types';

describe('CelebraAI Task Cascade & Multi-Branch Dependency Propagation', () => {
  const baseTask = (id: string, dependencies: string[] = []): Task => ({
    id,
    title: `Task ${id}`,
    description: `Description for ${id}`,
    category: 'Logistics',
    assignedRole: 'Lead',
    startDate: '2026-11-01',
    dueDate: '2026-11-05',
    priority: 'medium',
    status: 'todo',
    dependencies,
    estimatedCost: 1000,
  });

  test('propagates delay through diamond dependency graph without duplicating affected tasks', () => {
    // Diamond graph:
    //      A (Source)
    //     / \
    //    B   C
    //     \ /
    //      D
    const tasks: Task[] = [
      baseTask('task_A', []),
      baseTask('task_B', ['task_A']),
      baseTask('task_C', ['task_A']),
      baseTask('task_D', ['task_B', 'task_C']),
      baseTask('task_E', []), // completely independent
    ];

    const impact = calculateDelayCascade('task_A', 3, tasks);

    assert.equal(impact.sourceTaskId, 'task_A');
    assert.equal(impact.affectedTaskIds.length, 3);
    assert.ok(impact.affectedTaskIds.includes('task_B'));
    assert.ok(impact.affectedTaskIds.includes('task_C'));
    assert.ok(impact.affectedTaskIds.includes('task_D'));
    assert.ok(!impact.affectedTaskIds.includes('task_E')); // E is independent

    // 3 affected tasks triggers critical schedule risk
    assert.equal(impact.scheduleRisk, 'critical');
    assert.ok(impact.mitigationStrategy.includes('Parallelize'));
  });

  test('detects orphaned dependencies when tasks reference non-existent parent IDs', () => {
    const tasks: Task[] = [
      baseTask('task_1', ['task_ghost_missing']),
      baseTask('task_2', []),
    ];

    const graph = validateDependencyGraph(tasks);
    assert.equal(graph.isValid, false);
    assert.equal(graph.orphanedDependencies.length, 1);
    assert.equal(graph.orphanedDependencies[0].taskId, 'task_1');
    assert.equal(graph.orphanedDependencies[0].missingDepId, 'task_ghost_missing');
  });

  test('detects complex 3-node circular dependency cycle', () => {
    // A -> B -> C -> A
    const tasks: Task[] = [
      baseTask('task_A', ['task_C']),
      baseTask('task_B', ['task_A']),
      baseTask('task_C', ['task_B']),
    ];

    const graph = validateDependencyGraph(tasks);
    assert.equal(graph.isValid, false);
    assert.ok(graph.circularDependencyPaths.length > 0);
  });

  test('correctly identifies overdue tasks relative to reference date', () => {
    const tasks: Task[] = [
      { ...baseTask('t1'), dueDate: '2026-10-01', status: 'todo' }, // overdue
      { ...baseTask('t2'), dueDate: '2026-10-01', status: 'completed' }, // completed, not overdue
      { ...baseTask('t3'), dueDate: '2026-12-01', status: 'todo' }, // future, not overdue
    ];

    const overdue = getOverdueTasks(tasks, '2026-11-01');
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0].id, 't1');
  });

  test('computes accurate task completion rate across all status categories', () => {
    const tasks: Task[] = [
      { ...baseTask('t1'), status: 'completed' },
      { ...baseTask('t2'), status: 'completed' },
      { ...baseTask('t3'), status: 'in_progress' },
      { ...baseTask('t4'), status: 'todo' },
    ];

    const stats = getTaskStats(tasks);
    assert.equal(stats.total, 4);
    assert.equal(stats.completed, 2);
    assert.equal(stats.inProgress, 1);
    assert.equal(stats.todo, 1);
    assert.equal(stats.completionRate, 50);
  });

  test('canCompleteTask allows independent tasks without dependencies to complete immediately', () => {
    const tasks: Task[] = [baseTask('independent_task', [])];
    const check = canCompleteTask('independent_task', tasks);
    assert.equal(check.canComplete, true);
    assert.equal(check.missingPrerequisites.length, 0);
  });

  test('canCompleteTask handles non-existent task ID gracefully', () => {
    const tasks: Task[] = [baseTask('task_existing', [])];
    const check = canCompleteTask('task_non_existent', tasks);
    assert.equal(check.canComplete, false);
    assert.equal(check.reason, 'Task does not exist');
  });
});
