/**
 * INDEPENDENT MODULE: Development / Repair Task Service
 * 
 * Strict Isolation Rule:
 * This module is completely self-contained. It maintains its own:
 * - Tasks
 * - Source of Funds (unlimited)
 * - Budget & formal Revisions history
 * - Expenses / Costs
 * - Documents & Attachments
 * - Calculations & Reports
 * 
 * It does NOT automatically read from, write to, or create transactions in
 * Finance, Accounting, Inventory, Procurement, Maintenance, or Projects.
 */

import {
  DevRepairTask,
  DevTaskSourceOfFund,
  DevTaskBudgetRevision,
  DevTaskExpense,
  DevTaskAttachment,
  DevTaskFinancialSummary,
} from '../types/database';

const DEV_TASK_STORAGE_KEY = 'sas_aeit_dev_repair_tasks_v1';

interface DevTaskModuleState {
  tasks: DevRepairTask[];
  funds: DevTaskSourceOfFund[];
  revisions: DevTaskBudgetRevision[];
  expenses: DevTaskExpense[];
  nextIds: {
    task: number;
    fund: number;
    revision: number;
    expense: number;
    doc: number;
  };
}

class DevRepairTaskService {
  private state: DevTaskModuleState | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      const stored = localStorage.getItem(DEV_TASK_STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
        return;
      }
    } catch (e) {
      console.warn('Could not read DevRepairTasks, generating seed data', e);
    }

    this.state = this.buildInitialSeeds();
    this.persist();
  }

  private persist(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(DEV_TASK_STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.error('Failed to persist DevRepairTask module state', err);
    }
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('DevRepairTaskService listener error', err);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Financial & Budget Calculation Engine
  // Core Requirement:
  // Effective Budget = Initial Budget + Additional Accumulated Fund
  // where Additional Accumulated Fund = max(0, Accumulated Fund - Base Budget)
  // Therefore Effective Budget = max(Base Budget, Accumulated Fund)
  // If Accumulated Fund < Base Budget, Effective Budget remains Base Budget.
  // --------------------------------------------------------------------------
  public calculateTaskFinancials(task: DevRepairTask): DevTaskFinancialSummary {
    if (!this.state) {
      return {
        taskId: task.id,
        initialBudget: task.initial_budget,
        latestRevisionBudget: task.initial_budget,
        baseBudget: task.initial_budget,
        accumulatedFund: 0,
        additionalAccumulatedFund: 0,
        effectiveBudget: task.initial_budget,
        totalExpenses: 0,
        remainingBudget: task.initial_budget,
        cashBalance: 0,
        burnRatePct: 0,
        fundingCoveragePct: 0,
      };
    }

    // Historical revisions for this task (ordered chronologically)
    const taskRevisions = this.state.revisions
      .filter((r) => r.task_id === task.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latestRevision = taskRevisions.length > 0 ? taskRevisions[taskRevisions.length - 1] : null;
    const baseBudget = latestRevision ? latestRevision.revised_budget : task.initial_budget;

    // Sources of fund for this task
    const taskFunds = this.state.funds.filter((f) => f.task_id === task.id);
    const accumulatedFund = taskFunds.reduce((sum, f) => sum + f.amount, 0);

    // Exact formula from specifications
    const additionalAccumulatedFund = Math.max(0, accumulatedFund - baseBudget);
    const effectiveBudget = Math.max(baseBudget, accumulatedFund);

    // Expenses for this task
    const taskExpenses = this.state.expenses.filter((e) => e.task_id === task.id);
    const totalExpenses = taskExpenses.reduce((sum, e) => sum + e.amount, 0);

    const remainingBudget = effectiveBudget - totalExpenses;
    const cashBalance = accumulatedFund - totalExpenses;

    const burnRatePct = effectiveBudget > 0 ? (totalExpenses / effectiveBudget) * 100 : 0;
    const fundingCoveragePct = effectiveBudget > 0 ? (accumulatedFund / effectiveBudget) * 100 : 0;

    return {
      taskId: task.id,
      initialBudget: task.initial_budget,
      latestRevisionBudget: latestRevision ? latestRevision.revised_budget : task.initial_budget,
      baseBudget,
      accumulatedFund,
      additionalAccumulatedFund,
      effectiveBudget,
      totalExpenses,
      remainingBudget,
      cashBalance,
      burnRatePct,
      fundingCoveragePct,
    };
  }

  // --------------------------------------------------------------------------
  // Task Management Operations
  // --------------------------------------------------------------------------
  public getTasks(): DevRepairTask[] {
    return this.state ? [...this.state.tasks] : [];
  }

  public getTaskById(id: string): DevRepairTask | undefined {
    return this.state?.tasks.find((t) => t.id === id);
  }

  public createTask(data: Omit<DevRepairTask, 'id' | 'created_at' | 'updated_at'>): DevRepairTask {
    if (!this.state) this.init();
    const newId = `DRT-${String(this.state!.nextIds.task++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newTask: DevRepairTask = {
      ...data,
      id: newId,
      attachments: data.attachments || [],
      created_at: now,
      updated_at: now,
    };

    this.state!.tasks.unshift(newTask);
    this.persist();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<DevRepairTask>): DevRepairTask {
    if (!this.state) this.init();
    const idx = this.state!.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);

    const updated: DevRepairTask = {
      ...this.state!.tasks[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.state!.tasks[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteTask(id: string): boolean {
    if (!this.state) return false;
    const prevCount = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((t) => t.id !== id);

    // Cascade delete task-isolated child records
    this.state.funds = this.state.funds.filter((f) => f.task_id !== id);
    this.state.revisions = this.state.revisions.filter((r) => r.task_id !== id);
    this.state.expenses = this.state.expenses.filter((e) => e.task_id !== id);

    this.persist();
    return this.state.tasks.length < prevCount;
  }

  // --------------------------------------------------------------------------
  // Source of Fund Operations
  // --------------------------------------------------------------------------
  public getFunds(taskId?: string): DevTaskSourceOfFund[] {
    if (!this.state) return [];
    if (taskId) {
      return this.state.funds.filter((f) => f.task_id === taskId);
    }
    return [...this.state.funds];
  }

  public createFund(data: Omit<DevTaskSourceOfFund, 'id' | 'created_at'>): DevTaskSourceOfFund {
    if (!this.state) this.init();
    const newId = `SOF-${String(this.state!.nextIds.fund++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newFund: DevTaskSourceOfFund = {
      ...data,
      id: newId,
      created_at: now,
    };

    this.state!.funds.push(newFund);
    this.persist();
    return newFund;
  }

  public updateFund(id: string, updates: Partial<DevTaskSourceOfFund>): DevTaskSourceOfFund {
    if (!this.state) this.init();
    const idx = this.state!.funds.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error(`Source of fund ${id} not found`);

    const updated: DevTaskSourceOfFund = {
      ...this.state!.funds[idx],
      ...updates,
    };

    this.state!.funds[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteFund(id: string): boolean {
    if (!this.state) return false;
    const prev = this.state.funds.length;
    this.state.funds = this.state.funds.filter((f) => f.id !== id);
    this.persist();
    return this.state.funds.length < prev;
  }

  // --------------------------------------------------------------------------
  // Budget Revision Operations (Immutable Audit Trail)
  // Requirement: Never overwrite historical revisions
  // --------------------------------------------------------------------------
  public getRevisions(taskId: string): DevTaskBudgetRevision[] {
    if (!this.state) return [];
    return this.state.revisions
      .filter((r) => r.task_id === taskId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }

  public createRevision(data: Omit<DevTaskBudgetRevision, 'id' | 'created_at'>): DevTaskBudgetRevision {
    if (!this.state) this.init();
    const newId = `REV-${String(this.state!.nextIds.revision++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newRev: DevTaskBudgetRevision = {
      ...data,
      id: newId,
      created_at: now,
    };

    this.state!.revisions.push(newRev);
    this.persist();
    return newRev;
  }

  // --------------------------------------------------------------------------
  // Task Expenses / Costs Operations
  // --------------------------------------------------------------------------
  public getExpenses(taskId?: string): DevTaskExpense[] {
    if (!this.state) return [];
    if (taskId) {
      return this.state.expenses
        .filter((e) => e.task_id === taskId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [...this.state.expenses];
  }

  public createExpense(data: Omit<DevTaskExpense, 'id' | 'created_at'>): DevTaskExpense {
    if (!this.state) this.init();
    const newId = `EXP-${String(this.state!.nextIds.expense++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newExp: DevTaskExpense = {
      ...data,
      id: newId,
      created_at: now,
    };

    this.state!.expenses.push(newExp);
    this.persist();
    return newExp;
  }

  public updateExpense(id: string, updates: Partial<DevTaskExpense>): DevTaskExpense {
    if (!this.state) this.init();
    const idx = this.state!.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Expense ${id} not found`);

    const updated: DevTaskExpense = {
      ...this.state!.expenses[idx],
      ...updates,
    };

    this.state!.expenses[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteExpense(id: string): boolean {
    if (!this.state) return false;
    const prev = this.state.expenses.length;
    this.state.expenses = this.state.expenses.filter((e) => e.id !== id);
    this.persist();
    return this.state.expenses.length < prev;
  }

  // --------------------------------------------------------------------------
  // Document & Attachment Operations
  // --------------------------------------------------------------------------
  public addAttachment(taskId: string, doc: Omit<DevTaskAttachment, 'id' | 'uploaded_at'>): DevTaskAttachment {
    if (!this.state) this.init();
    const task = this.getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const newDocId = `DOC-${String(this.state!.nextIds.doc++).padStart(3, '0')}`;
    const newDoc: DevTaskAttachment = {
      ...doc,
      id: newDocId,
      uploaded_at: new Date().toISOString(),
    };

    const attachments = task.attachments ? [...task.attachments, newDoc] : [newDoc];
    this.updateTask(taskId, { attachments });
    return newDoc;
  }

  public removeAttachment(taskId: string, docId: string): boolean {
    const task = this.getTaskById(taskId);
    if (!task || !task.attachments) return false;
    const updated = task.attachments.filter((d) => d.id !== docId);
    this.updateTask(taskId, { attachments: updated });
    return true;
  }

  // --------------------------------------------------------------------------
  // Clean / Reset For Deployment
  // --------------------------------------------------------------------------
  public resetForDeployment(): void {
    this.state = {
      tasks: [],
      funds: [],
      revisions: [],
      expenses: [],
      nextIds: {
        task: 1,
        fund: 1,
        revision: 1,
        expense: 1,
        doc: 1,
      },
    };
    this.persist();
  }

  // --------------------------------------------------------------------------
  // Export Full Task Report (CSV / JSON)
  // --------------------------------------------------------------------------
  public exportTaskCSV(taskId: string): string {
    const task = this.getTaskById(taskId);
    if (!task) return '';
    const fin = this.calculateTaskFinancials(task);
    const funds = this.getFunds(taskId);
    const revisions = this.getRevisions(taskId);
    const expenses = this.getExpenses(taskId);

    const rows: string[] = [];
    rows.push(`"DEVELOPMENT / REPAIR TASK REPORT: ${task.id} - ${task.name}"`);
    rows.push(`"Type: ${task.task_type} | Status: ${task.status} | Priority: ${task.priority}"`);
    rows.push(`"Location: ${task.location} | Responsible: ${task.responsible_person} | Contractor: ${task.contractor_vendor || 'N/A'}"`);
    rows.push(`"Timeline: ${task.start_date} to ${task.expected_completion} (Actual: ${task.actual_completion || 'In Progress'})"`);
    rows.push('');
    rows.push(`"=== FINANCIAL & BUDGET SUMMARY ==="`);
    rows.push(`"Initial Budget (BDT): ${fin.initialBudget}"`);
    rows.push(`"Base Budget after Revisions (BDT): ${fin.baseBudget}"`);
    rows.push(`"Accumulated Fund (BDT): ${fin.accumulatedFund}"`);
    rows.push(`"Additional Accumulated Fund (BDT): ${fin.additionalAccumulatedFund}"`);
    rows.push(`"Effective Budget (BDT): ${fin.effectiveBudget}"`);
    rows.push(`"Total Expenses to Date (BDT): ${fin.totalExpenses}"`);
    rows.push(`"Remaining Budget (BDT): ${fin.remainingBudget}"`);
    rows.push(`"Net Cash Balance (BDT): ${fin.cashBalance}"`);
    rows.push(`"Budget Burn Rate: ${fin.burnRatePct.toFixed(1)}%"`);
    rows.push('');
    rows.push(`"=== SOURCE OF FUNDS (${funds.length}) ==="`);
    rows.push(`"Fund ID","Source Name","Source Type","Amount (BDT)","Date","Ref No","Status","Received/Committed By","Remarks"`);
    funds.forEach((f) => {
      rows.push(`"${f.id}","${f.source_name}","${f.source_type}","${f.amount}","${f.date}","${f.reference_receipt_no || ''}","${f.status}","${f.received_committed_by || ''}","${f.remarks || ''}"`);
    });
    rows.push('');
    rows.push(`"=== BUDGET REVISIONS AUDIT LOG (${revisions.length}) ==="`);
    rows.push(`"Revision ID","Previous Budget","Modification Amount","Revised Budget","Date","Approved By","Reason","Remarks"`);
    revisions.forEach((r) => {
      rows.push(`"${r.id}","${r.previous_budget}","${r.modification_amount}","${r.revised_budget}","${r.date}","${r.approved_by}","${r.reason}","${r.remarks || ''}"`);
    });
    rows.push('');
    rows.push(`"=== ITEMISED EXPENSES / COSTS (${expenses.length}) ==="`);
    rows.push(`"Expense ID","Date","Category","Expense Item","Amount (BDT)","Paid To","Status","Bill/Voucher No","Remarks"`);
    expenses.forEach((e) => {
      rows.push(`"${e.id}","${e.date}","${e.cost_category}","${e.expense_item}","${e.amount}","${e.paid_to}","${e.payment_status}","${e.voucher_bill_no || ''}","${e.remarks || ''}"`);
    });

    const bom = '\uFEFF';
    return bom + rows.join('\r\n');
  }

  // --------------------------------------------------------------------------
  // Initial Seed Data (Includes Prompt Examples & Realistic Engineering Tasks)
  // --------------------------------------------------------------------------
  private buildInitialSeeds(): DevTaskModuleState {
    const tasks: DevRepairTask[] = [
      {
        id: 'DRT-001',
        name: 'Community Center Roof Waterproofing & Structural Repair',
        task_type: 'Repair',
        description: 'Complete removal of deteriorated bitumen, concrete crack chemical pressure grouting, and 4mm APP torch-on waterproofing membrane installation.',
        location: 'Sector 4 Community Complex, Dhaka',
        responsible_person: 'Engr. M. A. Rahman',
        contractor_vendor: 'Apex Waterproofing Solutions Ltd.',
        priority: 'High',
        start_date: '2026-10-01',
        expected_completion: '2026-10-31',
        actual_completion: undefined,
        status: 'Ongoing',
        initial_budget: 100000,
        notes: 'Priority task to safeguard community facilities before upcoming unseasonal monsoon downpours.',
        attachments: [
          {
            id: 'DOC-001',
            name: 'Roof_Damage_Structural_Assessment_2026.pdf',
            type: 'Quotation',
            size_kb: 420,
            uploaded_at: '2026-09-28T09:30:00.000Z',
            notes: 'Approved site inspection quotation by civil engineer',
          },
          {
            id: 'DOC-002',
            name: 'Initial_Crack_Survey_Photo_Set.jpg',
            type: 'Photo',
            size_kb: 1250,
            uploaded_at: '2026-09-29T11:15:00.000Z',
            notes: 'Before photo set of parapet wall seepage',
          },
        ],
        created_at: '2026-09-28T08:00:00.000Z',
        updated_at: '2026-10-02T10:00:00.000Z',
      },
      {
        id: 'DRT-002',
        name: 'IT Server Room Precision HVAC & Redundant Cooling Installation',
        task_type: 'Development',
        description: 'Installation of dual 5-ton precision inverter DX cooling units with automatic failover telemetry, anti-static raised flooring, and fire suppression dampers.',
        location: 'Headquarters Building, Level 3 Data Center',
        responsible_person: 'Tanvir Hossain, Systems Lead',
        contractor_vendor: 'Electro-Mech Dynamic Engineering',
        priority: 'Urgent',
        start_date: '2026-09-15',
        expected_completion: '2026-10-25',
        actual_completion: undefined,
        status: 'Ongoing',
        initial_budget: 250000,
        notes: 'Critical cooling upgrade to protect core server racks and battery UPS modules.',
        attachments: [
          {
            id: 'DOC-003',
            name: 'HVAC_Engineering_Schematics.pdf',
            type: 'Approval',
            size_kb: 890,
            uploaded_at: '2026-09-12T14:00:00.000Z',
            notes: 'Architectural ducting and power load approval',
          },
        ],
        created_at: '2026-09-12T10:00:00.000Z',
        updated_at: '2026-09-26T16:00:00.000Z',
      },
      {
        id: 'DRT-003',
        name: 'Boundary Perimeter Security Lighting & Sensor Solar Poles',
        task_type: 'Development',
        description: 'Erection of 12 galvanized solar street LED posts along north and west outer boundary with motion-detecting PIR sensors.',
        location: 'Perimeter Wall & Outer Access Road',
        responsible_person: 'Md. Shahidul Islam',
        contractor_vendor: 'SolarTech Green Engineering',
        priority: 'Medium',
        start_date: '2026-10-15',
        expected_completion: '2026-11-10',
        actual_completion: undefined,
        status: 'Planned',
        initial_budget: 85000,
        notes: 'Planned for deployment in mid-October.',
        attachments: [],
        created_at: '2026-10-02T12:00:00.000Z',
        updated_at: '2026-10-02T12:00:00.000Z',
      },
    ];

    // Initial Sources of Funds (matching the prompt's exact example)
    const funds: DevTaskSourceOfFund[] = [
      {
        id: 'SOF-001',
        task_id: 'DRT-001',
        source_name: 'Development Fund',
        source_type: 'Internal Reserve',
        amount: 100000,
        date: '2026-10-01',
        reference_receipt_no: 'TR-DF-2026-101',
        description: 'Core institutional allocation from quarterly community reserve',
        received_committed_by: 'Treasurer Office',
        status: 'Received',
        remarks: 'Direct bank transfer cleared',
        created_at: '2026-10-01T09:00:00.000Z',
      },
      {
        id: 'SOF-002',
        task_id: 'DRT-001',
        source_name: 'Special Contribution',
        source_type: 'Special Contribution',
        amount: 50000,
        date: '2026-10-05',
        reference_receipt_no: 'SC-88921',
        description: 'Emergency facility welfare fund contribution',
        received_committed_by: 'Executive Committee',
        status: 'Received',
        remarks: 'Cheque No. 441029 deposited',
        created_at: '2026-10-05T11:00:00.000Z',
      },
      {
        id: 'SOF-003',
        task_id: 'DRT-001',
        source_name: 'Donor Contribution',
        source_type: 'Donor Contribution',
        amount: 25000,
        date: '2026-10-08',
        reference_receipt_no: 'DONOR-0994',
        description: 'Philanthropic grant for public community library wing',
        received_committed_by: 'Syed Nurul Huda Foundation',
        status: 'Committed',
        remarks: 'MOU signed, installment committed for Oct 10',
        created_at: '2026-10-08T14:30:00.000Z',
      },
      // DRT-002 Funds
      {
        id: 'SOF-004',
        task_id: 'DRT-002',
        source_name: 'IT Infrastructure Capital Fund',
        source_type: 'Internal Reserve',
        amount: 200000,
        date: '2026-09-14',
        reference_receipt_no: 'CAP-2026-IT-04',
        description: 'Allocated from capital expenditure reserves',
        received_committed_by: 'Finance Committee',
        status: 'Received',
        remarks: 'Fund released for procurement advance',
        created_at: '2026-09-14T10:00:00.000Z',
      },
      {
        id: 'SOF-005',
        task_id: 'DRT-002',
        source_name: 'Digital Modernization Grant',
        source_type: 'Govt Grant',
        amount: 120000,
        date: '2026-09-20',
        reference_receipt_no: 'GOVT-GRANT-991',
        description: 'Special technology infrastructure matching grant',
        received_committed_by: 'Ministry Directorate Project Fund',
        status: 'Received',
        remarks: 'Direct treasury EFT credit',
        created_at: '2026-09-20T15:00:00.000Z',
      },
    ];

    // Initial Budget Revisions
    const revisions: DevTaskBudgetRevision[] = [
      {
        id: 'REV-001',
        task_id: 'DRT-002',
        previous_budget: 250000,
        modification_amount: 50000,
        revised_budget: 300000,
        reason: 'Specification upgraded from single condensing unit to N+1 redundant dual inverter units for zero downtime.',
        date: '2026-09-22',
        approved_by: 'Managing Director / Audit Board',
        supporting_document: 'Board_Resolution_Memo_99.pdf',
        remarks: 'Approved in technical committee meeting #14',
        created_at: '2026-09-22T16:00:00.000Z',
      },
    ];

    // Initial Expenses for Tasks
    const expenses: DevTaskExpense[] = [
      // DRT-001 Expenses
      {
        id: 'EXP-001',
        task_id: 'DRT-001',
        expense_item: 'APP 4mm Torch-on Waterproofing Membrane (18 Rolls)',
        cost_category: 'Materials',
        amount: 42000,
        date: '2026-10-02',
        voucher_bill_no: 'INV-APEX-8810',
        paid_to: 'Apex Waterproofing Solutions Ltd.',
        payment_status: 'Paid',
        remarks: 'Delivered to site, inspected by site engineer',
        created_at: '2026-10-02T11:00:00.000Z',
      },
      {
        id: 'EXP-002',
        task_id: 'DRT-001',
        expense_item: 'Bitumen Primer, Polymer Sealant & Chemical Grout',
        cost_category: 'Materials',
        amount: 16500,
        date: '2026-10-03',
        voucher_bill_no: 'BILL-CHEM-3301',
        paid_to: 'Modern Construction Chemicals',
        payment_status: 'Paid',
        remarks: 'High performance polyurethane crack filler',
        created_at: '2026-10-03T14:00:00.000Z',
      },
      {
        id: 'EXP-003',
        task_id: 'DRT-001',
        expense_item: 'Specialist Torch Applicator Mason & Labor Advance',
        cost_category: 'Labor',
        amount: 15000,
        date: '2026-10-04',
        voucher_bill_no: 'VOUCHER-LAB-104',
        paid_to: 'Master Mason Jahangir & Team',
        payment_status: 'Paid',
        remarks: 'First phase labor mobilization payment',
        created_at: '2026-10-04T09:00:00.000Z',
      },
      // DRT-002 Expenses
      {
        id: 'EXP-004',
        task_id: 'DRT-002',
        expense_item: 'Precision 5-Ton Inverter AC Units (Advance Deposit 50%)',
        cost_category: 'Equipment',
        amount: 140000,
        date: '2026-09-18',
        voucher_bill_no: 'PO-HVAC-9901',
        paid_to: 'Electro-Mech Dynamic Engineering',
        payment_status: 'Paid',
        remarks: 'Machinery import and delivery advance',
        created_at: '2026-09-18T12:00:00.000Z',
      },
      {
        id: 'EXP-005',
        task_id: 'DRT-002',
        expense_item: 'Electrical Heavy-Duty Distribution Board & Copper Busbars',
        cost_category: 'Materials',
        amount: 38000,
        date: '2026-09-25',
        voucher_bill_no: 'INV-ELE-552',
        paid_to: 'Bengal Electric Supply',
        payment_status: 'Paid',
        remarks: 'Dedicated 63A circuit breaker panel for cooling loop',
        created_at: '2026-09-25T15:30:00.000Z',
      },
    ];

    return {
      tasks,
      funds,
      revisions,
      expenses,
      nextIds: {
        task: 4,
        fund: 6,
        revision: 2,
        expense: 6,
        doc: 4,
      },
    };
  }
}

export const devRepairTaskService = new DevRepairTaskService();
