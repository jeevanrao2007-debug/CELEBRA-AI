/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeString,
  validatePlanInput,
  validateAssistantInput,
  validateGeneratedAiPlan,
} from '../src/logic/validationEngine';

describe('CelebraAI Security Hardening & Injection Defense Suite', () => {
  test('sanitizeString strips script tags, html elements, event handlers, and null bytes', () => {
    // Script tag with payload
    const scriptPayload = '<script>alert("XSS")</script>Celebration Party';
    assert.equal(sanitizeString(scriptPayload), 'Celebration Party');

    // Case-insensitive script tag
    const mixedCaseScript = '<sCrIpt src="https://evil.com/payload.js"></scRipt>Grand Gala';
    assert.equal(sanitizeString(mixedCaseScript), 'Grand Gala');

    // HTML tag with onerror vector
    const onerrorPayload = '<img src="invalid.png" onerror="alert(document.cookie)">Wedding Reception';
    assert.equal(sanitizeString(onerrorPayload), 'Wedding Reception');

    // Javascript pseudo-protocol
    const jsProtocol = 'javascript:stealCredentials()Annual Meet';
    assert.equal(sanitizeString(jsProtocol), 'stealCredentials()Annual Meet');

    // Null byte injection
    const nullByte = 'Sanitized\0String\0Test';
    assert.equal(sanitizeString(nullByte), 'SanitizedStringTest');

    // Length clamping
    const longString = 'a'.repeat(300);
    assert.equal(sanitizeString(longString, 50).length, 50);
  });

  test('validatePlanInput neutralizes script injection in event name and theme fields', () => {
    const maliciousInput = {
      name: '<script>fetch("evil.com")</script>Tech Summit 2026',
      category: 'college_fest',
      date: '2026-11-20',
      city: '<b onmouseover="alert(1)">Bengaluru</b>',
      expectedAttendance: 2500,
      totalBudget: 500000,
      currency: 'INR',
      venueType: 'indoor',
      styleTheme: '<img src=x onerror=alert(1)>Neon Cyberpunk',
      dietary: '<script>alert(1)</script>Strictly vegetarian',
    };

    const result = validatePlanInput(maliciousInput);
    assert.equal(result.isValid, true);
    assert.ok(result.sanitized);

    // Assert that dangerous tags were completely stripped
    assert.equal(result.sanitized.name, 'Tech Summit 2026');
    assert.equal(result.sanitized.city, 'Bengaluru');
    assert.equal(result.sanitized.styleTheme, 'Neon Cyberpunk');
    assert.equal(result.sanitized.dietary, 'Strictly vegetarian');
  });

  test('validatePlanInput strictly rejects negative, NaN, and extreme overflow budgets', () => {
    // Negative budget
    const negBudget = validatePlanInput({
      name: 'Valid Name',
      category: 'wedding',
      expectedAttendance: 100,
      totalBudget: -50000,
      currency: 'INR',
    });
    assert.equal(negBudget.isValid, false);
    assert.ok(negBudget.errors.some((e) => e.includes('Total budget must be a positive number')));

    // Extreme integer overflow (exceeds 100,000,000)
    const overflowBudget = validatePlanInput({
      name: 'Valid Name',
      category: 'wedding',
      expectedAttendance: 100,
      totalBudget: 999999999999,
      currency: 'INR',
    });
    assert.equal(overflowBudget.isValid, false);

    // Negative attendance
    const negAttendance = validatePlanInput({
      name: 'Valid Name',
      category: 'wedding',
      expectedAttendance: -50,
      totalBudget: 100000,
      currency: 'INR',
    });
    assert.equal(negAttendance.isValid, false);
  });

  test('validateGeneratedAiPlan sanitizes negative unit costs and script tags in AI outputs', () => {
    const rawAiOutput = {
      expenses: [
        {
          id: 'exp_1',
          category: 'catering',
          description: '<script>alert("hacked")</script>Gourmet Buffet',
          quantity: 2,
          unitCost: 1500,
          status: 'planned',
        },
        {
          id: 'exp_2',
          category: 'venue',
          description: 'Security Deposit',
          quantity: 1,
          unitCost: -500, // Negative cost injection attempt
          status: 'planned',
        },
      ],
      layoutObjects: [
        {
          id: 'obj_1',
          name: '<img src=x onerror=alert(1)>Main Stage',
          type: 'stage',
          capacity: 50,
        },
      ],
      tasks: [
        {
          id: 'task_1',
          title: '<script>evil()</script>Setup sound board',
          description: 'Stage audio configuration',
        },
      ],
    };

    const result = validateGeneratedAiPlan(rawAiOutput, 100000);
    assert.equal(result.isValid, true);
    assert.ok(result.sanitizedPlan);

    // Catering description sanitized
    assert.equal(result.sanitizedPlan.expenses[0].description, 'Gourmet Buffet');

    // Negative unit cost floored to 0
    assert.equal(result.sanitizedPlan.expenses[1].unitCost, 0);
    assert.equal(result.sanitizedPlan.expenses[1].subtotal, 0);

    // Layout object name sanitized
    assert.equal(result.sanitizedPlan.layoutObjects[0].name, 'Main Stage');

    // Task title sanitized
    assert.equal(result.sanitizedPlan.tasks[0].title, 'Setup sound board');
  });
});

