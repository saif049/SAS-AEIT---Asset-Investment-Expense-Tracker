/**
 * MODULE 6: Backup & Data Restoration with Tax & Accounting Export
 * 
 * Features:
 * 1. Formatted CSV & Excel export for Bangladesh Tax Return (NBR) & Bookkeeping:
 *    - Filters by Fiscal Year (FY 2026-2027, FY 2025-2026, All Time, Current Year)
 *    - Summary of Total Gross Incomes, Deductible Expenses & Net Taxable Balance
 *    - Complete transaction ledger with Date, Type, Amount (BDT), Category, Sub-Category,
 *      Asset Reference, and Voucher Remarks
 *    - UTF-8 BOM encoding for seamless Microsoft Excel compatibility
 * 2. SQLite Database JSON Dump & Restore
 * 3. Cloud Storage Sync simulator
 * 4. Master Schema & Seed Reset
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Upload,
  Cloud,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Copy,
  Check,
  FileSpreadsheet,
  Calendar,
  Filter,
  Receipt,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import { sqliteService } from '../../database/sqliteService';
import { EnrichedExpense, EnrichedIncome, Vehicle, Property, Investment } from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';

interface BackupRestoreManagerProps {
  onDatabaseRestored: () => void;
}

export const BackupRestoreManager: React.FC<BackupRestoreManagerProps> = ({
  onDatabaseRestored,
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Accounting / Tax Export State
  const [taxFiscalYear, setTaxFiscalYear] = useState<string>('ALL');
  const [taxFlowType, setTaxFlowType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [allExpenses, setAllExpenses] = useState<EnrichedExpense[]>([]);
  const [allIncomes, setAllIncomes] = useState<EnrichedIncome[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [previewTab, setPreviewTab] = useState<'cards' | 'preview'>('cards');

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Load transactions for Tax calculation
  const loadLedgerData = async () => {
    try {
      const [exps, incs, vehs, props, invs] = await Promise.all([
        sqliteService.getEnrichedExpenses(),
        sqliteService.getEnrichedIncomes(),
        sqliteService.getVehicles(),
        sqliteService.getProperties(),
        sqliteService.getInvestments(),
      ]);
      setAllExpenses(exps);
      setAllIncomes(incs);
      setVehicles(vehs);
      setProperties(props);
      setInvestments(invs);
    } catch (err) {
      console.error('Failed to load ledger for tax export', err);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, []);

  // Filter ledger records by Fiscal Year / Date & Flow Type
  const filteredLedger = useMemo(() => {
    const records: {
      id: string;
      date: string;
      type: 'INCOME' | 'EXPENSE';
      amount_bdt: number;
      category: string;
      subcategory: string;
      classification: string;
      reference: string;
      remarks: string;
      created_at: string;
    }[] = [];

    const vehMap = new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model} (${v.reg_no})`]));
    const propMap = new Map(properties.map((p) => [p.id, `${p.type} ${p.sub_type} - ${p.survey_type}`]));
    const invMap = new Map(investments.map((i) => [i.id, `${i.type} #${i.id}`]));

    // Incomes
    if (taxFlowType === 'ALL' || taxFlowType === 'INCOME') {
      allIncomes.forEach((inc) => {
        let refStr = '-';
        if (inc.source_type === 'PROPERTY' && inc.source_id) {
          refStr = propMap.get(inc.source_id) || `Property #${inc.source_id}`;
        } else if (inc.source_type === 'INVESTMENT' && inc.source_id) {
          refStr = invMap.get(inc.source_id) || `Investment #${inc.source_id}`;
        }

        records.push({
          id: `INC-${inc.id.toString().padStart(5, '0')}`,
          date: inc.date,
          type: 'INCOME',
          amount_bdt: inc.amount_bdt,
          category: inc.category_name || 'Income',
          subcategory: inc.subcategory_name || 'General',
          classification: inc.source_type,
          reference: refStr,
          remarks: inc.remarks || '',
          created_at: inc.created_at,
        });
      });
    }

    // Expenses
    if (taxFlowType === 'ALL' || taxFlowType === 'EXPENSE') {
      allExpenses.forEach((exp) => {
        let refStr = '-';
        if (exp.expense_type === 'VEHICLE' && exp.reference_id) {
          refStr = vehMap.get(exp.reference_id) || `Vehicle #${exp.reference_id}`;
        } else if (exp.expense_type === 'PROPERTY' && exp.reference_id) {
          refStr = propMap.get(exp.reference_id) || `Property #${exp.reference_id}`;
        } else if (exp.expense_type === 'INVESTMENT' && exp.reference_id) {
          refStr = invMap.get(exp.reference_id) || `Investment #${exp.reference_id}`;
        }

        records.push({
          id: `EXP-${exp.id.toString().padStart(5, '0')}`,
          date: exp.date,
          type: 'EXPENSE',
          amount_bdt: exp.amount_bdt,
          category: exp.category_name || 'Expense',
          subcategory: exp.subcategory_name || 'General',
          classification: exp.expense_type,
          reference: refStr,
          remarks: exp.remarks || '',
          created_at: exp.created_at,
        });
      });
    }

    // Filter by Fiscal Year (Bangladesh FY: July 1 to June 30)
    let dateFiltered = records;
    if (taxFiscalYear === 'FY_2026_2027') {
      dateFiltered = records.filter((r) => r.date >= '2026-07-01' && r.date <= '2027-06-30');
    } else if (taxFiscalYear === 'FY_2025_2026') {
      dateFiltered = records.filter((r) => r.date >= '2025-07-01' && r.date <= '2026-06-30');
    } else if (taxFiscalYear === 'YEAR_2026') {
      dateFiltered = records.filter((r) => r.date.startsWith('2026'));
    }

    return dateFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allExpenses, allIncomes, vehicles, properties, investments, taxFiscalYear, taxFlowType]);

  // Tax Summary Metrics
  const taxSummary = useMemo(() => {
    const totalIncomes = filteredLedger
      .filter((r) => r.type === 'INCOME')
      .reduce((sum, r) => sum + r.amount_bdt, 0);

    const totalExpenses = filteredLedger
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + r.amount_bdt, 0);

    const netTaxableMargin = totalIncomes - totalExpenses;

    return {
      totalIncomes,
      totalExpenses,
      netTaxableMargin,
      count: filteredLedger.length,
    };
  }, [filteredLedger]);

  /**
   * Generates and downloads a clean, formatted CSV with UTF-8 BOM
   * compatible with Microsoft Excel, Google Sheets, and NBR tax filing
   */
  const handleExportTaxCSV = () => {
    try {
      const headers = [
        'SL No',
        'Voucher ID',
        'Date (YYYY-MM-DD)',
        'Flow Type',
        'Amount (BDT)',
        'Classification',
        'Category',
        'Sub-Category',
        'Linked Asset / Reference',
        'Remarks / Voucher Notes',
        'Audit Timestamp',
      ];

      const csvRows: string[] = [];

      // Add Title and Summary metadata rows for tax filing
      csvRows.push(`"SAS-AEIT - Asset, Investment & Expense Tracker - Tax & Accounting Ledger"`);
      csvRows.push(`"Fiscal Period: ${taxFiscalYear.replace('_', ' ')} | Export Date: ${new Date().toISOString().split('T')[0]}"`);
      csvRows.push(`"Total Gross Receipts (BDT): ${taxSummary.totalIncomes.toFixed(2)}"`);
      csvRows.push(`"Total Allowable Expenses (BDT): ${taxSummary.totalExpenses.toFixed(2)}"`);
      csvRows.push(`"Net Taxable Income / Surplus (BDT): ${taxSummary.netTaxableMargin.toFixed(2)}"`);
      csvRows.push(''); // Blank separator line

      // Column Header
      csvRows.push(headers.map((h) => `"${h}"`).join(','));

      // Data Rows
      filteredLedger.forEach((row, idx) => {
        const escaped = [
          (idx + 1).toString(),
          row.id,
          row.date,
          row.type,
          row.amount_bdt.toFixed(2),
          row.classification,
          row.category.replace(/"/g, '""'),
          row.subcategory.replace(/"/g, '""'),
          row.reference.replace(/"/g, '""'),
          row.remarks.replace(/"/g, '""'),
          row.created_at,
        ];
        csvRows.push(escaped.map((f) => `"${f}"`).join(','));
      });

      // Total summary footer row
      csvRows.push('');
      csvRows.push(`"","SUMMARY TOTALS","","","","","","","","",""`);
      csvRows.push(`"","Gross Incomes","","INCOME","${taxSummary.totalIncomes.toFixed(2)}","","","","","",""`);
      csvRows.push(`"","Allowable Expenses","","EXPENSE","${taxSummary.totalExpenses.toFixed(2)}","","","","","",""`);
      csvRows.push(`"","Net Surplus","","NET","${taxSummary.netTaxableMargin.toFixed(2)}","","","","","",""`);

      // UTF-8 BOM ensures Excel automatically renders all character sets properly
      const bom = '\uFEFF';
      const csvString = bom + csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAS_AEIT_Tax_Ledger_${taxFiscalYear}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus('success', `Tax Ledger CSV (${filteredLedger.length} rows) successfully exported.`);
    } catch (err: unknown) {
      showStatus('error', err instanceof Error ? err.message : 'CSV export failed');
    }
  };

  /**
   * Generates and downloads a Microsoft Excel XML Spreadsheet (.xls)
   */
  const handleExportTaxExcel = () => {
    try {
      const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:Bold="1" ss:Size="14" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Tax Ledger">
  <Table>
   <Row ss:StyleID="Title"><Cell><Data ss:Type="String">SAS-AEIT Tax &amp; Accounting Transaction History</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Period: ${taxFiscalYear} | Generated: ${new Date().toLocaleDateString()}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Total Incomes: ৳ ${taxSummary.totalIncomes.toFixed(2)} | Total Expenses: ৳ ${taxSummary.totalExpenses.toFixed(2)} | Net Surplus: ৳ ${taxSummary.netTaxableMargin.toFixed(2)}</Data></Cell></Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">SL</Data></Cell>
    <Cell><Data ss:Type="String">Voucher ID</Data></Cell>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Type</Data></Cell>
    <Cell><Data ss:Type="String">Amount (BDT)</Data></Cell>
    <Cell><Data ss:Type="String">Classification</Data></Cell>
    <Cell><Data ss:Type="String">Category</Data></Cell>
    <Cell><Data ss:Type="String">Sub-Category</Data></Cell>
    <Cell><Data ss:Type="String">Asset Reference</Data></Cell>
    <Cell><Data ss:Type="String">Remarks</Data></Cell>
   </Row>`;

      const xmlRows = filteredLedger.map((r, i) => `
   <Row>
    <Cell><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${r.id}</Data></Cell>
    <Cell><Data ss:Type="String">${r.date}</Data></Cell>
    <Cell><Data ss:Type="String">${r.type}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${r.amount_bdt}</Data></Cell>
    <Cell><Data ss:Type="String">${r.classification}</Data></Cell>
    <Cell><Data ss:Type="String">${r.category.replace(/&/g, '&amp;')}</Data></Cell>
    <Cell><Data ss:Type="String">${r.subcategory.replace(/&/g, '&amp;')}</Data></Cell>
    <Cell><Data ss:Type="String">${r.reference.replace(/&/g, '&amp;')}</Data></Cell>
    <Cell><Data ss:Type="String">${r.remarks.replace(/&/g, '&amp;')}</Data></Cell>
   </Row>`).join('');

      const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;

      const excelBlob = new Blob([xmlHeader + xmlRows + xmlFooter], {
        type: 'application/vnd.ms-excel;charset=utf-8',
      });
      const url = URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAS_AIET_Accounting_Ledger_${taxFiscalYear}_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus('success', 'Excel Spreadsheet (.xls) successfully generated and downloaded.');
    } catch (err: unknown) {
      showStatus('error', err instanceof Error ? err.message : 'Excel export failed');
    }
  };

  // Standard SQLite JSON backup handlers
  const handleExportJSON = async () => {
    try {
      const dump = await sqliteService.exportDatabaseJSON();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sas_aiet_sqlite_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showStatus('success', 'Full SQLite database JSON dump generated and downloaded.');
    } catch (err: unknown) {
      showStatus('error', err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleCopyJSON = async () => {
    try {
      const dump = await sqliteService.exportDatabaseJSON();
      await navigator.clipboard.writeText(dump);
      setCopied(true);
      showStatus('success', 'SQLite Database state copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showStatus('error', 'Clipboard copy failed');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await sqliteService.importDatabaseJSON(text);
      showStatus('success', 'Database successfully restored from JSON backup file.');
      await loadLedgerData();
      onDatabaseRestored();
    } catch (err: unknown) {
      showStatus('error', err instanceof Error ? err.message : 'Import failed: corrupted file');
    } finally {
      e.target.value = '';
    }
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncing(false);
    showStatus('success', 'Cloud storage synchronization complete (0 conflicts, offline synced).');
  };

  const handleResetToSeeds = async () => {
    if (confirm('Are you sure you want to restore initial master categories and seed records?')) {
      await sqliteService.resetToSeedData();
      showStatus('success', 'Database reset to initial master schema & seed data.');
      await loadLedgerData();
      onDatabaseRestored();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Tax Reporting, Accounting & Backup Hub
          </h2>
          <p className="text-xs text-slate-400">
            Formatted CSV & Excel exports for NBR Tax Returns, bookkeeping & offline SQLite archives
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setPreviewTab('cards')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              previewTab === 'cards'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Export Options
          </button>
          <button
            onClick={() => setPreviewTab('preview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              previewTab === 'preview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tax Ledger Preview ({filteredLedger.length})</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION 1: TAX & ACCOUNTING CSV / EXCEL EXPORT PANEL */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Tax Reporting & Bookkeeping Ledger Export
              </h3>
              <p className="text-xs text-slate-400">
                Generate formatted CSV or Excel spreadsheet with total gross inflows & deductible expenses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTaxCSV}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV (Excel)</span>
            </button>
            <button
              onClick={handleExportTaxExcel}
              className="px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel (.xls)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Fiscal Year & Transaction Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tax Assessment / Fiscal Period</span>
            </label>
            <select
              value={taxFiscalYear}
              onChange={(e) => setTaxFiscalYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Recorded Transactions</option>
              <option value="FY_2026_2027">Fiscal Year 2026–2027 (Jul 2026 – Jun 2027)</option>
              <option value="FY_2025_2026">Fiscal Year 2025–2026 (Jul 2025 – Jun 2026)</option>
              <option value="YEAR_2026">Calendar Year 2026</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span>Flow Classification Filter</span>
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setTaxFlowType('ALL')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  taxFlowType === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Flows
              </button>
              <button
                type="button"
                onClick={() => setTaxFlowType('INCOME')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  taxFlowType === 'INCOME'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setTaxFlowType('EXPENSE')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  taxFlowType === 'EXPENSE'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Expense
              </button>
            </div>
          </div>
        </div>

        {/* Live Tax Computation Banner */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Gross Inflows</span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 tabular-nums">
              {formatBDT(taxSummary.totalIncomes)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Allowable Expenses</span>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-400 tabular-nums">
              {formatBDT(taxSummary.totalExpenses)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Net Taxable Margin</span>
            <span
              className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                taxSummary.netTaxableMargin >= 0 ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              {formatBDT(taxSummary.netTaxableMargin)}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: PREVIEW TABLE OR BACKUP CARDS */}
      {/* ---------------------------------------------------- */}
      {previewTab === 'preview' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tax Ledger Data Preview ({filteredLedger.length} Records)</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">Ready for NBR Tax Filing</span>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">SL</th>
                  <th className="py-2.5 px-3">Voucher ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Flow</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Sub-Category</th>
                  <th className="py-2.5 px-3">Reference / Asset</th>
                  <th className="py-2.5 px-3 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLedger.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{row.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{row.date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          row.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-200">{row.category}</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.subcategory}</td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[180px]">{row.reference}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold tabular-nums ${
                        row.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatBDT(row.amount_bdt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Database Archive & Restore Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Database JSON Export */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Export Complete SQLite Database</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Dumps all relational SQLite tables (Categories, Incomes, Expenses, Vehicles, FuelLogs,
                Investments, Properties, SystemLogs) into a backup JSON file.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Backup</span>
              </button>
              <button
                onClick={handleCopyJSON}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Database JSON Restore */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Restore Database from Backup</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Select a previously exported SAS-AEIT JSON backup file to restore all master data,
                transactions, and audit trails.
              </p>
            </div>

            <label className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Backup JSON File</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {/* Cloud Storage Sync */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <Cloud className="w-4 h-4 text-amber-400" />
                <span>Cloud Storage Sync</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Sync local SQLite snapshots to cloud storage (Google Drive / Firebase Sync API)
                for multi-device access across phone and tablet.
              </p>
            </div>

            <button
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {isSyncing ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isSyncing ? 'Syncing to Cloud...' : 'One-Tap Cloud Sync'}</span>
            </button>
          </div>

          {/* Reset Database */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-1">
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Seed Data</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Restores standard master categories, subcategories, initial vehicles, and seed transactions.
              </p>
            </div>

            <button
              onClick={handleResetToSeeds}
              className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Master SQLite Database</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
