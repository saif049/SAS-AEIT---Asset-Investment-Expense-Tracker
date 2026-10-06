/**
 * MODULE 7: Development / Repair Task Independent Manager
 * 
 * Strict Isolation Rule:
 * Standalone module managing its own:
 * - Tasks
 * - Source of Funds (unlimited)
 * - Budget & Revisions
 * - Expenses / Costs
 * - Documents
 * - Calculations & Reports
 * 
 * Never touches or contaminates general accounting or finance tables.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench,
  Hammer,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Briefcase,
  AlertTriangle,
  Download,
  Trash2,
  Edit2,
  Eye,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { DevRepairTask, DevTaskType, DevTaskStatus, DevTaskPriority } from '../../types/database';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT } from '../../utils/bdtFormatter';
import { DevTaskCreateModal } from './DevTaskCreateModal';
import { DevTaskDetailModal } from './DevTaskDetailModal';

export const DevRepairTaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<DevRepairTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DevTaskType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DevTaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | DevTaskPriority>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<DevRepairTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<DevRepairTask | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load tasks & subscribe to updates
  const refreshTasks = useCallback(() => {
    setTasks(devRepairTaskService.getTasks());
  }, []);

  useEffect(() => {
    refreshTasks();
    const unsubscribe = devRepairTaskService.subscribe(refreshTasks);
    return () => {
      unsubscribe();
    };
  }, [refreshTasks]);

  // Aggregate Metrics across all tasks
  const aggregateMetrics = useMemo(() => {
    let totalInitialBudget = 0;
    let totalEffectiveBudget = 0;
    let totalAccumulatedFunds = 0;
    let totalExpenses = 0;

    tasks.forEach((t) => {
      const fin = devRepairTaskService.calculateTaskFinancials(t);
      totalInitialBudget += fin.initialBudget;
      totalEffectiveBudget += fin.effectiveBudget;
      totalAccumulatedFunds += fin.accumulatedFund;
      totalExpenses += fin.totalExpenses;
    });

    const netCashBalance = totalAccumulatedFunds - totalExpenses;
    const remainingEffectiveBudget = totalEffectiveBudget - totalExpenses;
    const ongoingCount = tasks.filter((t) => t.status === 'Ongoing').length;
    const completedCount = tasks.filter((t) => t.status === 'Completed').length;
    const plannedCount = tasks.filter((t) => t.status === 'Planned').length;

    return {
      totalInitialBudget,
      totalEffectiveBudget,
      totalAccumulatedFunds,
      totalExpenses,
      netCashBalance,
      remainingEffectiveBudget,
      ongoingCount,
      completedCount,
      plannedCount,
    };
  }, [tasks]);

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Type
      if (typeFilter !== 'ALL' && t.task_type !== typeFilter) return false;
      // Status
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      // Priority
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesLoc = t.location.toLowerCase().includes(q);
        const matchesPerson = t.responsible_person.toLowerCase().includes(q);
        const matchesContractor = t.contractor_vendor
          ? t.contractor_vendor.toLowerCase().includes(q)
          : false;
        if (!matchesName && !matchesId && !matchesLoc && !matchesPerson && !matchesContractor) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, typeFilter, statusFilter, priorityFilter, searchQuery]);

  // Delete Task
  const handleDeleteTask = (task: DevRepairTask) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    devRepairTaskService.deleteTask(taskToDelete.id);
    refreshTasks();
    setTaskToDelete(null);
  };

  // Export All Tasks CSV
  const handleExportAllTasksCSV = () => {
    const rows: string[] = [];
    rows.push('"=== SAS-AEIT DEVELOPMENT & REPAIR TASKS MASTER LEDGER ==="');
    rows.push(`"Export Timestamp: ${new Date().toISOString()} | Total Tasks: ${tasks.length}"`);
    rows.push(`"Total Effective Budget: ${aggregateMetrics.totalEffectiveBudget}"`);
    rows.push(`"Total Accumulated Funds: ${aggregateMetrics.totalAccumulatedFunds}"`);
    rows.push(`"Total Incurred Expenses: ${aggregateMetrics.totalExpenses}"`);
    rows.push(`"Net Cash Balance: ${aggregateMetrics.netCashBalance}"`);
    rows.push('');
    rows.push('"Task ID","Task Name","Type","Status","Priority","Location","Responsible Person","Contractor","Planned Start","Expected Completion","Initial Budget (BDT)","Effective Budget (BDT)","Accumulated Fund (BDT)","Expenses Spent (BDT)","Remaining Budget (BDT)","Burn Rate %"');

    tasks.forEach((t) => {
      const fin = devRepairTaskService.calculateTaskFinancials(t);
      rows.push(
        `"${t.id}","${t.name.replace(/"/g, '""')}","${t.task_type}","${t.status}","${t.priority}","${t.location.replace(/"/g, '""')}","${t.responsible_person.replace(/"/g, '""')}","${t.contractor_vendor || ''}","${t.start_date}","${t.expected_completion}","${fin.initialBudget}","${fin.effectiveBudget}","${fin.accumulatedFund}","${fin.totalExpenses}","${fin.remainingBudget}","${fin.burnRatePct.toFixed(1)}%"`
      );
    });

    const bom = '\uFEFF';
    const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAS_AEIT_Development_Repair_Tasks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ---------------------------------------------------- */}
      {/* MODULE HEADER & ISOLATION BADGE */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Independent Module
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero Accounting Contamination</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Wrench className="w-6 h-6 text-amber-400" />
              <span>Development / Repair Tasks</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Dedicated engine for work orders, source of funds, dynamic budget revisions, itemized cost tracking, and executive audit statements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleExportAllTasksCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Master CSV of All Tasks"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Master CSV</span>
            </button>
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* AGGREGATE FINANCIAL PILLARS */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30">
            <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block">
              Total Effective Budget
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-purple-300 block mt-0.5">
              {formatBDT(aggregateMetrics.totalEffectiveBudget)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Initial: {formatBDT(aggregateMetrics.totalInitialBudget)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
              Accumulated Funds
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-300 block mt-0.5">
              {formatBDT(aggregateMetrics.totalAccumulatedFunds)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Net Cash Bal: <strong className="text-slate-200">{formatBDT(aggregateMetrics.netCashBalance)}</strong>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/30">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
              Incurred Expenses
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-rose-300 block mt-0.5">
              {formatBDT(aggregateMetrics.totalExpenses)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Across all active work orders
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-blue-500/30">
            <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">
              Work Orders Status
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-white block mt-0.5">
              {tasks.length} Total Tasks
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              <strong className="text-emerald-400">{aggregateMetrics.ongoingCount}</strong> Ongoing ·{' '}
              <strong className="text-amber-400">{aggregateMetrics.plannedCount}</strong> Planned ·{' '}
              <strong className="text-blue-400">{aggregateMetrics.completedCount}</strong> Done
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FILTER & REAL-TIME SEARCH TOOLBAR */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by task name, ID (e.g. DRT-001), location, contractor, or in-charge person..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | DevTaskType)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="Development">Development Only</option>
            <option value="Repair">Repair Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DevTaskStatus)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Planned">Planned</option>
            <option value="Completed">Completed</option>
            <option value="Suspended">Suspended</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | DevTaskPriority)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TASK CARDS LIST */}
      {/* ---------------------------------------------------- */}
      {filteredTasks.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Development / Repair Tasks Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No tasks match the active search or filter criteria. Try clearing filters.'
              : 'Create your first development or repair task to track sources of fund, budget revisions, and isolated expenditures.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((t) => {
            const fin = devRepairTaskService.calculateTaskFinancials(t);
            const funds = devRepairTaskService.getFunds(t.id);
            const expenses = devRepairTaskService.getExpenses(t.id);
            const revisions = devRepairTaskService.getRevisions(t.id);

            return (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-4 transition-all duration-200 flex flex-col justify-between"
              >
                {/* Top Badge Strip */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {t.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          t.task_type === 'Development'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {t.task_type}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          t.status === 'Ongoing'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : t.status === 'Completed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : t.status === 'Planned'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.priority === 'Urgent'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : t.priority === 'High'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>

                  <h3
                    onClick={() => setSelectedTaskId(t.id)}
                    className="text-base font-bold text-white hover:text-amber-400 cursor-pointer transition-colors line-clamp-1"
                  >
                    {t.name}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {t.description || 'No description provided.'}
                  </p>
                </div>

                {/* Specs Meta */}
                <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{t.location}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {t.start_date} → {t.expected_completion}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{t.responsible_person}</span>
                    </span>
                    {t.contractor_vendor && (
                      <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[180px]">
                        <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{t.contractor_vendor}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial KPI Dashboard Strip */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-purple-400 uppercase font-semibold block">
                        Effective Budget
                      </span>
                      <span className="font-mono font-bold text-purple-300 text-sm">
                        {formatBDT(fin.effectiveBudget)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                        Accumulated Fund
                      </span>
                      <span className="font-mono font-bold text-emerald-300 text-sm">
                        {formatBDT(fin.accumulatedFund)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-rose-400 uppercase font-semibold block">
                        Total Spent
                      </span>
                      <span className="font-mono font-bold text-rose-300 text-sm">
                        {formatBDT(fin.totalExpenses)}
                      </span>
                    </div>
                  </div>

                  {/* Burn Rate Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400">
                        Remaining Budget: <strong className="text-slate-200">{formatBDT(fin.remainingBudget)}</strong>
                      </span>
                      <span className="font-mono text-slate-400">
                        {fin.burnRatePct.toFixed(1)}% burn
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          fin.burnRatePct > 90
                            ? 'bg-rose-500'
                            : fin.burnRatePct > 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, fin.burnRatePct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>
                      Funds: <strong className="text-emerald-400">{funds.length}</strong> | Revisions:{' '}
                      <strong className="text-purple-400">{revisions.length}</strong> | Costs:{' '}
                      <strong className="text-rose-400">{expenses.length}</strong>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      Cash: {formatBDT(fin.cashBalance)}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setSelectedTaskId(t.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Manage Task & Funds</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTaskToEdit(t);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Specs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODALS */}
      {/* ---------------------------------------------------- */}
      {isCreateModalOpen && (
        <DevTaskCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setTaskToEdit(null);
          }}
          taskToEdit={taskToEdit}
          onTaskCreated={(task) => {
            refreshTasks();
            setSelectedTaskId(task.id);
          }}
        />
      )}

      {selectedTaskId && (
        <DevTaskDetailModal
          isOpen={Boolean(selectedTaskId)}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={refreshTasks}
          onEditTaskRequest={(task) => {
            setTaskToEdit(task);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Delete Task</span>
              </h3>
              <button
                onClick={() => setTaskToDelete(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs text-slate-300">
              <p>
                Are you sure you want to delete task <strong className="text-white">"{taskToDelete.id} - {taskToDelete.name}"</strong>?
              </p>
              <p className="text-slate-400">
                This will permanently remove all isolated funds, budget revisions, cost records, and document attachments associated with this task.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
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
