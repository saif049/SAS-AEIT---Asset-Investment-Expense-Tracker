/**
 * React Native & Expo Code Hub
 * Displays clean, modular Expo + SQLite TypeScript components for Module 1 to Module 5
 * ready for copying into an Expo project.
 */

import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, Smartphone } from 'lucide-react';

export const ReactNativeExpoCodeViewer: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<'module3_entry' | 'sqlite_middleware' | 'schema' | 'drawer_nav'>('module3_entry');
  const [copied, setCopied] = useState(false);

  const codeSnippets: Record<string, { title: string; filename: string; code: string }> = {
    module3_entry: {
      title: 'Module 3: Direct Expense & Income Universal Entry Component',
      filename: 'components/UniversalExpenseEntry.tsx',
      code: `import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as SQLite from 'expo-sqlite';

// Open SQLite database instance
const db = SQLite.openDatabaseSync('sas_aiet.db');

interface UniversalExpenseEntryProps {
  onSaved?: () => void;
}

/**
 * Universal Direct Expense Entry Component (Expo + SQLite)
 * 1. Saves direct expense entries into SQLite 'Expenses' table
 * 2. Records an event in 'SystemLogs' for audit tracking
 * 3. Cascading sub-categories based on selected category
 * 4. BDT input formatting & inline date selection
 * 5. Async error handling & inline comments
 */
export const UniversalExpenseEntry: React.FC<UniversalExpenseEntryProps> = ({ onSaved }) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedSubCatId, setSelectedSubCatId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Initial Load: Fetch active expense categories
  useEffect(() => {
    try {
      const rows = db.getAllSync<any>(
        'SELECT * FROM Categories WHERE type = ? AND is_active = 1 ORDER BY name ASC',
        ['EXPENSE']
      );
      setCategories(rows);
      if (rows.length > 0) {
        setSelectedCatId(rows[0].id);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      Alert.alert('Database Error', 'Could not load expense categories.');
    }
  }, []);

  // 2. Cascading Sub-Categories: Updates automatically when category changes
  useEffect(() => {
    if (!selectedCatId) {
      setSubCategories([]);
      setSelectedSubCatId(null);
      return;
    }
    try {
      const rows = db.getAllSync<any>(
        'SELECT * FROM SubCategories WHERE category_id = ? AND is_active = 1 ORDER BY name ASC',
        [selectedCatId]
      );
      setSubCategories(rows);
      if (rows.length > 0) {
        setSelectedSubCatId(rows[0].id);
      } else {
        setSelectedSubCatId(null);
      }
    } catch (err) {
      console.error('Failed to cascade subcategories:', err);
    }
  }, [selectedCatId]);

  // 3. Save Direct Expense Entry & SystemLogs Audit
  const handleSaveExpense = async () => {
    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid BDT amount greater than 0.');
      return;
    }
    if (!selectedCatId || !selectedSubCatId) {
      Alert.alert('Validation Error', 'Please select both Category and Sub-Category.');
      return;
    }

    setLoading(true);

    try {
      // Begin transactional write to SQLite
      await db.withTransactionAsync(async () => {
        // Step 1: Insert into 'Expenses' table
        const result = await db.runAsync(
          \`INSERT INTO Expenses (date, amount_bdt, category_id, subcategory_id, expense_type, remarks, created_at)
           VALUES (?, ?, ?, ?, 'DIRECT', ?, ?)\`,
          [date, numericAmount, selectedCatId, selectedSubCatId, remarks.trim(), new Date().toISOString()]
        );

        const newExpenseId = result.lastInsertRowId;

        // Step 2: Record an event in 'SystemLogs' for audit tracking
        const auditPayload = JSON.stringify({
          amount_bdt: numericAmount,
          category_id: selectedCatId,
          subcategory_id: selectedSubCatId,
          date: date,
          remarks: remarks.trim()
        });

        await db.runAsync(
          \`INSERT INTO SystemLogs (timestamp, action, entity_type, entity_id, details_json)
           VALUES (?, 'CREATE', 'EXPENSE', ?, ?)\`,
          [new Date().toISOString(), newExpenseId, auditPayload]
        );
      });

      Alert.alert('Success', \`Expense of ৳ \${numericAmount.toLocaleString()} recorded & audited!\`);
      setAmount('');
      setRemarks('');
      if (onSaved) onSaved();
    } catch (error: any) {
      console.error('Failed to save expense into SQLite:', error);
      Alert.alert('Database Transaction Error', error.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Direct Expense Entry</Text>

      {/* BDT Amount Input */}
      <Text style={styles.label}>Amount (BDT)</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.currencyPrefix}>৳</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
        />
      </View>

      {/* Cascading Category Selector */}
      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setSelectedCatId(c.id)}
            style={[styles.chip, selectedCatId === c.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedCatId === c.id && styles.chipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cascading Sub-Category Selector */}
      <Text style={styles.label}>Sub-Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {subCategories.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => setSelectedSubCatId(s.id)}
            style={[styles.chip, selectedSubCatId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, selectedSubCatId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Remarks */}
      <Text style={styles.label}>Remarks / Details</Text>
      <TextInput
        style={styles.textInput}
        value={remarks}
        onChangeText={setRemarks}
        placeholder="e.g. Padma Ilish from Karwan Bazar"
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSaveExpense}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.submitText}>Save & Record Audit in SQLite</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0f172a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12 },
  currencyPrefix: { fontSize: 20, color: '#10b981', marginRight: 8, fontWeight: 'bold' },
  amountInput: { flex: 1, height: 48, color: '#fff', fontSize: 20, fontWeight: 'bold' },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1e293b', marginRight: 8 },
  chipActive: { backgroundColor: '#10b981' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#0f172a', fontWeight: 'bold' },
  textInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14 },
  submitButton: { backgroundColor: '#10b981', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});`,
    },
    sqlite_middleware: {
      title: 'Module 1 & 2: SQLite Async Audit Middleware (expo-sqlite)',
      filename: 'services/sqliteAuditMiddleware.ts',
      code: `import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('sas_aiet.db');

export type AuditAction = 'CREATE' | 'EDIT' | 'DELETE' | 'STATUS_TOGGLE';

/**
 * Async Audit Middleware for Expo SQLite:
 * Guarantees every state change is permanently logged with an immutable timestamp
 */
export async function logAuditEvent(
  action: AuditAction,
  entity_type: string,
  entity_id: number,
  details: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const detailsJson = JSON.stringify(details);

  await db.runAsync(
    \`INSERT INTO SystemLogs (timestamp, action, entity_type, entity_id, details_json)
     VALUES (?, ?, ?, ?, ?)\`,
    [timestamp, action, entity_type, entity_id, detailsJson]
  );
}

/**
 * Direct Expense Helper with Automatic Audit Execution
 */
export async function insertExpenseWithAudit(params: {
  date: string;
  amount_bdt: number;
  category_id: number;
  subcategory_id: number;
  expense_type: string;
  reference_id?: number | null;
  remarks?: string;
}) {
  return await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      \`INSERT INTO Expenses (date, amount_bdt, category_id, subcategory_id, expense_type, reference_id, remarks, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        params.date,
        params.amount_bdt,
        params.category_id,
        params.subcategory_id,
        params.expense_type || 'DIRECT',
        params.reference_id || null,
        params.remarks || null,
        new Date().toISOString()
      ]
    );

    await logAuditEvent('CREATE', 'EXPENSE', res.lastInsertRowId, {
      amount: params.amount_bdt,
      category_id: params.category_id,
      subcategory_id: params.subcategory_id,
      date: params.date
    });

    return res.lastInsertRowId;
  });
}`,
    },
    schema: {
      title: 'SQLite DDL Migration Schema (expo-sqlite)',
      filename: 'database/schema.sql',
      code: `-- SAS-AEIT Core & Audit Schema
CREATE TABLE IF NOT EXISTS Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS SubCategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SystemLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('CREATE', 'EDIT', 'DELETE', 'STATUS_TOGGLE')),
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  details_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount_bdt REAL NOT NULL CHECK(amount_bdt >= 0),
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('DIRECT', 'INVESTMENT', 'PROPERTY')),
  source_id INTEGER,
  remarks TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES SubCategories(id)
);

CREATE TABLE IF NOT EXISTS Expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount_bdt REAL NOT NULL CHECK(amount_bdt >= 0),
  category_id INTEGER NOT NULL,
  subcategory_id INTEGER NOT NULL,
  expense_type TEXT NOT NULL CHECK(expense_type IN ('DIRECT', 'INVESTMENT', 'PROPERTY', 'VEHICLE')),
  reference_id INTEGER,
  remarks TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES Categories(id),
  FOREIGN KEY (subcategory_id) REFERENCES SubCategories(id)
);

CREATE TABLE IF NOT EXISTS Investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('STOCK', 'SAVINGS_CERTIFICATE', 'FDR', 'LAND')),
  details_json TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  sub_type TEXT NOT NULL,
  land_measurement TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  cost_price REAL NOT NULL,
  development_cost REAL NOT NULL DEFAULT 0,
  survey_type TEXT NOT NULL,
  location_json TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('CAR', 'MOTORCYCLE', 'MICROBUS', 'OTHERS')),
  manufacturer TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  reg_year INTEGER NOT NULL,
  reg_no TEXT NOT NULL UNIQUE,
  current_odometer REAL NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS FuelLogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  expense_id INTEGER,
  fuel_type TEXT NOT NULL,
  unit_quantity REAL NOT NULL,
  unit_type TEXT NOT NULL CHECK(unit_type IN ('LITRE', 'KG')),
  odometer_reading REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES Vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (expense_id) REFERENCES Expenses(id) ON DELETE SET NULL
);`,
    },
    drawer_nav: {
      title: 'Navigation: React Navigation Drawer Setup (@react-navigation/drawer)',
      filename: 'navigation/DrawerNavigator.tsx',
      code: `import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ExpenseEntryScreen } from '../screens/ExpenseEntryScreen';
import { CategoryManagerScreen } from '../screens/CategoryManagerScreen';
import { AssetManagerScreen } from '../screens/AssetManagerScreen';
import { AuditLogsScreen } from '../screens/AuditLogsScreen';
import { BackupRestoreScreen } from '../screens/BackupRestoreScreen';

const Drawer = createDrawerNavigator();

export function RootDrawerNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          drawerStyle: { backgroundColor: '#0f172a', width: 280 },
          drawerActiveTintColor: '#10b981',
          drawerInactiveTintColor: '#94a3b8',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#ffffff',
        }}
      >
        <Drawer.Screen name="Dashboard" component={DashboardScreen} />
        <Drawer.Screen name="Direct Entry" component={ExpenseEntryScreen} />
        <Drawer.Screen name="Categories & Audit" component={CategoryManagerScreen} />
        <Drawer.Screen name="Asset Modules" component={AssetManagerScreen} />
        <Drawer.Screen name="System Audit Logs" component={AuditLogsScreen} />
        <Drawer.Screen name="Backup & Restore" component={BackupRestoreScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}`,
    },
  };

  const current = codeSnippets[selectedModule];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            React Native & Expo TypeScript Code Export
          </h2>
          <p className="text-xs text-slate-400">
            Copy-paste production source code ready for your Expo SDK & SQLite mobile build
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Code Copied!' : 'Copy Module Code'}</span>
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedModule('module3_entry')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            selectedModule === 'module3_entry'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Module 3: Direct Expense Entry
        </button>
        <button
          onClick={() => setSelectedModule('sqlite_middleware')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            selectedModule === 'sqlite_middleware'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          Module 1 & 2: SQLite Audit Middleware
        </button>
        <button
          onClick={() => setSelectedModule('schema')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            selectedModule === 'schema'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          SQLite DDL Schema (Tables & Keys)
        </button>
        <button
          onClick={() => setSelectedModule('drawer_nav')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            selectedModule === 'drawer_nav'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
          }`}
        >
          React Navigation Drawer Setup
        </button>
      </div>

      {/* Code Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <span className="font-mono text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            {current.filename}
          </span>
          <span className="text-slate-500 text-[11px]">{current.title}</span>
        </div>

        <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-[600px] leading-relaxed">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
};
