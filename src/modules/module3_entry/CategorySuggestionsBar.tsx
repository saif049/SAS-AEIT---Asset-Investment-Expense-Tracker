/**
 * Category Suggestions & Pre-Population Component
 * Displays intelligent tags, common transaction notes, and recent entries
 * under the selected category to enable 1-tap form pre-population.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  Clock,
  ArrowRight,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { CategorySuggestionsResult, RecentEntrySuggestion } from '../../utils/categorySuggestions';
import { formatBDT } from '../../utils/bdtFormatter';

interface CategorySuggestionsBarProps {
  categoryName: string;
  entryMode: 'EXPENSE' | 'INCOME';
  suggestions: CategorySuggestionsResult;
  currentRemarks: string;
  onSelectTag: (tag: string) => void;
  onSelectNote: (note: string) => void;
  onPrepopulateEntry: (entry: RecentEntrySuggestion) => void;
}

export const CategorySuggestionsBar: React.FC<CategorySuggestionsBarProps> = ({
  categoryName,
  entryMode,
  suggestions,
  currentRemarks,
  onSelectTag,
  onSelectNote,
  onPrepopulateEntry,
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  const { tags, notes, recentEntries } = suggestions;

  const handlePrepopulate = (entry: RecentEntrySuggestion) => {
    setSelectedEntryId(entry.id);
    onPrepopulateEntry(entry);
  };

  const isTagSelected = (tag: string) => {
    return currentRemarks.toLowerCase().includes(tag.toLowerCase());
  };

  return (
    <div className="space-y-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/20 shadow-inner">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Smart Suggestions for</span>
              <span className="text-emerald-400">"{categoryName}"</span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Tap tags to add, or select recent entries to auto-fill the form
            </p>
          </div>
        </div>

        {selectedEntryId && (
          <button
            type="button"
            onClick={() => setSelectedEntryId(null)}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Clone</span>
          </button>
        )}
      </div>

      {/* 1. Recent Entries Pre-Population Carousel (if any records exist for this category) */}
      {recentEntries.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Recent Entries ({recentEntries.length})</span>
            </span>
            <span className="text-[10px] text-slate-500">Tap to pre-populate</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentEntries.slice(0, 4).map((entry) => {
              const isSelected = selectedEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => handlePrepopulate(entry)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-400/80 shadow-xs'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-mono text-emerald-300">
                          {formatBDT(entry.amount_bdt)}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                          {entry.subcategory_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {entry.date}
                      </span>
                    </div>

                    <div
                      className={`p-1 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  {entry.remarks ? (
                    <p className="text-[11px] text-slate-300 line-clamp-1 italic">
                      "{entry.remarks}"
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500">No remarks</p>
                  )}

                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      {isSelected ? 'Pre-populated active' : 'Click to copy values'}
                    </span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-semibold">
                      <span>Use this</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Intelligent Tag Chips */}
      {tags.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-emerald-400" />
            <span>Recommended Tags for {entryMode === 'EXPENSE' ? 'Expense' : 'Income'}</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = isTagSelected(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSelectTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
                  }`}
                  title={active ? 'Tag added in remarks' : `Add ${tag} to remarks`}
                >
                  <span>{tag}</span>
                  {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Common Transaction Notes Presets */}
      {notes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Quick Transaction Notes</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {notes.map((note, index) => {
              const active = currentRemarks.trim() === note.trim();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectNote(note)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] text-left transition-colors cursor-pointer border ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-slate-900/90 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                  title="Click to fill Remarks field"
                >
                  {note}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
