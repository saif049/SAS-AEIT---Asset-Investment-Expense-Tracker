/**
 * MODULE 8: Android Widget View & Live Material You Simulator
 * Replicates the Android 14/15 Home Screen AppWidget experience for Future Purchase Tasks.
 * Displays:
 * - Items to purchase with real-time check-off
 * - Quantity with exact units (No / Kg / Litre)
 * - Target purchase date & overdue warnings
 * - Remarks / notes
 * - Size options: 4x2 (Rich List), 3x2 (Compact), 2x2 (Glance Counter)
 */

import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  Plus,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Tag,
  ShoppingBag,
} from 'lucide-react';
import { EnrichedPurchaseTask, PurchaseTaskUnit } from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';

interface AndroidWidgetViewProps {
  tasks: EnrichedPurchaseTask[];
  onToggleStatus: (id: number) => Promise<unknown>;
  onOpenCreateModal: () => void;
  onOpenTaskDetail?: (task: EnrichedPurchaseTask) => void;
}

export const AndroidWidgetView: React.FC<AndroidWidgetViewProps> = ({
  tasks,
  onToggleStatus,
  onOpenCreateModal,
  onOpenTaskDetail,
}) => {
  const [widgetSize, setWidgetSize] = useState<'4x2' | '3x2' | '2x2'>('4x2');
  const [filterUnit, setFilterUnit] = useState<'ALL' | PurchaseTaskUnit>('ALL');
  const [filterPendingOnly, setFilterPendingOnly] = useState(true);
  const [copiedGlanceCode, setCopiedGlanceCode] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
  const purchasedTasks = tasks.filter((t) => t.status === 'PURCHASED');

  const filteredTasks = tasks.filter((t) => {
    if (filterPendingOnly && t.status !== 'PENDING') return false;
    if (filterUnit !== 'ALL' && t.unit !== filterUnit) return false;
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter((t) => t.status === 'PENDING' && t.target_date === todayStr);
  const overdueTasks = tasks.filter((t) => t.is_overdue);

  const getUnitBadgeColor = (unit: PurchaseTaskUnit) => {
    switch (unit) {
      case 'Kg':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Litre':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'No':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500 animate-ping';
      case 'HIGH':
        return 'bg-rose-400';
      case 'MEDIUM':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

  const copyWidgetGlanceGuide = async () => {
    const snippet = `// Android Jetpack Glance Widget: PurchaseTaskWidget.kt
class PurchaseTaskWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    provideContent {
      PurchaseTaskListScreen(
        pendingTasks = SQLiteDatabase.getPendingPurchases(),
        onToggle = { taskId -> SQLiteDatabase.togglePurchaseStatus(taskId) }
      )
    }
  }
}`;
    await navigator.clipboard.writeText(snippet);
    setCopiedGlanceCode(true);
    setTimeout(() => setCopiedGlanceCode(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Widget Size & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android Home Screen Widget</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
            Live Simulator
          </span>
        </div>

        {/* Widget Size Selectors */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setWidgetSize('4x2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              widgetSize === '4x2'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4×2 List
          </button>
          <button
            type="button"
            onClick={() => setWidgetSize('3x2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              widgetSize === '3x2'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3×2 Compact
          </button>
          <button
            type="button"
            onClick={() => setWidgetSize('2x2')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              widgetSize === '2x2'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2×2 Glance
          </button>
        </div>
      </div>

      {/* Android Device Surface Simulator */}
      <div className="relative p-4 sm:p-6 bg-gradient-to-b from-slate-950 to-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center justify-center">
        {/* Subtle Android Wallpaper Backdrop Glow */}
        <div className="absolute inset-0 bg-radial from-emerald-500/5 via-transparent to-transparent pointer-events-none rounded-3xl" />

        {/* Material You 4x2 / 3x2 Widget Container */}
        <div
          className={`w-full transition-all duration-300 ${
            widgetSize === '2x2'
              ? 'max-w-[280px]'
              : widgetSize === '3x2'
              ? 'max-w-[380px]'
              : 'max-w-[480px]'
          }`}
        >
          <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-[28px] shadow-2xl p-4 sm:p-5 backdrop-blur-xl overflow-hidden">
            {/* Widget Header - Android Material 3 Glance Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                    <span>Purchase Tasks</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {pendingTasks.length} pending · {tasks.length} total
                  </p>
                </div>
              </div>

              {/* Widget Action: Quick Add Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="p-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Quick Add Purchase Task"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            </div>

            {/* Widget Content - 2x2 Glance Mode */}
            {widgetSize === '2x2' && (
              <div className="space-y-3 py-1">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pending</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 block mt-0.5">
                      {pendingTasks.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Today</span>
                    <span className="text-xl font-bold font-mono text-amber-400 block mt-0.5">
                      {dueTodayTasks.length}
                    </span>
                  </div>
                </div>

                {/* Top 2 Urgent Items */}
                <div className="space-y-1.5">
                  {pendingTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onToggleStatus(t.id)}
                      className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs cursor-pointer hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{t.item_name}</span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${getUnitBadgeColor(t.unit)}`}>
                        {t.quantity} {t.unit}
                      </span>
                    </div>
                  ))}
                  {pendingTasks.length === 0 && (
                    <p className="text-[11px] text-emerald-400 text-center py-2 font-medium">
                      All purchase tasks completed!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Widget Content - 4x2 or 3x2 List Mode */}
            {widgetSize !== '2x2' && (
              <div className="space-y-2">
                {/* Quick Unit Filter Chips inside widget */}
                <div className="flex items-center gap-1 pb-1 overflow-x-auto no-scrollbar">
                  {(['ALL', 'No', 'Kg', 'Litre'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setFilterUnit(u)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        filterUnit === u
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {u === 'ALL' ? 'All Units' : u}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFilterPendingOnly(!filterPendingOnly)}
                    className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                      filterPendingOnly
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {filterPendingOnly ? 'Pending Only' : 'All Tasks'}
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                  {filteredTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No purchase tasks matching this filter.
                    </div>
                  ) : (
                    filteredTasks.slice(0, widgetSize === '3x2' ? 4 : 7).map((t) => {
                      const isPurchased = t.status === 'PURCHASED';

                      return (
                        <div
                          key={t.id}
                          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                            isPurchased
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                              : t.is_overdue
                              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                          }`}
                        >
                          {/* Left: Checkbox & Item Info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Tap Checkbox to Toggle Status */}
                            <button
                              type="button"
                              onClick={() => onToggleStatus(t.id)}
                              className="p-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer shrink-0 transition-transform active:scale-90"
                              title={isPurchased ? 'Mark as Pending' : 'Mark as Purchased'}
                            >
                              {isPurchased ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    isPurchased
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-100'
                                  }`}
                                >
                                  {t.item_name}
                                </span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityDot(t.priority)}`} />
                              </div>

                              {/* Target Date & Remarks preview */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                                <span className="flex items-center gap-1 shrink-0 font-mono">
                                  <Calendar className="w-3 h-3 text-slate-500" />
                                  <span className={t.is_overdue ? 'text-rose-400 font-bold' : ''}>
                                    {t.target_date}
                                  </span>
                                </span>

                                {t.remarks && (
                                  <span className="truncate text-slate-400 max-w-[140px] sm:max-w-[180px]">
                                    · {t.remarks}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quantity (No / Kg / Litre) Badge & Price */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {t.estimated_cost_bdt && t.estimated_cost_bdt > 0 && (
                              <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
                                ~{formatBDT(t.estimated_cost_bdt)}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border shadow-xs ${getUnitBadgeColor(
                                t.unit
                              )}`}
                            >
                              {t.quantity} {t.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Widget Footer - Android Quick Sync Indicator */}
            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Sync: Instant SQLite</span>
              </span>
              <span className="text-slate-400 font-medium">
                Tap circle to toggle purchase
              </span>
            </div>
          </div>
        </div>

        {/* Android Widget Companion Info Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>PWA &amp; Pure Android WebAPK Support</span>
          </span>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={copyWidgetGlanceGuide}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
          >
            {copiedGlanceCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedGlanceCode ? 'Glance Kotlin Copied!' : 'Copy Android Widget XML / Kotlin'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
