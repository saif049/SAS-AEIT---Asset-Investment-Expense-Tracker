/**
 * Category Smart Suggestions & Tagging Utility
 * Provides intelligent tag recommendations, transaction notes,
 * and recent transaction pre-population based on selected Category and Type.
 */

import { EnrichedExpense, EnrichedIncome } from '../types/database';

export interface RecentEntrySuggestion {
  id: number;
  date: string;
  amount_bdt: number;
  subcategory_id: number;
  subcategory_name: string;
  remarks: string;
  type: string;
  reference_id: number | null;
}

export interface CategorySuggestionsResult {
  tags: string[];
  notes: string[];
  recentEntries: RecentEntrySuggestion[];
}

// Built-in intelligent presets based on financial context in Bangladesh
const EXPENSE_CATEGORY_PRESETS: Record<string, { tags: string[]; notes: string[] }> = {
  food: {
    tags: ['#Bazaar', '#DailyGroceries', '#Lunch', '#Dinner', '#OfficeSnacks', '#Restaurant', '#Supermarket', '#KitchenItems'],
    notes: [
      'Weekly kitchen bazaar from local market',
      'Office lunch and refreshments',
      'Family grocery shopping at Shwapno',
      'Weekend dinner with family',
      'Daily morning tea & snacks',
    ],
  },
  grocery: {
    tags: ['#Groceries', '#Shwapno', '#MeenaBazaar', '#DailyEssentials', '#RiceAndOil', '#Spices', '#Vegetables'],
    notes: [
      'Monthly rice, oil and cooking essentials',
      'Supermarket grocery purchase',
      'Fresh fruits & vegetables market',
      'Daily dairy and bakery items',
    ],
  },
  transport: {
    tags: ['#OctaneRefill', '#CNGFare', '#UberRide', '#MetroRail', '#Pathao', '#BridgeToll', '#ParkingFee', '#BusFare'],
    notes: [
      'Octane fuel tank refill',
      'Uber ride to business meeting',
      'Dhaka Metro Rail MRT card recharge',
      'Expressway & Padma Bridge toll',
      'Monthly car parking fee',
    ],
  },
  fuel: {
    tags: ['#Octane', '#Diesel', '#CNG', '#LPG', '#GasStation', '#EngineOil'],
    notes: [
      'Full tank octane fuel refill',
      'CNG cylinder gas refill',
      'Engine oil & filter change at servicing',
    ],
  },
  utility: {
    tags: ['#DESCO', '#WASA', '#TitasGas', '#AmberIT', '#Broadband', '#bKashRecharge', '#ServiceCharge'],
    notes: [
      'Monthly DESCO electricity bill payment',
      'Dhaka WASA water utility bill',
      'High-speed fiber broadband bill',
      'Titas prepaid gas recharge',
      'Building service and maintenance fee',
    ],
  },
  housing: {
    tags: ['#HouseRent', '#ApartmentRent', '#ServiceCharge', '#Maintenance', '#SecurityGuard', '#CleanerFee'],
    notes: [
      'Monthly residential apartment rent',
      'Building maintenance & security charge',
      'Apartment repairs & plumbing work',
      'Waste management & community fee',
    ],
  },
  rent: {
    tags: ['#ApartmentRent', '#OfficeRent', '#ServiceCharge', '#CommercialSpace', '#GarageRent'],
    notes: [
      'Monthly apartment house rent payment',
      'Commercial office space lease payment',
      'Monthly dedicated garage parking rent',
    ],
  },
  medical: {
    tags: ['#Pharmacy', '#Prescription', '#DoctorConsultation', '#DiagnosticLab', '#HospitalBill', '#DentalCare'],
    notes: [
      'Monthly regular prescription medicines',
      'Specialist doctor consultation fee',
      'Lab blood test and diagnostic report',
      'Dental checkup and scaling procedure',
    ],
  },
  health: {
    tags: ['#GymMembership', '#Medicine', '#HealthCheckup', '#Supplements', '#PersonalCare'],
    notes: [
      'Monthly fitness center / gym membership',
      'Nutritional supplements & vitamins',
      'Periodic health screening checkup',
    ],
  },
  education: {
    tags: ['#TuitionFee', '#SchoolFee', '#UniversitySemester', '#BooksStationery', '#Coaching', '#OnlineCourse'],
    notes: [
      'Monthly school tuition fee payment',
      'University semester registration fee',
      'Academic textbooks & stationery items',
      'Professional skill development course',
    ],
  },
  shopping: {
    tags: ['#Clothing', '#EidShopping', '#Electronics', '#DarazOnline', '#Footwear', '#HomeDecor', '#GiftItem'],
    notes: [
      'Festival clothing shopping',
      'Online purchase from Daraz e-commerce',
      'Home appliance and decor accessory',
      'Gift item for family celebration',
    ],
  },
  entertainment: {
    tags: ['#MovieCinema', '#StarCineplex', '#Streaming', '#Netflix', '#Outing', '#DiningOut', '#CoffeeShop'],
    notes: [
      'Star Cineplex movie tickets & snacks',
      'Monthly Netflix / OTT entertainment subscription',
      'Weekend family recreation & dining',
      'Coffee & dessert with friends',
    ],
  },
  personal: {
    tags: ['#HaircutSalon', '#PersonalGrooming', '#Fitness', '#PocketMoney', '#CharityZakat'],
    notes: [
      'Grooming and salon haircut visit',
      'Personal cash allowance & pocket expense',
      'Charity, Sadqah, and community donation',
    ],
  },
  vehicle: {
    tags: ['#CarMaintenance', '#Servicing', '#FitnessRenewal', '#TaxToken', '#CarWash', '#SpareParts'],
    notes: [
      'Periodic 5,000 km vehicle servicing',
      'BRTA fitness & tax token renewal',
      'Complete vehicle interior & exterior wash',
      'Brake pad and filter replacement',
    ],
  },
  property: {
    tags: ['#PropertyTax', '#LandHolding', '#HoldingTax', '#RepairsPlumbing', '#PaintWork'],
    notes: [
      'City Corporation municipal holding tax',
      'Plumbing and electrical restoration work',
      'Annual property maintenance and painting',
    ],
  },
  investment: {
    tags: ['#BOAccount', '#SharePurchase', '#MutualFund', '#Sanchayapatra', '#BrokerFee'],
    notes: [
      'Stock market equity purchase through BO account',
      'National Savings Certificate (Sanchayapatra) investment',
      'Mutual fund monthly SIP contribution',
    ],
  },
  payee: {
    tags: ['#SuperShop', '#Shopkeeper', '#Grocers', '#CounterPayment', '#SupplierPayment', '#ProjectBank', '#RetailVendor'],
    notes: [
      'Super shop daily commodities purchase',
      'Local shopkeeper payment settlement',
      'Fresh market grocers purchase',
      'Counter direct cash payment',
      'Authorized supplier vendor invoice settlement',
      'Project Bank institutional disbursement',
    ],
  },
};

const INCOME_CATEGORY_PRESETS: Record<string, { tags: string[]; notes: string[] }> = {
  payer: {
    tags: ['#MyGovt', '#Institution', '#ProjectFund', '#BuyerPayment', '#BankDisbursement', '#GovtTreasury'],
    notes: [
      'My Govt official treasury disbursement credited',
      'Institutional organization grant / payout received',
      'Project milestone contract remittance received',
      'Commercial buyer trade settlement payment',
      'Commercial Bank institutional transfer credit',
    ],
  },
  salary: {
    tags: ['#MonthlySalary', '#ExecutivePay', '#FestivalBonus', '#OvertimePay', '#Allowance', '#Arrears'],
    notes: [
      'Monthly payroll executive salary credit',
      'Eid-ul-Fitr festival bonus payment',
      'Performance incentive and quarterly bonus',
      'Transport & mobile phone official allowance',
    ],
  },
  business: {
    tags: ['#ClientInvoice', '#ConsultingFee', '#RetainerFee', '#SalesRevenue', '#ProjectMilestone', '#ServiceFee'],
    notes: [
      'Client invoice milestone settlement received',
      'Monthly retainer fee for consulting services',
      'Product sales proceeds collected',
      'Software engineering delivery payout',
    ],
  },
  investment: {
    tags: ['#StockDividend', '#SanchayapatraProfit', '#DPSMaturity', '#FDRInterest', '#CapitalGain'],
    notes: [
      'Quarterly cash dividend credited to bank',
      '3-month Sanchayapatra profit coupon credited',
      'Fixed Deposit (FDR) quarterly interest payment',
      'Capital gain realized from stock sales',
    ],
  },
  dividend: {
    tags: ['#CashDividend', '#StockDividend', '#DSEListed', '#AnnualDividend'],
    notes: [
      'Annual cash dividend credited from DSE company',
      'Interim dividend payout credited to bank account',
    ],
  },
  rental: {
    tags: ['#TenantRent', '#ApartmentRent', '#CommercialRent', '#AdvanceAdjustment'],
    notes: [
      'Monthly residential flat rent received from tenant',
      'Commercial shop floor space rent received',
      'Garage parking space monthly rent collected',
    ],
  },
  property: {
    tags: ['#RentalIncome', '#LeaseCollection', '#AdvanceDeposit', '#MaintenanceCollection'],
    notes: [
      'Apartment unit rental income received',
      'Security deposit advance received from new tenant',
    ],
  },
  freelance: {
    tags: ['#UpworkPayout', '#FiverrTransfer', '#InternationalRemittance', '#ForeignWire', '#ContractPay'],
    notes: [
      'International freelance wire remittance received',
      'Upwork client milestone payment',
      'Foreign client technical consulting transfer',
    ],
  },
  interest: {
    tags: ['#SavingsInterest', '#BankProfit', '#IslamicBankingProfit', '#FDRInterest'],
    notes: [
      'Half-yearly bank savings account profit/interest',
      'Monthly profit from Islamic Mudaraba account',
    ],
  },
};

/**
 * Normalizes string for fuzzy keyword matching
 */
function cleanKeyword(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts hashtags from any string
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[A-Za-z0-9_]+/g);
  return matches ? matches.map((t) => t.trim()) : [];
}

/**
 * Resolves best matching preset tags & notes for a category name
 */
export function getPresetSuggestions(
  categoryName: string,
  entryMode: 'EXPENSE' | 'INCOME'
): { tags: string[]; notes: string[] } {
  const presets = entryMode === 'EXPENSE' ? EXPENSE_CATEGORY_PRESETS : INCOME_CATEGORY_PRESETS;
  const cleanedCat = cleanKeyword(categoryName);

  // Exact or partial keyword match
  for (const [key, val] of Object.entries(presets)) {
    if (cleanedCat.includes(cleanKeyword(key)) || cleanKeyword(key).includes(cleanedCat)) {
      return val;
    }
  }

  // Fallback defaults
  if (entryMode === 'EXPENSE') {
    return {
      tags: ['#Personal', '#DirectExpense', '#Routine', '#Receipt', '#CardPayment', '#Cash'],
      notes: [
        `Direct expense payment under ${categoryName}`,
        `Routine purchase for ${categoryName}`,
        `Payment voucher for ${categoryName}`,
      ],
    };
  }

  return {
    tags: ['#DirectReceipt', '#IncomeCredit', '#BankTransfer', '#CashReceived', '#Cheque'],
    notes: [
      `Direct receipt credit under ${categoryName}`,
      `Bank transfer receipt for ${categoryName}`,
      `Payment voucher received for ${categoryName}`,
    ],
  };
}

/**
 * Master suggestion engine: extracts tags, notes, and recent entries
 * dynamically from both SQLite history and curated financial presets.
 */
export function getCategorySmartSuggestions(params: {
  categoryId: number | null;
  categoryName: string;
  entryMode: 'EXPENSE' | 'INCOME';
  expenses: EnrichedExpense[];
  incomes: EnrichedIncome[];
}): CategorySuggestionsResult {
  const { categoryId, categoryName, entryMode, expenses, incomes } = params;

  if (!categoryId || !categoryName) {
    return { tags: [], notes: [], recentEntries: [] };
  }

  // 1. Get Curated Base Presets
  const basePresets = getPresetSuggestions(categoryName, entryMode);

  // 2. Filter Historical Records for this category
  const historicalTags: string[] = [];
  const historicalNotes: string[] = [];
  const recentEntries: RecentEntrySuggestion[] = [];

  if (entryMode === 'EXPENSE') {
    const matchedExpenses = expenses
      .filter((e) => e.category_id === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);

    // Extract recent entries
    for (const exp of matchedExpenses.slice(0, 5)) {
      recentEntries.push({
        id: exp.id,
        date: exp.date,
        amount_bdt: exp.amount_bdt,
        subcategory_id: exp.subcategory_id,
        subcategory_name: exp.subcategory_name || 'General',
        remarks: exp.remarks || '',
        type: exp.expense_type,
        reference_id: exp.reference_id ?? null,
      });

      if (exp.remarks) {
        historicalNotes.push(exp.remarks.trim());
        const extracted = extractHashtags(exp.remarks);
        historicalTags.push(...extracted);
      }
    }
  } else {
    const matchedIncomes = incomes
      .filter((i) => i.category_id === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);

    for (const inc of matchedIncomes.slice(0, 5)) {
      recentEntries.push({
        id: inc.id,
        date: inc.date,
        amount_bdt: inc.amount_bdt,
        subcategory_id: inc.subcategory_id,
        subcategory_name: inc.subcategory_name || 'General',
        remarks: inc.remarks || '',
        type: inc.source_type,
        reference_id: inc.source_id ?? null,
      });

      if (inc.remarks) {
        historicalNotes.push(inc.remarks.trim());
        const extracted = extractHashtags(inc.remarks);
        historicalTags.push(...extracted);
      }
    }
  }

  // Deduplicate and prioritize historical over presets
  const combinedTags = Array.from(new Set([...historicalTags, ...basePresets.tags])).slice(0, 10);
  const combinedNotes = Array.from(new Set([...historicalNotes, ...basePresets.notes])).slice(0, 5);

  return {
    tags: combinedTags,
    notes: combinedNotes,
    recentEntries,
  };
}
