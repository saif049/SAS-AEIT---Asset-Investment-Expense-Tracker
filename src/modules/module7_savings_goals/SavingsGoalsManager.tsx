/**
 * MODULE: Savings Goals & Financial Targets Manager
 * 
 * Features:
 * - Define and manage long-term & short-term financial targets.
 * - Track BDT progress toward targets with South Asian numbering (Lakh/Crore).
 * - Link goals directly to specific Investment Accounts (FDR, Sanchayapatra, Stocks, Land).
 * - Real-time progress bars, time-to-target countdown, and required monthly contribution velocity.
 * - One-tap contribution deposit and portfolio value synchronization.
 * - Automated audit logging in SQLite SystemLogs.
 */

import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  Link2,
  RefreshCw,
  Calendar,
  Sparkles,
  Search,
  Trash2,
  Edit3,
  DollarSign,
  X,
  Building,
  Coins,
  ArrowUpRight,
  BookmarkCheck,
} from 'lucide-react';
import {
  EnrichedSavingsGoal,
  Investment,
  SavingsGoalPriority,
  SavingsGoalStatus,
} from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';

interface SavingsGoalsManagerProps {
  savingsGoals: EnrichedSavingsGoal[];
  investments: Investment[];
  onAddGoal: (goal: {
    title: string;
    target_amount_bdt: number;
    current_amount_bdt: number;
    target_date: string;
    priority: SavingsGoalPriority;
    status: SavingsGoalStatus;
    linked_investment_id?: number | null;
    notes?: string | null;
  }) => Promise<unknown>;
  onUpdateGoal: (
    id: number,
    updates: {
      title?: string;
      target_amount_bdt?: number;
      current_amount_bdt?: number;
      target_date?: string;
      priority?: SavingsGoalPriority;
      status?: SavingsGoalStatus;
      linked_investment_id?: number | null;
      notes?: string | null;
    }
  ) => Promise<unknown>;
  onContributeGoal: (id: number, amount_bdt: number, note?: string) => Promise<unknown>;
  onSyncGoalWithInvestment: (id: number) => Promise<unknown>;
  onDeleteGoal: (id: number) => Promise<unknown>;
}

export const SavingsGoalsManager: React.FC<SavingsGoalsManagerProps> = ({
  savingsGoals,
  investments,
  onAddGoal,
  onUpdateGoal,
  onContributeGoal,
  onSyncGoalWithInvestment,
  onDeleteGoal,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SavingsGoalStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | SavingsGoalPriority>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<EnrichedSavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<EnrichedSavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<EnrichedSavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    title: '',
    target_amount_bdt: '',
    current_amount_bdt: '',
    target_date: '',
    priority: 'HIGH' as SavingsGoalPriority,
    status: 'IN_PROGRESS' as SavingsGoalStatus,
    linked_investment_id: '' as string, // empty string means none
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Pre-parse investment descriptions for dropdown options
  const investmentOptions = useMemo(() => {
    return investments.map((inv) => {
      let label = `${inv.type} #${inv.id}`;
      let value = 0;
      try {
        const details = JSON.parse(inv.details_json);
        if (inv.type === 'STOCK') {
          label = `Stocks · ${details.bo_id ? `BO #${details.bo_id}` : 'Portfolio'} (Val: ৳ ${Number(details.total_portfolio_value_bdt || 0).toLocaleString()})`;
          value = Number(details.total_portfolio_value_bdt || 0);
        } else if (inv.type === 'FDR') {
          const p = Number(details.principal_bdt ?? details.principal ?? 0);
          label = `FDR · ${details.bank || 'Bank'} (৳ ${p.toLocaleString()})`;
          value = p;
        } else if (inv.type === 'SAVINGS_CERTIFICATE') {
          const p = Number(details.principal_bdt ?? details.principal ?? 0);
          label = `Sanchayapatra · #${details.instrument_no || ''} (৳ ${p.toLocaleString()})`;
          value = p;
        } else if (inv.type === 'LAND') {
          label = `Land · ${details.location} (৳ ${Number(details.current_estimated_value_bdt || details.purchase_price_bdt || 0).toLocaleString()})`;
          value = Number(details.current_estimated_value_bdt || details.purchase_price_bdt || 0);
        }
      } catch {
        // fallback
      }
      return { id: inv.id, label, value, type: inv.type };
    });
  }, [investments]);

  // Overall Aggregate Telemetry
  const aggregateMetrics = useMemo(() => {
    const totalTarget = savingsGoals.reduce((sum, g) => sum + g.target_amount_bdt, 0);
    const totalSaved = savingsGoals.reduce((sum, g) => sum + g.current_amount_bdt, 0);
    const totalRemaining = Math.max(0, totalTarget - totalSaved);
    const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
    const achievedCount = savingsGoals.filter((g) => g.status === 'ACHIEVED').length;
    const inProgressCount = savingsGoals.filter((g) => g.status === 'IN_PROGRESS').length;
    const monthlyNeededTotal = savingsGoals
      .filter((g) => g.status === 'IN_PROGRESS')
      .reduce((sum, g) => sum + g.monthly_savings_needed, 0);

    return {
      totalTarget,
      totalSaved,
      totalRemaining,
      overallProgress,
      achievedCount,
      inProgressCount,
      monthlyNeededTotal,
    };
  }, [savingsGoals]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return savingsGoals.filter((goal) => {
      const matchesSearch =
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (goal.notes && goal.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (goal.linked_investment_title && goal.linked_investment_title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || goal.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || goal.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [savingsGoals, searchQuery, statusFilter, priorityFilter]);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData({
      title: '',
      target_amount_bdt: '',
      current_amount_bdt: '',
      target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      linked_investment_id: '',
      notes: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (goal: EnrichedSavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target_amount_bdt: goal.target_amount_bdt.toString(),
      current_amount_bdt: goal.current_amount_bdt.toString(),
      target_date: goal.target_date,
      priority: goal.priority,
      status: goal.status,
      linked_investment_id: goal.linked_investment_id ? goal.linked_investment_id.toString() : '',
      notes: goal.notes || '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const targetAmount = parseFloat(formData.target_amount_bdt);
    const currentAmount = formData.current_amount_bdt ? parseFloat(formData.current_amount_bdt) : 0;

    if (!formData.title.trim()) {
      setFormError('Goal title is required.');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setFormError('Target amount must be a positive number in BDT.');
      return;
    }
    if (isNaN(currentAmount) || currentAmount < 0) {
      setFormError('Current saved amount cannot be negative.');
      return;
    }
    if (!formData.target_date) {
      setFormError('Target deadline date is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const linkedId = formData.linked_investment_id ? parseInt(formData.linked_investment_id, 10) : null;

      if (editingGoal) {
        await onUpdateGoal(editingGoal.id, {
          title: formData.title,
          target_amount_bdt: targetAmount,
          current_amount_bdt: currentAmount,
          target_date: formData.target_date,
          priority: formData.priority,
          status: currentAmount >= targetAmount ? 'ACHIEVED' : formData.status,
          linked_investment_id: linkedId,
          notes: formData.notes.trim() || null,
        });
        showNotification('success', `Goal "${formData.title}" updated successfully.`);
      } else {
        await onAddGoal({
          title: formData.title,
          target_amount_bdt: targetAmount,
          current_amount_bdt: currentAmount,
          target_date: formData.target_date,
          priority: formData.priority,
          status: currentAmount >= targetAmount ? 'ACHIEVED' : formData.status,
          linked_investment_id: linkedId,
          notes: formData.notes.trim() || null,
        });
        showNotification('success', `New Savings Goal "${formData.title}" created.`);
      }

      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save savings goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;

    const amt = parseFloat(contributionAmount);
    if (isNaN(amt) || amt <= 0) {
      showNotification('error', 'Please enter a valid deposit amount in BDT.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onContributeGoal(contributeGoal.id, amt, contributionNote.trim() || undefined);
      showNotification('success', `Deposited ৳ ${amt.toLocaleString()} to "${contributeGoal.title}".`);
      setContributeGoal(null);
      setContributionAmount('');
      setContributionNote('');
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncInvestment = async (goal: EnrichedSavingsGoal) => {
    try {
      await onSyncGoalWithInvestment(goal.id);
      showNotification('success', `Valuation synced from linked investment for "${goal.title}".`);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Sync failed.');
    }
  };

  const handleDelete = (goal: EnrichedSavingsGoal) => {
    setGoalToDelete(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    try {
      await onDeleteGoal(goalToDelete.id);
      showNotification('success', `Goal "${goalToDelete.title}" deleted.`);
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Deletion failed.');
    } finally {
      setGoalToDelete(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                SAVINGS GOALS &amp; TARGETS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {savingsGoals.length} Defined Targets
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Financial Targets &amp; Capital Accumulation
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Establish long-term wealth milestones, monitor BDT funding progress with automated time horizons, and bridge your savings directly to your active investment accounts.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Goal</span>
          </button>
        </div>

        {/* Aggregate Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {/* Total Accumulated */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/20">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block mb-1">
              Total Saved / Allocated
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono text-emerald-300 tabular-nums">
              {formatBDT(aggregateMetrics.totalSaved)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>Overall Progress:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {aggregateMetrics.overallProgress}%
              </span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
              <div
                style={{ width: `${aggregateMetrics.overallProgress}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full"
              />
            </div>
          </div>

          {/* Total Target Target Capital */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
              Cumulative Target BDT
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono text-white tabular-nums">
              {formatBDT(aggregateMetrics.totalTarget)}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Deficit: <strong className="text-rose-400 font-mono">{formatBDT(aggregateMetrics.totalRemaining)}</strong>
            </p>
          </div>

          {/* Monthly Required Savings */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-blue-500/20">
            <span className="text-[10px] uppercase font-mono tracking-wider text-blue-400 block mb-1">
              Monthly Savings Pace
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono text-blue-300 tabular-nums">
              {formatBDT(aggregateMetrics.monthlyNeededTotal)}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Combined velocity across all active goals
            </p>
          </div>

          {/* Status Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/20">
            <span className="text-[10px] uppercase font-mono tracking-wider text-purple-400 block mb-1">
              Goal Milestones
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <div>
                <p className="text-lg font-bold font-mono text-emerald-400">
                  {aggregateMetrics.achievedCount}
                </p>
                <span className="text-[10px] text-slate-400">Achieved</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <p className="text-lg font-bold font-mono text-purple-300">
                  {aggregateMetrics.inProgressCount}
                </p>
                <span className="text-[10px] text-slate-400">In Progress</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search goals by title, notes, or linked investment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('ACHIEVED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'ACHIEVED'
                  ? 'bg-blue-500/20 text-blue-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Achieved
            </button>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Savings Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No Savings Goals Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No financial targets matched your filter criteria.'
              : 'You have not defined any financial targets yet. Click below to establish your first goal.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'ACHIEVED' || goal.percentage_completed >= 100;
            const hasLinkedInvestment = !!goal.linked_investment_id;

            return (
              <div
                key={goal.id}
                className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all relative overflow-hidden flex flex-col justify-between ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/20 shadow-lg shadow-emerald-500/5'
                    : 'border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Top Corner Ribbon / Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                            goal.priority === 'HIGH'
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              : goal.priority === 'MEDIUM'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {goal.priority} PRIORITY
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : goal.status === 'ON_HOLD'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                              ACHIEVED
                            </>
                          ) : (
                            goal.status.replace('_', ' ')
                          )}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight pt-1">
                        {goal.title}
                      </h3>
                    </div>

                    {/* Quick Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Notes / Subtitle */}
                  {goal.notes && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 italic">
                      "{goal.notes}"
                    </p>
                  )}

                  {/* Financial Progress Numbers */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-4">
                    <div className="flex items-end justify-between mb-1.5">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Current Allocated
                        </span>
                        <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                          {formatBDT(goal.current_amount_bdt)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Target Goal
                        </span>
                        <span className="text-sm font-semibold font-mono text-slate-200 tabular-nums">
                          {formatBDT(goal.target_amount_bdt)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        style={{ width: `${goal.percentage_completed}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-300'
                            : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                      <span className="font-bold text-emerald-400">
                        {goal.percentage_completed}% Funded
                      </span>
                      <span>
                        {isCompleted ? (
                          <strong className="text-emerald-400">Goal Fulfilled!</strong>
                        ) : (
                          <>Deficit: {formatBDT(goal.remaining_bdt)}</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Horizon & Pace Indicators */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Target Date</span>
                        <span className="font-mono text-slate-300 font-semibold">{goal.target_date}</span>
                        <span className="text-[10px] text-slate-400 block">({goal.days_remaining}d left)</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-500 block">Required Rate</span>
                        <span className="font-mono text-blue-300 font-semibold">
                          {isCompleted ? '৳ 0 / mo' : `${formatBDT(goal.monthly_savings_needed)}/mo`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked Investment Account Banner */}
                  {hasLinkedInvestment && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 flex items-center justify-between gap-2 mb-4 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
                            Linked Investment Account
                          </span>
                          <span className="text-slate-200 font-semibold truncate block">
                            {goal.linked_investment_title || 'Active Investment'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSyncInvestment(goal)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title="Sync saved amount with current valuation of this investment"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Sync Val</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setContributeGoal(goal);
                      setContributionAmount('');
                      setContributionNote('');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Deposit Funds</span>
                  </button>

                  {isCompleted && (
                    <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                      ✓ Done
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE OR EDIT SAVINGS GOAL */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingGoal ? 'Edit Savings Goal' : 'Define New Savings Goal'}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Goal Title / Milestone Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Medical Reserve, Land Downpayment, Child Higher Education"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Amounts Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Target Capital (BDT) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500000"
                    value={formData.target_amount_bdt}
                    onChange={(e) => setFormData({ ...formData, target_amount_bdt: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Initial / Current Saved (BDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 100000"
                    value={formData.current_amount_bdt}
                    onChange={(e) => setFormData({ ...formData, current_amount_bdt: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Target Date & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Target Deadline Date *
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Link to Investment Account */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Link to Specific Investment Account (Optional)</span>
                </label>
                <select
                  value={formData.linked_investment_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFormData({ ...formData, linked_investment_id: selId });
                    // Optional quick populate current amount if empty
                    if (selId && !formData.current_amount_bdt) {
                      const matched = investmentOptions.find((opt) => opt.id.toString() === selId);
                      if (matched && matched.value > 0) {
                        setFormData((prev) => ({
                          ...prev,
                          linked_investment_id: selId,
                          current_amount_bdt: matched.value.toString(),
                        }));
                      }
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No linked investment (Independent cash reserve)</option>
                  {investmentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Connecting an investment allows one-tap valuation synchronization and integrates asset returns directly with your target.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ACHIEVED">Achieved / Fulfilled</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Strategy / Voucher Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Monthly salary deduction of ৳ 25,000 plus Sanchayapatra quarterly yield reinvestment."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingGoal ? 'Update Target' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DIRECT DEPOSIT / CONTRIBUTION */}
      {/* ======================================================== */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Deposit / Add Funds</h3>
              </div>
              <button
                onClick={() => setContributeGoal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Target Goal</span>
              <strong className="text-white text-sm block">{contributeGoal.title}</strong>
              <div className="flex justify-between items-center mt-2 text-slate-400 font-mono">
                <span>Current: {formatBDT(contributeGoal.current_amount_bdt)}</span>
                <span>Target: {formatBDT(contributeGoal.target_amount_bdt)}</span>
              </div>
            </div>

            <form onSubmit={handleContributeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Deposit Amount (BDT) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="e.g. 25000"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Presets:</span>
                {[5000, 10000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setContributionAmount(preset.toString())}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                  >
                    +৳{preset / 1000}k
                  </button>
                ))}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Deposit Note / Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary savings deposit, DPS installment"
                  value={contributionNote}
                  onChange={(e) => setContributionNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Delete Savings Goal</span>
              </h3>
              <button
                onClick={() => setGoalToDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-300">
              <p>
                Are you sure you want to delete <strong className="text-white">"{goalToDelete.title}"</strong>?
              </p>
              <p className="text-slate-400">
                Target amount: <span className="font-mono text-emerald-400">{formatBDT(goalToDelete.target_amount_bdt)}</span>. This action is audited in SQLite SystemLogs.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteGoal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
              >
                Delete Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
