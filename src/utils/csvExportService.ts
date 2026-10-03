/**
 * SAS-AEIT CSV Export Service
 * Generates RFC-4180 compliant CSV files with UTF-8 BOM encoding for seamless
 * compatibility with Microsoft Excel, Google Sheets, LibreOffice, and tax filings.
 */

import {
  EnrichedExpense,
  EnrichedIncome,
  Vehicle,
  Property,
  Investment,
} from '../types/database';

export interface CSVExportOptions {
  flow?: 'ALL' | 'EXPENSE' | 'INCOME';
  timeRange?: 'ALL' | 'CURRENT_MONTH' | '30D' | 'CURRENT_YEAR';
  customStartDate?: string;
  customEndDate?: string;
  filenamePrefix?: string;
  vehicles?: Vehicle[];
  properties?: Property[];
  investments?: Investment[];
}

export interface CSVTransactionRecord {
  sl: number;
  voucherId: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  amountBDT: number;
  category: string;
  subcategory: string;
  classification: string;
  reference: string;
  remarks: string;
  createdAt: string;
}

export interface CSVExportResult {
  filename: string;
  totalRecords: number;
  totalIncomesBDT: number;
  totalExpensesBDT: number;
  netCashflowBDT: number;
  csvString: string;
}

/**
 * Escapes a single CSV cell value according to RFC-4180 rules.
 */
function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // Always wrap in quotes and escape internal double quotes as ""
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Resolves human-readable reference label for asset-linked entries
 */
function resolveAssetReference(
  type: string,
  referenceId: number | null | undefined,
  vehicles: Vehicle[] = [],
  properties: Property[] = [],
  investments: Investment[] = []
): string {
  if (!referenceId) return '-';

  if (type === 'VEHICLE') {
    const v = vehicles.find((item) => item.id === referenceId);
    return v ? `${v.brand} ${v.model} (${v.reg_no})` : `Vehicle #${referenceId}`;
  }

  if (type === 'PROPERTY') {
    const p = properties.find((item) => item.id === referenceId);
    if (!p) return `Property #${referenceId}`;
    try {
      const loc = JSON.parse(p.location_json);
      return `${p.sub_type || p.type} (${loc.division || ''} ${loc.district || ''})`;
    } catch {
      return `${p.type} #${referenceId}`;
    }
  }

  if (type === 'INVESTMENT') {
    const inv = investments.find((item) => item.id === referenceId);
    if (!inv) return `Investment #${referenceId}`;
    try {
      const d = JSON.parse(inv.details_json);
      if (inv.type === 'STOCK') return `Stock BO #${d.bo_id || ''}`;
      if (inv.type === 'FDR') return `FDR #${d.instrument_no || ''} (${d.bank || ''})`;
      if (inv.type === 'SAVINGS_CERTIFICATE') return `Sanchayapatra #${d.instrument_no || ''}`;
      if (inv.type === 'LAND') return `Land (${d.location || ''})`;
      return `${inv.type} #${referenceId}`;
    } catch {
      return `${inv.type} #${referenceId}`;
    }
  }

  return '-';
}

/**
 * Compiles unified transaction records from SQLite expenses and incomes.
 */
export function buildCSVTransactionRecords(
  expenses: EnrichedExpense[],
  incomes: EnrichedIncome[],
  options: CSVExportOptions = {}
): CSVTransactionRecord[] {
  const {
    flow = 'ALL',
    timeRange = 'ALL',
    customStartDate,
    customEndDate,
    vehicles = [],
    properties = [],
    investments = [],
  } = options;

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = `${now.getFullYear()}`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const thirtyDaysThreshold = thirtyDaysAgo.toISOString().split('T')[0];

  const matchesDateRange = (dateStr: string): boolean => {
    if (customStartDate && dateStr < customStartDate) return false;
    if (customEndDate && dateStr > customEndDate) return false;

    if (timeRange === 'CURRENT_MONTH') {
      return dateStr.startsWith(currentYearMonth);
    }
    if (timeRange === '30D') {
      return dateStr >= thirtyDaysThreshold;
    }
    if (timeRange === 'CURRENT_YEAR') {
      return dateStr.startsWith(currentYear);
    }
    return true;
  };

  const records: CSVTransactionRecord[] = [];

  // 1. Process Incomes
  if (flow === 'ALL' || flow === 'INCOME') {
    incomes.forEach((inc) => {
      if (!matchesDateRange(inc.date)) return;
      const ref = resolveAssetReference(
        inc.source_type,
        inc.source_id,
        vehicles,
        properties,
        investments
      );

      records.push({
        sl: 0, // Assigned after sorting
        voucherId: `INC-${String(inc.id).padStart(5, '0')}`,
        date: inc.date,
        type: 'INCOME',
        amountBDT: Number(inc.amount_bdt.toFixed(2)),
        category: inc.category_name || 'Income',
        subcategory: inc.subcategory_name || 'General',
        classification: inc.source_type,
        reference: ref,
        remarks: inc.remarks || '',
        createdAt: inc.created_at,
      });
    });
  }

  // 2. Process Expenses
  if (flow === 'ALL' || flow === 'EXPENSE') {
    expenses.forEach((exp) => {
      if (!matchesDateRange(exp.date)) return;
      const ref = resolveAssetReference(
        exp.expense_type,
        exp.reference_id,
        vehicles,
        properties,
        investments
      );

      records.push({
        sl: 0, // Assigned after sorting
        voucherId: `EXP-${String(exp.id).padStart(5, '0')}`,
        date: exp.date,
        type: 'EXPENSE',
        amountBDT: Number(exp.amount_bdt.toFixed(2)),
        category: exp.category_name || 'Expense',
        subcategory: exp.subcategory_name || 'General',
        classification: exp.expense_type,
        reference: ref,
        remarks: exp.remarks || '',
        createdAt: exp.created_at,
      });
    });
  }

  // Sort descending by date (newest first), then by voucher ID
  records.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return b.voucherId.localeCompare(a.voucherId);
  });

  // Assign serial numbers (1-indexed)
  records.forEach((r, idx) => {
    r.sl = idx + 1;
  });

  return records;
}

/**
 * Builds the complete RFC-4180 CSV string with UTF-8 BOM, metadata header,
 * data rows, and summary footer.
 */
export function generateCSVContent(
  records: CSVTransactionRecord[],
  options: CSVExportOptions = {}
): CSVExportResult {
  const { flow = 'ALL', timeRange = 'ALL', filenamePrefix = 'SAS_AEIT_Financial_Ledger' } = options;

  const totalIncomesBDT = records
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum + r.amountBDT, 0);

  const totalExpensesBDT = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + r.amountBDT, 0);

  const netCashflowBDT = totalIncomesBDT - totalExpensesBDT;
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];

  const csvRows: string[] = [];

  // 1. Metadata Header Rows
  csvRows.push(escapeCSVCell('SAS-AEIT - Asset, Investment & Expense Tracker - SQLite Master Ledger'));
  csvRows.push(escapeCSVCell(`Export Timestamp: ${nowIso} | Export Date: ${todayDate}`));
  csvRows.push(escapeCSVCell(`Scope: ${flow} Records | Timeframe: ${timeRange}`));
  csvRows.push(escapeCSVCell(`Total Transactions: ${records.length}`));
  csvRows.push(escapeCSVCell(`Total Incomes (BDT): ${totalIncomesBDT.toFixed(2)}`));
  csvRows.push(escapeCSVCell(`Total Expenses (BDT): ${totalExpensesBDT.toFixed(2)}`));
  csvRows.push(escapeCSVCell(`Net Cashflow Surplus / Deficit (BDT): ${netCashflowBDT.toFixed(2)}`));
  csvRows.push(''); // Blank separator row

  // 2. Table Column Headers
  const columnHeaders = [
    'SL No',
    'Voucher ID',
    'Date (YYYY-MM-DD)',
    'Transaction Type',
    'Amount (BDT)',
    'Category',
    'Sub-Category',
    'Classification',
    'Linked Asset / Reference',
    'Remarks / Notes',
    'Audit Timestamp',
  ];
  csvRows.push(columnHeaders.map(escapeCSVCell).join(','));

  // 3. Data Rows
  records.forEach((r) => {
    const row = [
      r.sl,
      r.voucherId,
      r.date,
      r.type,
      r.amountBDT.toFixed(2),
      r.category,
      r.subcategory,
      r.classification,
      r.reference,
      r.remarks,
      r.createdAt,
    ];
    csvRows.push(row.map(escapeCSVCell).join(','));
  });

  // 4. Summary Totals Footer
  csvRows.push('');
  csvRows.push(['', 'SUMMARY TOTALS', '', '', '', '', '', '', '', '', ''].map(escapeCSVCell).join(','));
  csvRows.push(
    ['', 'Gross Incomes', '', 'INCOME', totalIncomesBDT.toFixed(2), '', '', '', '', '', ''].map(escapeCSVCell).join(',')
  );
  csvRows.push(
    ['', 'Total Expenses', '', 'EXPENSE', totalExpensesBDT.toFixed(2), '', '', '', '', '', ''].map(escapeCSVCell).join(',')
  );
  csvRows.push(
    ['', 'Net Cashflow', '', 'NET', netCashflowBDT.toFixed(2), '', '', '', '', '', ''].map(escapeCSVCell).join(',')
  );

  // UTF-8 Byte Order Mark (BOM) ensures Microsoft Excel properly identifies UTF-8
  const bom = '\uFEFF';
  const csvString = bom + csvRows.join('\r\n');

  const scopeSlug = flow === 'ALL' ? 'Transactions_All' : flow === 'EXPENSE' ? 'Expenses' : 'Incomes';
  const filename = `${filenamePrefix}_${scopeSlug}_${todayDate}.csv`;

  return {
    filename,
    totalRecords: records.length,
    totalIncomesBDT,
    totalExpensesBDT,
    netCashflowBDT,
    csvString,
  };
}

/**
 * Triggers a browser download of the CSV file using Blob & download link.
 */
export function triggerCSVDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-level one-step execution: filters SQLite expense and income records,
 * generates formatted CSV, and triggers instant browser download.
 */
export function exportTransactionsToCSV(
  expenses: EnrichedExpense[],
  incomes: EnrichedIncome[],
  options: CSVExportOptions = {}
): CSVExportResult {
  const records = buildCSVTransactionRecords(expenses, incomes, options);
  const result = generateCSVContent(records, options);
  triggerCSVDownload(result.csvString, result.filename);
  return result;
}
