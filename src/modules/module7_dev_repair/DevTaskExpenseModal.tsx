/**
 * Modal to record or edit a Task-Isolated Expense / Cost
 * Completely separated from general accounting tables.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, ShoppingBag, Calendar, AlertCircle } from 'lucide-react';
import { DevTaskExpense, DevTaskExpenseCategory, DevTaskPaymentStatus } from '../../types/database';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT, formatRawNumericInput } from '../../utils/bdtFormatter';

interface DevTaskExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  onExpenseSaved: () => void;
  expenseToEdit?: DevTaskExpense | null;
}

export const DevTaskExpenseModal: React.FC<DevTaskExpenseModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskName,
  onExpenseSaved,
  expenseToEdit,
}) => {
  const isEditing = Boolean(expenseToEdit);

  const [item, setItem] = useState(expenseToEdit?.expense_item || '');
  const [costCategory, setCostCategory] = useState<DevTaskExpenseCategory>(
    expenseToEdit?.cost_category || 'Materials'
  );
  const [rawAmount, setRawAmount] = useState(expenseToEdit ? String(expenseToEdit.amount) : '15000');
  const [date, setDate] = useState(expenseToEdit?.date || new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState(expenseToEdit?.voucher_bill_no || '');
  const [paidTo, setPaidTo] = useState(expenseToEdit?.paid_to || '');
  const [paymentStatus, setPaymentStatus] = useState<DevTaskPaymentStatus>(
    expenseToEdit?.payment_status || 'Paid'
  );
  const [remarks, setRemarks] = useState(expenseToEdit?.remarks || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseFloat(rawAmount) || 0;
    if (amount <= 0) {
      setErrorMsg('Expense amount must be greater than zero.');
      return;
    }
    if (!item.trim()) {
      setErrorMsg('Please enter the expense item description.');
      return;
    }
    if (!paidTo.trim()) {
      setErrorMsg('Please specify who was paid (Vendor / Contractor / Team).');
      return;
    }

    try {
      if (isEditing && expenseToEdit) {
        devRepairTaskService.updateExpense(expenseToEdit.id, {
          expense_item: item.trim(),
          cost_category: costCategory,
          amount,
          date,
          voucher_bill_no: voucherNo.trim() || undefined,
          paid_to: paidTo.trim(),
          payment_status: paymentStatus,
          remarks: remarks.trim() || undefined,
        });
      } else {
        devRepairTaskService.createExpense({
          task_id: taskId,
          expense_item: item.trim(),
          cost_category: costCategory,
          amount,
          date,
          voucher_bill_no: voucherNo.trim() || undefined,
          paid_to: paidTo.trim(),
          payment_status: paymentStatus,
          remarks: remarks.trim() || undefined,
        });
      }

      onExpenseSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save expense entry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-slate-900/95 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isEditing ? 'Edit Task Expense / Cost' : 'Record Task Expense / Cost'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount (BDT) */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold uppercase tracking-wider text-rose-400 text-[11px]">
                Expense Amount (BDT) *
              </label>
              <span className="font-mono text-sm font-bold text-rose-300">
                {formatBDT(parseFloat(rawAmount) || 0)}
              </span>
            </div>
            <input
              type="text"
              required
              value={rawAmount}
              onChange={(e) => setRawAmount(formatRawNumericInput(e.target.value))}
              placeholder="e.g. 15000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-rose-300 font-bold focus:outline-none focus:border-rose-400"
            />
          </div>

          {/* Expense Item & Cost Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Cost Category *
              </label>
              <select
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value as DevTaskExpenseCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Materials">Materials & Supplies</option>
                <option value="Labor">Labor & Specialist Wages</option>
                <option value="Equipment">Equipment & Machinery</option>
                <option value="Subcontractor">Subcontractor Billing</option>
                <option value="Permits/Fees">Permits, Testing & Fees</option>
                <option value="Miscellaneous">Miscellaneous Site Expenses</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as DevTaskPaymentStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Paid">Paid (Settled)</option>
                <option value="Pending">Pending (Invoice Received)</option>
                <option value="Partial">Partial (Advance Released)</option>
              </select>
            </div>
          </div>

          {/* Item Description */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Expense Item / Description *
            </label>
            <input
              type="text"
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. 4mm APP Waterproofing Membrane (18 Rolls)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Date & Paid To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Expense Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Paid To (Vendor / Contractor) *
              </label>
              <input
                type="text"
                required
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="e.g. Apex Waterproofing Ltd."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Voucher / Bill No & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Voucher / Bill No.
              </label>
              <input
                type="text"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                placeholder="e.g. INV-APEX-8810"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
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
                placeholder="e.g. Inspected on site by engineer"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 italic">
            * Isolation Rule: This cost is recorded strictly inside this Development/Repair Task and will not alter general accounting ledgers.
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
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Record Cost Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
