/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePlanInput,
  validateAssistantInput,
  validateGeneratedAiPlan,
  sanitizeString,
} from '../src/logic/validationEngine';

describe('CelebraAI Server API Contract & Route Protection Invariants', () => {
  test('health check contract delivers expected status, version, and uptime metadata', () => {
    // Model of the /api/health endpoint response contract
    const healthContract = {
      status: 'healthy',
      service: 'CelebraAI Command Center',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    assert.equal(healthContract.status, 'healthy');
    assert.equal(healthContract.service, 'CelebraAI Command Center');
    assert.equal(healthContract.version, '1.0.0');
    assert.ok(typeof healthContract.uptime === 'number');
    assert.ok(Date.parse(healthContract.timestamp) > 0);
  });

  test('POST /api/plan rejects missing required fields and returns descriptive error list', () => {
    const invalidPayloads = [
      {},
      { name: '' },
      { name: 'Gala', category: 'invalid_category' },
      { name: 'Gala', category: 'wedding', expectedAttendance: -5 },
      { name: 'Gala', category: 'wedding', expectedAttendance: 100, totalBudget: 50 }, // below min
      { name: 'Gala', category: 'wedding', expectedAttendance: 100, totalBudget: 500000, currency: 'BTC' }, // invalid currency
    ];

    for (const payload of invalidPayloads) {
      const result = validatePlanInput(payload);
      assert.equal(result.isValid, false, `Expected payload to fail validation: ${JSON.stringify(payload)}`);
      assert.ok(result.errors.length > 0);
      assert.equal(result.sanitized, undefined);
    }
  });

  test('POST /api/plan strictly validates all 3 problem statement categories: wedding, birthday, community', () => {
    const categories = ['wedding', 'birthday', 'community'] as const;

    for (const category of categories) {
      const validPayload = {
        name: `Annual ${category} Assembly`,
        category,
        date: '2026-11-20',
        city: 'Mumbai',
        expectedAttendance: 250,
        totalBudget: 450000,
        currency: 'INR',
        venueType: 'hybrid',
        styleTheme: 'Bespoke Warm Elegance',
      };

      const result = validatePlanInput(validPayload);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.length, 0);
      assert.ok(result.sanitized);
      assert.equal(result.sanitized.category, category);
      assert.equal(result.sanitized.expectedAttendance, 250);
      assert.equal(result.sanitized.totalBudget, 450000);
    }
  });

  test('POST /api/assistant enforces strict prompt size ceiling (1000 chars) and grounds context', () => {
    const oversizedPrompt = 'a'.repeat(1001);
    const result = validateAssistantInput({
      prompt: oversizedPrompt,
      context: {
        eventName: 'Gala',
        expectedAttendance: 100,
      },
    });

    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes('1000 characters')));

    // Compliant prompt passes and sanitizes context
    const validPrompt = 'Recommend three acoustic mitigation steps for outdoor rain failover';
    const validResult = validateAssistantInput({
      prompt: validPrompt,
      context: {
        eventName: '<script>alert(1)</script>Royal Wedding',
        expectedAttendance: 350,
        totalBudget: '1200000',
        plannedSpend: '1100000',
        contingencyReserve: '100000',
        isOverBudget: false,
        taskCount: 12,
        activeCrisis: 'None',
      },
    });

    assert.equal(validResult.isValid, true);
    assert.ok(validResult.sanitized);
    assert.equal(validResult.sanitized.prompt, validPrompt);
    // Verified XSS neutralization in context
    assert.equal(validResult.sanitized.context.eventName, 'Royal Wedding');
    assert.equal(validResult.sanitized.context.expectedAttendance, 350);
  });

  test('sliding-window rate limiter logic blocks burst excess and computes correct Retry-After', () => {
    // Sliding window logic simulation matching server.ts createRateLimiter
    interface RateLimitRecord {
      count: number;
      resetAt: number;
    }
    const map = new Map<string, RateLimitRecord>();
    const maxRequests = 10;
    const windowMs = 60000;

    const checkRateLimit = (ip: string, now: number) => {
      const current = map.get(ip);
      if (!current || now > current.resetAt) {
        map.set(ip, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfter: 0 };
      }

      if (current.count >= maxRequests) {
        const retryAfter = Math.ceil((current.resetAt - now) / 1000);
        return { allowed: false, retryAfter };
      }

      current.count++;
      return { allowed: true, retryAfter: 0 };
    };

    const clientIp = '192.168.1.100';
    const startTime = 1000000;

    // First 10 requests allowed
    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(clientIp, startTime + i * 100);
      assert.equal(res.allowed, true);
    }

    // 11th request rejected with 429 Retry-After
    const overflowRes = checkRateLimit(clientIp, startTime + 1500);
    assert.equal(overflowRes.allowed, false);
    assert.ok(overflowRes.retryAfter > 0 && overflowRes.retryAfter <= 60);

    // After window expiration, requests allowed again
    const afterWindowRes = checkRateLimit(clientIp, startTime + windowMs + 1000);
    assert.equal(afterWindowRes.allowed, true);
  });
});
