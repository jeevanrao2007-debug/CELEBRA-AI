/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EventCategory = 'wedding' | 'birthday' | 'college_fest' | 'community' | 'corporate';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface EventTheme {
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
  aestheticNotes: string[];
}

export type ExpenseCategory =
  | 'venue'
  | 'catering'
  | 'decoration'
  | 'photography'
  | 'entertainment'
  | 'equipment'
  | 'transport'
  | 'staff'
  | 'contingency';

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  description: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  confirmedAmount: number;
  status: 'planned' | 'contracted' | 'paid' | 'disputed';
  notes?: string;
  relatedVendorId?: string;
}

export interface BudgetSummary {
  currency: CurrencyCode;
  totalBudget: number;
  plannedExpenditure: number;
  confirmedExpenditure: number;
  remainingBudget: number;
  contingencyReserve: number;
  utilizationPercentage: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  categoryAllocations: Record<ExpenseCategory, {
    allocated: number;
    spent: number;
    percentage: number;
  }>;
}

export type LayoutObjectType =
  | 'stage'
  | 'round_table'
  | 'buffet_station'
  | 'arch_entrance'
  | 'lounge_set'
  | 'speaker_tower'
  | 'seating_row'
  | 'canopy_tent';

export interface LayoutObject {
  id: string;
  type: LayoutObjectType;
  name: string;
  zone: 'indoor' | 'outdoor';
  position: [number, number, number]; // [x, y, z] in meters
  rotation: [number, number, number]; // [rx, ry, rz] in radians
  scale: [number, number, number];
  capacity: number; // guest capacity enabled by this object
  status: 'operational' | 'flooded' | 'damaged' | 'relocated';
  notes?: string;
}

export interface VenueZone {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  maxCapacity: number;
  width: number; // in meters
  length: number; // in meters
  usable: boolean;
  notes?: string;
}

export interface VenueDetails {
  name: string;
  totalIndoorCapacity: number;
  totalOutdoorCapacity: number;
  indoorWidth: number;
  indoorLength: number;
  outdoorWidth: number;
  outdoorLength: number;
  hasBackupPower: boolean;
  weatherCovered: boolean;
  zones: VenueZone[];
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';

export type TaskPhase = 'planning_3m' | 'planning_1m' | 'final_week' | 'event_day';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  phase?: TaskPhase;
  assignedRole: string;
  assignedPerson?: string;
  startDate: string; // ISO date YYYY-MM-DD
  dueDate: string; // ISO date YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: string[]; // task IDs that must be completed first
  estimatedCost: number;
  relatedVendorId?: string;
  isAffectedByCrisis?: boolean;
}

export interface TaskDelayImpact {
  sourceTaskId: string;
  delayHours: number;
  affectedTaskIds: string[];
  scheduleRisk: 'minor' | 'moderate' | 'critical';
  mitigationStrategy: string;
}

export interface SavingsOpportunity {
  id: string;
  title: string;
  category: ExpenseCategory;
  potentialSavings: number;
  description: string;
  tradeOff: string;
  impactLevel: 'low' | 'medium' | 'high';
  actionType: 'reduce_scope' | 'switch_vendor' | 'seasonal_swap' | 'digital_alternative';
}

export interface AssistantProposedAction {
  id: string;
  title: string;
  description: string;
  actionType?: 'reduce_budget_line' | 'shift_schedule' | 'swap_vendor_tier' | 'add_contingency' | string;
  type?: 'add_expense' | 'modify_expense' | 'adjust_budget' | 'add_task';
  impactSummary?: string;
  applied?: boolean;
  payload?: {
    expense?: Partial<ExpenseItem>;
    newTotalBudget?: number;
    task?: Partial<Task>;
    deltaMinutes?: number;
    contingencyAddAmount?: number;
  };
}

export type VendorStatus = 'suggested' | 'user_entered' | 'contacted' | 'confirmed' | 'cancelled';

export interface Vendor {
  id: string;
  name: string;
  category: ExpenseCategory;
  contactPerson: string;
  phone?: string;
  email?: string;
  quotedPrice: number;
  capacityLimit: number; // max guest capacity they can cater/handle
  bookingStatus: VendorStatus;
  isDemoEntity: boolean; // clearly identifies fictional demo data
  cancellationTerms: string;
  notes: string;
  affectedTaskIds: string[];
}

export interface ScheduleItem {
  id: string;
  startTime: string; // "10:00 AM"
  endTime: string;   // "11:30 AM"
  title: string;
  zone: 'indoor' | 'outdoor';
  leadRole: string;
  description: string;
  isWeatherDependent: boolean;
}

export type IncidentType =
  | 'heavy_rain'
  | 'caterer_cancellation'
  | 'attendance_surge'
  | 'budget_cut'
  | 'sound_equipment_failure'
  | 'staging_delay_cascade';

export interface IncidentScenario {
  id: IncidentType;
  title: string;
  category: 'weather' | 'vendor' | 'guest' | 'financial' | 'equipment' | 'timeline';
  defaultSeverity: 'minor' | 'moderate' | 'severe' | 'critical';
  description: string;
  realisticContext: string;
}

export interface FeasibilityCheckItem {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RecoveryPlanProposal {
  id: string;
  title: string;
  strategy: string;
  description: string;
  costDelta: number; // incremental cost in INR (can be positive or negative savings)
  revisedTotalBudget: number;
  scheduleImpact: string;
  affectedTasksSummary: string[];
  vendorActionSummary: string[];
  layoutChangesSummary: string[];
  unresolvedRisks: string[];
  isFeasible: boolean;
  feasibilityChecks: FeasibilityCheckItem[];
  tradeOffSummary: string;
  layoutMutations?: {
    removeObjectIds?: string[];
    relocateObjects?: Array<{ id: string; zone: 'indoor' | 'outdoor'; position: [number, number, number] }>;
    addObjectList?: LayoutObject[];
  };
  budgetMutations?: Array<{
    category: ExpenseCategory;
    description: string;
    amount: number;
  }>;
  taskMutations?: Array<{
    id: string;
    newStatus?: TaskStatus;
    newDueDate?: string;
    action: 'add' | 'modify' | 'delay';
    newTask?: Task;
  }>;
  vendorMutations?: Array<{
    vendorId: string;
    newStatus: VendorStatus;
    substituteVendor?: Vendor;
  }>;
}

export interface IncidentImpactReport {
  incidentType: IncidentType;
  timestamp: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  affectedZones: string[];
  capacityDelta: number;
  affectedVendorIds: string[];
  affectedTaskIds: string[];
  budgetRiskAmount: number;
  criticalScheduleConflicts: string[];
  summary: string;
}

export interface EventVersionSnapshot {
  versionId: string;
  versionNumber: number;
  timestamp: string;
  changeDescription: string;
  author: string;
  budgetSummary: BudgetSummary;
  expenses: ExpenseItem[];
  layoutObjects: LayoutObject[];
  tasks: Task[];
  vendors: Vendor[];
  schedule: ScheduleItem[];
  activeCrisisDescription?: string;
}

export interface EventVersionSummary {
  versionId: string;
  versionNumber: number;
  timestamp: string;
  changeDescription: string;
  totalBudget: number;
  totalExpenses: number;
  taskCompletionCount: number;
  totalTasks: number;
}

export interface EventData {
  id: string;
  name: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  city: string;
  expectedAttendance: number;
  currency: CurrencyCode;
  totalBudget: number;
  styleTheme: string;
  dietaryPreferences: string[];
  accessibilityRequirements: string[];
  specialConstraints: string;
  
  theme: EventTheme;
  venue: VenueDetails;
  layoutObjects: LayoutObject[];
  expenses: ExpenseItem[];
  tasks: Task[];
  vendors: Vendor[];
  schedule: ScheduleItem[];
  
  currentVersionNumber: number;
  versions: EventVersionSnapshot[];
  
  activeIncidentReport?: IncidentImpactReport;
  candidateRecoveryPlans?: RecoveryPlanProposal[];
}
