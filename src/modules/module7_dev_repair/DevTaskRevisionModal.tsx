/**
 * Modal for Formal Budget Revision / Modification
 * Enforces historical immutable audit trail (never overwrites).
 * Calculates Previous Budget + Modification Amount = Revised Budget.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, TrendingUp, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT, formatRawNumericInput } from '../../utils/bdtFormatter';

interface DevTaskRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  currentBaseBudget: number;
  onRevisionSaved: () => void;
}

export const DevTaskRevisionModal: React.FC<DevTaskRevisionModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskName,
  currentBaseBudget,
  onRevisionSaved,
}) => {
  const [modificationType, setModificationType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [rawModAmount, setRawModAmount] = useState('50000');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [approvedBy, setApprovedBy] = useState('');
  const [supportingDoc, setSupportingDoc] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericMod = parseFloat(rawModAmount) || 0;
  const signedMod = modificationType === 'INCREASE' ? numericMod : -numericMod;
  const resultingRevisedBudget = Math.max(0, currentBaseBudget + signedMod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numericMod <= 0) {
      setErrorMsg('Modification amount must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please specify the justification / reason for budget revision.');
      return;
    }
    if (!approvedBy.trim()) {
      setErrorMsg('Please enter the approving authority or person.');
      return;
    }

    try {
      devRepairTaskService.createRevision({
        task_id: taskId,
        previous_budget: currentBaseBudget,
        modification_amount: signedMod,
        revised_budget: resultingRevisedBudget,
        reason: reason.trim(),
        date,
        approved_by: approvedBy.trim(),
        supporting_document: supportingDoc.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });

      onRevisionSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record budget revision.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900/95 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Formal Budget Revision / Modification
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                Task: <strong className="text-slate-200">{taskName}</strong> ({taskId})
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Budget Revision Math Visual Box */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Current Base Budget:</span>
              <span className="font-mono text-slate-200 font-bold">{formatBDT(currentBaseBudget)}</span>
            </div>

            {/* Toggle Increase vs Decrease */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModificationType('INCREASE')}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  modificationType === 'INCREASE'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                + Budget Increase
              </button>
              <button
                type="button"
                onClick={() => setModificationType('DECREASE')}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  modificationType === 'DECREASE'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                - Budget Reduction
              </button>
            </div>

            <div className="pt-1">
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Modification Amount (BDT) *
              </label>
              <input
                type="text"
                required
                value={rawModAmount}
                onChange={(e) => setRawModAmount(formatRawNumericInput(e.target.value))}
                placeholder="e.g. 50000"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-400"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-purple-300">
                Resulting Revised Budget:
              </span>
              <span className="font-mono text-base font-bold text-purple-300">
                {formatBDT(resultingRevisedBudget)}
              </span>
            </div>
          </div>

          {/* Reason / Justification */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Reason / Justification *
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scope expanded to include structural crack pressure grouting and additional parapet waterproofing."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Date & Approved By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Revision Approval Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Approved By *
              </label>
              <input
                type="text"
                required
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="e.g. Managing Director / Committee"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Supporting Document & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Supporting Document Ref
              </label>
              <input
                type="text"
                value={supportingDoc}
                onChange={(e) => setSupportingDoc(e.target.value)}
                placeholder="e.g. Committee_Resolution_Memo_14.pdf"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
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
                placeholder="e.g. Unanimously passed in quarterly review"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic">
            * Isolation Rule: This formal revision is strictly archived in the task revision history log and is never overwritten.
          </p>

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
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Budget Revision</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
