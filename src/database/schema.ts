/**
 * SQLite Database Schema Definition for SAS-AEIT
 * Implements relational constraints, foreign keys, indexes, and audit table
 */

export const CREATE_TABLES_SQL = `
-- 1. Categories Table
CREATE TABLE IF NOT EXISTS Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

-- 2. SubCategories Table
CREATE TABLE IF NOT EXISTS SubCategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

-- 3. SystemLogs (Audit Trail Table)
CREATE TABLE IF NOT EXISTS SystemLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'EDIT', 'DELETE', 'STATUS_TOGGLE')),
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  details_json TEXT NOT NULL
);

-- 4. Incomes Table
CREATE TABLE IF NOT EXISTS Incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount_bdt REAL NOT NULL CHECK(amount_bdt >= 0),
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('DIRECT', 'INVESTMENT', 'PROPERTY')),
  source_id INTEGER,
  remarks TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES SubCategories(id)
);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS Expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount_bdt REAL NOT NULL CHECK(amount_bdt >= 0),
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER NOT NULL,
  expense_type TEXT NOT NULL CHECK(expense_type IN ('DIRECT', 'INVESTMENT', 'PROPERTY', 'VEHICLE')),
  reference_id INTEGER,
  remarks TEXT,
  is_recurring INTEGER DEFAULT 0 CHECK(is_recurring IN (0, 1)),
  recurrence_frequency TEXT CHECK(recurrence_frequency IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
  recurrence_end_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES SubCategories(id)
);

-- 6. Investments Table
CREATE TABLE IF NOT EXISTS Investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('STOCK', 'SAVINGS_CERTIFICATE', 'FDR', 'LAND')),
  details_json TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);

-- 7. Properties Table
CREATE TABLE IF NOT EXISTS Properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  land_measurement TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  cost_price REAL NOT NULL,
  development_cost REAL NOT NULL DEFAULT 0,
  survey_type TEXT NOT NULL,
  location_json TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);

-- 8. Vehicles Table
CREATE TABLE IF NOT EXISTS Vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('CAR', 'MOTORCYCLE', 'MICROBUS', 'OTHERS')),
  manufacturer TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  reg_year INTEGER NOT NULL,
  reg_no TEXT NOT NULL UNIQUE,
  current_odometer REAL NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TEXT NOT NULL
);

-- 9. FuelLogs Table
CREATE TABLE IF NOT EXISTS FuelLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  expense_id INTEGER,
  fuel_type TEXT NOT NULL,
  unit_quantity REAL NOT NULL,
  unit_type TEXT NOT NULL CHECK(unit_type IN ('LITRE', 'KG')),
  odometer_reading REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES Vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_id) REFERENCES Expenses(id) ON DELETE SET NULL
);

-- 10. SavingsGoals Table
CREATE TABLE IF NOT EXISTS SavingsGoals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  target_amount_bdt REAL NOT NULL CHECK(target_amount_bdt > 0),
  current_amount_bdt REAL NOT NULL DEFAULT 0 CHECK(current_amount_bdt >= 0),
  target_date TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS', 'ACHIEVED', 'ON_HOLD')),
  linked_investment_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (linked_investment_id) REFERENCES Investments(id) ON DELETE SET NULL
);

-- 11. BudgetLimits Table
CREATE TABLE IF NOT EXISTS BudgetLimits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL UNIQUE,
  monthly_limit_bdt REAL NOT NULL CHECK(monthly_limit_bdt > 0),
  alert_threshold_pct INTEGER NOT NULL DEFAULT 85,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

-- 12. RecurringExpenses Table
CREATE TABLE IF NOT EXISTS RecurringExpenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER,
  title TEXT NOT NULL,
  amount_bdt REAL NOT NULL CHECK(amount_bdt > 0),
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER NOT NULL,
  expense_type TEXT NOT NULL DEFAULT 'DIRECT',
  reference_id INTEGER,
  frequency TEXT NOT NULL CHECK(frequency IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (category_id) REFERENCES Categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES SubCategories(id),
  FOREIGN KEY (expense_id) REFERENCES Expenses(id) ON DELETE SET NULL
);

-- Performance & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON Expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON Expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON Incomes(date);
CREATE INDEX IF NOT EXISTS idx_subcats_cat ON SubCategories(category_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_time ON SystemLogs(timestamp);
CREATE INDEX IF NOT EXISTS idx_savings_goals_status ON SavingsGoals(status);
CREATE INDEX IF NOT EXISTS idx_budget_limits_cat ON BudgetLimits(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON RecurringExpenses(is_active);
`;
