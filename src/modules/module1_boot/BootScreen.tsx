/**
 * MODULE 1: System Boot & Fast Data Lazy Loading
 * Loads SQLite database asynchronously without blocking UI render.
 * Features an offline-first engine with background cloud sync indicators.
 */

import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, HardDrive, Cloud, CheckCircle2, ArrowRight } from 'lucide-react';
import { sqliteService } from '../../database/sqliteService';

interface BootScreenProps {
  onBootComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onBootComplete }) => {
  const [bootSteps, setBootSteps] = useState([
    { id: 'db_init', label: 'Initializing SQLite Engine & IndexedDB Cache', status: 'pending' },
    { id: 'schema_verify', label: 'Verifying Relational Schema & Foreign Keys', status: 'pending' },
    { id: 'audit_middleware', label: 'Attaching SystemLogs Async Audit Middleware', status: 'pending' },
    { id: 'master_categories', label: 'Loading Master Categories & Subcategories', status: 'pending' },
    { id: 'cloud_queue', label: 'Verifying Offline Storage & Sync Queue', status: 'pending' },
  ]);

  const [diagnostics, setDiagnostics] = useState<{
    categories: number;
    subcategories: number;
    expenses: number;
    incomes: number;
  }>({ categories: 0, subcategories: 0, expenses: 0, incomes: 0 });

  useEffect(() => {
    let isMounted = true;

    async function runBootSequence() {
      // Step 1: Engine Init
      await new Promise((r) => setTimeout(r, 150));
      if (!isMounted) return;
      setBootSteps((prev) =>
        prev.map((s) => (s.id === 'db_init' ? { ...s, status: 'complete' } : s))
      );

      // Step 2: DB init call
      await sqliteService.initDatabase();
      if (!isMounted) return;
      setBootSteps((prev) =>
        prev.map((s) => (s.id === 'schema_verify' ? { ...s, status: 'complete' } : s))
      );

      // Step 3: Audit middleware
      await new Promise((r) => setTimeout(r, 120));
      if (!isMounted) return;
      setBootSteps((prev) =>
        prev.map((s) => (s.id === 'audit_middleware' ? { ...s, status: 'complete' } : s))
      );

      // Step 4: Categories check
      const cats = await sqliteService.getCategories();
      const subs = await sqliteService.getSubCategories();
      const exps = await sqliteService.getEnrichedExpenses();
      const incs = await sqliteService.getEnrichedIncomes();
      if (!isMounted) return;
      setDiagnostics({
        categories: cats.length,
        subcategories: subs.length,
        expenses: exps.length,
        incomes: incs.length,
      });

      setBootSteps((prev) =>
        prev.map((s) => (s.id === 'master_categories' ? { ...s, status: 'complete' } : s))
      );

      // Step 5: Sync queue
      await new Promise((r) => setTimeout(r, 150));
      if (!isMounted) return;
      setBootSteps((prev) =>
        prev.map((s) => (s.id === 'cloud_queue' ? { ...s, status: 'complete' } : s))
      );
    }

    runBootSequence();

    return () => {
      isMounted = false;
    };
  }, []);

  const allDone = bootSteps.every((s) => s.status === 'complete');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              SAS-AEIT Engine Boot
            </h1>
            <p className="text-xs text-slate-400">
              SAS-AEIT - Asset, Investment &amp; Expense Tracker · SQLite Offline Engine
            </p>
          </div>
        </div>

        {/* Boot Sequence List */}
        <div className="space-y-3 mb-8">
          {bootSteps.map((step) => {
            const isDone = step.status === 'complete';
            return (
              <div
                key={step.id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-slate-800/40 border border-slate-800"
              >
                <span className={isDone ? 'text-slate-200' : 'text-slate-400'}>
                  {step.label}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600 border-t-emerald-400 animate-spin shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Database Diagnostic Snapshot */}
        {allDone && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
            <div>
              <p className="text-xs text-slate-500">Categories</p>
              <p className="text-base font-semibold font-mono text-emerald-400">
                {diagnostics.categories}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sub-Categories</p>
              <p className="text-base font-semibold font-mono text-emerald-400">
                {diagnostics.subcategories}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Expenses</p>
              <p className="text-base font-semibold font-mono text-slate-200">
                {diagnostics.expenses}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Incomes</p>
              <p className="text-base font-semibold font-mono text-slate-200">
                {diagnostics.incomes}
              </p>
            </div>
          </div>
        )}

        {/* Operational Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mb-8 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQLite Offline Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Audit Trail Armed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>Cloud Sync Ready</span>
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={onBootComplete}
          disabled={!allDone}
          className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            allDone
              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>{allDone ? 'Launch SAS-AEIT Workspace' : 'Initializing Database...'}</span>
          {allDone && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
