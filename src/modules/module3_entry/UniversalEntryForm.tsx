/**
 * MODULE 3: Primary Income & Expense Universal Data Entry Component
 * 
 * Requirements Implemented:
 * 1. Saves direct expense entries into the SQLite 'Expenses' table.
 * 2. Records an event in 'SystemLogs' for audit tracking.
 * 3. Automatically handles cascading sub-categories based on the chosen category.
 * 4. Includes BDT input formatting and an inline date picker.
 * 5. Clean async error handling and comprehensive inline comments.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Tag,
  FileText,
  Car,
  Building,
  TrendingUp,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Repeat,
  Clock,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { sqliteService } from '../../database/sqliteService';
import {
  Category,
  SubCategory,
  ExpenseType,
  IncomeSourceType,
  Vehicle,
  Property,
  Investment,
  RecurrenceFrequency,
  EnrichedExpense,
  EnrichedIncome,
} from '../../types/database';
import { formatBDT, formatRawNumericInput } from '../../utils/bdtFormatter';
import { CategorySuggestionsBar } from './CategorySuggestionsBar';
import {
  getCategorySmartSuggestions,
  RecentEntrySuggestion,
} from '../../utils/categorySuggestions';

interface UniversalEntryFormProps {
  categories: Category[];
  subcategories: SubCategory[];
  vehicles: Vehicle[];
  properties: Property[];
  investments: Investment[];
  onEntrySaved: () => void;
  defaultMode?: 'EXPENSE' | 'INCOME';
}

export const UniversalEntryForm: React.FC<UniversalEntryFormProps> = ({
  categories,
  subcategories,
  vehicles,
  properties,
  investments,
  onEntrySaved,
  defaultMode = 'EXPENSE',
}) => {
  // ----------------------------------------------------
  // Form State
  // ----------------------------------------------------
  const [entryMode, setEntryMode] = useState<'EXPENSE' | 'INCOME'>(defaultMode);
  const [rawAmount, setRawAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<number | null>(null);
  const [expenseType, setExpenseType] = useState<ExpenseType>('DIRECT');
  const [incomeSourceType, setIncomeSourceType] = useState<IncomeSourceType>('DIRECT');
  const [referenceId, setReferenceId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<string>('');

  // Recurring Expense State (Frequency: Weekly, Monthly, Yearly and optional End Date)
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('MONTHLY');
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');

  // UI helpers
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // ----------------------------------------------------
  // Filter Categories by Active Mode (Income vs Expense)
  // ----------------------------------------------------
  const activeCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === entryMode && c.is_active === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, entryMode]);

  // ----------------------------------------------------
  // Requirement 3: Cascading Sub-Categories
  // Filter sub-categories whenever selectedCategoryId changes
  // ----------------------------------------------------
  const cascadingSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories
      .filter((s) => s.category_id === selectedCategoryId && s.is_active === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategories, selectedCategoryId]);

  // Auto-select first category and first cascading sub-category on mount or mode switch
  useEffect(() => {
    if (activeCategories.length > 0) {
      const firstCat = activeCategories[0];
      setSelectedCategoryId(firstCat.id);
    } else {
      setSelectedCategoryId(null);
      setSelectedSubCategoryId(null);
    }
  }, [activeCategories, entryMode]);

  // When category changes, auto-select its first matching subcategory
  useEffect(() => {
    if (cascadingSubCategories.length > 0) {
      setSelectedSubCategoryId(cascadingSubCategories[0].id);
    } else {
      setSelectedSubCategoryId(null);
    }
    setEntitySearchQuery('');
  }, [cascadingSubCategories]);

  // Real-time search query for Payee/Payer entities and sub-categories
  const [entitySearchQuery, setEntitySearchQuery] = useState('');

  const selectedCategory = useMemo(() => {
    return activeCategories.find((c) => c.id === selectedCategoryId);
  }, [activeCategories, selectedCategoryId]);

  const isPayeeOrPayer = useMemo(() => {
    if (!selectedCategory) return false;
    const n = selectedCategory.name.toLowerCase();
    return n === 'payee' || n === 'payer';
  }, [selectedCategory]);

  const payeeOrPayerCat = useMemo(() => {
    const targetName = entryMode === 'EXPENSE' ? 'payee' : 'payer';
    return activeCategories.find((c) => c.name.toLowerCase() === targetName);
  }, [activeCategories, entryMode]);

  const filteredSubCategories = useMemo(() => {
    if (!entitySearchQuery.trim()) return cascadingSubCategories;
    const q = entitySearchQuery.toLowerCase().trim();
    return cascadingSubCategories.filter((sub) => sub.name.toLowerCase().includes(q));
  }, [cascadingSubCategories, entitySearchQuery]);

  // ----------------------------------------------------
  // Category Intelligence & Pre-Population Engine
  // ----------------------------------------------------
  const [historicalExpenses, setHistoricalExpenses] = useState<EnrichedExpense[]>([]);
  const [historicalIncomes, setHistoricalIncomes] = useState<EnrichedIncome[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const [exps, incs] = await Promise.all([
        sqliteService.getEnrichedExpenses(200),
        sqliteService.getEnrichedIncomes(200),
      ]);
      setHistoricalExpenses(exps);
      setHistoricalIncomes(incs);
    } catch {
      // non-blocking fallback
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const suggestions = useMemo(() => {
    return getCategorySmartSuggestions({
      categoryId: selectedCategoryId,
      categoryName: selectedCategory ? selectedCategory.name : '',
      entryMode,
      expenses: historicalExpenses,
      incomes: historicalIncomes,
    });
  }, [selectedCategoryId, selectedCategory, entryMode, historicalExpenses, historicalIncomes]);

  const handleSelectTag = (tag: string) => {
    if (!remarks.trim()) {
      setRemarks(tag);
      return;
    }
    const currentTags = remarks.split(/\s+/);
    if (currentTags.includes(tag)) {
      const filtered = currentTags.filter((t) => t !== tag).join(' ');
      setRemarks(filtered);
    } else {
      setRemarks(`${remarks.trim()} ${tag}`);
    }
  };

  const handleSelectNote = (note: string) => {
    const hashtags = remarks.match(/#[A-Za-z0-9_]+/g);
    if (hashtags && hashtags.length > 0) {
      setRemarks(`${note} ${hashtags.join(' ')}`);
    } else {
      setRemarks(note);
    }
  };

  const handlePrepopulateEntry = (entry: RecentEntrySuggestion) => {
    setRawAmount(entry.amount_bdt.toString());
    setSelectedSubCategoryId(entry.subcategory_id);
    if (entry.remarks) {
      setRemarks(entry.remarks);
    }
    if (entryMode === 'EXPENSE') {
      if (entry.type) {
        setExpenseType(entry.type as ExpenseType);
      }
      setReferenceId(entry.reference_id);
    } else {
      if (entry.type) {
        setIncomeSourceType(entry.type as IncomeSourceType);
      }
      setReferenceId(entry.reference_id);
    }
    setSuccessMessage(
      `Pre-populated from recent entry (${entry.date}): ${formatBDT(entry.amount_bdt)} [${entry.subcategory_name}]`
    );
  };

  // ----------------------------------------------------
  // Requirement 4: BDT Input Formatting Handler
  // ----------------------------------------------------
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = formatRawNumericInput(e.target.value);
    setRawAmount(raw);
    setErrorMessage(null);
  };

  const numericAmount = parseFloat(rawAmount) || 0;

  // Quick Amount Increment Helpers
  const addAmount = (increment: number) => {
    const current = parseFloat(rawAmount) || 0;
    setRawAmount(String(current + increment));
  };

  // ----------------------------------------------------
  // Inline Date Helpers
  // ----------------------------------------------------
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // ----------------------------------------------------
  // Form Submission & Async Error Handling
  // Requirements 1 & 2:
  // - Save direct expense entry to SQLite Expenses table
  // - Record event in SystemLogs for audit tracking
  // ----------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Form field validations
    if (numericAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than ৳ 0.00');
      return;
    }

    if (!selectedCategoryId) {
      setErrorMessage('Please select a valid Category.');
      return;
    }

    if (!selectedSubCategoryId) {
      setErrorMessage('Please select a valid cascading Sub-Category.');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('Please choose a transaction date.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (entryMode === 'EXPENSE') {
        // Requirement 1: Save into SQLite 'Expenses' table (with recurrence support)
        // Requirement 2: Handled inside sqliteService.insertExpense with SystemLogs recording
        const newExpense = await sqliteService.insertExpense({
          date: selectedDate,
          amount_bdt: numericAmount,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubCategoryId,
          expense_type: expenseType,
          reference_id: referenceId,
          remarks: remarks.trim() || undefined,
          is_recurring: isRecurring,
          recurrence_frequency: isRecurring ? recurrenceFrequency : null,
          recurrence_end_date: isRecurring && hasEndDate && recurrenceEndDate ? recurrenceEndDate : null,
        });

        if (isRecurring) {
          const endNote = hasEndDate && recurrenceEndDate ? ` until ${recurrenceEndDate}` : ' (Ongoing)';
          setSuccessMessage(
            `Recurring ${recurrenceFrequency.toLowerCase()} expense of ${formatBDT(
              newExpense.amount_bdt
            )}${endNote} successfully scheduled & recorded in SQLite!`
          );
        } else {
          setSuccessMessage(
            `Expense of ${formatBDT(newExpense.amount_bdt)} successfully logged and audited in SQLite!`
          );
        }
      } else {
        // Direct Income Entry
        const newIncome = await sqliteService.insertIncome({
          date: selectedDate,
          amount_bdt: numericAmount,
          category_id: selectedCategoryId,
          subcategory_id: selectedSubCategoryId,
          source_type: incomeSourceType,
          source_id: referenceId,
          remarks: remarks.trim() || undefined,
        });

        setSuccessMessage(
          `Income of ${formatBDT(newIncome.amount_bdt)} successfully logged and audited in SQLite!`
        );
      }

      // Reset form fields
      setRawAmount('');
      setRemarks('');
      setReferenceId(null);
      setIsRecurring(false);
      setHasEndDate(false);
      setRecurrenceEndDate('');

      // Trigger store refresh & dashboard update
      onEntrySaved();
      await loadHistory();
    } catch (err: unknown) {
      // Requirement 5: Clean async error handling
      console.error('Data entry failed:', err);
      const message = err instanceof Error ? err.message : 'An unexpected database error occurred.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            Universal Transaction Entry
          </h2>
          <p className="text-xs text-slate-400">
            Module 3: Direct SQLite Insertion with Real-Time BDT Formatting & Audit Log
          </p>
        </div>

        {/* Actions: Export CSV and Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await sqliteService.exportTransactionsCSV({ flow: entryMode });
                setSuccessMessage(`Downloaded ${res.filename} (${res.totalRecords} records)`);
              } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : 'CSV export failed');
              }
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV of current transaction records"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Expense vs Income Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setEntryMode('EXPENSE');
                setErrorMessage(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                entryMode === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('INCOME');
                setErrorMessage(null);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                entryMode === 'INCOME'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Income
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Universal Entry Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* 1. BDT Currency Input Section */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Amount (BDT)
            </label>
            <span className="text-xs font-mono font-medium text-emerald-400">
              Formatted: {formatBDT(numericAmount)}
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400 font-mono">
              ৳
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={rawAmount}
              onChange={handleAmountChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-2xl font-bold font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors tabular-nums"
              required
            />
          </div>

          {/* Quick Increment Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400 mr-1">Quick Add:</span>
            {[500, 1000, 2000, 5000, 10000, 50000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => addAmount(val)}
                className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              >
                +{val.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRawAmount('')}
              title="Clear Amount"
              className="ml-auto text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* 2. Cascading Category & Sub-Category Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary Category</span>
              </label>
              {/* Quick Jump to Payee or Payer */}
              {payeeOrPayerCat && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(payeeOrPayerCat.id);
                    setEntitySearchQuery('');
                  }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                    selectedCategoryId === payeeOrPayerCat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Quick switch to ${payeeOrPayerCat.name} category`}
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Quick {payeeOrPayerCat.name}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => {
                  setSelectedCategoryId(Number(e.target.value));
                  setEntitySearchQuery('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                required
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Cascading SubCategory / Entity Selection with Real-Time Search Filter */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isPayeeOrPayer
                    ? (entryMode === 'EXPENSE' ? 'Payee Entity / Beneficiary' : 'Payer Entity / Originator')
                    : 'Cascading Sub-Category'}
                </span>
              </label>
              {cascadingSubCategories.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  {filteredSubCategories.length} / {cascadingSubCategories.length}
                </span>
              )}
            </div>

            {/* Real-time Search Filter Bar */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={entitySearchQuery}
                onChange={(e) => setEntitySearchQuery(e.target.value)}
                placeholder={
                  isPayeeOrPayer
                    ? `Search ${selectedCategory?.name} (e.g. ${entryMode === 'EXPENSE' ? 'Super shop, Grocers...' : 'Govt, Bank...'})`
                    : 'Search sub-categories / entities...'
                }
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {entitySearchQuery && (
                <button
                  type="button"
                  onClick={() => setEntitySearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Entity Quick-Select Chips (live filtered) */}
            {filteredSubCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                {filteredSubCategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubCategoryId(sub.id)}
                    className={`px-2 py-0.5 text-[11px] rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      selectedSubCategoryId === sub.id
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{sub.name}</span>
                    {selectedSubCategoryId === sub.id && <CheckCircle2 className="w-2.5 h-2.5" />}
                  </button>
                ))}
              </div>
            )}

            {filteredSubCategories.length === 0 && entitySearchQuery && (
              <div className="p-2 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between">
                <span>No entities matching "{entitySearchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setEntitySearchQuery('')}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Standard Dropdown Select */}
            <div className="relative">
              <select
                value={selectedSubCategoryId || ''}
                onChange={(e) => setSelectedSubCategoryId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                required
                disabled={filteredSubCategories.length === 0}
              >
                {filteredSubCategories.length === 0 ? (
                  <option value="">No subcategories match search</option>
                ) : (
                  filteredSubCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Smart Category Tags, Common Notes & Recent Entries Pre-Population */}
        {selectedCategory && (
          <CategorySuggestionsBar
            categoryName={selectedCategory.name}
            entryMode={entryMode}
            suggestions={suggestions}
            currentRemarks={remarks}
            onSelectTag={handleSelectTag}
            onSelectNote={handleSelectNote}
            onPrepopulateEntry={handlePrepopulateEntry}
          />
        )}

        {/* 3. Inline Date Selection & Quick Days (Requirement 4) */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Transaction Date
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <span>{showDatePicker ? 'Hide Calendar' : 'Pick Date'}</span>
              </button>
            </div>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            required
          />

          {showDatePicker && (
            <div className="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl text-center">
              <p className="text-xs text-slate-400 mb-2">Selected Entry Date: {selectedDate}</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 10, 15, 30].map((d) => {
                  const target = new Date();
                  target.setDate(target.getDate() - d);
                  const str = target.toISOString().split('T')[0];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSelectedDate(str);
                        setShowDatePicker(false);
                      }}
                      className={`px-2 py-1 text-[11px] rounded font-mono ${
                        selectedDate === str
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {d === 0 ? 'Today' : `${d}d ago`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Type & Asset Reference Linking */}
        {entryMode === 'EXPENSE' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Expense Classification
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                {(['DIRECT', 'VEHICLE', 'PROPERTY', 'INVESTMENT'] as ExpenseType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setExpenseType(t);
                      setReferenceId(null);
                    }}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                      expenseType === t
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Reference Linking */}
            {expenseType === 'VEHICLE' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  Link to Vehicle
                </label>
                <select
                  value={referenceId || ''}
                  onChange={(e) => setReferenceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Registered Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.reg_no})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {expenseType === 'PROPERTY' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  Link to Property
                </label>
                <select
                  value={referenceId || ''}
                  onChange={(e) => setReferenceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Registered Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} {p.sub_type} - {p.survey_type} ({p.land_measurement})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {expenseType === 'INVESTMENT' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  Link to Investment
                </label>
                <select
                  value={referenceId || ''}
                  onChange={(e) => setReferenceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Investment Portfolio --</option>
                  {investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.id} - {inv.type} ({inv.remarks || 'Standard Portfolio'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Income Source Type
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                {(['DIRECT', 'INVESTMENT', 'PROPERTY'] as IncomeSourceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setIncomeSourceType(t);
                      setReferenceId(null);
                    }}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-colors ${
                      incomeSourceType === t
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {incomeSourceType === 'PROPERTY' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  Rental Property Source
                </label>
                <select
                  value={referenceId || ''}
                  onChange={(e) => setReferenceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Rented Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} {p.sub_type} - {p.survey_type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {incomeSourceType === 'INVESTMENT' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  Investment Yield Source
                </label>
                <select
                  value={referenceId || ''}
                  onChange={(e) => setReferenceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Investment Source --</option>
                  {investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.id} - {inv.type} ({inv.remarks || 'Dividend/Profit'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Recurring Expense Definition (Expenses Only) */}
        {entryMode === 'EXPENSE' && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isRecurring ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Define as Recurring Expense
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Specify frequency (weekly, monthly, yearly) and optional end date
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isRecurring ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isRecurring ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Recurrence Details Options */}
            {isRecurring && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                {/* Frequency Selector */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Recurrence Frequency *</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'WEEKLY', label: 'Weekly', desc: 'Every 7 Days' },
                      { id: 'MONTHLY', label: 'Monthly', desc: 'Billing Cycle' },
                      { id: 'YEARLY', label: 'Yearly', desc: 'Annual Renewal' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setRecurrenceFrequency(f.id as RecurrenceFrequency)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          recurrenceFrequency === f.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs">{f.label}</div>
                        <div className="text-[10px] opacity-75">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional End Date */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasEndDate}
                        onChange={(e) => setHasEndDate(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Specify End Date (Optional)</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">
                      {hasEndDate ? 'Bounded Duration' : 'Indefinite / Ongoing'}
                    </span>
                  </div>

                  {hasEndDate && (
                    <div className="mt-2">
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={selectedDate}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        placeholder="YYYY-MM-DD"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Recurrence will automatically terminate on this date.
                      </p>
                    </div>
                  )}
                </div>

                {/* Recurrence Summary Chip */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Will register <strong className="text-white">{recurrenceFrequency}</strong> recurring expense
                    {hasEndDate && recurrenceEndDate ? ` ending on ${recurrenceEndDate}` : ' (ongoing)'}.
                    Stored in SQLite database with automated audit trails.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Remarks / Details */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Remarks / Invoice Reference
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Padma Ilish from Karwan Bazar, or Amber IT bill"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 6. Submit Button with Loading State */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || numericAmount <= 0}
            className={`w-full py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              entryMode === 'EXPENSE'
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 disabled:bg-slate-800 disabled:text-slate-500'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:bg-slate-800 disabled:text-slate-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Executing SQLite Transaction & Audit...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Save {entryMode === 'EXPENSE' ? 'Direct Expense' : 'Direct Income'} (
                  {formatBDT(numericAmount)})
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
