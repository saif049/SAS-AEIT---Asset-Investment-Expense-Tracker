/**
 * SAS-AEIT Database Schema & Domain Types
 * Matches SQLite relational tables for Expo & SQLite engine
 */

export type CategoryType = 'INCOME' | 'EXPENSE';
export type AuditAction = 'CREATE' | 'EDIT' | 'DELETE' | 'STATUS_TOGGLE';
export type IncomeSourceType = 'DIRECT' | 'INVESTMENT' | 'PROPERTY';
export type ExpenseType = 'DIRECT' | 'INVESTMENT' | 'PROPERTY' | 'VEHICLE';
export type InvestmentType = 'STOCK' | 'SAVINGS_CERTIFICATE' | 'FDR' | 'LAND';
export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'MICROBUS' | 'OTHERS';
export type FuelUnitType = 'LITRE' | 'KG';
export type FuelType = 'OCTANE' | 'PETROL' | 'DIESEL' | 'CNG' | 'LPG' | 'ELECTRIC';

// 1. Core & Audit Tables
export interface Category {
  id: number;
  type: CategoryType;
  name: string;
  is_active: number; // 1 | 0
}

export interface SubCategory {
  id: number;
  category_id: number;
  name: string;
  is_active: number; // 1 | 0
}

export interface SystemLog {
  id: number;
  timestamp: string; // ISO 8601 string
  action: AuditAction;
  entity_type: string; // 'EXPENSE' | 'INCOME' | 'CATEGORY' | 'SUBCATEGORY' | 'INVESTMENT' | 'PROPERTY' | 'VEHICLE' | 'FUELLOG'
  entity_id: number;
  details_json: string; // Serialized JSON of changed payload
}

// 2. Transaction Records
export interface Income {
  id: number;
  date: string; // YYYY-MM-DD
  amount_bdt: number;
  category_id: number;
  subcategory_id: number;
  source_type: IncomeSourceType;
  source_id?: number | null; // Optional reference ID for Investment or Property
  remarks?: string | null;
  created_at: string;
}

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Expense {
  id: number;
  date: string; // YYYY-MM-DD
  amount_bdt: number;
  category_id: number;
  subcategory_id: number;
  expense_type: ExpenseType;
  reference_id?: number | null; // Optional reference ID for Investment, Property, or Vehicle
  remarks?: string | null;
  is_recurring?: number; // 0 = one-time, 1 = recurring
  recurrence_frequency?: RecurrenceFrequency | null; // 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  recurrence_end_date?: string | null; // YYYY-MM-DD or null/indefinite
  created_at: string;
}

export interface RecurringExpense {
  id: number;
  expense_id?: number | null;
  title: string;
  amount_bdt: number;
  category_id: number;
  subcategory_id: number;
  expense_type: ExpenseType;
  reference_id?: number | null;
  frequency: RecurrenceFrequency;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  is_active: number; // 1 = active, 0 = paused/ended
  remarks?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EnrichedRecurringExpense extends RecurringExpense {
  category_name: string;
  subcategory_name: string;
  next_due_date?: string;
}

// 3. Asset & Specialty Modules
export interface Investment {
  id: number;
  type: InvestmentType;
  details_json: string; // Stocks: { bo_id, company, units, buy_price, current_price }; FDR: { bank, instrument_no, maturity_date, interest_rate, principal }; Land: { mouza, size_katha, value }
  remarks?: string | null;
  created_at: string;
}

// 4. Savings Goals & Financial Targets
export type SavingsGoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type SavingsGoalStatus = 'IN_PROGRESS' | 'ACHIEVED' | 'ON_HOLD';

export interface SavingsGoal {
  id: number;
  title: string;
  target_amount_bdt: number;
  current_amount_bdt: number;
  target_date: string; // YYYY-MM-DD
  priority: SavingsGoalPriority;
  status: SavingsGoalStatus;
  linked_investment_id?: number | null; // Optional link to specific investment account
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedSavingsGoal extends SavingsGoal {
  linked_investment_type?: InvestmentType;
  linked_investment_title?: string;
  linked_investment_value?: number;
  percentage_completed: number;
  remaining_bdt: number;
  days_remaining: number;
  monthly_savings_needed: number;
}

// 5. Monthly Budget Planner & Limits
export interface BudgetLimit {
  id: number;
  category_id: number;
  monthly_limit_bdt: number;
  alert_threshold_pct: number; // e.g. 85 (warn at 85%), default 85%
  updated_at: string;
}

export interface CategoryBudgetComparison {
  category_id: number;
  category_name: string;
  monthly_limit_bdt: number;
  actual_spent_bdt: number;
  variance_bdt: number; // monthly_limit_bdt - actual_spent_bdt
  percentage_consumed: number; // (actual_spent_bdt / monthly_limit_bdt) * 100
  status: 'OK' | 'WARNING' | 'OVERSPENT' | 'UNBUDGETED';
}

export interface PropertyLocation {
  mouza: string;
  dag: string;
  khatian: string;
  division: string;
  district: string;
  upazila: string;
}

export interface Property {
  id: number;
  type: string; // Residential, Commercial, Agricultural, Industrial
  sub_type: string; // Apartment, Plot, Office Space, Warehouse
  land_measurement: string; // Katha, Decimal, Bigha, SqFt
  owner_type: string; // Individual, Joint, Inherited, Leased
  cost_price: number;
  development_cost: number;
  survey_type: string; // CS, SA, RS, BS, City Survey
  location_json: string; // Serialized PropertyLocation
  remarks?: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  type: VehicleType;
  manufacturer: string;
  brand: string;
  model: string;
  reg_year: number;
  reg_no: string;
  current_odometer: number;
  remarks?: string | null;
  created_at: string;
}

export interface FuelLog {
  id: number;
  vehicle_id: number;
  expense_id?: number | null;
  fuel_type: FuelType;
  unit_quantity: number;
  unit_type: FuelUnitType;
  odometer_reading: number;
  created_at: string;
}

// UI helper interfaces with joined category/subcategory names
export interface EnrichedExpense extends Expense {
  category_name?: string;
  subcategory_name?: string;
}

export interface EnrichedIncome extends Income {
  category_name?: string;
  subcategory_name?: string;
}
