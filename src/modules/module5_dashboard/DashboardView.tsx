/**
 * MODULE 5: Interactive Dashboard & UI Layout
 * 
 * Components:
 * - Card A: Current Month Status (Total Income = Direct + Investment + Property;
 *           Total Expense = Direct + Investment + Property + Vehicle; Net Balance & Savings Rate)
 * - Card B: 30-Day Bar Diagram (Daily running bar chart comparing Income, Expense, Investments)
 * - Card C: Infographic (Live income vs top 10 expense distribution bar/stream graph)
 * - Card D: Recent Transactions (Top 10 recent transactions with category & subcategory)
 * - Cards E, F, G: Interactive Drill-Down Pie Charts (Aggregate totals with colored category rings.
 *                  Tapping a slice expands dynamically to show sub-category percentages & amounts!)
 * - Card H: Mileage Metrics (Vehicle fuel consumption per liter summary)
 * - Footer Badge: Fixed developer information panel:
 *   SAIF AHMED SAKIL, Freelancer
 *   MS in Applied Statistics, ISRT, University of Dhaka & LL.B, National University
 *   Mobile: +8801611447765 | Email: saif049@gmail.com
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Fuel,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Activity,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  AlertCircle,
  Wallet,
  ShieldAlert,
  Percent,
  PlusCircle,
  Sliders,
  Target,
  Search,
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  LineChart,
  Edit2,
  Trash2,
} from 'lucide-react';
import { SpendingTrendChart } from './SpendingTrendChart';
import {
  EnrichedExpense,
  EnrichedIncome,
  Vehicle,
  FuelLog,
  Investment,
  Property,
  Category,
  SubCategory,
  BudgetLimit,
  CategoryBudgetComparison,
} from '../../types/database';
import { formatBDT, formatBDTShort } from '../../utils/bdtFormatter';
import {
  exportTransactionsToCSV,
  buildCSVTransactionRecords,
} from '../../utils/csvExportService';
import { EditTransactionModal, EditableTransaction } from '../../components/EditTransactionModal';
import { sqliteService } from '../../database/sqliteService';

interface DashboardViewProps {
  expenses: EnrichedExpense[];
  incomes: EnrichedIncome[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  investments: Investment[];
  properties: Property[];
  categories?: Category[];
  subcategories?: SubCategory[];
  budgetLimits?: BudgetLimit[];
  budgetComparisons?: CategoryBudgetComparison[];
  onSetBudgetLimit?: (categoryId: number, limitBdt: number, threshold?: number) => Promise<unknown>;
  onBatchSetBudgetLimits?: (limits: { category_id: number; monthly_limit_bdt: number }[]) => Promise<unknown>;
  onUpdateExpense?: (id: number, updates: Parameters<typeof sqliteService.updateExpense>[1]) => Promise<unknown>;
  onDeleteExpense?: (id: number) => Promise<unknown>;
  onUpdateIncome?: (id: number, updates: Parameters<typeof sqliteService.updateIncome>[1]) => Promise<unknown>;
  onDeleteIncome?: (id: number) => Promise<unknown>;
  onQuickAddExpense: () => void;
  onQuickAddIncome: () => void;
  onNavigateToSavingsGoals?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  incomes,
  vehicles,
  fuelLogs,
  investments,
  properties,
  categories = [],
  subcategories = [],
  budgetLimits = [],
  budgetComparisons = [],
  onSetBudgetLimit,
  onBatchSetBudgetLimits,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateIncome,
  onDeleteIncome,
  onQuickAddExpense,
  onQuickAddIncome,
  onNavigateToSavingsGoals,
}) => {
  // Drill-down selected category for Cards E/F/G
  const [selectedPieCategory, setSelectedPieCategory] = useState<string | null>(null);

  // Card B high visibility settings: timeframe zoom, scale mode, and value labels
  const [cardBWindow, setCardBWindow] = useState<'7D' | '14D' | '30D'>('14D');
  const [cardBScaleMode, setCardBScaleMode] = useState<'adaptive' | 'linear'>('adaptive');
  const [showCardBValues, setShowCardBValues] = useState<boolean>(true);
  const [selectedCardBDay, setSelectedCardBDay] = useState<string | null>(null);

  // Budget Planner State
  const [budgetSearchQuery, setBudgetSearchQuery] = useState('');
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<'ALL' | 'OVERSPENT' | 'WARNING' | 'OK' | 'UNBUDGETED'>('ALL');
  const [editingBudgetCategory, setEditingBudgetCategory] = useState<CategoryBudgetComparison | null>(null);
  const [editBudgetLimitInput, setEditBudgetLimitInput] = useState('');
  const [editBudgetThresholdInput, setEditBudgetThresholdInput] = useState('85');
  const [budgetActionMsg, setBudgetActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const showBudgetNotification = (type: 'success' | 'error', text: string) => {
    setBudgetActionMsg({ type, text });
    setTimeout(() => setBudgetActionMsg(null), 3500);
  };

  // CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFlow, setExportFlow] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [exportTimeRange, setExportTimeRange] = useState<'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR' | 'CUSTOM'>('ALL');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showExportNotice = (type: 'success' | 'error', text: string) => {
    setExportNotice({ type, text });
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Live preview calculation for the CSV export modal
  const exportPreview = useMemo(() => {
    const records = buildCSVTransactionRecords(expenses, incomes, {
      flow: exportFlow,
      timeRange: exportTimeRange === 'CUSTOM' ? 'ALL' : exportTimeRange,
      customStartDate: exportTimeRange === 'CUSTOM' ? exportCustomStart : undefined,
      customEndDate: exportTimeRange === 'CUSTOM' ? exportCustomEnd : undefined,
      vehicles,
      properties,
      investments,
    });

    const incomeSum = records
      .filter((r) => r.type === 'INCOME')
      .reduce((s, r) => s + r.amountBDT, 0);

    const expenseSum = records
      .filter((r) => r.type === 'EXPENSE')
      .reduce((s, r) => s + r.amountBDT, 0);

    return {
      count: records.length,
      incomeSum,
      expenseSum,
      netSum: incomeSum - expenseSum,
    };
  }, [expenses, incomes, exportFlow, exportTimeRange, exportCustomStart, exportCustomEnd, vehicles, properties, investments]);

  // Execute export download
  const handleExecuteCSVExport = (
    flowOverride?: 'ALL' | 'EXPENSE' | 'INCOME',
    timeRangeOverride?: 'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR'
  ) => {
    try {
      const activeFlow = flowOverride || exportFlow;
      const activeTime = timeRangeOverride || (exportTimeRange === 'CUSTOM' ? 'ALL' : exportTimeRange);

      const result = exportTransactionsToCSV(expenses, incomes, {
        flow: activeFlow,
        timeRange: activeTime,
        customStartDate: exportTimeRange === 'CUSTOM' && !timeRangeOverride ? exportCustomStart : undefined,
        customEndDate: exportTimeRange === 'CUSTOM' && !timeRangeOverride ? exportCustomEnd : undefined,
        vehicles,
        properties,
        investments,
      });

      showExportNotice(
        'success',
        `Successfully downloaded ${result.filename} (${result.totalRecords} records)`
      );
      showBudgetNotification(
        'success',
        `CSV exported: ${result.totalRecords} transactions downloaded (${result.filename})`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'CSV export failed';
      showExportNotice('error', msg);
    }
  };

  // Time Window Filter
  const [timeRange, setTimeRange] = useState<'30D' | 'CURRENT_MONTH' | 'ALL'>('CURRENT_MONTH');

  // Filter Transactions by selected range
  const { currentExpenses, currentIncomes } = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (timeRange === 'CURRENT_MONTH') {
      return {
        currentExpenses: expenses.filter((e) => e.date.startsWith(currentYearMonth)),
        currentIncomes: incomes.filter((i) => i.date.startsWith(currentYearMonth)),
      };
    } else if (timeRange === '30D') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const isoThreshold = thirtyDaysAgo.toISOString().split('T')[0];
      return {
        currentExpenses: expenses.filter((e) => e.date >= isoThreshold),
        currentIncomes: incomes.filter((i) => i.date >= isoThreshold),
      };
    }
    return { currentExpenses: expenses, currentIncomes: incomes };
  }, [expenses, incomes, timeRange]);

  // -------------------------------------------------------------------------
  // CARD A CALCULATIONS: Current Month Status
  // Total Income = Direct Income + Investment Income + Property Income
  // Total Expense = Direct Expense + Investment Expense + Property Expense + Vehicle Expense
  // -------------------------------------------------------------------------
  const cardAMetrics = useMemo(() => {
    // Incomes breakdown
    const directIncome = currentIncomes
      .filter((i) => i.source_type === 'DIRECT')
      .reduce((sum, i) => sum + i.amount_bdt, 0);

    const investmentIncome = currentIncomes
      .filter((i) => i.source_type === 'INVESTMENT')
      .reduce((sum, i) => sum + i.amount_bdt, 0);

    const propertyIncome = currentIncomes
      .filter((i) => i.source_type === 'PROPERTY')
      .reduce((sum, i) => sum + i.amount_bdt, 0);

    const totalIncome = directIncome + investmentIncome + propertyIncome;

    // Expenses breakdown
    const directExpense = currentExpenses
      .filter((e) => e.expense_type === 'DIRECT')
      .reduce((sum, e) => sum + e.amount_bdt, 0);

    const investmentExpense = currentExpenses
      .filter((e) => e.expense_type === 'INVESTMENT')
      .reduce((sum, e) => sum + e.amount_bdt, 0);

    const propertyExpense = currentExpenses
      .filter((e) => e.expense_type === 'PROPERTY')
      .reduce((sum, e) => sum + e.amount_bdt, 0);

    const vehicleExpense = currentExpenses
      .filter((e) => e.expense_type === 'VEHICLE')
      .reduce((sum, e) => sum + e.amount_bdt, 0);

    const totalExpense = directExpense + investmentExpense + propertyExpense + vehicleExpense;

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    return {
      totalIncome,
      directIncome,
      investmentIncome,
      propertyIncome,
      totalExpense,
      directExpense,
      investmentExpense,
      propertyExpense,
      vehicleExpense,
      netSavings,
      savingsRate,
    };
  }, [currentIncomes, currentExpenses]);

  // -------------------------------------------------------------------------
  // CARD B CALCULATIONS: Running Cashflow Bar Diagram (High-Visibility Scaling)
  // -------------------------------------------------------------------------
  const cardBMetrics = useMemo(() => {
    const daysCount = cardBWindow === '7D' ? 7 : cardBWindow === '14D' ? 14 : 30;
    const days: {
      date: string;
      label: string;
      fullDate: string;
      income: number;
      expense: number;
      investment: number;
      net: number;
      incHeightPct: number;
      expHeightPct: number;
      transactionsCount: number;
    }[] = [];
    const now = new Date();

    let peakIncome = 0;
    let peakIncomeDate = '';
    let peakExpense = 0;
    let peakExpenseDate = '';
    let totalWindowIncome = 0;
    let totalWindowExpense = 0;
    let activeDaysCount = 0;

    const rawDays: {
      date: string;
      label: string;
      fullDate: string;
      income: number;
      expense: number;
      investment: number;
      transactionsCount: number;
    }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayIncomes = incomes.filter((inc) => inc.date === dateStr);
      const dayExpenses = expenses.filter((exp) => exp.date === dateStr);

      const incVal = dayIncomes.reduce((sum, inc) => sum + inc.amount_bdt, 0);
      const expVal = dayExpenses.reduce((sum, exp) => sum + exp.amount_bdt, 0);
      const invVal = dayIncomes
        .filter((inc) => inc.source_type === 'INVESTMENT')
        .reduce((sum, inc) => sum + inc.amount_bdt, 0);

      totalWindowIncome += incVal;
      totalWindowExpense += expVal;

      if (incVal > peakIncome) {
        peakIncome = incVal;
        peakIncomeDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (expVal > peakExpense) {
        peakExpense = expVal;
        peakExpenseDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (incVal > 0 || expVal > 0) activeDaysCount++;

      rawDays.push({
        date: dateStr,
        label: `${dayOfWeek} ${d.getDate()}`,
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        income: incVal,
        expense: expVal,
        investment: invVal,
        transactionsCount: dayIncomes.length + dayExpenses.length,
      });
    }

    const maxVal = Math.max(peakIncome, peakExpense, 10000);

    // Apply perceptual non-linear scaling or strict linear scaling:
    rawDays.forEach((d) => {
      const calcHeight = (val: number) => {
        if (val <= 0) return 0;
        if (cardBScaleMode === 'linear') {
          return Math.max(Math.round((val / maxVal) * 100), 5);
        }
        // Adaptive power scaling: small expenses (৳ 800 - ৳ 4,000) get baseline ≥ 18%
        // to remain clearly visible alongside large monthly salary spikes (৳ 185,000)
        const normalized = val / maxVal;
        return Math.min(Math.round(18 + 82 * Math.pow(normalized, 0.52)), 100);
      };

      days.push({
        ...d,
        net: d.income - d.expense,
        incHeightPct: calcHeight(d.income),
        expHeightPct: calcHeight(d.expense),
      });
    });

    const netWindowCashflow = totalWindowIncome - totalWindowExpense;

    return {
      days,
      maxVal,
      peakIncome,
      peakIncomeDate: peakIncomeDate || 'None',
      peakExpense,
      peakExpenseDate: peakExpenseDate || 'None',
      totalWindowIncome,
      totalWindowExpense,
      netWindowCashflow,
      activeDaysCount,
      daysCount,
    };
  }, [incomes, expenses, cardBWindow, cardBScaleMode]);

  // -------------------------------------------------------------------------
  // MONTHLY BUDGET PLANNER CALCULATIONS & REAL-TIME OVERSPENDING DETECTOR
  // -------------------------------------------------------------------------
  const liveBudgetComparisons = useMemo(() => {
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentPrefix));
    const limits = budgetLimits || [];

    // All active expense categories
    const expenseCats = (categories || []).filter((c) => c.type === 'EXPENSE' && c.is_active === 1);

    const result = expenseCats.map((cat) => {
      const budget = limits.find((b) => b.category_id === cat.id);
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
    return result.sort((a, b) => {
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
  }, [expenses, budgetLimits, categories]);

  const budgetTotals = useMemo(() => {
    const budgetedCategories = liveBudgetComparisons.filter((c) => c.monthly_limit_bdt > 0);
    const totalBudgeted = budgetedCategories.reduce((sum, c) => sum + c.monthly_limit_bdt, 0);
    const totalSpent = budgetedCategories.reduce((sum, c) => sum + c.actual_spent_bdt, 0);
    const netVariance = totalBudgeted - totalSpent;
    const overallBurnRate = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    const overspentList = liveBudgetComparisons.filter((c) => c.status === 'OVERSPENT');
    const warningList = liveBudgetComparisons.filter((c) => c.status === 'WARNING');
    const onTrackList = liveBudgetComparisons.filter((c) => c.status === 'OK');
    const unbudgetedList = liveBudgetComparisons.filter((c) => c.status === 'UNBUDGETED');

    return {
      totalBudgeted,
      totalSpent,
      netVariance,
      overallBurnRate,
      overspentList,
      warningList,
      onTrackList,
      unbudgetedList,
    };
  }, [liveBudgetComparisons]);

  // Filtered Budget List for Display
  const filteredBudgetList = useMemo(() => {
    return liveBudgetComparisons.filter((item) => {
      const matchesSearch = item.category_name.toLowerCase().includes(budgetSearchQuery.toLowerCase());
      const matchesStatus = budgetStatusFilter === 'ALL' || item.status === budgetStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [liveBudgetComparisons, budgetSearchQuery, budgetStatusFilter]);

  // Budget Actions
  const handleSaveBudgetLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudgetCategory) return;
    const limit = parseFloat(editBudgetLimitInput);
    const threshold = parseInt(editBudgetThresholdInput, 10);

    if (isNaN(limit) || limit <= 0) {
      showBudgetNotification('error', 'Budget limit must be a positive number in BDT.');
      return;
    }

    try {
      setIsSavingBudget(true);
      if (onSetBudgetLimit) {
        await onSetBudgetLimit(editingBudgetCategory.category_id, limit, isNaN(threshold) ? 85 : threshold);
      }
      showBudgetNotification('success', `Limit of ৳ ${limit.toLocaleString()} set for ${editingBudgetCategory.category_name}.`);
      setEditingBudgetCategory(null);
    } catch (err: unknown) {
      showBudgetNotification('error', err instanceof Error ? err.message : 'Failed to update limit.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleQuickSetRecommendedLimits = async () => {
    if (!onBatchSetBudgetLimits) return;
    try {
      setIsSavingBudget(true);
      const defaults: Record<string, number> = {
        Accommodations: 40000,
        Utilities: 8000,
        Connectivity: 2500,
        'Transportation & Commuting': 6000,
        Food: 6000,
        Fish: 6000,
        Meat: 8000,
        'Health & Medical': 5000,
        Household: 4000,
        'Personal Care & Clothing': 5000,
        'Vacation & Family Trip': 15000,
      };

      const limitsToSet: { category_id: number; monthly_limit_bdt: number }[] = [];
      categories.forEach((cat) => {
        if (cat.type === 'EXPENSE' && defaults[cat.name]) {
          limitsToSet.push({ category_id: cat.id, monthly_limit_bdt: defaults[cat.name] });
        }
      });

      if (limitsToSet.length > 0) {
        await onBatchSetBudgetLimits(limitsToSet);
        showBudgetNotification('success', `Automated limits configured for ${limitsToSet.length} categories.`);
      }
    } catch (err: unknown) {
      showBudgetNotification('error', err instanceof Error ? err.message : 'Auto-set failed.');
    } finally {
      setIsSavingBudget(false);
    }
  };

  // -------------------------------------------------------------------------
  // CARD C CALCULATIONS: Infographic Live Income vs Top 10 Expense Distribution
  // -------------------------------------------------------------------------
  const top10ExpenseCategories = useMemo(() => {
    const catTotals: Record<string, { total: number; subcategories: Record<string, number> }> = {};

    currentExpenses.forEach((exp) => {
      const cName = exp.category_name || 'Others';
      const sName = exp.subcategory_name || 'General';
      if (!catTotals[cName]) {
        catTotals[cName] = { total: 0, subcategories: {} };
      }
      catTotals[cName].total += exp.amount_bdt;
      catTotals[cName].subcategories[sName] =
        (catTotals[cName].subcategories[sName] || 0) + exp.amount_bdt;
    });

    return Object.entries(catTotals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [currentExpenses]);

  // -------------------------------------------------------------------------
  // CARD D: Recent Transactions (Top 10 combined and sorted by date desc)
  // -------------------------------------------------------------------------
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<EditableTransaction | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  const recentTransactions = useMemo(() => {
    const allTx: EditableTransaction[] = [];

    expenses.forEach((e) => {
      allTx.push({
        id: `exp-${e.id}`,
        rawId: e.id,
        date: e.date,
        amount_bdt: e.amount_bdt,
        type: 'EXPENSE',
        category: e.category_name || 'Expense',
        subcategory: e.subcategory_name || 'General',
        category_id: e.category_id,
        subcategory_id: e.subcategory_id,
        remarks: e.remarks || null,
        tag: e.expense_type,
      });
    });

    incomes.forEach((i) => {
      allTx.push({
        id: `inc-${i.id}`,
        rawId: i.id,
        date: i.date,
        amount_bdt: i.amount_bdt,
        type: 'INCOME',
        category: i.category_name || 'Income',
        subcategory: i.subcategory_name || 'General',
        category_id: i.category_id,
        subcategory_id: i.subcategory_id,
        remarks: i.remarks || null,
        tag: i.source_type,
      });
    });

    return allTx
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [expenses, incomes]);

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setIsDeletingTx(true);
      if (deletingTx.type === 'EXPENSE') {
        if (onDeleteExpense) {
          await onDeleteExpense(deletingTx.rawId);
        } else {
          await sqliteService.deleteExpense(deletingTx.rawId);
        }
      } else {
        if (onDeleteIncome) {
          await onDeleteIncome(deletingTx.rawId);
        } else {
          await sqliteService.deleteIncome(deletingTx.rawId);
        }
      }
      setDeletingTx(null);
    } catch (err) {
      console.error('Failed to delete transaction', err);
    } finally {
      setIsDeletingTx(false);
    }
  };

  // -------------------------------------------------------------------------
  // CARDS E, F, G: Interactive Drill-Down Pie Charts
  // Aggregate totals with colored category rings.
  // Tapping a slice dynamically displays sub-category percentages & amounts!
  // -------------------------------------------------------------------------
  const piePalette = [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#14B8A6', // Teal
    '#E11D48', // Rose
    '#6366F1', // Indigo
  ];

  const pieCategoriesData = useMemo(() => {
    const total = top10ExpenseCategories.reduce((sum, c) => sum + c.total, 0) || 1;
    let accumulatedAngle = 0;

    return top10ExpenseCategories.map((cat, idx) => {
      const percentage = (cat.total / total) * 100;
      const angle = (cat.total / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      return {
        name: cat.name,
        total: cat.total,
        percentage,
        startAngle,
        angle,
        color: piePalette[idx % piePalette.length],
        subcategories: cat.subcategories,
      };
    });
  }, [top10ExpenseCategories]);

  // Selected drill-down data
  const selectedDrillDown = useMemo(() => {
    if (!selectedPieCategory) {
      return pieCategoriesData[0] || null;
    }
    return pieCategoriesData.find((p) => p.name === selectedPieCategory) || pieCategoriesData[0];
  }, [pieCategoriesData, selectedPieCategory]);

  // -------------------------------------------------------------------------
  // CARD H: Mileage Metrics
  // Vehicle fuel consumption per liter summary
  // -------------------------------------------------------------------------
  const vehicleMileageMetrics = useMemo(() => {
    return vehicles.map((veh) => {
      const logs = fuelLogs.filter((f) => f.vehicle_id === veh.id);
      let calculatedKmPerLitre = 0;
      let totalFuelConsumed = 0;

      if (logs.length >= 2) {
        const sorted = [...logs].sort((a, b) => a.odometer_reading - b.odometer_reading);
        const dist = sorted[sorted.length - 1].odometer_reading - sorted[0].odometer_reading;
        totalFuelConsumed = sorted.slice(1).reduce((sum, l) => sum + l.unit_quantity, 0);
        if (totalFuelConsumed > 0 && dist > 0) {
          calculatedKmPerLitre = Number((dist / totalFuelConsumed).toFixed(2));
        }
      }

      return {
        vehicle: veh,
        logCount: logs.length,
        currentOdometer: veh.current_odometer,
        efficiencyKmPerL: calculatedKmPerLitre,
        totalFuelConsumed,
      };
    });
  }, [vehicles, fuelLogs]);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* Top Header & Range Controls */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Financial & Asset Dashboard
          </h2>
          <p className="text-xs text-slate-400">
            Module 5: Real-Time Cashflows, Relational Drill-Downs & Mileage Intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setTimeRange('CURRENT_MONTH')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === 'CURRENT_MONTH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Current Month
            </button>
            <button
              onClick={() => setTimeRange('30D')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === '30D'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === 'ALL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Jump to Card B */}
          <button
            onClick={() => {
              const el = document.getElementById('card-b-container');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Card B: Bar</span>
          </button>

          {/* Jump to Recharts Spending Trend Line Chart */}
          <button
            onClick={() => {
              const el = document.getElementById('spending-trend-chart-container');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Spending Trend</span>
          </button>

          {/* Jump to Budget Planner */}
          <button
            onClick={() => {
              const el = document.getElementById('budget-planner-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            <span>Budget Planner</span>
          </button>

          {/* Export CSV Trigger */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV spreadsheet of SQLite Incomes and Expenses"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>

          {/* Quick Actions */}
          <button
            onClick={onQuickAddIncome}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
          >
            + Income
          </button>
          <button
            onClick={onQuickAddExpense}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
          >
            + Expense
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CARD A: CURRENT MONTH STATUS */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Card A · Consolidated Cashflow Status
            </h3>
            <p className="text-xs text-slate-500">
              Total Incomes vs All Outflows (Direct + Investments + Properties + Vehicles)
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-950 text-slate-300 border border-slate-800">
            Savings Rate: <strong className="text-emerald-400">{cardAMetrics.savingsRate.toFixed(1)}%</strong>
          </span>
        </div>

        {/* 3 Main Stat Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Income Column */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Total Income</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {formatBDT(cardAMetrics.totalIncome)}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Direct Income:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.directIncome)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Investment Yield:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.investmentIncome)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Property Rental:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.propertyIncome)}</span>
              </div>
            </div>
          </div>

          {/* Expense Column */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/20">
            <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
              <span className="font-semibold uppercase tracking-wider">Total Expense</span>
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {formatBDT(cardAMetrics.totalExpense)}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Direct Expenses:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.directExpense)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vehicle & Fuel:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.vehicleExpense)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Property Repairs/Tax:</span>
                <span className="font-mono text-slate-200">{formatBDT(cardAMetrics.propertyExpense)}</span>
              </div>
            </div>
          </div>

          {/* Net Savings Column */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-blue-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
                <span className="font-semibold uppercase tracking-wider">Net Monthly Surplus</span>
                <Sparkles className="w-4 h-4" />
              </div>
              <p
                className={`text-2xl font-bold font-mono tabular-nums ${
                  cardAMetrics.netSavings >= 0 ? 'text-blue-400' : 'text-rose-400'
                }`}
              >
                {formatBDT(cardAMetrics.netSavings)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <p>
                Net retention is calculated against all direct operating costs and asset upkeep.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CARD B: RUNNING BAR DIAGRAM (HIGH-VISIBILITY DESIGN)  */}
      {/* ---------------------------------------------------- */}
      <div
        id="card-b-container"
        className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-400 rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.22)] ring-4 ring-emerald-500/20 relative overflow-hidden transition-all duration-300"
      >
        {/* Ambient Top Luminous Glow Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.9)]" />

        {/* Card Header & High-Impact Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold tracking-wider uppercase bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                CARD B · HIGH VISIBILITY
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-teal-500/20 border border-teal-500/40 text-teal-300">
                Running Cashflow Velocity
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {cardBMetrics.daysCount}-Day Trajectory
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Comparative Daily Cashflow &amp; Expenditure Velocity
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              High-contrast multi-day comparative bar graph tracking daily cash inflows vs allowable expenses. Includes direct on-bar BDT figures, micro-expense amplification, and spike inspection.
            </p>
          </div>

          {/* Interactive Controls: Timeframe, Scale Mode & Value Toggle */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Timeframe Zoom Buttons: 7D, 14D, 30D */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => {
                  setCardBWindow('7D');
                  setSelectedCardBDay(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cardBWindow === '7D'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => {
                  setCardBWindow('14D');
                  setSelectedCardBDay(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cardBWindow === '14D'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => {
                  setCardBWindow('30D');
                  setSelectedCardBDay(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cardBWindow === '30D'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                30 Days
              </button>
            </div>

            {/* Scale Mode Toggle: Adaptive vs Linear */}
            <button
              onClick={() => setCardBScaleMode(cardBScaleMode === 'adaptive' ? 'linear' : 'adaptive')}
              title={cardBScaleMode === 'adaptive' ? 'Switch to strict 1:1 linear scale' : 'Switch to adaptive power scale (highlights micro-expenses)'}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{cardBScaleMode === 'adaptive' ? 'Adaptive Scale' : 'Linear Scale'}</span>
            </button>

            {/* Direct Value Labels Toggle */}
            <button
              onClick={() => setShowCardBValues(!showCardBValues)}
              title="Toggle direct numeric badges above each bar"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                showCardBValues
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {showCardBValues ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showCardBValues ? 'Values ON' : 'Values OFF'}</span>
            </button>
          </div>
        </div>

        {/* High-Impact 5-Column Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-400 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Total Inflow</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-emerald-300 tabular-nums">
              {formatBDT(cardBMetrics.totalWindowIncome)}
            </p>
            <span className="text-[10px] text-slate-500">In selected {cardBMetrics.daysCount}d</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30">
            <div className="flex items-center justify-between text-xs text-rose-400 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Total Outflow</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
            <p className="text-base sm:text-lg font-bold font-mono text-rose-300 tabular-nums">
              {formatBDT(cardBMetrics.totalWindowExpense)}
            </p>
            <span className="text-[10px] text-slate-500">All expenses logged</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-blue-500/30">
            <div className="flex items-center justify-between text-xs text-blue-400 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Net Velocity</span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
              cardBMetrics.netWindowCashflow >= 0 ? 'text-blue-300' : 'text-rose-400'
            }`}>
              {cardBMetrics.netWindowCashflow >= 0 ? '+' : ''}{formatBDT(cardBMetrics.netWindowCashflow)}
            </p>
            <span className="text-[10px] text-slate-500">Retained cashflow</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
              Peak Inflow Spike
            </span>
            <p className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              {cardBMetrics.peakIncome > 0 ? formatBDT(cardBMetrics.peakIncome) : '৳ 0'}
            </p>
            <span className="text-[10px] text-slate-400 font-mono">
              {cardBMetrics.peakIncomeDate}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
              Peak Outflow Spike
            </span>
            <p className="text-base font-bold font-mono text-rose-400 tabular-nums">
              {cardBMetrics.peakExpense > 0 ? formatBDT(cardBMetrics.peakExpense) : '৳ 0'}
            </p>
            <span className="text-[10px] text-slate-400 font-mono">
              {cardBMetrics.peakExpenseDate}
            </span>
          </div>
        </div>

        {/* Chart Canvas with Guide Lines & Expanded Height */}
        <div className="relative pt-6 pb-2">
          {/* Horizontal Reference Dotted Gridlines with Values */}
          <div className="absolute inset-x-0 top-6 bottom-9 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-dashed border-emerald-400 w-full" />
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-dashed border-slate-400 w-full" />
            <div className="border-b border-slate-600 w-full" />
          </div>

          {/* Running Bars Grid */}
          <div className="h-72 sm:h-80 w-full flex items-end gap-2 sm:gap-3.5 px-2 overflow-x-auto relative z-10">
            {cardBMetrics.days.map((day) => {
              const isSelected = selectedCardBDay === day.date;
              const hasActivity = day.income > 0 || day.expense > 0;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedCardBDay(isSelected ? null : day.date)}
                  className={`flex-1 min-w-[32px] sm:min-w-[44px] flex flex-col items-center gap-1 group relative h-full justify-end cursor-pointer transition-all ${
                    isSelected ? 'scale-105' : 'hover:scale-102'
                  }`}
                >
                  {/* Floating Tooltip on Hover */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-slate-950 border border-emerald-500/50 text-[10px] text-slate-200 px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap">
                    <p className="font-bold text-white mb-0.5">{day.fullDate}</p>
                    <p className="text-emerald-400 font-mono">Inflow: +{formatBDT(day.income)}</p>
                    <p className="text-rose-400 font-mono">Outflow: -{formatBDT(day.expense)}</p>
                    <p className={`font-mono font-bold mt-0.5 pt-0.5 border-t border-slate-800 ${
                      day.net >= 0 ? 'text-blue-300' : 'text-rose-400'
                    }`}>
                      Net: {day.net >= 0 ? '+' : ''}{formatBDT(day.net)}
                    </p>
                  </div>

                  {/* On-Bar Direct Numeric Badges (When Enabled) */}
                  {showCardBValues && (
                    <div className="flex flex-col items-center gap-0.5 mb-1 z-20 pointer-events-none">
                      {day.income > 0 && (
                        <span className="text-[9px] font-mono font-bold text-emerald-300 bg-slate-950/90 border border-emerald-500/50 px-1 py-0.2 rounded shadow-xs whitespace-nowrap">
                          +{formatBDTShort(day.income)}
                        </span>
                      )}
                      {day.expense > 0 && (
                        <span className="text-[9px] font-mono font-bold text-rose-300 bg-slate-950/90 border border-rose-500/50 px-1 py-0.2 rounded shadow-xs whitespace-nowrap">
                          -{formatBDTShort(day.expense)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pair of Thick Vibrantly Styled Bars */}
                  <div className={`w-full flex items-end justify-center gap-1 h-[210px] sm:h-[230px] p-0.5 rounded-t-xl transition-all ${
                    isSelected ? 'bg-slate-800/90 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20' : 'group-hover:bg-slate-800/40'
                  }`}>
                    {/* Income Bar (Luminous Emerald-Cyan with Top Glow) */}
                    <div
                      style={{ height: `${day.incHeightPct}%` }}
                      className="w-1/2 bg-gradient-to-t from-emerald-600 via-emerald-400 to-teal-200 rounded-t-sm shadow-[0_0_10px_rgba(16,185,129,0.45)] border-t border-teal-200/80 transition-all duration-300"
                    />

                    {/* Expense Bar (Luminous Coral-Amber with Top Glow) */}
                    <div
                      style={{ height: `${day.expHeightPct}%` }}
                      className="w-1/2 bg-gradient-to-t from-rose-600 via-rose-500 to-amber-300 rounded-t-sm shadow-[0_0_10px_rgba(244,63,94,0.45)] border-t border-amber-200/80 transition-all duration-300"
                    />
                  </div>

                  {/* X-Axis Date Label */}
                  <span className={`text-[10px] font-mono truncate w-full text-center mt-1 transition-colors ${
                    isSelected
                      ? 'text-emerald-300 font-bold'
                      : hasActivity
                      ? 'text-slate-300 font-medium'
                      : 'text-slate-500'
                  }`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Expanded Detailed Inspector */}
        {selectedCardBDay && (() => {
          const selectedDayData = cardBMetrics.days.find((d) => d.date === selectedCardBDay);
          if (!selectedDayData) return null;
          const netDay = selectedDayData.income - selectedDayData.expense;

          // Find exact transactions for this day
          const dayIncomesList = incomes.filter((i) => i.date === selectedCardBDay);
          const dayExpensesList = expenses.filter((e) => e.date === selectedCardBDay);

          return (
            <div className="mt-5 p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 shadow-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Daily Ledger Breakdown</h4>
                    <span className="text-xs text-slate-400 font-mono">{selectedDayData.fullDate}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                    In: +{formatBDT(selectedDayData.income)}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
                    Out: -{formatBDT(selectedDayData.expense)}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg font-bold ${
                    netDay >= 0 ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  }`}>
                    Net: {netDay >= 0 ? '+' : ''}{formatBDT(netDay)}
                  </span>
                  <button
                    onClick={() => setSelectedCardBDay(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer ml-1"
                    title="Close Inspector"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Transaction Detail Lines */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dayIncomesList.length === 0 && dayExpensesList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1">No transaction records logged on this date.</p>
                ) : (
                  <>
                    {dayIncomesList.map((inc) => (
                      <div
                        key={inc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                            INCOME
                          </span>
                          <span className="font-semibold text-slate-200">{inc.category_name}</span>
                          {inc.subcategory_name && (
                            <span className="text-slate-400">· {inc.subcategory_name}</span>
                          )}
                          {inc.remarks && <span className="text-slate-500 italic">({inc.remarks})</span>}
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          +{formatBDT(inc.amount_bdt)}
                        </span>
                      </div>
                    ))}

                    {dayExpensesList.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                            EXPENSE
                          </span>
                          <span className="font-semibold text-slate-200">{exp.category_name}</span>
                          {exp.subcategory_name && (
                            <span className="text-slate-400">· {exp.subcategory_name}</span>
                          )}
                          {exp.remarks && <span className="text-slate-500 italic">({exp.remarks})</span>}
                        </div>
                        <span className="font-mono font-bold text-rose-400">
                          -{formatBDT(exp.amount_bdt)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Legend & Guide */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 shadow-sm shadow-emerald-500/50" /> Income Inflow
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-rose-500 shadow-sm shadow-rose-500/50" /> Expense Outflow
            </span>
            <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <span className="w-3 h-3 rounded-xs bg-blue-500 shadow-sm shadow-blue-500/50" /> Net Surplus
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Tap any daily bar to inspect full transaction ledger
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* RECHARTS: 30-DAY SPENDING TREND LINE CHART */}
      {/* ---------------------------------------------------- */}
      <div id="spending-trend-chart-container" className="scroll-mt-6">
        <SpendingTrendChart expenses={expenses} />
      </div>

      {/* ---------------------------------------------------- */}
      {/* MONTHLY BUDGET PLANNER & REAL-TIME OVERSPENDING MONITOR */}
      {/* ---------------------------------------------------- */}
      <div
        id="budget-planner-section"
        className="bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden ring-1 ring-purple-500/20 transition-all duration-300"
      >
        {/* Ambient Top Glow Ribbon */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-400 to-emerald-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />

        {/* Action Toast */}
        {budgetActionMsg && (
          <div
            className={`p-3 mb-4 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in duration-200 ${
              budgetActionMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
            }`}
          >
            {budgetActionMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{budgetActionMsg.text}</span>
          </div>
        )}

        {/* Header & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold tracking-wider uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Wallet className="w-3.5 h-3.5 text-purple-400" />
                MONTHLY BUDGET PLANNER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-800 text-slate-300 border border-slate-700">
                Current Month Limits
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Projected Category Limits vs Actual Outflows
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time variance monitor comparing actual expenditures against category limits and alerting of fiscal slippage immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={handleQuickSetRecommendedLimits}
              disabled={isSavingBudget}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Automatically populate recommended baseline monthly limits for all active categories"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Auto-Set Limits</span>
            </button>
            {onNavigateToSavingsGoals && (
              <button
                onClick={onNavigateToSavingsGoals}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Savings Goals Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Critical Overspending Alert Banner */}
        {budgetTotals.overspentList.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border-2 border-rose-500/80 shadow-xl shadow-rose-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>REAL-TIME OVERSPENDING DETECTED</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-slate-950">
                    {budgetTotals.overspentList.length} CATEGOR{budgetTotals.overspentList.length > 1 ? 'IES' : 'Y'}
                  </span>
                </h4>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  {budgetTotals.overspentList
                    .map(
                      (c) =>
                        `${c.category_name} (Spent: ৳ ${c.actual_spent_bdt.toLocaleString()} vs Limit: ৳ ${c.monthly_limit_bdt.toLocaleString()}, +${Math.round(c.percentage_consumed - 100)}%)`
                    )
                    .join(' · ')}
                </p>
              </div>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-slate-950 font-bold font-mono text-[11px] shrink-0">
              Immediate Action Advised
            </span>
          </div>
        )}

        {/* 4 Telemetry Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Total Budgeted */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
              Total Monthly Limit
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
              {formatBDT(budgetTotals.totalBudgeted)}
            </p>
            <span className="text-[10px] text-slate-500">
              Across active categories
            </span>
          </div>

          {/* Total Spent so far */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-purple-500/20">
            <div className="flex items-center justify-between text-xs text-purple-400 mb-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Month-to-Date Spend</span>
              <Percent className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono text-purple-300 tabular-nums">
              {formatBDT(budgetTotals.totalSpent)}
            </p>
            <span className="text-[10px] text-slate-400 font-mono">
              Burn Rate: <strong className="text-purple-300">{budgetTotals.overallBurnRate.toFixed(1)}%</strong>
            </span>
          </div>

          {/* Remaining Budget / Variance */}
          <div className={`p-3.5 rounded-2xl bg-slate-950/70 border ${
            budgetTotals.netVariance >= 0 ? 'border-emerald-500/20' : 'border-rose-500/30'
          }`}>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
              Net Budget Margin
            </span>
            <p className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              budgetTotals.netVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {budgetTotals.netVariance >= 0 ? '+' : ''}{formatBDT(budgetTotals.netVariance)}
            </p>
            <span className="text-[10px] text-slate-500">
              {budgetTotals.netVariance >= 0 ? 'Available surplus buffer' : 'Cumulative deficit'}
            </span>
          </div>

          {/* Health Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">
              Threshold Audit
            </span>
            <div className="flex items-center gap-2 mt-1">
              {budgetTotals.overspentList.length > 0 ? (
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  {budgetTotals.overspentList.length} Overspent
                </span>
              ) : budgetTotals.warningList.length > 0 ? (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  {budgetTotals.warningList.length} Near Limit
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  100% On Track
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {budgetTotals.onTrackList.length} within limits
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category limits..."
              value={budgetSearchQuery}
              onChange={(e) => setBudgetSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs overflow-x-auto">
            <button
              onClick={() => setBudgetStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                budgetStatusFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({liveBudgetComparisons.length})
            </button>
            <button
              onClick={() => setBudgetStatusFilter('OVERSPENT')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                budgetStatusFilter === 'OVERSPENT'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overspent ({budgetTotals.overspentList.length})
            </button>
            <button
              onClick={() => setBudgetStatusFilter('WARNING')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                budgetStatusFilter === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Near Limit ({budgetTotals.warningList.length})
            </button>
            <button
              onClick={() => setBudgetStatusFilter('OK')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                budgetStatusFilter === 'OK'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              On Track ({budgetTotals.onTrackList.length})
            </button>
          </div>
        </div>

        {/* Categories Budget Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredBudgetList.map((item) => {
            const hasLimit = item.monthly_limit_bdt > 0;
            const isOverspent = item.status === 'OVERSPENT';
            const isWarning = item.status === 'WARNING';
            const progressPct = Math.min(100, Math.round(item.percentage_consumed));

            return (
              <div
                key={item.category_id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isOverspent
                    ? 'bg-rose-950/20 border-rose-500/40 ring-1 ring-rose-500/20 shadow-md shadow-rose-950/20'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                      <span>{item.category_name}</span>
                      {isOverspent && (
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0" />
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Spent: <strong className="text-slate-200 font-mono">{formatBDT(item.actual_spent_bdt)}</strong>
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        isOverspent
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                          : isWarning
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : hasLimit
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {item.status === 'OVERSPENT'
                        ? 'OVERSPENT'
                        : item.status === 'WARNING'
                        ? 'NEAR LIMIT'
                        : item.status === 'OK'
                        ? 'ON TRACK'
                        : 'UNBUDGETED'}
                    </span>

                    <button
                      onClick={() => {
                        setEditingBudgetCategory(item);
                        setEditBudgetLimitInput(item.monthly_limit_bdt ? item.monthly_limit_bdt.toString() : '');
                        setEditBudgetThresholdInput('85');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Configure Budget Limit"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar with Color Shift */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative mb-1.5">
                  <div
                    style={{ width: `${hasLimit ? progressPct : 0}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOverspent
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                        : isWarning
                        ? 'bg-gradient-to-r from-amber-400 to-rose-400'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-300'
                    }`}
                  />
                </div>

                {/* Variance and Remaining */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">
                    Limit: <strong className="text-slate-300">{hasLimit ? formatBDT(item.monthly_limit_bdt) : 'Not set'}</strong>
                  </span>
                  <span>
                    {hasLimit ? (
                      isOverspent ? (
                        <span className="text-rose-400 font-bold">
                          +{formatBDT(Math.abs(item.variance_bdt))} Over ({item.percentage_consumed.toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold">
                          {formatBDT(item.variance_bdt)} left ({item.percentage_consumed.toFixed(0)}%)
                        </span>
                      )
                    ) : (
                      <button
                        onClick={() => {
                          setEditingBudgetCategory(item);
                          setEditBudgetLimitInput('5000');
                        }}
                        className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                      >
                        Set limit
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: EDIT CATEGORY BUDGET LIMIT */}
      {/* ======================================================== */}
      {editingBudgetCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Configure Budget Limit</h3>
              </div>
              <button
                onClick={() => setEditingBudgetCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Category</span>
              <strong className="text-white text-sm block">{editingBudgetCategory.category_name}</strong>
              <div className="flex justify-between items-center mt-2 text-slate-400 font-mono">
                <span>Month-to-Date Spend:</span>
                <span className="text-emerald-400 font-bold">{formatBDT(editingBudgetCategory.actual_spent_bdt)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveBudgetLimit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Monthly Limit (BDT) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="e.g. 8000"
                  value={editBudgetLimitInput}
                  onChange={(e) => setEditBudgetLimitInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  required
                  autoFocus
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Presets:</span>
                {[5000, 10000, 15000, 25000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEditBudgetLimitInput(preset.toString())}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                  >
                    ৳{preset / 1000}k
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Alert Warning Threshold (%)
                </label>
                <select
                  value={editBudgetThresholdInput}
                  onChange={(e) => setEditBudgetThresholdInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="75">75% (Early Warning)</option>
                  <option value="85">85% (Recommended)</option>
                  <option value="90">90% (Late Warning)</option>
                  <option value="100">100% (Strict Limit)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBudgetCategory(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBudget}
                  className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingBudget ? 'Saving...' : 'Set Budget Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CSV EXPORT MODAL DIALOG                              */}
      {/* ---------------------------------------------------- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Export Financial Records to CSV
                  </h3>
                  <p className="text-xs text-slate-400">
                    RFC-4180 format with UTF-8 BOM for Microsoft Excel & Google Sheets
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification alert inside modal */}
            {exportNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  exportNotice.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {exportNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{exportNotice.text}</span>
              </div>
            )}

            {/* Step 1: Flow Type */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                1. Select Transaction Scope
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL', label: 'All Records', desc: 'Incomes & Expenses' },
                  { id: 'EXPENSE', label: 'Expenses Only', desc: 'Outflows' },
                  { id: 'INCOME', label: 'Incomes Only', desc: 'Inflows' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExportFlow(item.id as 'ALL' | 'EXPENSE' | 'INCOME')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportFlow === item.id
                        ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] opacity-75">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Timeframe */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                2. Select Timeframe
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'CURRENT_MONTH', label: 'This Month' },
                  { id: '30D', label: 'Last 30 Days' },
                  { id: 'CUSTOM', label: 'Custom Range' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setExportTimeRange(
                        item.id as 'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR' | 'CUSTOM'
                      )
                    }
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-all cursor-pointer ${
                      exportTimeRange === item.id
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {exportTimeRange === 'CUSTOM' && (
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 mt-2">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={exportCustomStart}
                      onChange={(e) => setExportCustomStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={exportCustomEnd}
                      onChange={(e) => setExportCustomEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Telemetry Preview Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Matching SQLite Records:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {exportPreview.count} entries
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Incomes</span>
                  <span className="text-emerald-400 font-bold">
                    {formatBDTShort(exportPreview.incomeSum)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Expenses</span>
                  <span className="text-rose-400 font-bold">
                    {formatBDTShort(exportPreview.expenseSum)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Net Cashflow</span>
                  <span
                    className={`font-bold ${
                      exportPreview.netSum >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatBDTShort(exportPreview.netSum)}
                  </span>
                </div>
              </div>
            </div>

            {/* Included Fields Chips */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">
                Fields Included in CSV:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {[
                  'SL No',
                  'Voucher ID',
                  'Date',
                  'Type',
                  'Amount (BDT)',
                  'Category',
                  'Sub-Category',
                  'Classification',
                  'Asset Reference',
                  'Remarks',
                  'Audit Timestamp',
                ].map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleExecuteCSVExport()}
                disabled={exportPreview.count === 0}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CARD C: INFOGRAPHIC LIVE INCOME VS TOP 10 EXPENSES */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="pb-3 mb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Card C · Infographic: Income vs Top 10 Expense Distribution
          </h3>
          <p className="text-xs text-slate-500">
            Ranked proportional stream diagram of top expenditure centers
          </p>
        </div>

        <div className="space-y-3">
          {top10ExpenseCategories.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No expense records found.</p>
          ) : (
            top10ExpenseCategories.map((cat, idx) => {
              const maxCatTotal = top10ExpenseCategories[0].total || 1;
              const barPercent = (cat.total / maxCatTotal) * 100;
              const pctOfIncome =
                cardAMetrics.totalIncome > 0
                  ? ((cat.total / cardAMetrics.totalIncome) * 100).toFixed(1)
                  : '0';

              return (
                <div key={cat.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-medium flex items-center gap-2">
                      <span className="font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px] font-mono">
                        {pctOfIncome}% of Inflow
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {formatBDT(cat.total)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${barPercent}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CARDS E, F, G: INTERACTIVE DRILL-DOWN PIE CHARTS */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ring Visualizer (Card E/F) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="pb-3 mb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Cards E, F, G · Interactive Drill-Down Pie Ring
            </h3>
            <p className="text-xs text-slate-500">
              Tap any category slice to expand and inspect its cascading sub-categories.
            </p>
          </div>

          {/* SVG Donut Ring with Central Aggregate Total */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {pieCategoriesData.map((slice) => {
                  const strokeDasharray = `${(slice.percentage * 2 * Math.PI * 38) / 100} ${
                    2 * Math.PI * 38
                  }`;
                  const strokeDashoffset = `${
                    (-((slice.startAngle / 360) * 100 * 2 * Math.PI * 38)) / 100
                  }`;
                  const isSelected = selectedPieCategory === slice.name;

                  return (
                    <circle
                      key={slice.name}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isSelected ? '14' : '10'}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-80"
                      onClick={() => setSelectedPieCategory(slice.name)}
                    />
                  );
                })}
              </svg>

              {/* Central Aggregate Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {selectedPieCategory || 'Total Outflow'}
                </span>
                <span className="text-base font-bold font-mono text-white tabular-nums">
                  {formatBDTShort(
                    selectedDrillDown ? selectedDrillDown.total : cardAMetrics.totalExpense
                  )}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {selectedDrillDown ? `${selectedDrillDown.percentage.toFixed(1)}%` : '100%'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Clickable Legend */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
            {pieCategoriesData.slice(0, 6).map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedPieCategory(cat.name)}
                className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  selectedPieCategory === cat.name
                    ? 'bg-slate-800 border border-slate-700'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 truncate mr-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-200 truncate">{cat.name}</span>
                </div>
                <span className="font-mono text-slate-400 shrink-0 text-[11px]">
                  {cat.percentage.toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Drill-Down Inspector (Card G) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Sub-Category Drill-Down Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Expanded breakdown for: <strong className="text-emerald-400">{selectedDrillDown?.name || 'All'}</strong>
              </p>
            </div>
            {selectedDrillDown && (
              <span className="text-xs font-mono font-bold text-slate-200">
                {formatBDT(selectedDrillDown.total)}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {!selectedDrillDown || Object.keys(selectedDrillDown.subcategories).length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">
                Select a slice on the pie ring to view its sub-category granular percentages.
              </p>
            ) : (
              Object.entries(selectedDrillDown.subcategories)
                .sort((a, b) => b[1] - a[1])
                .map(([subName, subAmount]) => {
                  const subPct = ((subAmount / selectedDrillDown.total) * 100).toFixed(1);

                  return (
                    <div
                      key={subName}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">{subName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 text-[11px]">{subPct}%</span>
                          <span className="font-mono font-semibold text-white">
                            {formatBDT(subAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${subPct}%` }}
                          className="h-full bg-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CARD D: RECENT TRANSACTIONS TABLE */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Card D · Top 10 Recent Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Real-time feed across direct, investment, property, and vehicle ledgers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download full SQLite transaction ledger as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <span className="text-xs font-mono text-slate-400">10 Most Recent</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Sub-Category</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Sparkles className="w-6 h-6 text-emerald-400 opacity-80" />
                      <span className="font-semibold text-slate-300 text-sm">Clean Distribution State Active</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        All sample transactions removed. Record new direct entries to build your ledger with automated SQLite audit tracking.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">{tx.date}</td>
                    <td className="py-3 px-3 text-slate-200 font-medium">{tx.category}</td>
                    <td className="py-3 px-3 text-slate-400">{tx.subcategory}</td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-mono text-slate-300 uppercase">
                        {tx.tag}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-semibold tabular-nums ${
                        tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'} {formatBDT(tx.amount_bdt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit transaction (Audit Logged)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTx(tx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete transaction (Audit Logged)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CARD H: MILEAGE METRICS */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="pb-3 mb-4 border-b border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            Card H · Vehicle Fuel Consumption & Mileage Metrics
          </h3>
          <p className="text-xs text-slate-500">
            Real-time km per Liter efficiency calculated from SQLite FuelLogs and odometer telemetry
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicleMileageMetrics.map((vm) => (
            <div
              key={vm.vehicle.id}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <h4 className="text-sm font-bold text-white">
                  {vm.vehicle.brand} {vm.vehicle.model}
                </h4>
                <p className="text-xs font-mono text-amber-400">{vm.vehicle.reg_no}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Odometer: <strong className="text-slate-200 font-mono">{vm.currentOdometer.toLocaleString()} km</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Efficiency Rating
                </span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {vm.efficiencyKmPerL > 0 ? `${vm.efficiencyKmPerL} km/L` : 'Calibrating'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  {vm.logCount} refuels logged
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FOOTER BADGE: FIXED DEVELOPER INFORMATION PANEL */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-sm font-bold tracking-tight text-white uppercase">
                SAIF AHMED SAKIL, Freelancer
              </h4>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              <span>MS in Applied Statistics, ISRT, University of Dhaka & LL.B, National University</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
            <a
              href="tel:+8801611447765"
              className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>+8801611447765</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <a
              href="mailto:saif049@gmail.com"
              className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>saif049@gmail.com</span>
            </a>
          </div>
        </div>
      </div>
      {/* Transaction Edit Modal */}
      {editingTx && (
        <EditTransactionModal
          isOpen={true}
          onClose={() => setEditingTx(null)}
          transaction={editingTx}
          categories={categories}
          subcategories={subcategories}
          onSaved={() => {
            setEditingTx(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Transaction?</h3>
                <p className="text-xs text-slate-400">
                  This action will be permanently recorded in SQLite system audit logs.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Record ID:</span>
                <span className="font-mono text-slate-200 font-bold">{deletingTx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono text-rose-400 font-bold">{formatBDT(deletingTx.amount_bdt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200">{deletingTx.category} ({deletingTx.subcategory})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-slate-300">{deletingTx.date}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingTx}
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingTx ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting & Logging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
