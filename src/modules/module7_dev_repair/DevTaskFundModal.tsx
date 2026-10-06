/**
 * Modal to Add or Edit a Source of Fund for a Task
 * Enforces unlimited funding sources, received/committed statuses,
 * and automatic calculation updates.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { DevTaskSourceOfFund, SourceOfFundStatus } from '../../types/database';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT, formatRawNumericInput } from '../../utils/bdtFormatter';

interface DevTaskFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  onFundSaved: () => void;
  fundToEdit?: DevTaskSourceOfFund | null;
}

export const DevTaskFundModal: React.FC<DevTaskFundModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskName,
  onFundSaved,
  fundToEdit,
}) => {
  const isEditing = Boolean(fundToEdit);

  const [sourceName, setSourceName] = useState(fundToEdit?.source_name || '');
  const [sourceType, setSourceType] = useState(fundToEdit?.source_type || 'Development Fund');
  const [rawAmount, setRawAmount] = useState(fundToEdit ? String(fundToEdit.amount) : '50000');
  const [date, setDate] = useState(fundToEdit?.date || new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState(fundToEdit?.reference_receipt_no || '');
  const [description, setDescription] = useState(fundToEdit?.description || '');
  const [receivedBy, setReceivedBy] = useState(fundToEdit?.received_committed_by || '');
  const [status, setStatus] = useState<SourceOfFundStatus>(fundToEdit?.status || 'Received');
  const [remarks, setRemarks] = useState(fundToEdit?.remarks || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseFloat(rawAmount) || 0;
    if (amount <= 0) {
      setErrorMsg('Fund amount must be greater than zero.');
      return;
    }
    if (!sourceName.trim()) {
      setErrorMsg('Please specify the Source Name.');
      return;
    }

    try {
      if (isEditing && fundToEdit) {
        devRepairTaskService.updateFund(fundToEdit.id, {
          source_name: sourceName.trim(),
          source_type: sourceType,
          amount,
          date,
          reference_receipt_no: refNo.trim() || undefined,
          description: description.trim() || undefined,
          received_committed_by: receivedBy.trim() || undefined,
          status,
          remarks: remarks.trim() || undefined,
        });
      } else {
        devRepairTaskService.createFund({
          task_id: taskId,
          source_name: sourceName.trim(),
          source_type: sourceType,
          amount,
          date,
          reference_receipt_no: refNo.trim() || undefined,
          description: description.trim() || undefined,
          received_committed_by: receivedBy.trim() || undefined,
          status,
          remarks: remarks.trim() || undefined,
        });
      }
      onFundSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save funding source.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900/95 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing ? 'Edit Funding Source' : 'Add Source of Fund'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                For Task: <strong className="text-slate-200">{taskName}</strong> ({taskId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount (BDT) */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold uppercase tracking-wider text-emerald-400 text-[11px]">
                Fund Amount (BDT) *
              </label>
              <span className="font-mono text-sm font-bold text-emerald-300">
                {formatBDT(parseFloat(rawAmount) || 0)}
              </span>
            </div>
            <input
              type="text"
              required
              value={rawAmount}
              onChange={(e) => setRawAmount(formatRawNumericInput(e.target.value))}
              placeholder="e.g. 50000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* Source Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Source Name *
              </label>
              <input
                type="text"
                required
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Special Contribution"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Development Fund">Development Fund</option>
                <option value="Special Contribution">Special Contribution</option>
                <option value="Donor Contribution">Donor Contribution</option>
                <option value="Govt Grant">Govt Grant</option>
                <option value="Internal Reserve">Internal Reserve</option>
                <option value="Community Fund">Community Fund</option>
                <option value="Bank Loan">Bank Loan</option>
                <option value="Other">Other Source</option>
              </select>
            </div>
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Date Received / Committed *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Funding Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SourceOfFundStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Received">Received (In Hand / Cleared)</option>
                <option value="Committed">Committed (MOU Signed / Approved)</option>
                <option value="Pledged">Pledged (Expected / Pipeline)</option>
              </select>
            </div>
          </div>

          {/* Reference / Receipt & Received / Committed By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Reference / Receipt No.
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="e.g. SC-88921 or Chq #441029"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Received / Committed By
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="e.g. Treasurer Office / Donor Rep"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Description & Remarks */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Description & Purpose
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Emergency facility welfare fund contribution"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Cleared via bank voucher #9921"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Record Source of Fund'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
