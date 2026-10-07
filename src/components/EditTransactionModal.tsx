/**
 * SAS-AEIT Transaction Edit Modal
 * Allows updating existing direct expenses or incomes with cascading categories,
 * real-time BDT formatting, and automated SQLite audit logging.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  FolderTree,
} from 'lucide-react';
import { Category, SubCategory } from '../types/database';
import { sqliteService } from '../database/sqliteService';
import { formatBDT } from '../utils/bdtFormatter';

export interface EditableTransaction {
  id: string; // e.g. 'exp-1' or 'inc-2'
  rawId: number;
  type: 'EXPENSE' | 'INCOME';
  amount_bdt: number;
  date: string;
  category_id: number;
  subcategory_id: number;
  category?: string;
  subcategory?: string;
  remarks: string | null;
  tag?: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: EditableTransaction | null;
  categories: Category[];
  subcategories: SubCategory[];
  onSaved: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  subcategories,
  onSaved,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when transaction opens
  useEffect(() => {
    if (transaction) {
      setAmountStr(String(transaction.amount_bdt));
      setDate(transaction.date);
      setSelectedCategoryId(transaction.category_id);
      setSelectedSubCategoryId(transaction.subcategory_id);
      setRemarks(transaction.remarks || '');
      setErrorMsg(null);
    }
  }, [transaction]);

  const activeCategories = useMemo(() => {
    if (!transaction) return [];
    return categories
      .filter((c) => c.type === transaction.type && c.is_active === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, transaction]);

  const cascadingSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories
      .filter((s) => s.category_id === selectedCategoryId && s.is_active === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategories, selectedCategoryId]);

  const numericAmount = parseFloat(amountStr) || 0;

  if (!isOpen || !transaction) return null;

  const handleCategoryChange = (catId: number) => {
    setSelectedCategoryId(catId);
    const subs = subcategories.filter((s) => s.category_id === catId && s.is_active === 1);
    setSelectedSubCategoryId(subs.length > 0 ? subs[0].id : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0 BDT.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Please select a category.');
      return;
    }
    if (!selectedSubCategoryId) {
      setErrorMsg('Please select a sub-category.');
      return;
    }
    if (!date) {
      setErrorMsg('Please select a date.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      if (transaction.type === 'EXPENSE') {
        await sqliteService.updateExpense(transaction.rawId, {
          amount_bdt: numericAmount,
          date,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubCategoryId,
          remarks: remarks.trim() || null,
        });
      } else {
        await sqliteService.updateIncome(transaction.rawId, {
          amount_bdt: numericAmount,
          date,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubCategoryId,
          remarks: remarks.trim() || null,
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update transaction';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                transaction.type === 'INCOME'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edit {transaction.type === 'INCOME' ? 'Income' : 'Expense'} Entry</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                  #{transaction.rawId}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Alterations will be permanently registered in SQLite System Audit Logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold uppercase tracking-wider text-slate-300">
                Amount (BDT) *
              </label>
              <span className="font-mono text-emerald-400 font-bold">
                {numericAmount > 0 ? formatBDT(numericAmount) : '৳ 0.00'}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                ৳
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Date Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(new Date().toISOString().split('T')[0])}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category & Cascading Sub-Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">-- Select Category --</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Sub-Category *
              </label>
              <select
                value={selectedSubCategoryId || ''}
                onChange={(e) => setSelectedSubCategoryId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                required
                disabled={cascadingSubCategories.length === 0}
              >
                <option value="">-- Select Sub-Category --</option>
                {cascadingSubCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Remarks / Reference
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Voucher reference or invoice note"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || numericAmount <= 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                transaction.type === 'INCOME'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500'
                  : 'bg-rose-500 hover:bg-rose-600 text-white disabled:bg-slate-800 disabled:text-slate-500'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Logging Audit...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
