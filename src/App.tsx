/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Menu,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  HardDrive,
  X,
  Download,
  LayoutDashboard,
  FolderTree,
  Building,
  Receipt,
  Target,
} from 'lucide-react';
import { useAppStore, NavigationScreen } from './store/useAppStore';
import { BootScreen } from './modules/module1_boot/BootScreen';
import { NavigationDrawer } from './components/NavigationDrawer';
import { DashboardView } from './modules/module5_dashboard/DashboardView';
import { UniversalEntryForm } from './modules/module3_entry/UniversalEntryForm';
import { CategoryAuditManager } from './modules/module2_categories/CategoryAuditManager';
import { AssetRegistryManager } from './modules/module4_assets/AssetRegistryManager';
import { AuditLogsViewer } from './modules/module2_categories/AuditLogsViewer';
import { BackupRestoreManager } from './modules/module6_backup/BackupRestoreManager';
import { ReactNativeExpoCodeViewer } from './modules/code_export/ReactNativeExpoCodeViewer';
import { AndroidApkInstallHub } from './modules/android_apk/AndroidApkInstallHub';
import { SavingsGoalsManager } from './modules/module7_savings_goals/SavingsGoalsManager';
import { usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  const {
    activeScreen,
    setActiveScreen,
    isDrawerOpen,
    setIsDrawerOpen,
    isBooted,
    categories,
    subcategories,
    expenses,
    incomes,
    systemLogs,
    investments,
    properties,
    vehicles,
    fuelLogs,
    savingsGoals,
    budgetLimits,
    budgetComparisons,
    summary,
    refresh,
    addSavingsGoal,
    updateSavingsGoal,
    contributeToSavingsGoal,
    syncGoalWithInvestment,
    deleteSavingsGoal,
    setBudgetLimit,
    batchSetBudgetLimits,
  } = useAppStore();

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [hasDismissedBoot, setHasDismissedBoot] = useState(false);
  const [quickModalMode, setQuickModalMode] = useState<'EXPENSE' | 'INCOME' | null>(null);

  // If not booted yet or boot screen not dismissed, show Module 1 BootScreen
  if (!isBooted && !hasDismissedBoot) {
    return <BootScreen onBootComplete={() => setHasDismissedBoot(true)} />;
  }

  // Active Screen Content Renderer
  const renderScreenContent = () => {
    switch (activeScreen) {
      case 'dashboard':
        return (
          <DashboardView
            expenses={expenses}
            incomes={incomes}
            vehicles={vehicles}
            fuelLogs={fuelLogs}
            investments={investments}
            properties={properties}
            categories={categories}
            budgetLimits={budgetLimits}
            budgetComparisons={budgetComparisons}
            onSetBudgetLimit={setBudgetLimit}
            onBatchSetBudgetLimits={batchSetBudgetLimits}
            onNavigateToSavingsGoals={() => setActiveScreen('savings_goals')}
            onQuickAddExpense={() => setQuickModalMode('EXPENSE')}
            onQuickAddIncome={() => setQuickModalMode('INCOME')}
          />
        );

      case 'savings_goals':
        return (
          <SavingsGoalsManager
            savingsGoals={savingsGoals}
            investments={investments}
            onAddGoal={addSavingsGoal}
            onUpdateGoal={updateSavingsGoal}
            onContributeGoal={contributeToSavingsGoal}
            onSyncGoalWithInvestment={syncGoalWithInvestment}
            onDeleteGoal={deleteSavingsGoal}
          />
        );

      case 'entry':
        return (
          <UniversalEntryForm
            categories={categories}
            subcategories={subcategories}
            vehicles={vehicles}
            properties={properties}
            investments={investments}
            onEntrySaved={refresh}
            defaultMode="EXPENSE"
          />
        );

      case 'categories':
        return (
          <CategoryAuditManager
            categories={categories}
            subcategories={subcategories}
            onRefresh={refresh}
          />
        );

      case 'investments':
      case 'properties':
      case 'vehicles':
        return (
          <AssetRegistryManager
            investments={investments}
            properties={properties}
            vehicles={vehicles}
            fuelLogs={fuelLogs}
            onRefresh={refresh}
          />
        );

      case 'audit_logs':
        return <AuditLogsViewer logs={systemLogs} />;

      case 'android_apk':
        return <AndroidApkInstallHub />;

      case 'backup_restore':
        return <BackupRestoreManager onDatabaseRestored={refresh} />;

      case 'expo_code_export':
        return <ReactNativeExpoCodeViewer />;

      default:
        return (
          <DashboardView
            expenses={expenses}
            incomes={incomes}
            vehicles={vehicles}
            fuelLogs={fuelLogs}
            investments={investments}
            properties={properties}
            categories={categories}
            budgetLimits={budgetLimits}
            budgetComparisons={budgetComparisons}
            onSetBudgetLimit={setBudgetLimit}
            onBatchSetBudgetLimits={batchSetBudgetLimits}
            onNavigateToSavingsGoals={() => setActiveScreen('savings_goals')}
            onQuickAddExpense={() => setQuickModalMode('EXPENSE')}
            onQuickAddIncome={() => setQuickModalMode('INCOME')}
          />
        );
    }
  };

  const getScreenTitle = (screen: NavigationScreen) => {
    switch (screen) {
      case 'dashboard':
        return 'Executive Financial Dashboard';
      case 'savings_goals':
        return 'Savings Goals & Target Tracker';
      case 'entry':
        return 'Module 3: Direct Expense & Income Entry';
      case 'categories':
        return 'Module 2: Master Categories & Cascading Tree';
      case 'investments':
      case 'properties':
      case 'vehicles':
        return 'Module 4: Asset Modules & Mileage Registry';
      case 'audit_logs':
        return 'Module 2: SQLite SystemLogs Audit Trail';
      case 'android_apk':
        return 'Android APK & Installation Hub';
      case 'backup_restore':
        return 'Tax Reporting, Bookkeeping & Backups';
      case 'expo_code_export':
        return 'Expo & React Native TypeScript Code';
      default:
        return 'Dashboard';
    }
  };

  // Standalone Mobile UI Shell
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Mobile Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        summary={summary}
      />

      {/* Standalone Mobile App Viewport Container */}
      <div className="w-full max-w-lg min-h-screen bg-slate-900/90 border-x border-slate-800/80 shadow-2xl flex flex-col relative">
        {/* Native Mobile App Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Menu button & Mobile Screen Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 -ml-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">
                  SAS-AEIT
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-mono font-semibold text-emerald-400 px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  SQLite
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[170px] sm:max-w-[220px]">
                {getScreenTitle(activeScreen)}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct APK Install Button if browser supports PWA installation */}
            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install APK</span>
              </button>
            )}

            {/* Quick Savings Goals Shortcut */}
            <button
              onClick={() => setActiveScreen('savings_goals')}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                activeScreen === 'savings_goals'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
              title="Savings Goals"
            >
              <Target className="w-4 h-4 text-amber-400" />
              {savingsGoals.length > 0 && (
                <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded-full font-mono">
                  {savingsGoals.length}
                </span>
              )}
            </button>

            {/* Quick Add Expense Button */}
            <button
              onClick={() => setQuickModalMode('EXPENSE')}
              className="px-2.5 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Expense</span>
            </button>

            {/* Quick Add Income Button */}
            <button
              onClick={() => setQuickModalMode('INCOME')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Income</span>
            </button>
          </div>
        </header>

        {/* Standalone Mobile Main Content (Natural scroll, no double scrollbars) */}
        <main className="flex-1 w-full px-3 py-3.5 pb-28 overflow-x-hidden">
          {renderScreenContent()}
        </main>

        {/* Standalone Mobile Bottom Navigation Bar (Persistent touch tab bar) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-3 py-2 flex items-center justify-between text-[10px]">
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => setActiveScreen('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 flex-1 cursor-pointer transition-colors ${
              activeScreen === 'dashboard'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Home</span>
          </button>

          {/* Tab 2: Savings Goals */}
          <button
            onClick={() => setActiveScreen('savings_goals')}
            className={`flex flex-col items-center gap-0.5 py-1 flex-1 relative cursor-pointer transition-colors ${
              activeScreen === 'savings_goals'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-4.5 h-4.5" />
            <span>Goals</span>
            {savingsGoals.length > 0 && (
              <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Tab 3: Raised Center Action Button (+) for Quick Entry Modal */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={() => setQuickModalMode('EXPENSE')}
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30 border-4 border-slate-950 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              title="Quick Add Transaction"
              aria-label="Quick Add Transaction"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Tab 4: Categories */}
          <button
            onClick={() => setActiveScreen('categories')}
            className={`flex flex-col items-center gap-0.5 py-1 flex-1 cursor-pointer transition-colors ${
              activeScreen === 'categories'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4.5 h-4.5" />
            <span>Categories</span>
          </button>

          {/* Tab 5: Assets */}
          <button
            onClick={() => setActiveScreen('investments')}
            className={`flex flex-col items-center gap-0.5 py-1 flex-1 cursor-pointer transition-colors ${
              activeScreen === 'investments' || activeScreen === 'properties' || activeScreen === 'vehicles'
                ? 'text-purple-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4.5 h-4.5" />
            <span>Assets</span>
          </button>
        </nav>
      </div>

      {/* Quick Add Modal (Direct Mobile Bottom Sheet / Modal) */}
      {quickModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="relative max-w-lg w-full max-h-[92vh] bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-y-auto pb-4">
            {/* Sheet Handle for Mobile Touch */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1 bg-slate-700 rounded-full" />
            </div>

            <div className="px-4 pt-2 pb-1 flex items-center justify-between border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Quick Mobile Entry
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    quickModalMode === 'EXPENSE'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {quickModalMode}
                </span>
              </div>
              <button
                onClick={() => setQuickModalMode(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3">
              <UniversalEntryForm
                categories={categories}
                subcategories={subcategories}
                vehicles={vehicles}
                properties={properties}
                investments={investments}
                onEntrySaved={() => {
                  refresh();
                  setQuickModalMode(null);
                }}
                defaultMode={quickModalMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
