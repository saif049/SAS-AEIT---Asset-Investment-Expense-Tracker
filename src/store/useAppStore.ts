/**
 * React Application State Hook for SAS-AEIT
 * Integrates SQLite database service with reactive state updates,
 * navigation routes, and drawer state.
 */

import { useState, useEffect, useCallback } from 'react';
import { sqliteService } from '../database/sqliteService';
import {
  Category,
  SubCategory,
  SystemLog,
  EnrichedExpense,
  EnrichedIncome,
  Investment,
  Property,
  Vehicle,
  FuelLog,
  EnrichedSavingsGoal,
  BudgetLimit,
  CategoryBudgetComparison,
  SavingsGoal,
  EnrichedRecurringExpense,
  RecurrenceFrequency,
  EnrichedPurchaseTask,
  PurchaseTask,
  PurchaseTaskStatus,
} from '../types/database';

export type NavigationScreen =
  | 'dashboard'
  | 'purchase_tasks'
  | 'development_repair'
  | 'savings_goals'
  | 'entry'
  | 'categories'
  | 'investments'
  | 'properties'
  | 'vehicles'
  | 'audit_logs'
  | 'backup_restore'
  | 'android_apk'
  | 'expo_code_export';

export function useAppStore() {
  const [activeScreen, setActiveScreen] = useState<NavigationScreen>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBooted, setIsBooted] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Core Data Cache
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [expenses, setExpenses] = useState<EnrichedExpense[]>([]);
  const [incomes, setIncomes] = useState<EnrichedIncome[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<EnrichedSavingsGoal[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [budgetComparisons, setBudgetComparisons] = useState<CategoryBudgetComparison[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<EnrichedRecurringExpense[]>([]);
  const [purchaseTasks, setPurchaseTasks] = useState<EnrichedPurchaseTask[]>([]);
  const [summary, setSummary] = useState(sqliteService.getDatabaseSummary());

  const reloadData = useCallback(async () => {
    try {
      await sqliteService.initDatabase();
      const [cats, subs, exps, incs, logs, invs, props, vehs, fuels, goals, budgets, comparisons, recurrings, purchases] =
        await Promise.all([
          sqliteService.getCategories(),
          sqliteService.getSubCategories(),
          sqliteService.getEnrichedExpenses(),
          sqliteService.getEnrichedIncomes(),
          sqliteService.getSystemLogs(200),
          sqliteService.getInvestments(),
          sqliteService.getProperties(),
          sqliteService.getVehicles(),
          sqliteService.getFuelLogs(),
          sqliteService.getSavingsGoals(),
          sqliteService.getBudgetLimits(),
          sqliteService.getCategoryBudgetComparisons(),
          sqliteService.getRecurringExpenses(),
          sqliteService.getPurchaseTasks(),
        ]);

      setCategories(cats);
      setSubcategories(subs);
      setExpenses(exps);
      setIncomes(incs);
      setSystemLogs(logs);
      setInvestments(invs);
      setProperties(props);
      setVehicles(vehs);
      setFuelLogs(fuels);
      setSavingsGoals(goals);
      setBudgetLimits(budgets);
      setBudgetComparisons(comparisons);
      setRecurringExpenses(recurrings);
      setPurchaseTasks(purchases);
      setSummary(sqliteService.getDatabaseSummary());
      setIsBooted(true);
    } catch (err) {
      console.error('Failed to load database state', err);
    }
  }, []);

  useEffect(() => {
    reloadData();
    const unsubscribe = sqliteService.subscribe(() => {
      setRefreshTick((t) => t + 1);
    });
    return unsubscribe;
  }, [reloadData]);

  useEffect(() => {
    if (isBooted) {
      reloadData();
    }
  }, [refreshTick, isBooted, reloadData]);

  return {
    activeScreen,
    setActiveScreen,
    isDrawerOpen,
    setIsDrawerOpen,
    isBooted,
    categories,
    subcategories,
    expenses,
    incomes,
    systemLogs,
    investments,
    properties,
    vehicles,
    fuelLogs,
    savingsGoals,
    budgetLimits,
    budgetComparisons,
    recurringExpenses,
    purchaseTasks,
    summary,
    refresh: reloadData,
    // Savings Goal Actions
    addSavingsGoal: async (goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>) => {
      const res = await sqliteService.addSavingsGoal(goal);
      await reloadData();
      return res;
    },
    updateSavingsGoal: async (id: number, updates: Partial<SavingsGoal>) => {
      const res = await sqliteService.updateSavingsGoal(id, updates);
      await reloadData();
      return res;
    },
    contributeToSavingsGoal: async (id: number, amount_bdt: number, note?: string) => {
      const res = await sqliteService.contributeToSavingsGoal(id, amount_bdt, note);
      await reloadData();
      return res;
    },
    syncGoalWithInvestment: async (id: number) => {
      const res = await sqliteService.syncGoalWithInvestment(id);
      await reloadData();
      return res;
    },
    deleteSavingsGoal: async (id: number) => {
      const res = await sqliteService.deleteSavingsGoal(id);
      await reloadData();
      return res;
    },
    // Budget Limit Actions
    setBudgetLimit: async (categoryId: number, limitBdt: number, threshold = 85) => {
      const res = await sqliteService.setBudgetLimit(categoryId, limitBdt, threshold);
      await reloadData();
      return res;
    },
    batchSetBudgetLimits: async (limits: { category_id: number; monthly_limit_bdt: number }[]) => {
      const res = await sqliteService.batchSetBudgetLimits(limits);
      await reloadData();
      return res;
    },
    // Recurring Expense Actions
    createRecurringExpense: async (params: {
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
    }) => {
      const res = await sqliteService.createRecurringExpense(params);
      await reloadData();
      return res;
    },
    toggleRecurringExpenseStatus: async (id: number) => {
      const res = await sqliteService.toggleRecurringExpenseStatus(id);
      await reloadData();
      return res;
    },
    deleteRecurringExpense: async (id: number) => {
      const res = await sqliteService.deleteRecurringExpense(id);
      await reloadData();
      return res;
    },
    // Future Purchase Task Actions
    addPurchaseTask: async (params: Parameters<typeof sqliteService.addPurchaseTask>[0]) => {
      const res = await sqliteService.addPurchaseTask(params);
      await reloadData();
      return res;
    },
    updatePurchaseTask: async (id: number, updates: Partial<PurchaseTask>) => {
      const res = await sqliteService.updatePurchaseTask(id, updates);
      await reloadData();
      return res;
    },
    togglePurchaseTaskStatus: async (id: number) => {
      const res = await sqliteService.togglePurchaseTaskStatus(id);
      await reloadData();
      return res;
    },
    completePurchaseTask: async (
      id: number,
      actual_cost_bdt?: number,
      createExpenseRecord?: boolean,
      category_id?: number,
      subcategory_id?: number
    ) => {
      const res = await sqliteService.completePurchaseTask(id, actual_cost_bdt, createExpenseRecord, category_id, subcategory_id);
      await reloadData();
      return res;
    },
    deletePurchaseTask: async (id: number) => {
      const res = await sqliteService.deletePurchaseTask(id);
      await reloadData();
      return res;
    },
    // Deployment Clean Action: wipes temporary demo records while preserving categories
    cleanTemporaryDataForDeployment: async () => {
      await sqliteService.cleanTemporaryDataForDeployment();
      await reloadData();
    },
    // Direct CSV Export Action
    exportTransactionsCSV: async (options?: {
      flow?: 'ALL' | 'EXPENSE' | 'INCOME';
      timeRange?: 'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR';
      customStartDate?: string;
      customEndDate?: string;
      filenamePrefix?: string;
    }) => {
      const res = await sqliteService.exportTransactionsCSV(options);
      await reloadData();
      return res;
    },
  };
}
