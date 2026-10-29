/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  validatePlanInput,
  validateAssistantInput,
  validateGeneratedAiPlan,
} from './src/logic/validationEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Trust first proxy hop when deployed behind reverse proxy / Cloud Run
app.set('trust proxy', 1);

// Request body size limit (512kb prevents denial-of-service via huge payloads)
app.use(express.json({ limit: '512kb' }));

// Comprehensive Security Headers Middleware (WCAG AAA & OWASP Compliant)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'self';"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

// Tiered Sliding-Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 */
function createRateLimiter(options: { maxRequests: number; windowMs: number; message: string }) {
  const map = new Map<string, RateLimitRecord>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of map.entries()) {
      if (now > record.resetAt) {
        map.delete(ip);
      }
    }
  }, Math.max(options.windowMs * 2, 60000)).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    const current = map.get(ip);
    if (!current || now > current.resetAt) {
      map.set(ip, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (current.count >= options.maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: options.message });
    }

    current.count++;
    next();
  };
}

const generalApiLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000,
  message: 'Rate limit exceeded. Please wait a moment before sending more requests.',
});

const planApiLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  message: 'AI generation rate limit reached (max 10 plans/min). Please try again shortly.',
});

app.use('/api', generalApiLimiter);

// Initialize Google Gemini SDK
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Google GenAI initialization warning:', err);
  }
}

/**
 * Route: POST /api/plan
 * Generates an editable, structured event plan using Gemini AI with schema validation and sanitization
 */
app.post('/api/plan', planApiLimiter, async (req: Request, res: Response) => {
  // Step 1: Strict input schema validation & sanitization
  const validation = validatePlanInput(req.body);
  if (!validation.isValid || !validation.sanitized) {
    return res.status(400).json({
      error: 'Invalid event planning request parameters.',
      details: validation.errors,
    });
  }

  const {
    name,
    category,
    date,
    city,
    expectedAttendance,
    totalBudget,
    currency,
    venueType,
    styleTheme,
    dietary,
    accessibility,
    constraints,
  } = validation.sanitized;

  if (!ai || !apiKey) {
    return res.status(503).json({
      error: 'AI service unavailable. Using deterministic planning module.',
    });
  }

  try {
    const prompt = `You are CelebraAI's Senior Event Architect. Generate a realistic, detailed event plan for:
Event: ${name}
Category: ${category}
Date: ${date}
Location: ${city}
Attendance: ${expectedAttendance} guests
Budget: ${currency} ${totalBudget}
Venue preference: ${venueType}
Theme/Aesthetic: ${styleTheme}
Dietary preferences: ${dietary || 'None specified'}
Accessibility: ${accessibility || 'Standard'}
Constraints: ${constraints || 'Standard operating hours'}

Return a structured JSON with:
1. theme: { name, description, primaryColor, accentColor, secondaryColor, aestheticNotes: [] }
2. expenses: array of { id, category ('venue'|'catering'|'decoration'|'photography'|'entertainment'|'equipment'|'transport'|'staff'|'contingency'), description, quantity, unitCost, subtotal, confirmedAmount, status ('planned'|'contracted') }
3. layoutObjects: array of { id, type ('stage'|'round_table'|'buffet_station'|'arch_entrance'|'lounge_set'|'speaker_tower'|'canopy_tent'), name, zone ('indoor'|'outdoor'), position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1], capacity, status: 'operational' }
4. tasks: array of { id, title, description, category, assignedRole, startDate, dueDate, priority ('low'|'medium'|'high'|'critical'), status ('todo'|'in_progress'|'completed'), dependencies: [], estimatedCost }
5. vendors: array of { id, name, category, contactPerson, quotedPrice, capacityLimit, bookingStatus ('suggested'), isDemoEntity: true, cancellationTerms, notes, affectedTaskIds: [] }
6. schedule: array of { id, startTime, endTime, title, zone ('indoor'|'outdoor'), leadRole, description, isWeatherDependent: boolean }

Ensure total expenses do not exceed ${totalBudget}, and reserve at least 10% contingency reserve.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'Failed to parse AI-generated plan structure. Falling back to deterministic plan.',
      });
    }

    // Step 2: Validate AI response schema to guard against hallucinations, negative costs, or overflow
    const aiValidation = validateGeneratedAiPlan(rawParsed, totalBudget);
    if (!aiValidation.isValid || !aiValidation.sanitizedPlan) {
      console.warn('AI generated plan failed structural constraints:', aiValidation.errors);
      return res.status(502).json({
        error: 'AI output did not satisfy safety and budget constraints.',
        details: aiValidation.errors,
      });
    }

    return res.json(aiValidation.sanitizedPlan);
  } catch (err: unknown) {
    console.error('Gemini plan generation error:', err);
    return res.status(500).json({ error: 'Event plan generation failed. Using deterministic fallback.' });
  }
});

/**
 * Route: POST /api/assistant
 * Evaluates contextual questions grounded in actual event data with input validation
 */
app.post('/api/assistant', async (req: Request, res: Response) => {
  const validation = validateAssistantInput(req.body);
  if (!validation.isValid || !validation.sanitized) {
    return res.status(400).json({
      error: 'Invalid assistant prompt parameters.',
      details: validation.errors,
    });
  }

  const { prompt, context } = validation.sanitized;

  if (!ai || !apiKey) {
    return res.status(503).json({
      error: 'AI service unavailable',
      reply: 'AI service offline. Using deterministic strategist fallback.',
    });
  }

  try {
    const systemInstruction = `You are CelebraAI's In-Workspace Event Strategist. 
You provide concrete, professional, and mathematically sound operational advice for event organizers.
Always ground your answers in the event's actual metrics:
- Event: ${context.eventName}
- Headcount: ${context.expectedAttendance}
- Budget: Total ${context.totalBudget}, Planned ${context.plannedSpend}, Remaining Reserve ${context.contingencyReserve}
- Over-Budget: ${context.isOverBudget}
- Tasks: ${context.taskCount}
- Active Crisis: ${context.activeCrisis || 'None'}

Provide concise, highly actionable advice. Do not output conversational fluff or markdown tables. Use INR (₹) formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || 'No response generated.';
    return res.json({ reply });
  } catch (err: unknown) {
    console.error('Gemini assistant error:', err);
    return res.status(500).json({ error: 'Assistant request failed.' });
  }
});

// Global error handler for uncaught express errors (prevents stack traces from leaking)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: string }).type === 'entity.too.large'
  ) {
    return res.status(413).json({ error: 'Payload too large. Maximum size is 512KB.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

// Mount Vite middleware for dev or serve built assets in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.basename(__dirname) === 'dist' ? __dirname : path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CelebraAI Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
