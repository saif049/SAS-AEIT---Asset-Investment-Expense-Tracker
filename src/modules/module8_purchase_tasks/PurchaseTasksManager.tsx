/**
 * MODULE 8: Future Purchase Tasks & Shopping Planner
 * 
 * Requirements:
 * 1. Plan future purchase (Multiple) tasks with:
 *    - Item to purchase (item_name)
 *    - Target date
 *    - Quantity with unit (No / Kg / Litre)
 *    - Remarks / notes
 * 2. Viewable from Android Widget ("android wetget") mode
 * 3. Batch quick-add for multiple grocery / market items
 * 4. 1-tap completion with option to auto-convert to SQLite Expense record
 * 5. Full audit logging in SQLite SystemLogs
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Tag,
  DollarSign,
  Smartphone,
  Layers,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Download,
  ListPlus,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  EnrichedPurchaseTask,
  PurchaseTask,
  PurchaseTaskUnit,
  PurchaseTaskPriority,
  PurchaseTaskStatus,
  Category,
  SubCategory,
} from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';
import { AndroidWidgetView } from './AndroidWidgetView';

interface PurchaseTasksManagerProps {
  purchaseTasks: EnrichedPurchaseTask[];
  categories: Category[];
  subcategories: SubCategory[];
  onAddTask: (task: {
    item_name: string;
    category_id?: number | null;
    subcategory_id?: number | null;
    target_date: string;
    quantity: number;
    unit: PurchaseTaskUnit;
    estimated_cost_bdt?: number | null;
    priority?: PurchaseTaskPriority;
    remarks?: string | null;
  }) => Promise<unknown>;
  onUpdateTask: (id: number, updates: Partial<PurchaseTask>) => Promise<unknown>;
  onToggleStatus: (id: number) => Promise<unknown>;
  onCompleteTask: (
    id: number,
    actual_cost_bdt?: number,
    createExpenseRecord?: boolean,
    category_id?: number,
    subcategory_id?: number
  ) => Promise<unknown>;
  onDeleteTask: (id: number) => Promise<unknown>;
}

export const PurchaseTasksManager: React.FC<PurchaseTasksManagerProps> = ({
  purchaseTasks,
  categories,
  subcategories,
  onAddTask,
  onUpdateTask,
  onToggleStatus,
  onCompleteTask,
  onDeleteTask,
}) => {
  // Main View Mode: standard list view or Android Widget view
  const [viewMode, setViewMode] = useState<'LIST' | 'WIDGET'>('LIST');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseTaskStatus>('PENDING');
  const [unitFilter, setUnitFilter] = useState<'ALL' | PurchaseTaskUnit>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PurchaseTaskPriority>('ALL');

  // Single Item Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EnrichedPurchaseTask | null>(null);
  const [singleFormData, setSingleFormData] = useState({
    item_name: '',
    category_id: '' as string,
    subcategory_id: '' as string,
    target_date: new Date().toISOString().split('T')[0],
    quantity: '1',
    unit: 'No' as PurchaseTaskUnit,
    estimated_cost_bdt: '',
    priority: 'MEDIUM' as PurchaseTaskPriority,
    remarks: '',
  });

  // Batch Multi-Item Add Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTargetDate, setBatchTargetDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [batchDefaultUnit, setBatchDefaultUnit] = useState<PurchaseTaskUnit>('No');
  const [batchDefaultPriority, setBatchDefaultPriority] = useState<PurchaseTaskPriority>('MEDIUM');
  const [batchItemsText, setBatchItemsText] = useState('');

  // Complete & Convert to Expense Modal
  const [completeTarget, setCompleteTarget] = useState<EnrichedPurchaseTask | null>(null);
  const [actualCostInput, setActualCostInput] = useState('');
  const [createExpenseCheckbox, setCreateExpenseCheckbox] = useState(true);
  const [completeExpenseCatId, setCompleteExpenseCatId] = useState<number | null>(null);
  const [completeExpenseSubId, setCompleteExpenseSubId] = useState<number | null>(null);

  // Delete Target Modal (iFrame-safe)
  const [taskToDelete, setTaskToDelete] = useState<EnrichedPurchaseTask | null>(null);

  // Status Notification Toast
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  // Expense Categories for linking
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'EXPENSE' && c.is_active === 1);
  }, [categories]);

  const cascadingSubcategories = useMemo(() => {
    if (!completeExpenseCatId) return [];
    return subcategories.filter(
      (s) => s.category_id === completeExpenseCatId && s.is_active === 1
    );
  }, [subcategories, completeExpenseCatId]);

  // Today string for calculations
  const todayStr = new Date().toISOString().split('T')[0];

  // ----------------------------------------------------
  // Aggregate Metrics
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    const totalCount = purchaseTasks.length;
    const pendingCount = purchaseTasks.filter((t) => t.status === 'PENDING').length;
    const purchasedCount = purchaseTasks.filter((t) => t.status === 'PURCHASED').length;
    const overdueCount = purchaseTasks.filter((t) => t.is_overdue).length;
    const todayCount = purchaseTasks.filter(
      (t) => t.status === 'PENDING' && t.target_date === todayStr
    ).length;

    // Unit breakdown
    const pendingItems = purchaseTasks.filter((t) => t.status === 'PENDING');
    const noCount = pendingItems.filter((t) => t.unit === 'No').reduce((s, t) => s + t.quantity, 0);
    const kgCount = pendingItems.filter((t) => t.unit === 'Kg').reduce((s, t) => s + t.quantity, 0);
    const litreCount = pendingItems.filter((t) => t.unit === 'Litre').reduce((s, t) => s + t.quantity, 0);

    const estimatedBudgetSum = pendingItems.reduce(
      (s, t) => s + (t.estimated_cost_bdt || 0),
      0
    );

    return {
      totalCount,
      pendingCount,
      purchasedCount,
      overdueCount,
      todayCount,
      noCount,
      kgCount,
      litreCount,
      estimatedBudgetSum,
    };
  }, [purchaseTasks, todayStr]);

  // ----------------------------------------------------
  // Filtered Tasks
  // ----------------------------------------------------
  const filteredTasks = useMemo(() => {
    return purchaseTasks.filter((t) => {
      // Status
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Unit (No / Kg / Litre)
      if (unitFilter !== 'ALL' && t.unit !== unitFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      // Timeframe
      if (timeFilter === 'TODAY' && t.target_date !== todayStr) return false;
      if (timeFilter === 'OVERDUE' && !t.is_overdue) return false;
      if (timeFilter === 'WEEK') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        if (t.target_date < todayStr || t.target_date > nextWeekStr) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.item_name.toLowerCase().includes(q);
        const matchesRemarks = t.remarks ? t.remarks.toLowerCase().includes(q) : false;
        const matchesCat = t.category_name ? t.category_name.toLowerCase().includes(q) : false;
        const matchesSub = t.subcategory_name ? t.subcategory_name.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesRemarks && !matchesCat && !matchesSub) return false;
      }

      return true;
    });
  }, [purchaseTasks, statusFilter, unitFilter, timeFilter, priorityFilter, searchQuery, todayStr]);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const openCreateModal = () => {
    setEditingTask(null);
    setSingleFormData({
      item_name: '',
      category_id: '',
      subcategory_id: '',
      target_date: new Date().toISOString().split('T')[0],
      quantity: '1',
      unit: 'No',
      estimated_cost_bdt: '',
      priority: 'MEDIUM',
      remarks: '',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: EnrichedPurchaseTask) => {
    setEditingTask(task);
    setSingleFormData({
      item_name: task.item_name,
      category_id: task.category_id ? String(task.category_id) : '',
      subcategory_id: task.subcategory_id ? String(task.subcategory_id) : '',
      target_date: task.target_date,
      quantity: String(task.quantity),
      unit: task.unit,
      estimated_cost_bdt: task.estimated_cost_bdt ? String(task.estimated_cost_bdt) : '',
      priority: task.priority,
      remarks: task.remarks || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveSingleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFormData.item_name.trim()) {
      showNotification('error', 'Please specify the item name to purchase.');
      return;
    }
    const qty = parseFloat(singleFormData.quantity);
    if (isNaN(qty) || qty <= 0) {
      showNotification('error', 'Please enter a valid quantity greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, {
          item_name: singleFormData.item_name.trim(),
          category_id: singleFormData.category_id ? Number(singleFormData.category_id) : null,
          subcategory_id: singleFormData.subcategory_id ? Number(singleFormData.subcategory_id) : null,
          target_date: singleFormData.target_date,
          quantity: qty,
          unit: singleFormData.unit,
          estimated_cost_bdt: singleFormData.estimated_cost_bdt ? parseFloat(singleFormData.estimated_cost_bdt) : null,
          priority: singleFormData.priority,
          remarks: singleFormData.remarks.trim() || null,
        });
        showNotification('success', `Purchase task "${singleFormData.item_name}" updated.`);
      } else {
        await onAddTask({
          item_name: singleFormData.item_name.trim(),
          category_id: singleFormData.category_id ? Number(singleFormData.category_id) : null,
          subcategory_id: singleFormData.subcategory_id ? Number(singleFormData.subcategory_id) : null,
          target_date: singleFormData.target_date,
          quantity: qty,
          unit: singleFormData.unit,
          estimated_cost_bdt: singleFormData.estimated_cost_bdt ? parseFloat(singleFormData.estimated_cost_bdt) : null,
          priority: singleFormData.priority,
          remarks: singleFormData.remarks.trim() || null,
        });
        showNotification('success', `Added "${singleFormData.item_name}" (${qty} ${singleFormData.unit}) to future purchase tasks.`);
      }
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save purchase task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Multi-Item Add Handler
  const handleSaveBatchTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchItemsText.trim()) return;

    // Parse lines: e.g.
    // "Basmati Rice, 5, Kg, Monthly stock"
    // or "Milk, 2, Litre"
    // or "LED Bulbs, 3"
    const lines = batchItemsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let addedCount = 0;
    setIsSubmitting(true);

    try {
      for (const line of lines) {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        const itemName = parts[0];
        if (!itemName) continue;

        let qty = 1;
        let unit: PurchaseTaskUnit = batchDefaultUnit;
        let remarks = '';

        if (parts[1]) {
          const parsedQty = parseFloat(parts[1]);
          if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
        }

        if (parts[2]) {
          const uStr = parts[2].toLowerCase();
          if (uStr.includes('kg') || uStr.includes('kilo')) unit = 'Kg';
          else if (uStr.includes('l') || uStr.includes('litre') || uStr.includes('liter')) unit = 'Litre';
          else if (uStr.includes('no') || uStr.includes('pc') || uStr.includes('unit')) unit = 'No';
        }

        if (parts[3]) {
          remarks = parts.slice(3).join(', ');
        }

        await onAddTask({
          item_name: itemName,
          target_date: batchTargetDate,
          quantity: qty,
          unit,
          priority: batchDefaultPriority,
          remarks: remarks || null,
        });
        addedCount++;
      }

      showNotification('success', `Successfully batch-scheduled ${addedCount} future purchase tasks!`);
      setIsBatchModalOpen(false);
      setBatchItemsText('');
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Batch import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Complete Purchase Modal
  const openCompleteModal = (task: EnrichedPurchaseTask) => {
    setCompleteTarget(task);
    setActualCostInput(task.estimated_cost_bdt ? String(task.estimated_cost_bdt) : '');
    setCreateExpenseCheckbox(true);
    setCompleteExpenseCatId(task.category_id || (expenseCategories[0]?.id || null));
    setCompleteExpenseSubId(task.subcategory_id || null);
  };

  // Execute Complete Purchase
  const handleExecuteComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;

    setIsSubmitting(true);
    try {
      const cost = actualCostInput ? parseFloat(actualCostInput) : undefined;
      await onCompleteTask(
        completeTarget.id,
        cost,
        createExpenseCheckbox,
        completeExpenseCatId || undefined,
        completeExpenseSubId || undefined
      );

      const expNote = createExpenseCheckbox && cost ? ` and logged ৳ ${cost} to SQLite Expenses` : '';
      showNotification(
        'success',
        `Marked "${completeTarget.item_name}" as purchased${expNote}!`
      );
      setCompleteTarget(null);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Could not complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Task Confirmation
  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await onDeleteTask(taskToDelete.id);
      showNotification('success', `Deleted purchase task "${taskToDelete.item_name}".`);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setTaskToDelete(null);
    }
  };

  // Copy Shopping Checklist to Clipboard
  const handleCopyShoppingList = async () => {
    const pending = purchaseTasks.filter((t) => t.status === 'PENDING');
    if (pending.length === 0) {
      showNotification('error', 'No pending items to copy.');
      return;
    }

    const text = [
      '🛒 SAS-AEIT Shopping & Purchase Checklist:',
      ...pending.map(
        (t, idx) =>
          `${idx + 1}. [ ] ${t.item_name} - ${t.quantity} ${t.unit} (Due: ${t.target_date})${t.remarks ? ` [${t.remarks}]` : ''}`
      ),
      `\nTotal items: ${pending.length}`,
    ].join('\n');

    await navigator.clipboard.writeText(text);
    showNotification('success', `Copied ${pending.length} purchase tasks to clipboard!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
            notice.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Module 8 Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
              Module 8 Planner
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-medium">No · Kg · Litre Tracking</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 mt-1">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Future Purchase Tasks &amp; Shopping Planner</span>
          </h2>
          <p className="text-xs text-slate-400">
            Keep in mind upcoming multi-item purchases with date, quantity (No/Kg/Litre), remarks &amp; Android Widget support
          </p>
        </div>

        {/* Action Buttons: Add Item, Batch Multi-Add, Widget Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Android Widget Mode Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'LIST' ? 'WIDGET' : 'LIST')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'WIDGET'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle Android Widget View"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{viewMode === 'WIDGET' ? 'Full View' : 'Android Widget'}</span>
          </button>

          {/* Copy List */}
          <button
            type="button"
            onClick={handleCopyShoppingList}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title="Copy Pending Shopping List to Clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy List</span>
          </button>

          {/* Batch Multi-Item Add */}
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Quick Batch Add Multiple Items"
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Batch Add</span>
          </button>

          {/* New Single Purchase Task */}
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Pending Items */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Pending Purchases</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {metrics.pendingCount}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            of {metrics.totalCount} total tasks scheduled
          </span>
        </div>

        {/* Due Today / Overdue */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Today &amp; Overdue</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${metrics.overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {metrics.todayCount}
            </span>
            {metrics.overdueCount > 0 && (
              <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                {metrics.overdueCount} overdue
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            immediate priority purchases
          </span>
        </div>

        {/* Quantities (No / Kg / Litre) */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Pending Quantities</span>
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {metrics.noCount} No
            </span>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {metrics.kgCount} Kg
            </span>
            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {metrics.litreCount} L
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            across classified units
          </span>
        </div>

        {/* Estimated Budget Sum */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider">Estimated Budget</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
            {formatBDT(metrics.estimatedBudgetSum)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            estimated pending outlay
          </span>
        </div>
      </div>

      {/* Android Widget Simulator Mode Container */}
      {viewMode === 'WIDGET' && (
        <AndroidWidgetView
          tasks={purchaseTasks}
          onToggleStatus={onToggleStatus}
          onOpenCreateModal={openCreateModal}
        />
      )}

      {/* Standard List / Grid View */}
      {viewMode === 'LIST' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, remarks, or category..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Segmented Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto overflow-x-auto no-scrollbar">
                {(['PENDING', 'PURCHASED', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                      statusFilter === st
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'PENDING'
                      ? `Pending (${metrics.pendingCount})`
                      : st === 'PURCHASED'
                      ? `Purchased (${metrics.purchasedCount})`
                      : `All (${metrics.totalCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Filter Chips: Unit Filter (No / Kg / Litre) & Timeframe */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              {/* Unit Filter Chips */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-1">Unit:</span>
                {(['ALL', 'No', 'Kg', 'Litre'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitFilter(u)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      unitFilter === u
                        ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {u === 'ALL' ? 'All Units' : u}
                  </button>
                ))}
              </div>

              {/* Timeframe Chips */}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[11px] text-slate-400 mr-1">Timeline:</span>
                {[
                  { id: 'ALL', label: 'Anytime' },
                  { id: 'TODAY', label: 'Due Today' },
                  { id: 'WEEK', label: 'Next 7 Days' },
                  { id: 'OVERDUE', label: 'Overdue' },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeFilter(tf.id as any)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      timeFilter === tf.id
                        ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks List Table / Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No purchase tasks found</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add items you plan to buy in the future with target dates, quantity (No/Kg/Litre), and remarks.
                </p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Purchase Task</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredTasks.map((task) => {
                  const isPurchased = task.status === 'PURCHASED';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 sm:p-5 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPurchased ? 'opacity-65 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Left Block: Checkbox, Item Name, Quantity, Remarks, Category */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* 1-Tap Status Checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleStatus(task.id)}
                          className="mt-0.5 p-1 text-slate-400 hover:text-emerald-400 cursor-pointer shrink-0 transition-transform active:scale-90"
                          title={isPurchased ? 'Mark as Pending' : 'Mark as Purchased'}
                        >
                          {isPurchased ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-bold tracking-tight ${
                                isPurchased
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-100'
                              }`}
                            >
                              {task.item_name}
                            </span>

                            {/* Quantity Pill (No / Kg / Litre) */}
                            <span
                              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                                task.unit === 'Kg'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : task.unit === 'Litre'
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {task.quantity} {task.unit}
                            </span>

                            {/* Priority Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                task.priority === 'URGENT'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : task.priority === 'MEDIUM'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {task.priority}
                            </span>

                            {/* Overdue Badge */}
                            {task.is_overdue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Overdue by {Math.abs(task.days_until_target || 0)}d</span>
                              </span>
                            )}
                          </div>

                          {/* Remarks / Notes */}
                          {task.remarks && (
                            <p className="text-xs text-slate-400 italic">
                              "{task.remarks}"
                            </p>
                          )}

                          {/* Metadata row: Target Date & Category */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span className={task.is_overdue ? 'text-rose-400 font-bold' : ''}>
                                Target: {task.target_date}
                              </span>
                              {task.days_until_target !== undefined && !isPurchased && (
                                <span className="text-slate-400">
                                  ({task.days_until_target === 0
                                    ? 'Today'
                                    : task.days_until_target === 1
                                    ? 'Tomorrow'
                                    : task.days_until_target > 1
                                    ? `In ${task.days_until_target} days`
                                    : `${Math.abs(task.days_until_target)} days overdue`})
                                </span>
                              )}
                            </span>

                            {task.category_name && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Tag className="w-3 h-3 text-emerald-400" />
                                <span>{task.category_name}</span>
                                {task.subcategory_name && <span>/ {task.subcategory_name}</span>}
                              </span>
                            )}

                            {isPurchased && task.purchased_date && (
                              <span className="text-emerald-400 font-medium">
                                ✓ Purchased on {task.purchased_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Cost & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        {/* Cost Display */}
                        <div className="text-left sm:text-right">
                          {isPurchased && task.actual_cost_bdt !== null ? (
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                Paid Cost
                              </span>
                              <span className="text-sm font-bold font-mono text-emerald-400">
                                {formatBDT(task.actual_cost_bdt)}
                              </span>
                            </div>
                          ) : task.estimated_cost_bdt ? (
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                                Est. Budget
                              </span>
                              <span className="text-sm font-bold font-mono text-slate-200">
                                {formatBDT(task.estimated_cost_bdt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">No est. cost</span>
                          )}
                        </div>

                        {/* Complete & Convert to Expense button */}
                        {!isPurchased && (
                          <button
                            type="button"
                            onClick={() => openCompleteModal(task)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Complete purchase & record actual price"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">Buy</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: Single Item Create / Edit Modal */}
      {/* ---------------------------------------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>{editingTask ? 'Edit Purchase Task' : 'New Future Purchase Task'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleTask} className="mt-4 space-y-4 text-xs">
              {/* Item Name */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Item to Purchase <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Motor Engine Oil, LED Tube Light, Fresh Fish"
                  value={singleFormData.item_name}
                  onChange={(e) => setSingleFormData({ ...singleFormData, item_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              {/* Quantity & Unit (No / Kg / Litre) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="e.g. 5, 2.5, 1"
                    value={singleFormData.quantity}
                    onChange={(e) => setSingleFormData({ ...singleFormData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Unit Type <span className="text-rose-400">*</span>
                  </label>
                  {/* Dedicated Unit Selector: No, Kg, Litre */}
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                    {(['No', 'Kg', 'Litre'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setSingleFormData({ ...singleFormData, unit: u })}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          singleFormData.unit === u
                            ? 'bg-emerald-500 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Date & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Purchase Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={singleFormData.target_date}
                    onChange={(e) => setSingleFormData({ ...singleFormData, target_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Priority</label>
                  <select
                    value={singleFormData.priority}
                    onChange={(e) => setSingleFormData({ ...singleFormData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Estimated Budget (BDT) */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex items-center justify-between">
                  <span>Estimated Budget (BDT)</span>
                  {singleFormData.estimated_cost_bdt && (
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatBDT(parseFloat(singleFormData.estimated_cost_bdt) || 0)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400">৳</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional estimated cost in BDT"
                    value={singleFormData.estimated_cost_bdt}
                    onChange={(e) => setSingleFormData({ ...singleFormData, estimated_cost_bdt: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Optional Category Linking */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Link to Expense Category (Optional)
                </label>
                <select
                  value={singleFormData.category_id}
                  onChange={(e) => setSingleFormData({ ...singleFormData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">No category (Uncategorized)</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Remarks / Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Brand preference, vendor name, Karwan Bazar wholesale store, specific packaging notes..."
                  value={singleFormData.remarks}
                  onChange={(e) => setSingleFormData({ ...singleFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingTask ? 'Update Task' : 'Save Purchase Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: Batch Multi-Item Quick Add Modal */}
      {/* ---------------------------------------------------- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-teal-400" />
                <span>Batch Add Multiple Purchase Tasks</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchTasks} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-400">
                Quickly schedule multiple items. Enter one item per line using format:{' '}
                <code className="text-emerald-400 font-mono">Item Name, Quantity, Unit, Remarks</code>
              </p>

              {/* Target Date for all batch items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={batchTargetDate}
                    onChange={(e) => setBatchTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Default Unit</label>
                  <select
                    value={batchDefaultUnit}
                    onChange={(e) => setBatchDefaultUnit(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="No">No (Piece / Unit)</option>
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="Litre">Litre</option>
                  </select>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1 font-semibold">Load Sample Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBatchItemsText(
                        `Basmati Rice, 25, Kg, Monthly supply\nMustard Oil, 5, Litre, Ghani vanga\nSalt, 2, Kg, Iodized\nSugar, 3, Kg, Deshi sugar`
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    Monthly Grocery
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBatchItemsText(
                        `Fresh Ilish Fish, 3, No, 1.2kg each\nBeef Gorur Mangsho, 4, Kg, Bone-in cuts\nFresh Milk, 5, Litre, Full cream dairy`
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    Weekend Bazar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBatchItemsText(
                        `Engine Oil 5W-30, 4, Litre, Synthetic\nOil Filter, 1, No, Genuine Toyota\nAir Filter, 1, No, Cabin filter`
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    Car Maintenance
                  </button>
                </div>
              </div>

              {/* Multi-line input */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Items List (One item per row)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`Example:\nBasmati Rice, 25, Kg, Monthly supply\nMustard Oil, 5, Litre, Ghani vanga\nLED Light Bulb, 4, No, Philips 18W\nPhotocopy Paper, 5, No, A4 80gsm`}
                  value={batchItemsText}
                  onChange={(e) => setBatchItemsText(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Add All Items'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: Complete Purchase & Auto-Expense Modal */}
      {/* ---------------------------------------------------- */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Mark as Purchased</span>
              </h3>
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteComplete} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                <p className="text-slate-300 font-semibold text-sm">
                  {completeTarget.item_name}
                </p>
                <div className="flex items-center gap-2 text-slate-400 font-mono mt-1">
                  <span>Quantity: {completeTarget.quantity} {completeTarget.unit}</span>
                  {completeTarget.estimated_cost_bdt && (
                    <span>· Est: {formatBDT(completeTarget.estimated_cost_bdt)}</span>
                  )}
                </div>
              </div>

              {/* Actual Cost Paid in BDT */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Actual Amount Paid (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400">৳</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter amount paid"
                    value={actualCostInput}
                    onChange={(e) => setActualCostInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-sm font-bold"
                  />
                </div>
              </div>

              {/* Auto-record in Expenses Table Checkbox */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createExpenseCheckbox}
                    onChange={(e) => setCreateExpenseCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-200">
                    Auto-record in SQLite 'Expenses' Ledger
                  </span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">
                  Directly writes a verified transaction into your primary financial records and updates the executive dashboard.
                </p>

                {createExpenseCheckbox && (
                  <div className="pl-6 pt-1 space-y-2">
                    <label className="text-slate-300 font-medium block">
                      Category for Expense Entry:
                    </label>
                    <select
                      value={completeExpenseCatId || ''}
                      onChange={(e) => setCompleteExpenseCatId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: Delete Task Confirmation Modal */}
      {/* ---------------------------------------------------- */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <span>Delete Purchase Task</span>
            </h3>
            <p className="mt-3 text-xs text-slate-300">
              Are you sure you want to delete <strong className="text-white">"{taskToDelete.item_name}"</strong> ({taskToDelete.quantity} {taskToDelete.unit})?
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              This task will be removed from your future purchase planner and Android Widget.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
