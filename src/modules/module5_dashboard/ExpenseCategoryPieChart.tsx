/**
 * MODULE 5: Recharts Expense Category Pie & Donut Chart Component
 * 
 * Visually represents expense distribution across primary categories with:
 * - Interactive Recharts PieChart, Pie, Cell, Sector, Tooltip, and ResponsiveContainer
 * - Dual Mode: Modern Donut Ring (with central stats) vs. Solid Radial Pie Chart
 * - Timeframe Filtering: Current Month, Last 30 Days, or All Time
 * - Interactive slice hover & click with active sector highlighting
 * - Synchronized category selection that drives the drill-down subcategory inspector
 * - Dynamic color palette with BDT currency formatting
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from 'recharts';
import {
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  Maximize2,
  Info,
} from 'lucide-react';
import { EnrichedExpense } from '../../types/database';
import { formatBDT, formatBDTShort } from '../../utils/bdtFormatter';

export interface ExpenseCategoryPieChartProps {
  expenses: EnrichedExpense[];
  selectedCategory: string | null;
  onSelectCategory: (categoryName: string | null) => void;
  className?: string;
}

export interface CategoryDistributionItem {
  name: string;
  total: number;
  percentage: number;
  color: string;
  transactionCount: number;
  subcategories: Record<string, number>;
  topSubcategory?: string;
}

// Master color palette for primary category distribution slices
const PIE_PALETTE = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#A855F7', // Violet
];

export const ExpenseCategoryPieChart: React.FC<ExpenseCategoryPieChartProps> = ({
  expenses,
  selectedCategory,
  onSelectCategory,
  className = '',
}) => {
  // Chart visual configuration: Donut with center stats vs Classic Solid Pie
  const [chartMode, setChartMode] = useState<'DONUT' | 'PIE'>('DONUT');

  // Timeframe filter window: Current Month (default), 30 Days, or All Time
  const [timeWindow, setTimeWindow] = useState<'MONTH' | '30D' | 'ALL'>('MONTH');

  // Active hovered sector index in Recharts
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // -------------------------------------------------------------------------
  // 1. Filter expenses according to chosen timeframe
  // -------------------------------------------------------------------------
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

    if (timeWindow === 'MONTH') {
      return expenses.filter((exp) => exp.date.startsWith(currentMonthStr));
    }

    if (timeWindow === '30D') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      return expenses.filter((exp) => exp.date >= thirtyDaysAgoStr);
    }

    // 'ALL' Time
    return expenses;
  }, [expenses, timeWindow]);

  // -------------------------------------------------------------------------
  // 2. Aggregate expenses by primary category
  // -------------------------------------------------------------------------
  const { chartData, totalExpenseAmount, topCategory } = useMemo(() => {
    const catMap: Record<
      string,
      {
        total: number;
        count: number;
        subcategories: Record<string, number>;
      }
    > = {};

    filteredExpenses.forEach((exp) => {
      const cName = exp.category_name || 'Others';
      const sName = exp.subcategory_name || 'General';

      if (!catMap[cName]) {
        catMap[cName] = { total: 0, count: 0, subcategories: {} };
      }

      catMap[cName].total += exp.amount_bdt;
      catMap[cName].count += 1;
      catMap[cName].subcategories[sName] =
        (catMap[cName].subcategories[sName] || 0) + exp.amount_bdt;
    });

    const total = Object.values(catMap).reduce((sum, item) => sum + item.total, 0);

    const sortedEntries = Object.entries(catMap)
      .map(([name, data], idx) => {
        const percentage = total > 0 ? (data.total / total) * 100 : 0;

        // Determine top subcategory
        let topSub = '';
        let maxSubAmount = 0;
        Object.entries(data.subcategories).forEach(([sub, amt]) => {
          if (amt > maxSubAmount) {
            maxSubAmount = amt;
            topSub = sub;
          }
        });

        return {
          name,
          total: data.total,
          percentage,
          color: PIE_PALETTE[idx % PIE_PALETTE.length],
          transactionCount: data.count,
          subcategories: data.subcategories,
          topSubcategory: topSub,
        } as CategoryDistributionItem;
      })
      .sort((a, b) => b.total - a.total);

    return {
      chartData: sortedEntries,
      totalExpenseAmount: total,
      topCategory: sortedEntries[0] || null,
    };
  }, [filteredExpenses]);

  // Sync active index with selected category if set
  const currentSelectedIndex = useMemo(() => {
    if (!selectedCategory) return -1;
    return chartData.findIndex((c) => c.name === selectedCategory);
  }, [chartData, selectedCategory]);

  const effectiveActiveIndex = activeIndex !== null ? activeIndex : (currentSelectedIndex >= 0 ? currentSelectedIndex : null);
  const activeItem = effectiveActiveIndex !== null && chartData[effectiveActiveIndex] ? chartData[effectiveActiveIndex] : null;

  // -------------------------------------------------------------------------
  // Recharts Custom Active Sector Shape (Glow & Expand effect)
  // -------------------------------------------------------------------------
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

    return (
      <g>
        {/* Glow backdrop sector */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={Math.max(0, innerRadius - 3)}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: `drop-shadow(0 0 10px ${fill}88)`,
            transition: 'all 0.3s ease',
          }}
        />
        {/* Crisp outer ring accent */}
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 11}
          outerRadius={outerRadius + 13}
          fill={fill}
        />
      </g>
    );
  };

  // -------------------------------------------------------------------------
  // Recharts Rich Custom Tooltip
  // -------------------------------------------------------------------------
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CategoryDistributionItem;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: data.color }}
              />
              <span className="font-bold text-white text-xs">{data.name}</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
              {data.percentage.toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Total Spent:</span>
              <span className="font-bold text-emerald-300">{formatBDT(data.total)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Transactions:</span>
              <span className="text-slate-200">{data.transactionCount} entries</span>
            </div>

            {data.topSubcategory && (
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Primary Item:</span>
                <span className="text-slate-200 font-sans truncate max-w-[110px]">
                  {data.topSubcategory}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-emerald-400/80 font-sans italic flex items-center gap-1">
            <span>Tap slice to inspect subcategories</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between ${className}`}>
      {/* Chart Header & Control Toolbar */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                Recharts Visualization
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-medium">Primary Categories</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mt-1">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>Expense Distribution Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive proportional breakdown of outflow across primary master categories
            </p>
          </div>

          {/* Timeframe & Chart Style Toggles */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTimeWindow('MONTH')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  timeWindow === 'MONTH'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Current Calendar Month"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow('30D')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  timeWindow === '30D'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Rolling Last 30 Days"
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow('ALL')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  timeWindow === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="All Recorded Ledger Transactions"
              >
                All Time
              </button>
            </div>

            {/* Donut vs Solid Pie Switch */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setChartMode('DONUT')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  chartMode === 'DONUT'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Donut
              </button>
              <button
                type="button"
                onClick={() => setChartMode('PIE')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  chartMode === 'PIE'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solid Pie
              </button>
            </div>
          </div>
        </div>

        {/* Aggregate KPI Ribbon */}
        <div className="grid grid-cols-3 gap-2.5 mb-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Outflow</span>
            <span className="text-sm sm:text-base font-bold font-mono text-white block mt-0.5">
              {formatBDT(totalExpenseAmount)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Top Category</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate block mt-0.5" title={topCategory?.name}>
              {topCategory?.name || 'None'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Categories</span>
            <span className="text-sm sm:text-base font-bold font-mono text-sky-400 block mt-0.5">
              {chartData.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Canvas */}
      {chartData.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <PieIcon className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">No expense records found for this period</p>
          <p className="text-[11px] text-slate-400">
            Switch timeframe to 'All Time' or record a new transaction to generate the distribution chart.
          </p>
        </div>
      ) : (
        <div className="relative w-full my-2 flex items-center justify-center">
          <div className="relative w-full h-64 sm:h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={chartMode === 'DONUT' ? 62 : 0}
                  outerRadius={chartMode === 'DONUT' ? 95 : 92}
                  paddingAngle={chartMode === 'DONUT' ? 3 : 1}
                  dataKey="total"
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(entry) => {
                    if (entry && entry.name) {
                      onSelectCategory(entry.name === selectedCategory ? null : entry.name);
                    }
                  }}
                  cursor="pointer"
                  animationDuration={600}
                >
                  {chartData.map((entry, idx) => {
                    const isSelected = selectedCategory === entry.name || effectiveActiveIndex === idx;
                    return (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        stroke={isSelected ? '#34d399' : '#0f172a'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all duration-200 cursor-pointer"
                        style={{
                          filter: isSelected ? `drop-shadow(0 0 8px ${entry.color}88)` : undefined,
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Central Metrics Ring Display in Donut Mode */}
            {chartMode === 'DONUT' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2 z-10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate max-w-[110px]">
                  {activeItem?.name || selectedCategory || 'Total Outflow'}
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-white tabular-nums leading-tight">
                  {formatBDTShort(activeItem?.total ?? totalExpenseAmount)}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                  {activeItem
                    ? `${activeItem.percentage.toFixed(1)}%`
                    : selectedCategory && chartData.find((c) => c.name === selectedCategory)
                    ? `${chartData.find((c) => c.name === selectedCategory)!.percentage.toFixed(1)}%`
                    : '100%'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Category Legend Grid */}
      {chartData.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
            <span>Primary Categories ({chartData.length}):</span>
            <span className="italic">Tap to filter drill-down</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
            {chartData.map((cat, idx) => {
              const isSelected = selectedCategory === cat.name;

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onSelectCategory(isSelected ? null : cat.name)}
                  className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-slate-200 truncate text-[11px]">
                        {cat.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-baseline justify-between mt-1 text-[11px] font-mono">
                    <span className="text-slate-400 font-semibold">{cat.percentage.toFixed(1)}%</span>
                    <span className="text-slate-300 font-medium">{formatBDTShort(cat.total)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
