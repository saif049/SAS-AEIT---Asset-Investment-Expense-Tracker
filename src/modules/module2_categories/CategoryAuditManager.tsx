/**
 * MODULE 2: Category & Audit Management
 * CRUD Engine: Add, Edit, Modify, Activate, or Deactivate Categories & Sub-categories.
 * Audit Logger: Every change directly records a write event in SQLite SystemLogs.
 */

import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Shield,
  Layers,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { sqliteService } from '../../database/sqliteService';
import { Category, SubCategory } from '../../types/database';

interface CategoryAuditManagerProps {
  categories: Category[];
  subcategories: SubCategory[];
  onRefresh: () => void;
}

export const CategoryAuditManager: React.FC<CategoryAuditManagerProps> = ({
  categories,
  subcategories,
  onRefresh,
}) => {
  const [selectedType, setSelectedType] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('EXPENSE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // New Category Modal State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  // New SubCategory State
  const [newSubName, setNewSubName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Status message
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  // Filter Categories
  const filteredCategories = categories.filter((c) => {
    const matchesType = selectedType === 'ALL' || c.type === selectedType;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Current active subcategories for the selected category
  const activeSubcategories = selectedCategory
    ? subcategories.filter((s) => s.category_id === selectedCategory.id)
    : [];

  // Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const created = await sqliteService.addCategory(newCatType, newCatName.trim());
      showBanner('success', `Category "${created.name}" created and audited in SystemLogs.`);
      setNewCatName('');
      setShowAddCatModal(false);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleToggleCategoryStatus = async (cat: Category) => {
    try {
      const updated = await sqliteService.toggleCategoryStatus(cat.id);
      showBanner(
        'success',
        `Category "${updated.name}" is now ${updated.is_active === 1 ? 'Active' : 'Inactive'} (SystemLogs recorded).`
      );
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleSaveEditCategory = async (id: number) => {
    if (!editCatName.trim()) return;
    try {
      const updated = await sqliteService.updateCategory(id, editCatName.trim());
      showBanner('success', `Category renamed to "${updated.name}" (SystemLogs recorded).`);
      setEditingCatId(null);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleSaveEditSubCategory = async (id: number) => {
    if (!editSubName.trim()) return;
    try {
      const updated = await sqliteService.updateSubCategory(id, editSubName.trim());
      showBanner('success', `Subcategory renamed to "${updated.name}" (SystemLogs recorded).`);
      setEditingSubId(null);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to update subcategory');
    }
  };

  const handleCreateSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubName.trim()) return;
    try {
      const sub = await sqliteService.addSubCategory(selectedCategory.id, newSubName.trim());
      showBanner(
        'success',
        `Subcategory "${sub.name}" added to "${selectedCategory.name}" and audited.`
      );
      setNewSubName('');
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to add subcategory');
    }
  };

  const handleToggleSubCategoryStatus = async (sub: SubCategory) => {
    try {
      const updated = await sqliteService.toggleSubCategoryStatus(sub.id);
      showBanner(
        'success',
        `Subcategory "${updated.name}" is now ${updated.is_active === 1 ? 'Active' : 'Inactive'} (SystemLogs recorded).`
      );
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-400" />
            Category & Sub-Category Manager
          </h2>
          <p className="text-xs text-slate-400">
            Module 2: Complete Relational Category Tree with Real-Time SQLite Audit Logging
          </p>
        </div>

        <button
          onClick={() => setShowAddCatModal(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Notification Banner */}
      {banner && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {banner.type === 'success' ? (
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Interactive Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setSelectedType('EXPENSE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedType === 'EXPENSE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expenses ({categories.filter((c) => c.type === 'EXPENSE').length})
          </button>
          <button
            onClick={() => setSelectedType('INCOME')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedType === 'INCOME'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Incomes ({categories.filter((c) => c.type === 'INCOME').length})
          </button>
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedType === 'ALL'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({categories.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Dual-Column Category & Sub-category Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Master List */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Categories ({filteredCategories.length})
            </span>
            <span className="text-xs text-slate-400">Click to view sub-items</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredCategories.map((cat) => {
              const catSubCount = subcategories.filter((s) => s.category_id === cat.id).length;
              const isSelected = selectedCategory?.id === cat.id;
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        cat.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />

                    {isEditing ? (
                      <div
                        className="flex items-center gap-1.5 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded px-2 py-1 flex-1"
                        />
                        <button
                          onClick={() => handleSaveEditCategory(cat.id)}
                          className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCatId(null)}
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="truncate">
                        <p
                          className={`text-sm font-medium truncate ${
                            cat.is_active === 1 ? 'text-slate-200' : 'text-slate-500 line-through'
                          }`}
                        >
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {cat.type} · {catSubCount} Subcategories
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isEditing && (
                      <button
                        title="Rename Category"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditCatName(cat.name);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      title={cat.is_active === 1 ? 'Deactivate' : 'Activate'}
                      onClick={() => handleToggleCategoryStatus(cat)}
                      className="p-1.5 rounded transition-colors"
                    >
                      {cat.is_active === 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 hover:text-rose-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: SubCategories Cascade for Selected Category */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Sub-Categories
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedCategory ? (
                  <>
                    Parent: <strong className="text-slate-200">{selectedCategory.name}</strong>
                  </>
                ) : (
                  'Select a category from the left'
                )}
              </p>
            </div>
            {selectedCategory && (
              <span className="text-xs font-mono text-slate-400">
                {activeSubcategories.length} entries
              </span>
            )}
          </div>

          {selectedCategory ? (
            <div className="flex-1 flex flex-col">
              {/* Add New SubCategory Input */}
              <form onSubmit={handleCreateSubCategory} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder={`New sub-item for ${selectedCategory.name}...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newSubName.trim()}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              {/* SubCategory List */}
              <div className="flex-1 max-h-[460px] overflow-y-auto space-y-1.5 pr-1">
                {activeSubcategories.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No sub-categories defined yet for this category.
                  </p>
                ) : (
                  activeSubcategories.map((sub) => {
                    const isEditingThisSub = editingSubId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                      >
                        {isEditingThisSub ? (
                          <div className="flex items-center gap-1.5 flex-1 mr-2">
                            <input
                              type="text"
                              value={editSubName}
                              onChange={(e) => setEditSubName(e.target.value)}
                              className="bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded px-2 py-1 flex-1 focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditSubCategory(sub.id)}
                              className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                              title="Save subcategory"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSubId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={
                              sub.is_active === 1
                                ? 'text-slate-200 font-medium'
                                : 'text-slate-500 line-through'
                            }
                          >
                            {sub.name}
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          {!isEditingThisSub && (
                            <button
                              title="Rename SubCategory"
                              onClick={() => {
                                setEditingSubId(sub.id);
                                setEditSubName(sub.name);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            title={sub.is_active === 1 ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleSubCategoryStatus(sub)}
                            className="p-1 rounded transition-colors cursor-pointer"
                          >
                            {sub.is_active === 1 ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 hover:text-rose-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <FolderTree className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs">Choose a category on the left to inspect its cascading items.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Create New Category</h3>
              <button
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('EXPENSE')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      newCatType === 'EXPENSE'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('INCOME')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      newCatType === 'INCOME'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Real Estate Development"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-semibold rounded-lg text-xs"
                >
                  Create & Record Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
