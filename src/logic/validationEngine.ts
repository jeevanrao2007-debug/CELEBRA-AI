/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurrencyCode, EventCategory, ExpenseCategory } from '../types/index.ts';

export interface PlanInput {
  name: string;
  category: EventCategory;
  date: string;
  city: string;
  expectedAttendance: number;
  totalBudget: number;
  currency: CurrencyCode;
  venueType: 'indoor' | 'outdoor' | 'hybrid';
  styleTheme: string;
  dietary?: string;
  accessibility?: string;
  constraints?: string;
}

export interface AssistantInput {
  prompt: string;
  context: {
    eventName: string;
    expectedAttendance: number;
    totalBudget: string | number;
    plannedSpend: string | number;
    contingencyReserve: string | number;
    isOverBudget: boolean;
    taskCount: number;
    activeCrisis?: string;
  };
}

const ALLOWED_CATEGORIES: EventCategory[] = ['wedding', 'birthday', 'college_fest', 'community'];
const ALLOWED_CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP'];
const ALLOWED_VENUE_TYPES = ['indoor', 'outdoor', 'hybrid'] as const;

const ALLOWED_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'venue',
  'catering',
  'decoration',
  'photography',
  'entertainment',
  'equipment',
  'transport',
  'staff',
  'contingency',
];

/**
 * Sanitizes an untrusted string by stripping HTML tags, script vectors, javascript: protocols,
 * null bytes, and malicious event handlers to guard against Stored XSS and injection.
 */
export function sanitizeString(val: unknown, maxLength = 255): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes plan generation inputs to protect against invalid ranges or injection.
 */
export function validatePlanInput(raw: any): {
  isValid: boolean;
  errors: string[];
  sanitized?: PlanInput;
} {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  // Name
  const rawName = typeof raw.name === 'string' ? raw.name : '';
  const name = sanitizeString(rawName, 120);
  if (!name) {
    errors.push('Event name is required.');
  }

  // Category
  const category = raw.category as EventCategory;
  if (!ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`Invalid event category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`);
  }

  // Attendance
  const attendance = parseInt(String(raw.expectedAttendance), 10);
  if (isNaN(attendance) || attendance < 1 || attendance > 50000) {
    errors.push('Expected attendance must be a positive integer between 1 and 50,000.');
  }

  // Budget
  const budget = parseFloat(String(raw.totalBudget));
  if (isNaN(budget) || budget < 1000 || budget > 100000000) {
    errors.push('Total budget must be a positive number between 1,000 and 100,000,000.');
  }

  // Currency
  const currency = (raw.currency || 'INR') as CurrencyCode;
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    errors.push(`Invalid currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}.`);
  }

  // Venue Type
  const venueType = (raw.venueType || 'hybrid') as 'indoor' | 'outdoor' | 'hybrid';
  if (!ALLOWED_VENUE_TYPES.includes(venueType)) {
    errors.push('Venue type must be indoor, outdoor, or hybrid.');
  }

  // Strings (Date, City, StyleTheme)
  const date = sanitizeString(typeof raw.date === 'string' ? raw.date : new Date().toISOString().split('T')[0], 30);
  const city = sanitizeString(typeof raw.city === 'string' ? raw.city : 'Main Venue', 100);
  const styleTheme = sanitizeString(typeof raw.styleTheme === 'string' ? raw.styleTheme : 'Elegant Minimalist', 150);
  const dietary = sanitizeString(raw.dietary, 200);
  const accessibility = sanitizeString(raw.accessibility, 200);
  const constraints = sanitizeString(raw.constraints, 200);

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      name,
      category,
      date,
      city,
      expectedAttendance: attendance,
      totalBudget: budget,
      currency,
      venueType,
      styleTheme,
      dietary,
      accessibility,
      constraints,
    },
  };
}

/**
 * Validates contextual assistant chat input and bounded context parameters.
 */
export function validateAssistantInput(raw: any): {
  isValid: boolean;
  errors: string[];
  sanitized?: AssistantInput;
} {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const rawPrompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
  if (!rawPrompt) {
    errors.push('Prompt string cannot be empty.');
  } else if (rawPrompt.length > 1000) {
    errors.push('Prompt length exceeds maximum limit of 1000 characters.');
  }
  const prompt = sanitizeString(rawPrompt, 1000);

  const contextRaw = raw.context || {};
  const eventName = sanitizeString(contextRaw.eventName || 'Current Event', 120);
  const expectedAttendance = Math.max(0, parseInt(String(contextRaw.expectedAttendance), 10) || 0);
  const taskCount = Math.max(0, parseInt(String(contextRaw.taskCount), 10) || 0);
  const isOverBudget = Boolean(contextRaw.isOverBudget);
  const activeCrisis = sanitizeString(contextRaw.activeCrisis || 'None', 100);

  const sanitized: AssistantInput = {
    prompt,
    context: {
      eventName,
      expectedAttendance,
      totalBudget: String(contextRaw.totalBudget || '0').slice(0, 30),
      plannedSpend: String(contextRaw.plannedSpend || '0').slice(0, 30),
      contingencyReserve: String(contextRaw.contingencyReserve || '0').slice(0, 30),
      isOverBudget,
      taskCount,
      activeCrisis,
    },
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validates untrusted AI-generated plans to prevent corrupt data, NaN amounts, negative values,
 * or over-budget proposals from contaminating event state.
 */
export function validateGeneratedAiPlan(
  plan: any,
  maxBudget: number
): {
  isValid: boolean;
  errors: string[];
  sanitizedPlan?: any;
} {
  const errors: string[] = [];

  if (!plan || typeof plan !== 'object') {
    return { isValid: false, errors: ['AI output is not a valid JSON structure.'] };
  }

  // Expenses validation
  if (!Array.isArray(plan.expenses) || plan.expenses.length === 0) {
    errors.push('AI output must include an array of expenses.');
  }

  let totalExpenseSpend = 0;
  const sanitizedExpenses: any[] = [];

  if (Array.isArray(plan.expenses)) {
    for (let i = 0; i < plan.expenses.length; i++) {
      const exp = plan.expenses[i];
      if (!exp || typeof exp !== 'object') continue;

      const category = ALLOWED_EXPENSE_CATEGORIES.includes(exp.category) ? exp.category : 'contingency';
      const description = sanitizeString(exp.description, 100) || `Expense item ${i + 1}`;
      const quantity = Math.max(1, parseInt(String(exp.quantity), 10) || 1);
      const unitCost = Math.max(0, parseFloat(String(exp.unitCost)) || 0);
      const subtotal = Math.round(quantity * unitCost);

      totalExpenseSpend += subtotal;

      sanitizedExpenses.push({
        id: typeof exp.id === 'string' && exp.id ? exp.id : `exp_ai_${i + 1}`,
        category,
        description,
        quantity,
        unitCost,
        subtotal,
        confirmedAmount: exp.status === 'contracted' ? subtotal : 0,
        status: exp.status === 'contracted' ? 'contracted' : 'planned',
      });
    }
  }

  // Guard against AI hallucinations allocating more than total budget
  if (totalExpenseSpend > maxBudget * 1.05) {
    errors.push(`AI allocated expenses (${totalExpenseSpend}) exceed maximum event budget (${maxBudget}).`);
  }

  // Layout Objects validation
  const sanitizedLayout: any[] = [];
  if (Array.isArray(plan.layoutObjects)) {
    for (let i = 0; i < plan.layoutObjects.length; i++) {
      const obj = plan.layoutObjects[i];
      if (!obj || typeof obj !== 'object') continue;

      const posX = typeof obj.position?.[0] === 'number' && !isNaN(obj.position[0]) ? obj.position[0] : 0;
      const posY = typeof obj.position?.[1] === 'number' && !isNaN(obj.position[1]) ? obj.position[1] : 0;
      const posZ = typeof obj.position?.[2] === 'number' && !isNaN(obj.position[2]) ? obj.position[2] : 0;

      sanitizedLayout.push({
        id: typeof obj.id === 'string' && obj.id ? obj.id : `obj_ai_${i + 1}`,
        type: obj.type || 'round_table',
        name: sanitizeString(obj.name, 60) || `Layout Object ${i + 1}`,
        zone: obj.zone === 'outdoor' ? 'outdoor' : 'indoor',
        position: [posX, posY, posZ],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        capacity: Math.max(0, parseInt(String(obj.capacity), 10) || 0),
        status: 'operational',
      });
    }
  }

  // Tasks validation
  const sanitizedTasks: any[] = [];
  if (Array.isArray(plan.tasks)) {
    for (let i = 0; i < plan.tasks.length; i++) {
      const t = plan.tasks[i];
      if (!t || typeof t !== 'object') continue;

      sanitizedTasks.push({
        id: typeof t.id === 'string' && t.id ? t.id : `task_ai_${i + 1}`,
        title: sanitizeString(t.title, 100) || `Task ${i + 1}`,
        description: sanitizeString(t.description, 200),
        category: sanitizeString(t.category, 50) || 'General',
        assignedRole: sanitizeString(t.assignedRole, 50) || 'Coordinator',
        startDate: typeof t.startDate === 'string' ? t.startDate : new Date().toISOString().split('T')[0],
        dueDate: typeof t.dueDate === 'string' ? t.dueDate : new Date().toISOString().split('T')[0],
        priority: ['low', 'medium', 'high', 'critical'].includes(t.priority) ? t.priority : 'medium',
        status: ['todo', 'in_progress', 'completed'].includes(t.status) ? t.status : 'todo',
        dependencies: Array.isArray(t.dependencies) ? t.dependencies.filter((d: any) => typeof d === 'string') : [],
        estimatedCost: Math.max(0, parseFloat(String(t.estimatedCost)) || 0),
      });
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedPlan: {
      ...plan,
      expenses: sanitizedExpenses,
      layoutObjects: sanitizedLayout,
      tasks: sanitizedTasks,
    },
  };
}
