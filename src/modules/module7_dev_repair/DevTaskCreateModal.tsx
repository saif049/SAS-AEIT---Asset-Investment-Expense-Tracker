/**
 * Modal to create or edit a Development / Repair Task
 * Enforces all required specifications:
 * Task Name, Task Type, Description, Location, Responsible Person,
 * Contractor/Vendor, Priority, Start Date, Expected Completion, Status, Initial Budget, Notes.
 */

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Wrench,
  Hammer,
  Calendar,
  User,
  MapPin,
  Briefcase,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { DevRepairTask, DevTaskType, DevTaskPriority, DevTaskStatus } from '../../types/database';
import { devRepairTaskService } from '../../services/devRepairTaskService';
import { formatBDT, formatRawNumericInput } from '../../utils/bdtFormatter';

interface DevTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: DevRepairTask) => void;
  taskToEdit?: DevRepairTask | null;
}

export const DevTaskCreateModal: React.FC<DevTaskCreateModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  taskToEdit,
}) => {
  const isEditing = Boolean(taskToEdit);

  const [name, setName] = useState(taskToEdit?.name || '');
  const [taskType, setTaskType] = useState<DevTaskType>(taskToEdit?.task_type || 'Repair');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [location, setLocation] = useState(taskToEdit?.location || '');
  const [responsiblePerson, setResponsiblePerson] = useState(taskToEdit?.responsible_person || '');
  const [contractorVendor, setContractorVendor] = useState(taskToEdit?.contractor_vendor || '');
  const [priority, setPriority] = useState<DevTaskPriority>(taskToEdit?.priority || 'Medium');
  const [startDate, setStartDate] = useState(
    taskToEdit?.start_date || new Date().toISOString().split('T')[0]
  );
  const [expectedCompletion, setExpectedCompletion] = useState(
    taskToEdit?.expected_completion ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [actualCompletion, setActualCompletion] = useState(taskToEdit?.actual_completion || '');
  const [status, setStatus] = useState<DevTaskStatus>(taskToEdit?.status || 'Planned');
  const [rawInitialBudget, setRawInitialBudget] = useState(
    taskToEdit ? String(taskToEdit.initial_budget) : '100000'
  );
  const [notes, setNotes] = useState(taskToEdit?.notes || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a task name.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please specify the work location.');
      return;
    }
    if (!responsiblePerson.trim()) {
      setErrorMsg('Please specify the responsible person.');
      return;
    }

    const initialBudget = parseFloat(rawInitialBudget) || 0;
    if (initialBudget <= 0) {
      setErrorMsg('Initial Budget must be greater than zero.');
      return;
    }

    try {
      if (isEditing && taskToEdit) {
        const updated = devRepairTaskService.updateTask(taskToEdit.id, {
          name: name.trim(),
          task_type: taskType,
          description: description.trim(),
          location: location.trim(),
          responsible_person: responsiblePerson.trim(),
          contractor_vendor: contractorVendor.trim() || undefined,
          priority,
          start_date: startDate,
          expected_completion: expectedCompletion,
          actual_completion: actualCompletion.trim() || undefined,
          status,
          initial_budget: initialBudget,
          notes: notes.trim() || undefined,
        });
        onTaskCreated(updated);
      } else {
        const created = devRepairTaskService.createTask({
          name: name.trim(),
          task_type: taskType,
          description: description.trim(),
          location: location.trim(),
          responsible_person: responsiblePerson.trim(),
          contractor_vendor: contractorVendor.trim() || undefined,
          priority,
          start_date: startDate,
          expected_completion: expectedCompletion,
          actual_completion: actualCompletion.trim() || undefined,
          status,
          initial_budget: initialBudget,
          notes: notes.trim() || undefined,
          attachments: [],
        });
        onTaskCreated(created);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save task.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {taskType === 'Development' ? <Hammer className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `Edit Task: ${taskToEdit?.id}` : 'Create New Development / Repair Task'}
              </h3>
              <p className="text-xs text-slate-400">
                Independent module task with dedicated budget & funding tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Task Type & Priority Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Task Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskType('Repair')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    taskType === 'Repair'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>Repair</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('Development')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    taskType === 'Development'
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Development</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                {(['Low', 'Medium', 'High', 'Urgent'] as DevTaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      priority === p
                        ? p === 'Urgent'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : p === 'High'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task Name */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Task Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Community Center Roof Waterproofing & Structural Repair"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Work Location *</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Sector 4 Community Complex, Level 3"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DevTaskStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {(['Planned', 'Ongoing', 'Completed', 'Suspended', 'Cancelled'] as DevTaskStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Responsible Person & Contractor / Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Responsible Person *</span>
              </label>
              <input
                type="text"
                required
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Engr. M. A. Rahman"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Contractor / Vendor (Optional)</span>
              </label>
              <input
                type="text"
                value={contractorVendor}
                onChange={(e) => setContractorVendor(e.target.value)}
                placeholder="e.g. Apex Waterproofing Solutions Ltd."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Timeline: Start Date, Expected Completion, Actual Completion */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Planned Start *</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Expected Completion *</span>
              </label>
              <input
                type="date"
                required
                value={expectedCompletion}
                onChange={(e) => setExpectedCompletion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Actual Completion
              </label>
              <input
                type="date"
                value={actualCompletion}
                onChange={(e) => setActualCompletion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Initial Budget Amount (BDT) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold uppercase tracking-wider text-amber-300">
                Initial Budget (BDT) *
              </label>
              <span className="font-mono text-sm font-bold text-amber-400">
                {formatBDT(parseFloat(rawInitialBudget) || 0)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Base task budget. When sources of fund exceed this amount, the system automatically recognizes the additional accumulated funding as the Effective Budget.
            </p>
            <input
              type="text"
              required
              value={rawInitialBudget}
              onChange={(e) => setRawInitialBudget(formatRawNumericInput(e.target.value))}
              placeholder="e.g. 100000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Detailed Description</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe scope of work, technical specifications, and key deliverables..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Additional Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational constraints, meeting references, or safety notes"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
