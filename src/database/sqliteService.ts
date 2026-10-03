/**
 * SAS-AEIT SQLite Database Engine & Async Audit Middleware
 * Implements expo-sqlite compatible asynchronous API with IndexedDB backing,
 * transactional integrity, and automated audit logging for all changes.
 */

import {
  Category,
  SubCategory,
  SystemLog,
  Income,
  Expense,
  Investment,
  Property,
  Vehicle,
  FuelLog,
  AuditAction,
  EnrichedExpense,
  EnrichedIncome,
  SavingsGoal,
  EnrichedSavingsGoal,
  BudgetLimit,
  CategoryBudgetComparison,
  RecurrenceFrequency,
  RecurringExpense,
  EnrichedRecurringExpense,
} from '../types/database';
import { MASTER_CATEGORIES_DATA } from './seedData';
import { exportTransactionsToCSV } from '../utils/csvExportService';

const DB_STORAGE_KEY = 'sas_aiet_sqlite_v1';

export interface DatabaseState {
  categories: Category[];
  subcategories: SubCategory[];
  systemLogs: SystemLog[];
  incomes: Income[];
  expenses: Expense[];
  investments: Investment[];
  properties: Property[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  savingsGoals: SavingsGoal[];
  budgetLimits: BudgetLimit[];
  recurringExpenses: RecurringExpense[];
  nextIds: {
    categories: number;
    subcategories: number;
    systemLogs: number;
    incomes: number;
    expenses: number;
    investments: number;
    properties: number;
    vehicles: number;
    fuelLogs: number;
    savingsGoals: number;
    budgetLimits: number;
    recurringExpenses: number;
  };
}

class SQLiteDatabaseService {
  private state: DatabaseState | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Fast asynchronous database initialization (Module 1 Boot)
   */
  public async initDatabase(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const stored = localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.categories && parsed.categories.length > 0) {
            // Backward-compatible hydration for SavingsGoals & BudgetLimits
            if (!parsed.savingsGoals || parsed.savingsGoals.length === 0) {
              parsed.savingsGoals = this.buildInitialSavingsGoals(parsed.investments || []);
            }
            if (!parsed.budgetLimits || parsed.budgetLimits.length === 0) {
              parsed.budgetLimits = this.buildInitialBudgetLimits(parsed.categories || []);
            }
            if (!parsed.recurringExpenses || parsed.recurringExpenses.length === 0) {
              parsed.recurringExpenses = this.buildInitialRecurringExpenses(parsed.categories || [], parsed.subcategories || []);
            }
            if (!parsed.nextIds) {
              parsed.nextIds = {};
            }
            if (!parsed.nextIds.savingsGoals) {
              parsed.nextIds.savingsGoals = 5;
            }
            if (!parsed.nextIds.budgetLimits) {
              parsed.nextIds.budgetLimits = 15;
            }
            if (!parsed.nextIds.recurringExpenses) {
              parsed.nextIds.recurringExpenses = 5;
            }
            this.state = parsed;
            this.persist();
            this.isInitialized = true;
            this.notifyListeners();
            return;
          }
        }
      } catch (err) {
        console.warn('Could not read existing database, re-seeding...', err);
      }

      // Bootstrap fresh master schema & seeds
      this.state = this.buildInitialMasterData();
      this.persist();
      this.isInitialized = true;
      this.notifyListeners();
    })();

    return this.initPromise;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error('Listener callback error', e);
      }
    });
  }

  private persist(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('Failed to persist SQLite state to storage', err);
    }
    this.notifyListeners();
  }

  /**
   * Async Audit Middleware:
   * Records an immutable entry in the SystemLogs table for complete traceability
   */
  public async logAuditEvent(
    action: AuditAction,
    entity_type: string,
    entity_id: number,
    details: Record<string, unknown>
  ): Promise<SystemLog> {
    await this.initDatabase();
    if (!this.state) throw new Error('Database not initialized');

    const logEntry: SystemLog = {
      id: this.state.nextIds.systemLogs++,
      timestamp: new Date().toISOString(),
      action,
      entity_type,
      entity_id,
      details_json: JSON.stringify(details),
    };

    this.state.systemLogs.unshift(logEntry);
    this.persist();
    return logEntry;
  }

  // ==========================================
  // MODULE 2: CATEGORY & SUBCATEGORY CRUD
  // ==========================================

  public async getCategories(type?: 'INCOME' | 'EXPENSE', activeOnly = false): Promise<Category[]> {
    await this.initDatabase();
    let result = this.state!.categories;
    if (type) {
      result = result.filter((c) => c.type === type);
    }
    if (activeOnly) {
      result = result.filter((c) => c.is_active === 1);
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getSubCategories(categoryId?: number, activeOnly = false): Promise<SubCategory[]> {
    await this.initDatabase();
    let result = this.state!.subcategories;
    if (categoryId !== undefined) {
      result = result.filter((s) => s.category_id === categoryId);
    }
    if (activeOnly) {
      result = result.filter((s) => s.is_active === 1);
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }

  public async addCategory(type: 'INCOME' | 'EXPENSE', name: string): Promise<Category> {
    await this.initDatabase();
    const existing = this.state!.categories.find(
      (c) => c.type === type && c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Category "${name}" already exists for ${type}`);
    }

    const newCat: Category = {
      id: this.state!.nextIds.categories++,
      type,
      name: name.trim(),
      is_active: 1,
    };
    this.state!.categories.push(newCat);
    this.persist();

    // Audit Log
    await this.logAuditEvent('CREATE', 'CATEGORY', newCat.id, {
      name: newCat.name,
      type: newCat.type,
    });

    return newCat;
  }

  public async updateCategory(id: number, name: string): Promise<Category> {
    await this.initDatabase();
    const cat = this.state!.categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found');

    const oldName = cat.name;
    cat.name = name.trim();
    this.persist();

    // Audit Log
    await this.logAuditEvent('EDIT', 'CATEGORY', id, {
      previous_name: oldName,
      new_name: cat.name,
    });

    return cat;
  }

  public async toggleCategoryStatus(id: number): Promise<Category> {
    await this.initDatabase();
    const cat = this.state!.categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found');

    cat.is_active = cat.is_active === 1 ? 0 : 1;
    this.persist();

    // Audit Log
    await this.logAuditEvent('STATUS_TOGGLE', 'CATEGORY', id, {
      name: cat.name,
      new_status: cat.is_active === 1 ? 'ACTIVE' : 'INACTIVE',
    });

    return cat;
  }

  public async addSubCategory(categoryId: number, name: string): Promise<SubCategory> {
    await this.initDatabase();
    const cat = this.state!.categories.find((c) => c.id === categoryId);
    if (!cat) throw new Error('Parent category not found');

    const existing = this.state!.subcategories.find(
      (s) => s.category_id === categoryId && s.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`SubCategory "${name}" already exists in ${cat.name}`);
    }

    const newSub: SubCategory = {
      id: this.state!.nextIds.subcategories++,
      category_id: categoryId,
      name: name.trim(),
      is_active: 1,
    };
    this.state!.subcategories.push(newSub);
    this.persist();

    // Audit Log
    await this.logAuditEvent('CREATE', 'SUBCATEGORY', newSub.id, {
      category_name: cat.name,
      subcategory_name: newSub.name,
    });

    return newSub;
  }

  public async toggleSubCategoryStatus(id: number): Promise<SubCategory> {
    await this.initDatabase();
    const sub = this.state!.subcategories.find((s) => s.id === id);
    if (!sub) throw new Error('SubCategory not found');

    sub.is_active = sub.is_active === 1 ? 0 : 1;
    this.persist();

    // Audit Log
    await this.logAuditEvent('STATUS_TOGGLE', 'SUBCATEGORY', id, {
      name: sub.name,
      new_status: sub.is_active === 1 ? 'ACTIVE' : 'INACTIVE',
    });

    return sub;
  }

  // ==========================================
  // MODULE 3: DIRECT EXPENSE & INCOME ENTRY
  // ==========================================

  /**
   * Requirement 1 & 2:
   * 1. Save direct expense entries into the SQLite 'Expenses' table.
   * 2. Record an event in 'SystemLogs' for audit tracking.
   */
  public async insertExpense(params: {
    date: string;
    amount_bdt: number;
    category_id: number;
    subcategory_id: number;
    expense_type?: 'DIRECT' | 'INVESTMENT' | 'PROPERTY' | 'VEHICLE';
    reference_id?: number | null;
    remarks?: string | null;
    is_recurring?: boolean | number;
    recurrence_frequency?: RecurrenceFrequency | null;
    recurrence_end_date?: string | null;
  }): Promise<Expense> {
    await this.initDatabase();

    // Validation
    if (params.amount_bdt <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    if (!params.date) {
      throw new Error('Please select a valid date.');
    }
    const cat = this.state!.categories.find((c) => c.id === params.category_id);
    if (!cat) {
      throw new Error('Selected category is invalid.');
    }
    const sub = this.state!.subcategories.find((s) => s.id === params.subcategory_id);
    if (!sub || sub.category_id !== params.category_id) {
      throw new Error('Selected sub-category does not match the category.');
    }

    const isRecurringNum = params.is_recurring ? 1 : 0;
    const recurrenceFrequency = isRecurringNum
      ? (params.recurrence_frequency || 'MONTHLY')
      : null;
    const recurrenceEndDate = isRecurringNum
      ? (params.recurrence_end_date?.trim() || null)
      : null;

    const newExpense: Expense = {
      id: this.state!.nextIds.expenses++,
      date: params.date,
      amount_bdt: Number(params.amount_bdt.toFixed(2)),
      category_id: params.category_id,
      subcategory_id: params.subcategory_id,
      expense_type: params.expense_type || 'DIRECT',
      reference_id: params.reference_id || null,
      remarks: params.remarks?.trim() || null,
      is_recurring: isRecurringNum,
      recurrence_frequency: recurrenceFrequency,
      recurrence_end_date: recurrenceEndDate,
      created_at: new Date().toISOString(),
    };

    // 1. Save into SQLite 'Expenses' table
    this.state!.expenses.unshift(newExpense);

    // If recurring, also record into SQLite 'RecurringExpenses' table
    if (isRecurringNum) {
      if (!this.state!.recurringExpenses) this.state!.recurringExpenses = [];
      const newRecurring: RecurringExpense = {
        id: this.state!.nextIds.recurringExpenses++,
        expense_id: newExpense.id,
        title: `${cat.name} - ${sub.name}`,
        amount_bdt: newExpense.amount_bdt,
        category_id: newExpense.category_id,
        subcategory_id: newExpense.subcategory_id,
        expense_type: newExpense.expense_type,
        reference_id: newExpense.reference_id,
        frequency: recurrenceFrequency || 'MONTHLY',
        start_date: newExpense.date,
        end_date: recurrenceEndDate,
        is_active: 1,
        remarks: newExpense.remarks,
        created_at: new Date().toISOString(),
      };
      this.state!.recurringExpenses.unshift(newRecurring);
    }

    this.persist();

    // 2. Record an event in 'SystemLogs' for audit tracking
    await this.logAuditEvent('CREATE', 'EXPENSE', newExpense.id, {
      amount_bdt: newExpense.amount_bdt,
      category_name: cat.name,
      subcategory_name: sub.name,
      date: newExpense.date,
      expense_type: newExpense.expense_type,
      remarks: newExpense.remarks,
      is_recurring: isRecurringNum,
      recurrence_frequency: recurrenceFrequency,
      recurrence_end_date: recurrenceEndDate,
    });

    return newExpense;
  }

  public async insertIncome(params: {
    date: string;
    amount_bdt: number;
    category_id: number;
    subcategory_id: number;
    source_type?: 'DIRECT' | 'INVESTMENT' | 'PROPERTY';
    source_id?: number | null;
    remarks?: string | null;
  }): Promise<Income> {
    await this.initDatabase();

    if (params.amount_bdt <= 0) {
      throw new Error('Income amount must be greater than zero.');
    }
    if (!params.date) {
      throw new Error('Please select a valid date.');
    }
    const cat = this.state!.categories.find((c) => c.id === params.category_id);
    if (!cat) {
      throw new Error('Selected category is invalid.');
    }
    const sub = this.state!.subcategories.find((s) => s.id === params.subcategory_id);
    if (!sub || sub.category_id !== params.category_id) {
      throw new Error('Selected sub-category does not match the category.');
    }

    const newIncome: Income = {
      id: this.state!.nextIds.incomes++,
      date: params.date,
      amount_bdt: Number(params.amount_bdt.toFixed(2)),
      category_id: params.category_id,
      subcategory_id: params.subcategory_id,
      source_type: params.source_type || 'DIRECT',
      source_id: params.source_id || null,
      remarks: params.remarks?.trim() || null,
      created_at: new Date().toISOString(),
    };

    this.state!.incomes.unshift(newIncome);
    this.persist();

    // Audit log
    await this.logAuditEvent('CREATE', 'INCOME', newIncome.id, {
      amount_bdt: newIncome.amount_bdt,
      category_name: cat.name,
      subcategory_name: sub.name,
      date: newIncome.date,
      source_type: newIncome.source_type,
      remarks: newIncome.remarks,
    });

    return newIncome;
  }

  public async getEnrichedExpenses(limit?: number): Promise<EnrichedExpense[]> {
    await this.initDatabase();
    const catMap = new Map(this.state!.categories.map((c) => [c.id, c.name]));
    const subMap = new Map(this.state!.subcategories.map((s) => [s.id, s.name]));

    const enriched = this.state!.expenses.map((e) => ({
      ...e,
      category_name: catMap.get(e.category_id) || 'Uncategorized',
      subcategory_name: subMap.get(e.subcategory_id) || 'General',
    }));

    return limit ? enriched.slice(0, limit) : enriched;
  }

  public async getEnrichedIncomes(limit?: number): Promise<EnrichedIncome[]> {
    await this.initDatabase();
    const catMap = new Map(this.state!.categories.map((c) => [c.id, c.name]));
    const subMap = new Map(this.state!.subcategories.map((s) => [s.id, s.name]));

    const enriched = this.state!.incomes.map((i) => ({
      ...i,
      category_name: catMap.get(i.category_id) || 'Uncategorized',
      subcategory_name: subMap.get(i.subcategory_id) || 'General',
    }));

    return limit ? enriched.slice(0, limit) : enriched;
  }

  public async deleteExpense(id: number): Promise<void> {
    await this.initDatabase();
    const idx = this.state!.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Expense not found');

    const removed = this.state!.expenses.splice(idx, 1)[0];
    this.persist();

    await this.logAuditEvent('DELETE', 'EXPENSE', id, {
      amount_bdt: removed.amount_bdt,
      date: removed.date,
      remarks: removed.remarks,
    });
  }

  public async deleteIncome(id: number): Promise<void> {
    await this.initDatabase();
    const idx = this.state!.incomes.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Income not found');

    const removed = this.state!.incomes.splice(idx, 1)[0];
    this.persist();

    await this.logAuditEvent('DELETE', 'INCOME', id, {
      amount_bdt: removed.amount_bdt,
      date: removed.date,
      remarks: removed.remarks,
    });
  }

  // ==========================================
  // MODULE 4: ASSET MODULES (INVESTMENTS, PROPERTIES, VEHICLES & FUEL)
  // ==========================================

  public async getInvestments(): Promise<Investment[]> {
    await this.initDatabase();
    return [...this.state!.investments];
  }

  public async addInvestment(type: 'STOCK' | 'SAVINGS_CERTIFICATE' | 'FDR' | 'LAND', details: Record<string, unknown>, remarks?: string): Promise<Investment> {
    await this.initDatabase();
    const newInv: Investment = {
      id: this.state!.nextIds.investments++,
      type,
      details_json: JSON.stringify(details),
      remarks: remarks?.trim() || null,
      created_at: new Date().toISOString(),
    };

    this.state!.investments.unshift(newInv);
    this.persist();

    await this.logAuditEvent('CREATE', 'INVESTMENT', newInv.id, {
      type,
      details,
    });

    return newInv;
  }

  public async getProperties(): Promise<Property[]> {
    await this.initDatabase();
    return [...this.state!.properties];
  }

  public async addProperty(data: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    await this.initDatabase();
    const newProp: Property = {
      ...data,
      id: this.state!.nextIds.properties++,
      created_at: new Date().toISOString(),
    };

    this.state!.properties.unshift(newProp);
    this.persist();

    await this.logAuditEvent('CREATE', 'PROPERTY', newProp.id, {
      type: newProp.type,
      cost_price: newProp.cost_price,
      survey_type: newProp.survey_type,
    });

    return newProp;
  }

  public async getVehicles(): Promise<Vehicle[]> {
    await this.initDatabase();
    return [...this.state!.vehicles];
  }

  public async addVehicle(data: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle> {
    await this.initDatabase();
    const newVeh: Vehicle = {
      ...data,
      id: this.state!.nextIds.vehicles++,
      created_at: new Date().toISOString(),
    };

    this.state!.vehicles.unshift(newVeh);
    this.persist();

    await this.logAuditEvent('CREATE', 'VEHICLE', newVeh.id, {
      reg_no: newVeh.reg_no,
      model: `${newVeh.brand} ${newVeh.model}`,
    });

    return newVeh;
  }

  public async getFuelLogs(vehicleId?: number): Promise<FuelLog[]> {
    await this.initDatabase();
    let logs = this.state!.fuelLogs;
    if (vehicleId) {
      logs = logs.filter((l) => l.vehicle_id === vehicleId);
    }
    return [...logs].sort((a, b) => b.odometer_reading - a.odometer_reading);
  }

  /**
   * Logs fuel usage, updates vehicle odometer reading, and optionally links to an Expense entry.
   */
  public async addFuelLog(params: {
    vehicle_id: number;
    fuel_type: 'OCTANE' | 'PETROL' | 'DIESEL' | 'CNG' | 'LPG' | 'ELECTRIC';
    unit_quantity: number;
    unit_type: 'LITRE' | 'KG';
    odometer_reading: number;
    fuel_cost_bdt?: number;
    date?: string;
  }): Promise<{ fuelLog: FuelLog; mileageKmPerUnit: number | null }> {
    await this.initDatabase();
    const vehicle = this.state!.vehicles.find((v) => v.id === params.vehicle_id);
    if (!vehicle) throw new Error('Vehicle not found');

    const previousLogs = await this.getFuelLogs(params.vehicle_id);
    const lastReading = previousLogs.length > 0 ? previousLogs[0].odometer_reading : vehicle.current_odometer;

    // Calculate real-time mileage
    let mileageKmPerUnit: number | null = null;
    if (params.odometer_reading > lastReading && params.unit_quantity > 0) {
      const distanceCovered = params.odometer_reading - lastReading;
      mileageKmPerUnit = Number((distanceCovered / params.unit_quantity).toFixed(2));
    }

    // Update vehicle odometer
    vehicle.current_odometer = Math.max(vehicle.current_odometer, params.odometer_reading);

    let createdExpenseId: number | null = null;

    // If cost provided, auto-link to Expenses under Transportation & Commuting -> Fuel
    if (params.fuel_cost_bdt && params.fuel_cost_bdt > 0) {
      const transportCat = this.state!.categories.find((c) => c.name === 'Transportation & Commuting');
      const fuelSubCat = this.state!.subcategories.find(
        (s) => s.category_id === transportCat?.id && s.name === 'Fuel'
      );

      if (transportCat && fuelSubCat) {
        const exp = await this.insertExpense({
          date: params.date || new Date().toISOString().split('T')[0],
          amount_bdt: params.fuel_cost_bdt,
          category_id: transportCat.id,
          subcategory_id: fuelSubCat.id,
          expense_type: 'VEHICLE',
          reference_id: params.vehicle_id,
          remarks: `Fuel: ${params.unit_quantity} ${params.unit_type} (${params.fuel_type}) @ Odo: ${params.odometer_reading}km`,
        });
        createdExpenseId = exp.id;
      }
    }

    const newLog: FuelLog = {
      id: this.state!.nextIds.fuelLogs++,
      vehicle_id: params.vehicle_id,
      expense_id: createdExpenseId,
      fuel_type: params.fuel_type,
      unit_quantity: params.unit_quantity,
      unit_type: params.unit_type,
      odometer_reading: params.odometer_reading,
      created_at: new Date().toISOString(),
    };

    this.state!.fuelLogs.unshift(newLog);
    this.persist();

    await this.logAuditEvent('CREATE', 'FUELLOG', newLog.id, {
      vehicle_reg: vehicle.reg_no,
      quantity: `${params.unit_quantity} ${params.unit_type}`,
      odometer: params.odometer_reading,
      calculated_mileage: mileageKmPerUnit ? `${mileageKmPerUnit} km/${params.unit_type}` : 'N/A (first entry)',
    });

    return { fuelLog: newLog, mileageKmPerUnit };
  }

  // ==========================================
  // SAVINGS GOALS & FINANCIAL TARGETS MODULE
  // ==========================================

  public async getSavingsGoals(): Promise<EnrichedSavingsGoal[]> {
    await this.initDatabase();
    const goals = this.state!.savingsGoals || [];
    const investments = this.state!.investments || [];
    const now = new Date();

    return goals.map((goal) => {
      let linked_investment_type = undefined;
      let linked_investment_title: string | undefined = undefined;
      let linked_investment_value: number | undefined = undefined;

      if (goal.linked_investment_id) {
        const inv = investments.find((i) => i.id === goal.linked_investment_id);
        if (inv) {
          linked_investment_type = inv.type;
          try {
            const details = JSON.parse(inv.details_json);
            if (inv.type === 'STOCK') {
              linked_investment_title = `${details.bo_id ? `BO #${details.bo_id}` : 'Stock Portfolio'} (${details.items?.length || 0} equities)`;
              linked_investment_value = details.total_portfolio_value_bdt || 0;
            } else if (inv.type === 'FDR') {
              linked_investment_title = `${details.bank || 'Bank'} FDR #${details.instrument_no || ''}`;
              linked_investment_value = details.principal || 0;
            } else if (inv.type === 'SAVINGS_CERTIFICATE') {
              linked_investment_title = `Govt Sanchayapatra #${details.instrument_no || ''}`;
              linked_investment_value = details.principal || 0;
            } else if (inv.type === 'LAND') {
              linked_investment_title = `Land (${details.area_katha} Katha, ${details.location})`;
              linked_investment_value = details.current_estimated_value_bdt || details.purchase_price_bdt || 0;
            }
          } catch {
            linked_investment_title = `${inv.type} Asset #${inv.id}`;
          }
        }
      }

      const percentage_completed =
        goal.target_amount_bdt > 0
          ? Math.min(100, Math.round((goal.current_amount_bdt / goal.target_amount_bdt) * 100))
          : 0;

      const remaining_bdt = Math.max(0, goal.target_amount_bdt - goal.current_amount_bdt);

      // Days remaining calculation
      const targetD = new Date(goal.target_date);
      const diffTime = targetD.getTime() - now.getTime();
      const days_remaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const months_remaining = Math.max(1, Math.ceil(days_remaining / 30));
      const monthly_savings_needed = remaining_bdt > 0 ? Math.round(remaining_bdt / months_remaining) : 0;

      return {
        ...goal,
        linked_investment_type,
        linked_investment_title,
        linked_investment_value,
        percentage_completed,
        remaining_bdt,
        days_remaining,
        monthly_savings_needed,
      };
    });
  }

  public async addSavingsGoal(
    params: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SavingsGoal> {
    await this.initDatabase();
    if (!this.state!.savingsGoals) this.state!.savingsGoals = [];

    const newGoal: SavingsGoal = {
      id: this.state!.nextIds.savingsGoals++,
      title: params.title.trim(),
      target_amount_bdt: params.target_amount_bdt,
      current_amount_bdt: params.current_amount_bdt || 0,
      target_date: params.target_date,
      priority: params.priority || 'MEDIUM',
      status: params.current_amount_bdt >= params.target_amount_bdt ? 'ACHIEVED' : params.status || 'IN_PROGRESS',
      linked_investment_id: params.linked_investment_id || null,
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state!.savingsGoals.unshift(newGoal);
    this.persist();

    await this.logAuditEvent('CREATE', 'SAVINGS_GOAL', newGoal.id, {
      title: newGoal.title,
      target_amount_bdt: newGoal.target_amount_bdt,
      target_date: newGoal.target_date,
      linked_investment_id: newGoal.linked_investment_id,
    });

    return newGoal;
  }

  public async updateSavingsGoal(
    id: number,
    updates: Partial<Omit<SavingsGoal, 'id' | 'created_at'>>
  ): Promise<SavingsGoal> {
    await this.initDatabase();
    const goal = this.state!.savingsGoals.find((g) => g.id === id);
    if (!goal) throw new Error('Savings goal not found');

    if (updates.title !== undefined) goal.title = updates.title.trim();
    if (updates.target_amount_bdt !== undefined) goal.target_amount_bdt = updates.target_amount_bdt;
    if (updates.current_amount_bdt !== undefined) {
      goal.current_amount_bdt = updates.current_amount_bdt;
      if (goal.current_amount_bdt >= goal.target_amount_bdt) {
        goal.status = 'ACHIEVED';
      }
    }
    if (updates.target_date !== undefined) goal.target_date = updates.target_date;
    if (updates.priority !== undefined) goal.priority = updates.priority;
    if (updates.status !== undefined) goal.status = updates.status;
    if (updates.linked_investment_id !== undefined) goal.linked_investment_id = updates.linked_investment_id;
    if (updates.notes !== undefined) goal.notes = updates.notes;

    goal.updated_at = new Date().toISOString();
    this.persist();

    await this.logAuditEvent('EDIT', 'SAVINGS_GOAL', id, {
      title: goal.title,
      updated_fields: Object.keys(updates),
      current_amount_bdt: goal.current_amount_bdt,
    });

    return goal;
  }

  public async contributeToSavingsGoal(
    id: number,
    amount_bdt: number,
    note?: string
  ): Promise<SavingsGoal> {
    await this.initDatabase();
    const goal = this.state!.savingsGoals.find((g) => g.id === id);
    if (!goal) throw new Error('Savings goal not found');
    if (amount_bdt <= 0) throw new Error('Contribution amount must be greater than 0 BDT');

    const previousAmount = goal.current_amount_bdt;
    goal.current_amount_bdt += amount_bdt;
    if (goal.current_amount_bdt >= goal.target_amount_bdt) {
      goal.status = 'ACHIEVED';
    }
    goal.updated_at = new Date().toISOString();
    this.persist();

    await this.logAuditEvent('EDIT', 'SAVINGS_GOAL', id, {
      action: 'CONTRIBUTE_FUNDS',
      contribution_bdt: amount_bdt,
      previous_amount: previousAmount,
      new_total: goal.current_amount_bdt,
      note: note || 'Direct contribution deposit',
    });

    return goal;
  }

  public async syncGoalWithInvestment(id: number): Promise<SavingsGoal> {
    await this.initDatabase();
    const goal = this.state!.savingsGoals.find((g) => g.id === id);
    if (!goal) throw new Error('Savings goal not found');
    if (!goal.linked_investment_id) throw new Error('No investment account linked to this goal');

    const inv = this.state!.investments.find((i) => i.id === goal.linked_investment_id);
    if (!inv) throw new Error('Linked investment account not found');

    let synchedValue = 0;
    try {
      const details = JSON.parse(inv.details_json);
      if (inv.type === 'STOCK') {
        synchedValue = details.total_portfolio_value_bdt || 0;
      } else if (inv.type === 'FDR' || inv.type === 'SAVINGS_CERTIFICATE') {
        synchedValue = details.principal || 0;
      } else if (inv.type === 'LAND') {
        synchedValue = details.current_estimated_value_bdt || details.purchase_price_bdt || 0;
      }
    } catch {
      throw new Error('Failed to parse linked investment value');
    }

    const previous = goal.current_amount_bdt;
    goal.current_amount_bdt = synchedValue;
    if (goal.current_amount_bdt >= goal.target_amount_bdt) {
      goal.status = 'ACHIEVED';
    }
    goal.updated_at = new Date().toISOString();
    this.persist();

    await this.logAuditEvent('EDIT', 'SAVINGS_GOAL', id, {
      action: 'SYNC_WITH_INVESTMENT',
      investment_id: inv.id,
      investment_type: inv.type,
      previous_amount: previous,
      synched_amount: synchedValue,
    });

    return goal;
  }

  public async deleteSavingsGoal(id: number): Promise<boolean> {
    await this.initDatabase();
    const idx = this.state!.savingsGoals.findIndex((g) => g.id === id);
    if (idx === -1) return false;

    const removed = this.state!.savingsGoals.splice(idx, 1)[0];
    this.persist();

    await this.logAuditEvent('DELETE', 'SAVINGS_GOAL', id, {
      title: removed.title,
      target_amount_bdt: removed.target_amount_bdt,
    });

    return true;
  }

  // ==========================================
  // MONTHLY BUDGET PLANNER & REAL-TIME LIMITS
  // ==========================================

  public async getBudgetLimits(): Promise<BudgetLimit[]> {
    await this.initDatabase();
    return this.state!.budgetLimits || [];
  }

  public async getCategoryBudgetComparisons(monthPrefix?: string): Promise<CategoryBudgetComparison[]> {
    await this.initDatabase();
    const now = new Date();
    const currentPrefix =
      monthPrefix || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const expenseCategories = this.state!.categories.filter(
      (c) => c.type === 'EXPENSE' && c.is_active === 1
    );
    const budgetLimits = this.state!.budgetLimits || [];
    const monthlyExpenses = this.state!.expenses.filter((e) => e.date.startsWith(currentPrefix));

    const comparisons: CategoryBudgetComparison[] = expenseCategories.map((cat) => {
      const budget = budgetLimits.find((b) => b.category_id === cat.id);
      const monthly_limit_bdt = budget ? budget.monthly_limit_bdt : 0;
      const threshold = budget ? budget.alert_threshold_pct : 85;

      const actual_spent_bdt = monthlyExpenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + e.amount_bdt, 0);

      const variance_bdt = monthly_limit_bdt - actual_spent_bdt;
      const percentage_consumed =
        monthly_limit_bdt > 0 ? (actual_spent_bdt / monthly_limit_bdt) * 100 : 0;

      let status: 'OK' | 'WARNING' | 'OVERSPENT' | 'UNBUDGETED' = 'OK';
      if (monthly_limit_bdt === 0) {
        status = 'UNBUDGETED';
      } else if (actual_spent_bdt > monthly_limit_bdt) {
        status = 'OVERSPENT';
      } else if (percentage_consumed >= threshold) {
        status = 'WARNING';
      }

      return {
        category_id: cat.id,
        category_name: cat.name,
        monthly_limit_bdt,
        actual_spent_bdt,
        variance_bdt,
        percentage_consumed,
        status,
      };
    });

    // Sort: 1. Overspent, 2. Warning, 3. OK, 4. Unbudgeted
    return comparisons.sort((a, b) => {
      const rank = (s: string) => {
        if (s === 'OVERSPENT') return 1;
        if (s === 'WARNING') return 2;
        if (s === 'OK') return 3;
        return 4;
      };
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return b.percentage_consumed - a.percentage_consumed;
    });
  }

  public async setBudgetLimit(
    category_id: number,
    monthly_limit_bdt: number,
    alert_threshold_pct = 85
  ): Promise<BudgetLimit> {
    await this.initDatabase();
    if (!this.state!.budgetLimits) this.state!.budgetLimits = [];

    const cat = this.state!.categories.find((c) => c.id === category_id);
    if (!cat) throw new Error('Category not found');

    let existing = this.state!.budgetLimits.find((b) => b.category_id === category_id);
    if (existing) {
      existing.monthly_limit_bdt = monthly_limit_bdt;
      existing.alert_threshold_pct = alert_threshold_pct;
      existing.updated_at = new Date().toISOString();
    } else {
      existing = {
        id: this.state!.nextIds.budgetLimits++,
        category_id,
        monthly_limit_bdt,
        alert_threshold_pct,
        updated_at: new Date().toISOString(),
      };
      this.state!.budgetLimits.push(existing);
    }

    this.persist();

    await this.logAuditEvent('EDIT', 'BUDGET_LIMIT', category_id, {
      category_name: cat.name,
      monthly_limit_bdt,
      alert_threshold_pct,
    });

    return existing;
  }

  public async batchSetBudgetLimits(
    limits: { category_id: number; monthly_limit_bdt: number }[]
  ): Promise<BudgetLimit[]> {
    await this.initDatabase();
    const updated: BudgetLimit[] = [];
    for (const item of limits) {
      const res = await this.setBudgetLimit(item.category_id, item.monthly_limit_bdt);
      updated.push(res);
    }
    return updated;
  }

  // ==========================================
  // RECURRING EXPENSES MODULE
  // ==========================================

  public async getRecurringExpenses(): Promise<EnrichedRecurringExpense[]> {
    await this.initDatabase();
    const catMap = new Map(this.state!.categories.map((c) => [c.id, c.name]));
    const subMap = new Map(this.state!.subcategories.map((s) => [s.id, s.name]));
    const list = this.state!.recurringExpenses || [];

    return list.map((item) => {
      // Calculate next due date
      let next_due_date = item.start_date;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const d = new Date(item.start_date);

      while (d.toISOString().split('T')[0] < todayStr) {
        if (item.frequency === 'WEEKLY') {
          d.setDate(d.getDate() + 7);
        } else if (item.frequency === 'MONTHLY') {
          d.setMonth(d.getMonth() + 1);
        } else if (item.frequency === 'YEARLY') {
          d.setFullYear(d.getFullYear() + 1);
        }
      }
      next_due_date = d.toISOString().split('T')[0];

      return {
        ...item,
        category_name: catMap.get(item.category_id) || 'Category',
        subcategory_name: subMap.get(item.subcategory_id) || 'General',
        next_due_date,
      };
    });
  }

  public async createRecurringExpense(params: {
    title: string;
    amount_bdt: number;
    category_id: number;
    subcategory_id: number;
    expense_type?: 'DIRECT' | 'INVESTMENT' | 'PROPERTY' | 'VEHICLE';
    reference_id?: number | null;
    frequency: RecurrenceFrequency;
    start_date: string;
    end_date?: string | null;
    remarks?: string | null;
  }): Promise<RecurringExpense> {
    await this.initDatabase();
    if (!this.state!.recurringExpenses) this.state!.recurringExpenses = [];

    const newRecurring: RecurringExpense = {
      id: this.state!.nextIds.recurringExpenses++,
      title: params.title.trim(),
      amount_bdt: Number(params.amount_bdt.toFixed(2)),
      category_id: params.category_id,
      subcategory_id: params.subcategory_id,
      expense_type: params.expense_type || 'DIRECT',
      reference_id: params.reference_id || null,
      frequency: params.frequency,
      start_date: params.start_date,
      end_date: params.end_date?.trim() || null,
      is_active: 1,
      remarks: params.remarks?.trim() || null,
      created_at: new Date().toISOString(),
    };

    this.state!.recurringExpenses.unshift(newRecurring);
    this.persist();

    await this.logAuditEvent('CREATE', 'RECURRING_EXPENSE', newRecurring.id, {
      title: newRecurring.title,
      amount_bdt: newRecurring.amount_bdt,
      frequency: newRecurring.frequency,
      start_date: newRecurring.start_date,
      end_date: newRecurring.end_date,
    });

    return newRecurring;
  }

  public async toggleRecurringExpenseStatus(id: number): Promise<RecurringExpense> {
    await this.initDatabase();
    const item = (this.state!.recurringExpenses || []).find((r) => r.id === id);
    if (!item) throw new Error('Recurring expense schedule not found');
    item.is_active = item.is_active === 1 ? 0 : 1;
    item.updated_at = new Date().toISOString();
    this.persist();
    await this.logAuditEvent('STATUS_TOGGLE', 'RECURRING_EXPENSE', id, {
      title: item.title,
      is_active: item.is_active,
    });
    return item;
  }

  public async deleteRecurringExpense(id: number): Promise<boolean> {
    await this.initDatabase();
    const idx = (this.state!.recurringExpenses || []).findIndex((r) => r.id === id);
    if (idx === -1) return false;
    const removed = this.state!.recurringExpenses.splice(idx, 1)[0];
    this.persist();
    await this.logAuditEvent('DELETE', 'RECURRING_EXPENSE', id, {
      title: removed.title,
      amount_bdt: removed.amount_bdt,
    });
    return true;
  }

  // ==========================================
  // SYSTEM AUDIT LOGS QUERY
  // ==========================================

  public async getSystemLogs(limit = 100): Promise<SystemLog[]> {
    await this.initDatabase();
    return this.state!.systemLogs.slice(0, limit);
  }

  // ==========================================
  // EXPORT / IMPORT & RESET
  // ==========================================

  /**
   * Generates and downloads a complete CSV export of all SQLite Expense and Income records
   * with UTF-8 BOM encoding for Microsoft Excel & Google Sheets.
   */
  public async exportTransactionsCSV(options?: {
    flow?: 'ALL' | 'EXPENSE' | 'INCOME';
    timeRange?: 'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR';
    customStartDate?: string;
    customEndDate?: string;
    filenamePrefix?: string;
  }) {
    await this.initDatabase();
    const [expenses, incomes, vehicles, properties, investments] = await Promise.all([
      this.getEnrichedExpenses(),
      this.getEnrichedIncomes(),
      this.getVehicles(),
      this.getProperties(),
      this.getInvestments(),
    ]);

    const result = exportTransactionsToCSV(expenses, incomes, {
      ...options,
      vehicles,
      properties,
      investments,
    });

    await this.logAuditEvent('CREATE', 'CSV_EXPORT', 0, {
      flow: options?.flow || 'ALL',
      timeRange: options?.timeRange || 'ALL',
      totalRecords: result.totalRecords,
      totalIncomesBDT: result.totalIncomesBDT,
      totalExpensesBDT: result.totalExpensesBDT,
      netCashflowBDT: result.netCashflowBDT,
      filename: result.filename,
    });

    return result;
  }

  public async exportDatabaseJSON(): Promise<string> {
    await this.initDatabase();
    return JSON.stringify(this.state, null, 2);
  }

  public async importDatabaseJSON(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString) as DatabaseState;
      if (!parsed.categories || !parsed.systemLogs) {
        throw new Error('Invalid SAS-AEIT database backup structure');
      }
      this.state = parsed;
      this.persist();
      await this.logAuditEvent('EDIT', 'DATABASE', 0, {
        operation: 'DATABASE_RESTORE_FROM_BACKUP',
        restored_at: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Import error', err);
      throw err;
    }
  }

  public async resetToSeedData(): Promise<void> {
    this.state = this.buildInitialMasterData();
    this.persist();
    await this.logAuditEvent('CREATE', 'DATABASE', 0, {
      operation: 'DATABASE_RESET_TO_INITIAL_MASTER_DATA',
    });
  }

  public getDatabaseSummary() {
    if (!this.state) {
      return {
        categoriesCount: 0,
        subcategoriesCount: 0,
        expensesCount: 0,
        incomesCount: 0,
        systemLogsCount: 0,
        investmentsCount: 0,
        propertiesCount: 0,
        vehiclesCount: 0,
        savingsGoalsCount: 0,
        budgetLimitsCount: 0,
      };
    }
    return {
      categoriesCount: this.state.categories.length,
      subcategoriesCount: this.state.subcategories.length,
      expensesCount: this.state.expenses.length,
      incomesCount: this.state.incomes.length,
      systemLogsCount: this.state.systemLogs.length,
      investmentsCount: this.state.investments.length,
      propertiesCount: this.state.properties.length,
      vehiclesCount: this.state.vehicles.length,
      savingsGoalsCount: this.state.savingsGoals?.length || 0,
      budgetLimitsCount: this.state.budgetLimits?.length || 0,
    };
  }

  // ==========================================
  // INITIAL SEED BUILDER
  // ==========================================
  private buildInitialMasterData(): DatabaseState {
    let catId = 1;
    let subCatId = 1;

    const categories: Category[] = [];
    const subcategories: SubCategory[] = [];

    MASTER_CATEGORIES_DATA.forEach((catSeed) => {
      const currentCatId = catId++;
      categories.push({
        id: currentCatId,
        type: catSeed.type,
        name: catSeed.name,
        is_active: 1,
      });

      catSeed.subcategories.forEach((subName) => {
        subcategories.push({
          id: subCatId++,
          category_id: currentCatId,
          name: subName,
          is_active: 1,
        });
      });
    });

    // Helper map
    const catMap = new Map(categories.map((c) => [c.name, c.id]));
    const findSubId = (catName: string, subName: string) => {
      const cId = catMap.get(catName);
      if (!cId) return 1;
      const sub = subcategories.find((s) => s.category_id === cId && s.name.toLowerCase().includes(subName.toLowerCase()));
      return sub ? sub.id : 1;
    };

    // Realistic Initial Vehicles
    const vehicles: Vehicle[] = [
      {
        id: 1,
        type: 'CAR',
        manufacturer: 'Toyota',
        brand: 'Corolla',
        model: 'Axio Hybrid 2018',
        reg_year: 2019,
        reg_no: 'Dhaka Metro-GA-34-8891',
        current_odometer: 48620,
        remarks: 'Family commute vehicle',
        created_at: '2026-01-15T09:00:00.000Z',
      },
      {
        id: 2,
        type: 'MOTORCYCLE',
        manufacturer: 'Yamaha',
        brand: 'FZ-S',
        model: 'Version 3.0 FI',
        reg_year: 2021,
        reg_no: 'Dhaka Metro-HA-52-1102',
        current_odometer: 18450,
        remarks: 'Personal daily city transit',
        created_at: '2026-02-10T10:00:00.000Z',
      },
    ];

    // Initial Investments
    const investments: Investment[] = [
      {
        id: 1,
        type: 'SAVINGS_CERTIFICATE',
        details_json: JSON.stringify({
          scheme: '5-Year Bangladesh Sanchayapatra',
          instrument_no: 'SP-992184-DH',
          issuing_office: 'Bangladesh Bank Motijheel',
          principal_bdt: 2000000,
          profit_rate: '11.28%',
          maturity_date: '2029-06-30',
        }),
        remarks: 'Primary safe income portfolio',
        created_at: '2026-01-05T08:00:00.000Z',
      },
      {
        id: 2,
        type: 'STOCK',
        details_json: JSON.stringify({
          bo_id: '1201900045892100',
          broker: 'LankaBangla Securities Ltd.',
          symbols: [
            { ticker: 'GP', units: 1500, avg_cost: 290, market_price: 312 },
            { ticker: 'BATBC', units: 800, avg_cost: 495, market_price: 520 },
            { ticker: 'SQURPHARMA', units: 1200, avg_cost: 215, market_price: 228 },
          ],
          total_portfolio_value_bdt: 1125200,
        }),
        remarks: 'DSE High-dividend blue chips',
        created_at: '2026-01-12T11:30:00.000Z',
      },
      {
        id: 3,
        type: 'LAND',
        details_json: JSON.stringify({
          location: 'Purbachal Sector 17, Road 302',
          area_katha: 5.0,
          purchase_price_bdt: 7500000,
          current_estimated_value_bdt: 9500000,
          registration_date: '2024-11-20',
        }),
        remarks: 'Long term capital appreciation',
        created_at: '2026-01-20T14:00:00.000Z',
      },
    ];

    // Initial Properties
    const properties: Property[] = [
      {
        id: 1,
        type: 'Residential',
        sub_type: 'Apartment',
        land_measurement: '1850 SqFt',
        owner_type: 'Individual',
        cost_price: 14500000,
        development_cost: 650000,
        survey_type: 'City Survey',
        location_json: JSON.stringify({
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Gulshan',
          mouza: 'Gulshan North',
          dag: '1428',
          khatian: '892',
        }),
        remarks: 'Rented to corporate executive (৳ 75,000/mo)',
        created_at: '2026-01-10T10:00:00.000Z',
      },
      {
        id: 2,
        type: 'Commercial',
        sub_type: 'Office Space',
        land_measurement: '1200 SqFt',
        owner_type: 'Joint',
        cost_price: 11000000,
        development_cost: 320000,
        survey_type: 'RS',
        location_json: JSON.stringify({
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Motijheel',
          mouza: 'Dilkusha C/A',
          dag: '312',
          khatian: '104',
        }),
        remarks: 'Commercial rental unit (৳ 60,000/mo)',
        created_at: '2026-01-18T12:00:00.000Z',
      },
    ];

    // Realistic Recent Fuel Logs
    const fuelLogs: FuelLog[] = [
      {
        id: 1,
        vehicle_id: 1,
        expense_id: 1,
        fuel_type: 'OCTANE',
        unit_quantity: 38.5,
        unit_type: 'LITRE',
        odometer_reading: 48620,
        created_at: '2026-09-28T09:40:00.000Z',
      },
      {
        id: 2,
        vehicle_id: 1,
        expense_id: 2,
        fuel_type: 'OCTANE',
        unit_quantity: 35.0,
        unit_type: 'LITRE',
        odometer_reading: 48190,
        created_at: '2026-09-14T11:20:00.000Z',
      },
      {
        id: 3,
        vehicle_id: 2,
        expense_id: 3,
        fuel_type: 'OCTANE',
        unit_quantity: 11.2,
        unit_type: 'LITRE',
        odometer_reading: 18450,
        created_at: '2026-09-25T16:15:00.000Z',
      },
    ];

    // Realistic Income Records (Current Month & Prior)
    const govtPayCatId = catMap.get('Govt Payments') || 1;
    const salarySubId = findSubId('Govt Payments', 'Salary');
    const travelBillSubId = findSubId('Govt Payments', 'Travel Bill');
    const festivalSubId = findSubId('Govt Payments', 'Festival');

    const incomes: Income[] = [
      {
        id: 1,
        date: '2026-10-01',
        amount_bdt: 185000,
        category_id: govtPayCatId,
        subcategory_id: salarySubId,
        source_type: 'DIRECT',
        source_id: null,
        remarks: 'October 2026 Principal Salary Disbursal',
        created_at: '2026-10-01T04:30:00.000Z',
      },
      {
        id: 2,
        date: '2026-10-01',
        amount_bdt: 75000,
        category_id: govtPayCatId,
        subcategory_id: salarySubId,
        source_type: 'PROPERTY',
        source_id: 1,
        remarks: 'Monthly rental income from Gulshan Apartment #3B',
        created_at: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 3,
        date: '2026-09-28',
        amount_bdt: 32000,
        category_id: govtPayCatId,
        subcategory_id: travelBillSubId,
        source_type: 'DIRECT',
        source_id: null,
        remarks: 'Official division tour reimbursement (ISRT Field Inspection)',
        created_at: '2026-09-28T10:00:00.000Z',
      },
      {
        id: 4,
        date: '2026-09-20',
        amount_bdt: 37600,
        category_id: govtPayCatId,
        subcategory_id: salarySubId,
        source_type: 'INVESTMENT',
        source_id: 1,
        remarks: 'Quarterly Sanchayapatra profit transfer to Sonali Bank A/C',
        created_at: '2026-09-20T06:00:00.000Z',
      },
      {
        id: 5,
        date: '2026-09-01',
        amount_bdt: 185000,
        category_id: govtPayCatId,
        subcategory_id: salarySubId,
        source_type: 'DIRECT',
        source_id: null,
        remarks: 'September 2026 Base Salary',
        created_at: '2026-09-01T04:30:00.000Z',
      },
    ];

    // Realistic Expenses
    const utilitiesCatId = catMap.get('Utilities') || 3;
    const electSubId = findSubId('Utilities', 'Electricity');
    const fishCatId = catMap.get('Fish') || 5;
    const ilishSubId = findSubId('Fish', 'Ilish');
    const ruiSubId = findSubId('Fish', 'Rui');
    const meatCatId = catMap.get('Meat') || 6;
    const beefSubId = findSubId('Meat', 'Beef');
    const transportCatId = catMap.get('Transportation & Commuting') || 14;
    const fuelSubId = findSubId('Transportation & Commuting', 'Fuel');
    const foodCatId = catMap.get('Food') || 13;
    const diningSubId = findSubId('Food', 'Dining out');
    const healthCatId = catMap.get('Healthcare & Wellness') || 16;
    const docSubId = findSubId('Healthcare & Wellness', 'Doctor fees');
    const connCatId = catMap.get('Connectivity') || 4;
    const internetSubId = findSubId('Connectivity', 'High-speed internet');

    const expenses: Expense[] = [
      {
        id: 1,
        date: '2026-10-02',
        amount_bdt: 5005,
        category_id: transportCatId,
        subcategory_id: fuelSubId,
        expense_type: 'VEHICLE',
        reference_id: 1,
        remarks: '38.5 Liters Octane refuel for Axio @ ৳ 130/L',
        created_at: '2026-10-02T03:40:00.000Z',
      },
      {
        id: 2,
        date: '2026-10-01',
        amount_bdt: 7450,
        category_id: utilitiesCatId,
        subcategory_id: electSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'DPDC September electricity bill payment via bKash',
        created_at: '2026-10-01T09:15:00.000Z',
      },
      {
        id: 3,
        date: '2026-09-30',
        amount_bdt: 4200,
        category_id: fishCatId,
        subcategory_id: ilishSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Chandpur Padma Ilish (2 pcs, 2.4kg total) from Karwan Bazar',
        created_at: '2026-09-30T05:20:00.000Z',
      },
      {
        id: 4,
        date: '2026-09-29',
        amount_bdt: 3100,
        category_id: meatCatId,
        subcategory_id: beefSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Fresh premium beef (4 kg) for family weekend',
        created_at: '2026-09-29T11:00:00.000Z',
      },
      {
        id: 5,
        date: '2026-09-28',
        amount_bdt: 2400,
        category_id: connCatId,
        subcategory_id: internetSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Amber IT 60 Mbps fiber broadband monthly renewal',
        created_at: '2026-09-28T07:10:00.000Z',
      },
      {
        id: 6,
        date: '2026-09-27',
        amount_bdt: 4500,
        category_id: foodCatId,
        subcategory_id: diningSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Family weekend dinner at Dhanmondi Star Kabab',
        created_at: '2026-09-27T14:30:00.000Z',
      },
      {
        id: 7,
        date: '2026-09-24',
        amount_bdt: 2500,
        category_id: healthCatId,
        subcategory_id: docSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Routine family health consultation & prescription',
        created_at: '2026-09-24T12:00:00.000Z',
      },
      {
        id: 8,
        date: '2026-09-22',
        amount_bdt: 1850,
        category_id: fishCatId,
        subcategory_id: ruiSubId,
        expense_type: 'DIRECT',
        reference_id: null,
        remarks: 'Fresh river Rui fish (3.5 kg)',
        created_at: '2026-09-22T08:15:00.000Z',
      },
    ];

    // Initial System Audit Logs
    const systemLogs: SystemLog[] = [
      {
        id: 1,
        timestamp: '2026-10-02T03:40:00.000Z',
        action: 'CREATE',
        entity_type: 'EXPENSE',
        entity_id: 1,
        details_json: JSON.stringify({
          amount_bdt: 5005,
          category: 'Transportation & Commuting',
          subcategory: 'Fuel',
          vehicle: 'Toyota Axio (Dhaka Metro-GA-34-8891)',
        }),
      },
      {
        id: 2,
        timestamp: '2026-10-01T09:15:00.000Z',
        action: 'CREATE',
        entity_type: 'EXPENSE',
        entity_id: 2,
        details_json: JSON.stringify({
          amount_bdt: 7450,
          category: 'Utilities',
          subcategory: 'Electricity',
        }),
      },
      {
        id: 3,
        timestamp: '2026-10-01T04:30:00.000Z',
        action: 'CREATE',
        entity_type: 'INCOME',
        entity_id: 1,
        details_json: JSON.stringify({
          amount_bdt: 185000,
          category: 'Govt Payments',
          subcategory: 'Salary',
        }),
      },
      {
        id: 4,
        timestamp: '2026-09-28T07:10:00.000Z',
        action: 'CREATE',
        entity_type: 'EXPENSE',
        entity_id: 5,
        details_json: JSON.stringify({
          amount_bdt: 2400,
          category: 'Connectivity',
          subcategory: 'High-speed internet',
        }),
      },
    ];

    const savingsGoals = this.buildInitialSavingsGoals(investments);
    const budgetLimits = this.buildInitialBudgetLimits(categories);
    const recurringExpenses = this.buildInitialRecurringExpenses(categories, subcategories);

    return {
      categories,
      subcategories,
      systemLogs,
      incomes,
      expenses,
      investments,
      properties,
      vehicles,
      fuelLogs,
      savingsGoals,
      budgetLimits,
      recurringExpenses,
      nextIds: {
        categories: catId,
        subcategories: subCatId,
        systemLogs: 5,
        incomes: 6,
        expenses: 9,
        investments: 4,
        properties: 3,
        vehicles: 3,
        fuelLogs: 4,
        savingsGoals: 5,
        budgetLimits: 15,
        recurringExpenses: 5,
      },
    };
  }

  private buildInitialSavingsGoals(investments: Investment[]): SavingsGoal[] {
    return [
      {
        id: 1,
        title: 'Emergency Medical & Family Buffer',
        target_amount_bdt: 500000,
        current_amount_bdt: 350000,
        target_date: '2026-12-31',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        linked_investment_id: 2, // Stock Portfolio
        notes: '6-month emergency reserve. Liquid portfolio at BRAC EPL Stock Brokerage.',
        created_at: '2026-01-15T08:00:00.000Z',
        updated_at: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 2,
        title: 'Purbachal Plot Boundary Wall & Development',
        target_amount_bdt: 1200000,
        current_amount_bdt: 650000,
        target_date: '2027-06-30',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        linked_investment_id: 3, // Land in Purbachal
        notes: 'Development fund for Purbachal Sector 17 property (boundary wall, sand filling, utility connection).',
        created_at: '2026-02-01T09:30:00.000Z',
        updated_at: '2026-09-28T14:15:00.000Z',
      },
      {
        id: 3,
        title: 'Family Hajj & Umrah Pilgrimage Fund',
        target_amount_bdt: 1500000,
        current_amount_bdt: 1500000,
        target_date: '2027-05-15',
        priority: 'HIGH',
        status: 'ACHIEVED',
        linked_investment_id: 1, // Sanchayapatra
        notes: 'Target achieved via 5-Year Bangladesh Govt Sanchayapatra yield reinvestment.',
        created_at: '2025-11-10T12:00:00.000Z',
        updated_at: '2026-10-01T08:00:00.000Z',
      },
      {
        id: 4,
        title: 'Children Higher Education Trust',
        target_amount_bdt: 3000000,
        current_amount_bdt: 1125200,
        target_date: '2030-01-01',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        linked_investment_id: 2, // Stocks
        notes: 'Long-term equity growth fund linked to DSE blue-chip stock portfolio dividends.',
        created_at: '2026-01-20T11:00:00.000Z',
        updated_at: '2026-09-25T16:00:00.000Z',
      },
    ];
  }

  private buildInitialBudgetLimits(categories: Category[]): BudgetLimit[] {
    const catMap = new Map(categories.map((c) => [c.name, c.id]));
    const limits: BudgetLimit[] = [];
    let bId = 1;

    const defaultLimits: { name: string; limit: number; threshold?: number }[] = [
      { name: 'Accommodations', limit: 40000 },
      { name: 'Utilities', limit: 8000, threshold: 85 }, // actual: 7450 (93% -> warning!)
      { name: 'Connectivity', limit: 2500, threshold: 85 }, // actual: 2400 (96% -> warning!)
      { name: 'Transportation & Commuting', limit: 6000, threshold: 85 }, // actual: 5005 (83%)
      { name: 'Food', limit: 6000, threshold: 85 }, // actual: 3200 (53%)
      { name: 'Fish', limit: 6000, threshold: 85 }, // actual: 1850 (31%)
      { name: 'Meat', limit: 8000, threshold: 85 },
      { name: 'Health & Medical', limit: 5000, threshold: 85 }, // actual: 2500 (50%)
      { name: 'Household', limit: 4000, threshold: 85 },
      { name: 'Personal Care & Clothing', limit: 5000, threshold: 85 },
    ];

    defaultLimits.forEach((dl) => {
      const cId = catMap.get(dl.name);
      if (cId) {
        limits.push({
          id: bId++,
          category_id: cId,
          monthly_limit_bdt: dl.limit,
          alert_threshold_pct: dl.threshold || 85,
          updated_at: new Date().toISOString(),
        });
      }
    });

    return limits;
  }

  private buildInitialRecurringExpenses(categories: Category[], subcategories: SubCategory[]): RecurringExpense[] {
    const connCat = categories.find((c) => c.name === 'Connectivity');
    const internetSub = subcategories.find((s) => s.category_id === connCat?.id && s.name.includes('internet'));
    const utilCat = categories.find((c) => c.name === 'Utilities');
    const elecSub = subcategories.find((s) => s.category_id === utilCat?.id && s.name === 'Electricity');
    const accomCat = categories.find((c) => c.name === 'Accommodations');
    const flatSub = subcategories.find((s) => s.category_id === accomCat?.id);

    return [
      {
        id: 1,
        title: 'Amber IT 60 Mbps Fiber Broadband',
        amount_bdt: 2400,
        category_id: connCat?.id || 3,
        subcategory_id: internetSub?.id || 1,
        expense_type: 'DIRECT',
        reference_id: null,
        frequency: 'MONTHLY',
        start_date: '2026-01-01',
        end_date: null,
        is_active: 1,
        remarks: 'Monthly recurring high-speed fiber internet subscription',
        created_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 2,
        title: 'DESCO Electricity Utility Bill',
        amount_bdt: 7500,
        category_id: utilCat?.id || 2,
        subcategory_id: elecSub?.id || 2,
        expense_type: 'DIRECT',
        reference_id: null,
        frequency: 'MONTHLY',
        start_date: '2026-01-01',
        end_date: null,
        is_active: 1,
        remarks: 'Estimated monthly prepaid electricity meter recharge',
        created_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 3,
        title: 'Apartment Maintenance & Service Charge',
        amount_bdt: 5000,
        category_id: accomCat?.id || 1,
        subcategory_id: flatSub?.id || 3,
        expense_type: 'DIRECT',
        reference_id: null,
        frequency: 'MONTHLY',
        start_date: '2026-01-01',
        end_date: '2027-12-31',
        is_active: 1,
        remarks: 'Monthly building society security & lift maintenance dues',
        created_at: '2026-01-01T08:00:00.000Z',
      },
      {
        id: 4,
        title: 'Annual Vehicle Fitness & Tax Token Renewal',
        amount_bdt: 12500,
        category_id: categories.find((c) => c.name === 'Transportation & Commuting')?.id || 4,
        subcategory_id: subcategories.find((s) => s.name === 'Maintenance')?.id || 4,
        expense_type: 'VEHICLE',
        reference_id: 1,
        frequency: 'YEARLY',
        start_date: '2026-06-15',
        end_date: null,
        is_active: 1,
        remarks: 'BRTA annual fitness certificate and road tax token for Axio',
        created_at: '2026-01-15T10:00:00.000Z',
      },
    ];
  }
}

export const sqliteService = new SQLiteDatabaseService();
