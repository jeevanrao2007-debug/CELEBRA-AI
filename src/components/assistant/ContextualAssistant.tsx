/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  MessageSquare,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle,
} from 'lucide-react';
import { EventData, AssistantProposedAction } from '../../types';
import { calculateBudgetSummary, formatCurrency } from '../../logic/budgetEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposedAction?: AssistantProposedAction;
}

interface ContextualAssistantProps {
  event: EventData;
  onApplyAction?: (action: AssistantProposedAction) => void;
}

export const ContextualAssistant: React.FC<ContextualAssistantProps> = ({ event, onApplyAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: `Hello! I am your CelebraAI Contextual Event Strategist. I have live access to "${event.name}" (${event.expectedAttendance} guests, ${event.expenses.length} budgeted lines, ${event.tasks.length} run-sheet tasks). Ask me about budget reallocations, vendor contingency plans, or layout advice!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sampleQuestions = [
    'Reduce catering expenditure without reducing guest count.',
    'What happens if the lead sound vendor cancels?',
    'Which tasks are at risk of being delayed?',
    'How much contingency reserve remains?',
  ];

  const handleSend = async (userPrompt?: string) => {
    const promptToSend = userPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const budget = calculateBudgetSummary(event.totalBudget, event.expenses, event.currency);
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          context: {
            eventName: event.name,
            expectedAttendance: event.expectedAttendance,
            totalBudget: event.totalBudget,
            plannedSpend: budget.plannedExpenditure,
            contingencyReserve: budget.remainingBudget,
            isOverBudget: budget.isOverBudget,
            taskCount: event.tasks.length,
            vendorCount: event.vendors.length,
            activeCrisis: event.activeIncidentReport?.incidentType,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Server response was not ok');
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Deterministic Local Strategy Fallback if server/API unavailable
      let reply = '';
      let proposedAction: AssistantProposedAction | undefined = undefined;
      const promptLower = promptToSend.toLowerCase();

      if (promptLower.includes('catering') || promptLower.includes('food')) {
        reply = `For ${event.expectedAttendance} guests, your catering spend is currently configured at ~₹65,000 (130/pax). To trim expenditure without cutting headcount: switch from a multi-course plated dinner to a curated live buffet station (e.g. Biryani & Pasta bars), reduce non-seasonal dessert variety from 5 items to 2 high-volume favorites, and source table beverages in bulk dispensers rather than individual bottles. This yields an estimated 15-20% savings (₹10,000–₹13,000) while preserving guest satisfaction.`;
        proposedAction = {
          id: `act_${Date.now()}`,
          title: 'Apply 15% Catering Optimization',
          description: 'Reduce catering unit costs by switching to live buffet counters and saving ~₹10,000.',
          actionType: 'reduce_budget_line',
          impactSummary: 'Reduces planned spend, transferring ~₹10,000 directly into your contingency reserve.',
          applied: false,
        };
      } else if (promptLower.includes('vendor') || promptLower.includes('cancel') || promptLower.includes('sound')) {
        reply = `If your sound or equipment vendor cancels: CelebraAI maintains verified standby partner options in the Crisis Simulator. Activating the "Emergency Audio Hot-Swap" protocol mobilizes a twin-amplifier backup package from the city warehouse within 45 minutes for ~₹14,000, fully absorbable by your current contingency reserve (₹${(event.totalBudget - event.expenses.reduce((s, e) => s + e.subtotal, 0)).toLocaleString('en-IN')}).`;
      } else if (promptLower.includes('reserve') || promptLower.includes('budget') || promptLower.includes('contingency')) {
        const spent = event.expenses.reduce((s, e) => s + e.subtotal, 0);
        const reserve = event.totalBudget - spent;
        reply = `Your approved total budget is ₹${event.totalBudget.toLocaleString('en-IN')}. Committed expenses total ₹${spent.toLocaleString('en-IN')}, leaving an unallocated contingency reserve of ₹${reserve.toLocaleString('en-IN')} (${Math.round((reserve / event.totalBudget) * 100)}%). This reserve is healthy for absorbing moderate disruptions.`;
        proposedAction = {
          id: `act_${Date.now()}`,
          title: 'Top Up Contingency Buffer (+₹25,000)',
          description: 'Increase authorized overall budget cap by ₹25,000 for emergency buffer absorption.',
          actionType: 'add_contingency',
          impactSummary: 'Increases available reserve without modifying existing vendor commitments.',
          applied: false,
        };
      } else if (promptLower.includes('delay') || promptLower.includes('task') || promptLower.includes('risk')) {
        const blocked = event.tasks.filter((t) => t.status === 'blocked' || t.dependencies.length > 0);
        reply = `In your run-sheet, key critical path items include "${event.tasks[1]?.title || 'Stage Rigging'}" and "${event.tasks[2]?.title || 'Sound Check'}". Because sound calibration has a hard dependency on stage truss completion, any inspection hold-up cascades into performer rehearsals. Parallelizing green-room mic tuning prevents downstream curtain-rise delays.`;
      } else {
        reply = `Based on your event parameters (${event.expectedAttendance} attendees, ${event.layoutObjects.length} 3D venue elements, and ${event.tasks.length} run-sheet tasks), all systems are balanced. To stress-test your resilience, visit the Crisis Simulator tab to test how the plan withstands heavy rain or sudden capacity surges.`;
      }

      const assistantMsg: Message = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: reply,
        proposedAction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right, non-intrusive) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open CelebraAI Strategist assistant drawer"
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-[#0D3B2E] text-white rounded-full shadow-lg hover:bg-[#165342] transition-transform duration-200 hover:scale-105 flex items-center gap-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D3B2E]/50"
        >
          <Sparkles className="w-4 h-4 text-[#C59B27]" />
          <span>CelebraAI Strategist</span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          role="region"
          aria-label="CelebraAI Strategist Assistant Panel"
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[92vw] h-[520px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-[rgba(26,29,32,0.12)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#0D3B2E] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C59B27]" />
              <div>
                <div className="text-xs font-bold">CelebraAI Strategist</div>
                <div className="text-[10px] text-white/70">Contextual Event AI Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close strategist assistant panel"
              className="text-white/80 hover:text-white p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#FAF8F5] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#0D3B2E] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#C59B27]" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3 rounded-xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#0D3B2E] text-white rounded-tr-none'
                      : 'bg-white text-[#181B1E] border border-[rgba(26,29,32,0.08)] rounded-tl-none shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Proposed Action Button if available */}
                  {m.proposedAction && onApplyAction && (
                    <div className="mt-2.5 pt-2 border-t border-[rgba(26,29,32,0.08)] space-y-1.5">
                      <div className="text-[10px] font-semibold text-[#0D3B2E]">
                        Action: {m.proposedAction.title}
                      </div>
                      <button
                        onClick={() => {
                          if (!m.proposedAction!.applied) {
                            onApplyAction(m.proposedAction!);
                            setMessages((prev) =>
                              prev.map((msg) =>
                                msg.id === m.id && msg.proposedAction
                                  ? {
                                      ...msg,
                                      proposedAction: { ...msg.proposedAction, applied: true },
                                    }
                                  : msg
                              )
                            );
                          }
                        }}
                        disabled={m.proposedAction.applied}
                        className={`px-2.5 py-1 text-[10px] rounded-md font-semibold transition-colors ${
                          m.proposedAction.applied
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-[#0D3B2E] text-white hover:bg-[#165342] cursor-pointer'
                        }`}
                      >
                        {m.proposedAction.applied ? '✓ Applied to Event' : 'Apply Recommendation'}
                      </button>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-white/60' : 'text-[#7D858D]'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#7D858D] p-2">
                <Bot className="w-3.5 h-3.5 animate-spin text-[#0D3B2E]" />
                <span>Evaluating event parameters...</span>
              </div>
            )}
          </div>

          {/* Sample Prompts Pills */}
          <div className="p-2 bg-white border-t border-[rgba(26,29,32,0.06)] overflow-x-auto flex gap-1.5 whitespace-nowrap">
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-[10px] bg-[#FAF8F5] hover:bg-[#EBF4F0] text-[#4A5056] hover:text-[#0D3B2E] border border-[rgba(26,29,32,0.08)] px-2.5 py-1 rounded-md transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-[rgba(26,29,32,0.08)] flex items-center gap-2">
            <input
              type="text"
              aria-label="Ask a question about this event"
              placeholder="Ask anything about this event..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-2 bg-[#FAF8F5] border border-[rgba(26,29,32,0.12)] rounded-lg text-xs focus:outline-none focus:border-[#0D3B2E]"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              aria-label="Send message to strategist"
              className="p-2 bg-[#0D3B2E] text-white rounded-lg hover:bg-[#165342] transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#0D3B2E]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
