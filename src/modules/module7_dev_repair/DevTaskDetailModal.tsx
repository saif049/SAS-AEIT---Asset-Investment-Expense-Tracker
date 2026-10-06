/**
 * Comprehensive Task Detail Modal & Management Console
 * Houses Budget & Revisions, Sources of Funds, Expenses, Documents,
 * and Live Financial Computations.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Wrench,
  Hammer,
  Calendar,
  User,
  MapPin,
  Briefcase,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Paperclip,
  FileText,
  Download,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
} from 'lucide-react';
import {
  DevRepairTask,
  DevTaskSourceOfFund,
  DevTaskBudgetRevision,
  DevTaskExpense,
  DevTaskAttachment,
} from '../../types/database';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT } from '../../utils/bdtFormatter';
import { DevTaskFundModal } from './DevTaskFundModal';
import { DevTaskRevisionModal } from './DevTaskRevisionModal';
import { DevTaskExpenseModal } from './DevTaskExpenseModal';

interface DevTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdated: () => void;
  onEditTaskRequest: (task: DevRepairTask) => void;
}

type TabType = 'budget' | 'funds' | 'expenses' | 'documents' | 'report';

export const DevTaskDetailModal: React.FC<DevTaskDetailModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  onEditTaskRequest,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('budget');

  // Sub-modal states
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundToEdit, setFundToEdit] = useState<DevTaskSourceOfFund | null>(null);

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<DevTaskExpense | null>(null);

  // Document add state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Quotation');
  const [docNotes, setDocNotes] = useState('');
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    type: 'DOC' | 'FUND' | 'EXPENSE';
    id: string;
    title: string;
  } | null>(null);

  // Fetch current live task and financials
  const task = devRepairTaskService.getTaskById(taskId);
  const financials = useMemo(() => {
    return task ? devRepairTaskService.calculateTaskFinancials(task) : null;
  }, [task, isFundModalOpen, isRevisionModalOpen, isExpenseModalOpen]);

  const funds = useMemo(() => {
    return devRepairTaskService.getFunds(taskId);
  }, [taskId, isFundModalOpen]);

  const revisions = useMemo(() => {
    return devRepairTaskService.getRevisions(taskId);
  }, [taskId, isRevisionModalOpen]);

  const expenses = useMemo(() => {
    return devRepairTaskService.getExpenses(taskId);
  }, [taskId, isExpenseModalOpen]);

  if (!isOpen || !task || !financials) return null;

  // Handle Export CSV
  const handleDownloadCSV = () => {
    const csvData = devRepairTaskService.exportTaskCSV(task.id);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.id}_${task.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add Document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    devRepairTaskService.addAttachment(task.id, {
      name: docName.trim(),
      type: docType,
      size_kb: Math.floor(Math.random() * 800) + 120,
      notes: docNotes.trim() || undefined,
    });
    setDocName('');
    setDocNotes('');
    setIsAddingDoc(false);
    onTaskUpdated();
  };

  // Delete Document
  const handleDeleteDoc = (docId: string, name?: string) => {
    setConfirmDeleteTarget({ type: 'DOC', id: docId, title: name || 'Document Attachment' });
  };

  // Delete Fund
  const handleDeleteFund = (fundId: string, name?: string) => {
    setConfirmDeleteTarget({ type: 'FUND', id: fundId, title: name || 'Fund Source' });
  };

  // Delete Expense
  const handleDeleteExpense = (expId: string, name?: string) => {
    setConfirmDeleteTarget({ type: 'EXPENSE', id: expId, title: name || 'Cost Record' });
  };

  const handleExecuteDelete = () => {
    if (!confirmDeleteTarget) return;
    if (confirmDeleteTarget.type === 'DOC') {
      devRepairTaskService.removeAttachment(task.id, confirmDeleteTarget.id);
    } else if (confirmDeleteTarget.type === 'FUND') {
      devRepairTaskService.deleteFund(confirmDeleteTarget.id);
    } else if (confirmDeleteTarget.type === 'EXPENSE') {
      devRepairTaskService.deleteExpense(confirmDeleteTarget.id);
    }
    setConfirmDeleteTarget(null);
    onTaskUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header Bar */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                task.task_type === 'Development'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {task.task_type === 'Development' ? <Hammer className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {task.id}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    task.status === 'Ongoing'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : task.status === 'Completed'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : task.status === 'Planned'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {task.status}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    task.priority === 'Urgent'
                      ? 'bg-rose-500/20 text-rose-300'
                      : task.priority === 'High'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {task.priority} Priority
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-1">
                {task.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditTaskRequest(task)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Edit Task Specs"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadCSV}
              className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
              title="Download Task Audit CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Context Bar */}
        <div className="px-5 sm:px-7 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-slate-200">Location:</strong> {task.location}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <strong className="text-slate-200">Responsible:</strong> {task.responsible_person}
          </span>
          {task.contractor_vendor && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <strong className="text-slate-200">Contractor:</strong> {task.contractor_vendor}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {task.start_date} → {task.expected_completion}
          </span>
        </div>

        {/* ---------------------------------------------------- */}
        {/* FINANCIAL SUMMARY KPI TILES (Exact Formula Engine) */}
        {/* ---------------------------------------------------- */}
        <div className="p-5 sm:p-7 pb-4 bg-slate-900 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Effective Budget Tile */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-950 border border-purple-500/30">
              <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block">
                Effective Budget
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-purple-300 block mt-0.5">
                {formatBDT(financials.effectiveBudget)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Base: {formatBDT(financials.baseBudget)}
                {financials.additionalAccumulatedFund > 0 && (
                  <strong className="text-emerald-400 ml-1">
                    (+{formatBDT(financials.additionalAccumulatedFund)})
                  </strong>
                )}
              </span>
            </div>

            {/* Accumulated Funds Tile */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Accumulated Fund
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-300 block mt-0.5">
                {formatBDT(financials.accumulatedFund)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                From {funds.length} source{funds.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Total Spent Tile */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                Total Cost Spent
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-rose-300 block mt-0.5">
                {formatBDT(financials.totalExpenses)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {expenses.length} itemized expense{expenses.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Remaining Budget Tile */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-blue-500/30">
              <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">
                Remaining Budget
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-blue-300 block mt-0.5">
                {formatBDT(financials.remainingBudget)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Cash Bal: <strong className="text-slate-200">{formatBDT(financials.cashBalance)}</strong>
              </span>
            </div>
          </div>

          {/* Progress / Utilization Bar */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Budget Burn Rate:</span>
                <span className="font-mono font-bold text-slate-200">
                  {financials.burnRatePct.toFixed(1)}% of Effective Budget
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    financials.burnRatePct > 90
                      ? 'bg-rose-500'
                      : financials.burnRatePct > 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, financials.burnRatePct)}%` }}
                />
              </div>
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-4 space-y-1 sm:w-56">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Funding Coverage:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {financials.fundingCoveragePct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, financials.fundingCoveragePct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TABS NAVIGATION */}
        {/* ---------------------------------------------------- */}
        <div className="px-5 sm:px-7 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'budget'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Budget & Revisions ({revisions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('funds')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'funds'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Source of Funds ({funds.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'expenses'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
              <span>Expenses & Costs ({expenses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'documents'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5 text-blue-400" />
              <span>Documents ({task.attachments?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'report'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Task Report</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB CONTENTS */}
        {/* ---------------------------------------------------- */}
        <div className="p-5 sm:p-7 flex-1 space-y-6">
          {/* TAB 1: BUDGET & REVISIONS */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Formula & Rule Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Standard Budget & Funding Calculation Rule
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsRevisionModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Formal Budget Revision</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                      1. Base Budget
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-100">
                      {formatBDT(financials.baseBudget)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {revisions.length > 0 ? 'From latest revision' : 'Initial task budget'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                      2. Accumulated Fund
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {formatBDT(financials.accumulatedFund)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Additional available: {formatBDT(financials.additionalAccumulatedFund)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <span className="text-[10px] text-purple-400 uppercase block font-bold">
                      3. Effective Budget
                    </span>
                    <span className="font-mono text-base font-bold text-purple-300">
                      {formatBDT(financials.effectiveBudget)}
                    </span>
                    <span className="text-[10px] text-purple-400/80 block mt-0.5">
                      max(Base Budget, Accumulated Fund)
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  Note: When Accumulated Fund ({formatBDT(financials.accumulatedFund)}) exceeds Base Budget ({formatBDT(financials.baseBudget)}), the system recognizes the full funding as Effective Budget. If Accumulated Fund is lower, the Effective Budget is protected and does not decrease.
                </p>
              </div>

              {/* Revision History Log (Immutable) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                  <span>Formal Budget Revisions History (Audit Trail)</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Never overwritten
                  </span>
                </h4>

                {revisions.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                    No formal revisions yet. The task is currently operating on its Initial Budget of {formatBDT(task.initial_budget)}.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {rev.id}
                            </span>
                            <span className="font-semibold text-white">{rev.reason}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            Approved {rev.date} by <strong className="text-slate-200">{rev.approved_by}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-slate-400 block">Previous:</span>
                            <span className="font-mono text-slate-300">{formatBDT(rev.previous_budget)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Modification:</span>
                            <span
                              className={`font-mono font-bold ${
                                rev.modification_amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {rev.modification_amount >= 0
                                ? `+${formatBDT(rev.modification_amount)}`
                                : formatBDT(rev.modification_amount)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Revised Budget:</span>
                            <span className="font-mono font-bold text-purple-300">
                              {formatBDT(rev.revised_budget)}
                            </span>
                          </div>
                        </div>

                        {(rev.supporting_document || rev.remarks) && (
                          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 pt-1">
                            {rev.supporting_document && (
                              <span>Doc: <code className="text-slate-300">{rev.supporting_document}</code></span>
                            )}
                            {rev.remarks && <span>Remarks: {rev.remarks}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SOURCE OF FUNDS */}
          {activeTab === 'funds' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Independent Source of Funds Ledger
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Supports unlimited funding sources. Accumulated total dynamically adjusts Effective Budget.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFundToEdit(null);
                    setIsFundModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Source of Fund</span>
                </button>
              </div>

              {funds.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                  No source of funds recorded yet. Click &apos;Add Source of Fund&apos; to register allocations or contributions.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {funds.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {f.id}
                          </span>
                          <span className="font-bold text-white text-sm">{f.source_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {f.source_type}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              f.status === 'Received'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-4">
                          <span>Date: <strong className="text-slate-300">{f.date}</strong></span>
                          {f.reference_receipt_no && (
                            <span>Ref: <code className="text-slate-300">{f.reference_receipt_no}</code></span>
                          )}
                          {f.received_committed_by && (
                            <span>By: <strong className="text-slate-300">{f.received_committed_by}</strong></span>
                          )}
                        </div>

                        {f.description && (
                          <p className="text-[11px] text-slate-400 italic">{f.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Amount</span>
                          <span className="font-mono text-base font-bold text-emerald-400">
                            {formatBDT(f.amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setFundToEdit(f);
                            setIsFundModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Fund"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFund(f.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Fund"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPENSES & COSTS */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Task-Isolated Expenditures & Cost Items
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Track material, labor, equipment, and subcontractor outlays strictly for this task.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setExpenseToEdit(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Cost Item</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                  No costs recorded yet for this task. Click &apos;Record Cost Item&apos; to add material or labor vouchers.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            {exp.id}
                          </span>
                          <span className="font-bold text-white text-sm">{exp.expense_item}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {exp.cost_category}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              exp.payment_status === 'Paid'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {exp.payment_status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-4">
                          <span>Date: <strong className="text-slate-300">{exp.date}</strong></span>
                          <span>Paid To: <strong className="text-slate-300">{exp.paid_to}</strong></span>
                          {exp.voucher_bill_no && (
                            <span>Bill #: <code className="text-slate-300">{exp.voucher_bill_no}</code></span>
                          )}
                        </div>

                        {exp.remarks && (
                          <p className="text-[11px] text-slate-400 italic">{exp.remarks}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cost</span>
                          <span className="font-mono text-base font-bold text-rose-400">
                            {formatBDT(exp.amount)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setExpenseToEdit(exp);
                            setIsExpenseModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Cost"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Cost"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENTS & ATTACHMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Task Documents & Artifacts Repository
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Store quotations, engineering approvals, site photos, contractor bills, and inspection reports.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingDoc ? 'Cancel' : 'Attach Document'}</span>
                </button>
              </div>

              {/* Add Document Inline Form */}
              {isAddingDoc && (
                <form
                  onSubmit={handleAddDocument}
                  className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3 text-xs animate-in fade-in"
                >
                  <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                    Upload / Attach Task Document
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Document Title / File Name *</label>
                      <input
                        type="text"
                        required
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Apex_Contract_Agreement_Signed.pdf"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Document Category</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 cursor-pointer"
                      >
                        <option value="Quotation">Quotation / Estimate</option>
                        <option value="Approval">Engineering Approval / Memo</option>
                        <option value="Photo">Site Inspection Photo</option>
                        <option value="Bill">Bill / Invoice Copy</option>
                        <option value="Contract">Contract / Work Order</option>
                        <option value="Other">Other Document</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Notes / Description</label>
                    <input
                      type="text"
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      placeholder="e.g. Countersigned by executive engineer"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold"
                    >
                      Save Attachment
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {(!task.attachments || task.attachments.length === 0) ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
                  No documents attached yet. Click &apos;Attach Document&apos; to link files.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.attachments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-200 line-clamp-1">{doc.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {doc.type}
                            </span>
                            {doc.size_kb && <span>{doc.size_kb} KB</span>}
                            <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                          </div>
                          {doc.notes && (
                            <p className="text-[10px] text-slate-500 mt-1 italic">{doc.notes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TASK REPORT & AUDIT */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Standalone Task Executive Statement
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Isolated audit statement with full source of funds and cost breakdown.
                  </p>
                </div>
                <button
                  onClick={handleDownloadCSV}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report (CSV)</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3 text-slate-300">
                <div className="border-b border-slate-800 pb-2">
                  <p className="font-bold text-white text-sm">
                    {task.id} - {task.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Type: {task.task_type} | Priority: {task.priority} | Status: {task.status}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Location: {task.location} | In-Charge: {task.responsible_person}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Initial Budget:</span>
                    <span className="font-bold text-slate-200">{formatBDT(financials.initialBudget)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Effective Budget:</span>
                    <span className="font-bold text-purple-300">{formatBDT(financials.effectiveBudget)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Accumulated Fund:</span>
                    <span className="font-bold text-emerald-400">{formatBDT(financials.accumulatedFund)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Spent:</span>
                    <span className="font-bold text-rose-400">{formatBDT(financials.totalExpenses)}</span>
                  </div>
                </div>

                <div className="text-[11px] space-y-1">
                  <p className="text-slate-400">
                    Net Cash In-Hand: <strong className="text-slate-100">{formatBDT(financials.cashBalance)}</strong>
                  </p>
                  <p className="text-slate-400">
                    Uncommitted Effective Budget: <strong className="text-slate-100">{formatBDT(financials.remainingBudget)}</strong>
                  </p>
                  <p className="text-slate-400">
                    Fund Sources Count: <strong className="text-slate-100">{funds.length}</strong> | Cost Items Count: <strong className="text-slate-100">{expenses.length}</strong> | Formal Revisions: <strong className="text-slate-100">{revisions.length}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Modals */}
        {isFundModalOpen && (
          <DevTaskFundModal
            isOpen={isFundModalOpen}
            onClose={() => {
              setIsFundModalOpen(false);
              setFundToEdit(null);
            }}
            taskId={task.id}
            taskName={task.name}
            fundToEdit={fundToEdit}
            onFundSaved={() => {
              onTaskUpdated();
            }}
          />
        )}

        {isRevisionModalOpen && (
          <DevTaskRevisionModal
            isOpen={isRevisionModalOpen}
            onClose={() => setIsRevisionModalOpen(false)}
            taskId={task.id}
            taskName={task.name}
            currentBaseBudget={financials.baseBudget}
            onRevisionSaved={() => {
              onTaskUpdated();
            }}
          />
        )}

        {isExpenseModalOpen && (
          <DevTaskExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => {
              setIsExpenseModalOpen(false);
              setExpenseToEdit(null);
            }}
            taskId={task.id}
            taskName={task.name}
            expenseToEdit={expenseToEdit}
            onExpenseSaved={() => {
              onTaskUpdated();
            }}
          />
        )}

        {/* In-App Delete Confirmation Modal */}
        {confirmDeleteTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Confirm Removal</span>
              </h3>
              <p className="mt-3 text-xs text-slate-300">
                Are you sure you want to delete <strong className="text-white">"{confirmDeleteTarget.title}"</strong>?
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                This item will be removed immediately from this task.
              </p>
              <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
