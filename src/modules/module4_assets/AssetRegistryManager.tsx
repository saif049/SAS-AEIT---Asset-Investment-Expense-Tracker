/**
 * MODULE 4: Asset Modules (Investments, Properties, Vehicles & Fuel Efficiency)
 * 
 * Features:
 * 1. Investments: Profile builder for Stocks, Savings Certificates/FDRs, and Land.
 * 2. Properties: Real estate registry with Division -> District -> Upazila cascade,
 *    Mouza, Dag, Khatian, Survey Type, Cost & Development tracking.
 * 3. Vehicles & Fuel Efficiency: Vehicle registry + Fuel Log Calculator tracking
 *    volume (Liters/Kg) vs odometer to compute real-time mileage (km/L).
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  Building,
  Car,
  Fuel,
  Plus,
  Shield,
  Gauge,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { sqliteService } from '../../database/sqliteService';
import {
  Investment,
  Property,
  Vehicle,
  FuelLog,
  InvestmentType,
  VehicleType,
  FuelType,
  FuelUnitType,
} from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';

interface AssetRegistryManagerProps {
  investments: Investment[];
  properties: Property[];
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  onRefresh: () => void;
}

// Bangladesh Administrative Cascades for Properties
const BD_DIVISIONS_DATA: Record<string, Record<string, string[]>> = {
  Dhaka: {
    Dhaka: ['Gulshan', 'Dhanmondi', 'Motijheel', 'Uttara', 'Mirpur', 'Savar', 'Keraniganj'],
    Gazipur: ['Gazipur Sadar', 'Kaliakair', 'Sreepur', 'Kapasia', 'Kaliganj'],
    Narayanganj: ['Narayanganj Sadar', 'Bandar', 'Araihazar', 'Rupganj', 'Sonargaon'],
  },
  Chittagong: {
    Chittagong: ['Kotwali', 'Panchlaish', 'Pahartali', 'Halishahar', 'Agrabad', 'Sitakunda', 'Hathazari'],
    'Cox\'s Bazar': ['Cox\'s Bazar Sadar', 'Ramu', 'Chakaria', 'Teknaf', 'Ukhia'],
  },
  Sylhet: {
    Sylhet: ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Biswanath', 'Fenchuganj'],
    Moulvibazar: ['Moulvibazar Sadar', 'Sreemangal', 'Kulaura', 'Barlekha'],
  },
  Rajshahi: {
    Rajshahi: ['Boalia', 'Motihar', 'Rajpara', 'Paba', 'Godagari'],
    Bogra: ['Bogra Sadar', 'Sherpur', 'Shibganj', 'Sariakandi'],
  },
};

export const AssetRegistryManager: React.FC<AssetRegistryManagerProps> = ({
  investments,
  properties,
  vehicles,
  fuelLogs,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'INVESTMENTS' | 'PROPERTIES' | 'VEHICLES'>('INVESTMENTS');

  // Banner message
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  // ----------------------------------------------------
  // SUB-TAB 1: INVESTMENTS STATE & FORM
  // ----------------------------------------------------
  const [showAddInvModal, setShowAddInvModal] = useState(false);
  const [invType, setInvType] = useState<InvestmentType>('SAVINGS_CERTIFICATE');
  const [invRemarks, setInvRemarks] = useState('');
  // Sub-forms
  const [stockBoId, setStockBoId] = useState('');
  const [stockBroker, setStockBroker] = useState('');
  const [stockTicker, setStockTicker] = useState('');
  const [stockUnits, setStockUnits] = useState('');
  const [stockBuyPrice, setStockBuyPrice] = useState('');
  const [stockMarketPrice, setStockMarketPrice] = useState('');

  const [scScheme, setScScheme] = useState('5-Year Bangladesh Sanchayapatra');
  const [scInstrumentNo, setScInstrumentNo] = useState('');
  const [scPrincipal, setScPrincipal] = useState('');
  const [scProfitRate, setScProfitRate] = useState('11.28%');
  const [scMaturity, setScMaturity] = useState('2029-12-31');

  const [landLocation, setLandLocation] = useState('');
  const [landAreaKatha, setLandAreaKatha] = useState('');
  const [landPurchasePrice, setLandPurchasePrice] = useState('');
  const [landCurrentValue, setLandCurrentValue] = useState('');

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let details: Record<string, unknown> = {};

      if (invType === 'STOCK') {
        const units = parseInt(stockUnits) || 0;
        const buyPrice = parseFloat(stockBuyPrice) || 0;
        const marketPrice = parseFloat(stockMarketPrice) || buyPrice;
        details = {
          bo_id: stockBoId,
          broker: stockBroker,
          symbols: [{ ticker: stockTicker.toUpperCase(), units, avg_cost: buyPrice, market_price: marketPrice }],
          total_portfolio_value_bdt: units * marketPrice,
        };
      } else if (invType === 'SAVINGS_CERTIFICATE' || invType === 'FDR') {
        details = {
          scheme: scScheme,
          instrument_no: scInstrumentNo,
          principal_bdt: parseFloat(scPrincipal) || 0,
          profit_rate: scProfitRate,
          maturity_date: scMaturity,
        };
      } else if (invType === 'LAND') {
        details = {
          location: landLocation,
          area_katha: parseFloat(landAreaKatha) || 0,
          purchase_price_bdt: parseFloat(landPurchasePrice) || 0,
          current_estimated_value_bdt: parseFloat(landCurrentValue) || parseFloat(landPurchasePrice) || 0,
        };
      }

      await sqliteService.addInvestment(invType, details, invRemarks);
      showBanner('success', `Investment profile for ${invType} created and audited in SQLite.`);
      setShowAddInvModal(false);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to add investment');
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 2: PROPERTIES STATE & FORM
  // ----------------------------------------------------
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [propType, setPropType] = useState('Residential');
  const [propSubType, setPropSubType] = useState('Apartment');
  const [propLandMeasurement, setPropLandMeasurement] = useState('1650 SqFt');
  const [propOwnerType, setPropOwnerType] = useState('Individual');
  const [propCostPrice, setPropCostPrice] = useState('');
  const [propDevCost, setPropDevCost] = useState('0');
  const [propSurveyType, setPropSurveyType] = useState('City Survey');
  const [propDivision, setPropDivision] = useState('Dhaka');
  const [propDistrict, setPropDistrict] = useState('Dhaka');
  const [propUpazila, setPropUpazila] = useState('Gulshan');
  const [propMouza, setPropMouza] = useState('');
  const [propDag, setPropDag] = useState('');
  const [propKhatian, setPropKhatian] = useState('');
  const [propRemarks, setPropRemarks] = useState('');

  const availableDistricts = Object.keys(BD_DIVISIONS_DATA[propDivision] || {});
  const availableUpazilas = BD_DIVISIONS_DATA[propDivision]?.[propDistrict] || [];

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const location = {
        division: propDivision,
        district: propDistrict,
        upazila: propUpazila,
        mouza: propMouza || 'N/A',
        dag: propDag || 'N/A',
        khatian: propKhatian || 'N/A',
      };

      await sqliteService.addProperty({
        type: propType,
        sub_type: propSubType,
        land_measurement: propLandMeasurement,
        owner_type: propOwnerType,
        cost_price: parseFloat(propCostPrice) || 0,
        development_cost: parseFloat(propDevCost) || 0,
        survey_type: propSurveyType,
        location_json: JSON.stringify(location),
        remarks: propRemarks || null,
      });

      showBanner('success', `Real estate asset in ${propDistrict} saved and audited.`);
      setShowAddPropModal(false);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to register property');
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 3: VEHICLES & FUEL CALCULATOR
  // ----------------------------------------------------
  const [showAddVehModal, setShowAddVehModal] = useState(false);
  const [vehType, setVehType] = useState<VehicleType>('CAR');
  const [vehManufacturer, setVehManufacturer] = useState('Toyota');
  const [vehBrand, setVehBrand] = useState('Corolla');
  const [vehModel, setVehModel] = useState('Axio 2019');
  const [vehRegYear, setVehRegYear] = useState('2019');
  const [vehRegNo, setVehRegNo] = useState('');
  const [vehOdometer, setVehOdometer] = useState('');
  const [vehRemarks, setVehRemarks] = useState('');

  // Fuel Log Calculator State
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelVehId, setFuelVehId] = useState<number>(vehicles[0]?.id || 1);
  const [fuelType, setFuelType] = useState<FuelType>('OCTANE');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [fuelUnit, setFuelUnit] = useState<FuelUnitType>('LITRE');
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [lastCalculatedMileage, setLastCalculatedMileage] = useState<number | null>(null);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sqliteService.addVehicle({
        type: vehType,
        manufacturer: vehManufacturer,
        brand: vehBrand,
        model: vehModel,
        reg_year: parseInt(vehRegYear) || 2020,
        reg_no: vehRegNo,
        current_odometer: parseFloat(vehOdometer) || 0,
        remarks: vehRemarks || null,
      });

      showBanner('success', `Vehicle ${vehRegNo} registered and audited.`);
      setShowAddVehModal(false);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to register vehicle');
    }
  };

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sqliteService.addFuelLog({
        vehicle_id: fuelVehId,
        fuel_type: fuelType,
        unit_quantity: parseFloat(fuelQuantity) || 0,
        unit_type: fuelUnit,
        odometer_reading: parseFloat(fuelOdometer) || 0,
        fuel_cost_bdt: fuelCost ? parseFloat(fuelCost) : undefined,
      });

      setLastCalculatedMileage(res.mileageKmPerUnit);
      showBanner(
        'success',
        `Fuel log recorded! ${
          res.mileageKmPerUnit
            ? `Calculated Mileage: ${res.mileageKmPerUnit} km/${fuelUnit}`
            : 'Odometer updated'
        }`
      );
      setShowFuelModal(false);
      onRefresh();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to log fuel');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Modules */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-400" />
            Asset & Specialty Modules
          </h2>
          <p className="text-xs text-slate-400">
            Module 4: Investments Portfolio, Real Estate Land Registry & Vehicle Mileage Engines
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('INVESTMENTS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'INVESTMENTS'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Investments ({investments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PROPERTIES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PROPERTIES'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Properties ({properties.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('VEHICLES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'VEHICLES'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Vehicles & Fuel ({vehicles.length})</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {banner && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
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

      {/* ---------------------------------------------------- */}
      {/* TAB 1: INVESTMENTS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'INVESTMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Holdings: Stocks (BO ID), Bangladesh Savings Certificates (Sanchayapatra), FDRs & Land.
            </span>
            <button
              onClick={() => setShowAddInvModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Investment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((inv) => {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(inv.details_json);
              } catch {
                parsed = {};
              }

              return (
                <div
                  key={inv.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">
                        {inv.type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: #{inv.id}
                      </span>
                    </div>

                    {inv.type === 'STOCK' && (
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-400">
                          BO ID: <span className="text-slate-200 font-mono">{String(parsed.bo_id || 'N/A')}</span>
                        </p>
                        <p className="text-slate-400">
                          Broker: <span className="text-slate-200">{String(parsed.broker || 'N/A')}</span>
                        </p>
                        <div className="pt-2">
                          <p className="text-[11px] text-slate-500">Holdings:</p>
                          {Array.isArray(parsed.symbols) &&
                            parsed.symbols.map((s, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-xs py-1 border-b border-slate-800/60"
                              >
                                <span className="font-semibold text-slate-200">{s.ticker}</span>
                                <span className="font-mono text-slate-400">
                                  {s.units} units @ ৳{s.avg_cost}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {(inv.type === 'SAVINGS_CERTIFICATE' || inv.type === 'FDR') && (
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-400">
                          Scheme: <span className="text-slate-200">{String(parsed.scheme || 'N/A')}</span>
                        </p>
                        <p className="text-slate-400">
                          Instrument No:{' '}
                          <span className="text-slate-200 font-mono">{String(parsed.instrument_no || 'N/A')}</span>
                        </p>
                        <p className="text-slate-400">
                          Principal:{' '}
                          <span className="text-emerald-400 font-mono font-semibold">
                            {formatBDT(parsed.principal_bdt as number)}
                          </span>
                        </p>
                        <p className="text-slate-400">
                          Profit Rate:{' '}
                          <span className="text-slate-200 font-mono">{String(parsed.profit_rate || '11.28%')}</span>
                        </p>
                        <p className="text-slate-400">
                          Maturity:{' '}
                          <span className="text-slate-200 font-mono">{String(parsed.maturity_date || 'N/A')}</span>
                        </p>
                      </div>
                    )}

                    {inv.type === 'LAND' && (
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-400">
                          Location: <span className="text-slate-200">{String(parsed.location || 'N/A')}</span>
                        </p>
                        <p className="text-slate-400">
                          Area:{' '}
                          <span className="text-slate-200 font-mono">
                            {String(parsed.area_katha || '0')} Katha
                          </span>
                        </p>
                        <p className="text-slate-400">
                          Purchase Cost:{' '}
                          <span className="text-slate-200 font-mono">
                            {formatBDT(parsed.purchase_price_bdt as number)}
                          </span>
                        </p>
                        <p className="text-slate-400">
                          Current Valuation:{' '}
                          <span className="text-emerald-400 font-mono font-semibold">
                            {formatBDT(parsed.current_estimated_value_bdt as number)}
                          </span>
                        </p>
                      </div>
                    )}

                    {inv.remarks && (
                      <p className="mt-3 pt-2 text-[11px] text-slate-400 italic border-t border-slate-800">
                        "{inv.remarks}"
                      </p>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 font-mono mt-4 pt-2 border-t border-slate-800/80">
                    Logged: {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: PROPERTIES */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'PROPERTIES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Registry: Division · District · Upazila cascade, Mouza, Dag, Khatian & Survey Type.
            </span>
            <button
              onClick={() => setShowAddPropModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Property</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((prop) => {
              let loc: Record<string, string> = {};
              try {
                loc = JSON.parse(prop.location_json);
              } catch {
                loc = {};
              }

              const totalBookValue = prop.cost_price + prop.development_cost;

              return (
                <div
                  key={prop.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {prop.type} · {prop.sub_type}
                      </h4>
                      <p className="text-xs text-blue-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {loc.upazila || 'Upazila'}, {loc.district || 'District'},{' '}
                          {loc.division || 'Division'}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Survey: {prop.survey_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Measurement</span>
                      <span className="text-slate-200 font-medium">{prop.land_measurement}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Ownership</span>
                      <span className="text-slate-200 font-medium">{prop.owner_type}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Mouza / Dag / Khatian</span>
                      <span className="text-slate-200 font-mono text-[11px]">
                        M: {loc.mouza || '-'} / D: {loc.dag || '-'} / K: {loc.khatian || '-'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Total Invested</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {formatBDT(totalBookValue)}
                      </span>
                    </div>
                  </div>

                  {prop.remarks && (
                    <p className="text-[11px] text-slate-400 italic pt-2 border-t border-slate-800">
                      "{prop.remarks}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: VEHICLES & FUEL EFFICIENCY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'VEHICLES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Vehicle Registry & Real-Time Fuel Economy Calculator (km/L).
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFuelModal(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Fuel className="w-4 h-4" />
                <span>Log Fuel Fill-Up</span>
              </button>
              <button
                onClick={() => setShowAddVehModal(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Vehicle</span>
              </button>
            </div>
          </div>

          {/* Vehicle Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((veh) => {
              const vehLogs = fuelLogs.filter((f) => f.vehicle_id === veh.id);
              const latestLog = vehLogs[0];

              // Calculate overall average mileage from logs
              let avgMileage: string = 'N/A';
              if (vehLogs.length >= 2) {
                const totalDist = vehLogs[0].odometer_reading - vehLogs[vehLogs.length - 1].odometer_reading;
                const totalFuel = vehLogs.slice(0, -1).reduce((sum, l) => sum + l.unit_quantity, 0);
                if (totalFuel > 0 && totalDist > 0) {
                  avgMileage = (totalDist / totalFuel).toFixed(2);
                }
              }

              return (
                <div
                  key={veh.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {veh.manufacturer} {veh.brand} {veh.model}
                      </h4>
                      <p className="text-xs font-mono text-amber-400">{veh.reg_no}</p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Reg: {veh.reg_year}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Odometer</span>
                      <span className="text-slate-200 font-mono font-semibold">
                        {veh.current_odometer.toLocaleString()} km
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Avg Efficiency</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {avgMileage !== 'N/A' ? `${avgMileage} km/L` : 'Calibrating'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Total Fill-Ups</span>
                      <span className="text-slate-200 font-mono">{vehLogs.length} logs</span>
                    </div>
                  </div>

                  {latestLog && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                      <span>
                        Last refuel: {latestLog.unit_quantity} {latestLog.unit_type} ({latestLog.fuel_type})
                      </span>
                      <span className="font-mono text-slate-500">
                        {new Date(latestLog.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Fuel Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Recent Fuel Refuel Logs & Calculated Mileages
            </h4>

            {fuelLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No fuel logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Vehicle</th>
                      <th className="py-2 px-3">Fuel Type</th>
                      <th className="py-2 px-3">Quantity</th>
                      <th className="py-2 px-3">Odometer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {fuelLogs.slice(0, 8).map((log) => {
                      const veh = vehicles.find((v) => v.id === log.vehicle_id);
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-200">
                            {veh ? `${veh.brand} (${veh.reg_no})` : 'Vehicle'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-amber-400 font-mono">{log.fuel_type}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-200">
                            {log.unit_quantity} {log.unit_type}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {log.odometer_reading.toLocaleString()} km
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: ADD INVESTMENT */}
      {/* ---------------------------------------------------- */}
      {showAddInvModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-white mb-3">Add Investment Profile</h3>
            <form onSubmit={handleCreateInvestment} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Investment Class</label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value as InvestmentType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="SAVINGS_CERTIFICATE">Bangladesh Savings Certificate (Sanchayapatra)</option>
                  <option value="STOCK">Stock Equities (DSE / BO Account)</option>
                  <option value="FDR">Fixed Deposit Receipt (FDR / Bank)</option>
                  <option value="LAND">Land / Real Property Investment</option>
                </select>
              </div>

              {invType === 'STOCK' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="BO ID (16 digits)"
                      value={stockBoId}
                      onChange={(e) => setStockBoId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Broker Name"
                      value={stockBroker}
                      onChange={(e) => setStockBroker(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Ticker (e.g. GP)"
                      value={stockTicker}
                      onChange={(e) => setStockTicker(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Units"
                      value={stockUnits}
                      onChange={(e) => setStockUnits(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Buy Price"
                      value={stockBuyPrice}
                      onChange={(e) => setStockBuyPrice(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                  </div>
                </div>
              )}

              {(invType === 'SAVINGS_CERTIFICATE' || invType === 'FDR') && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Scheme Name (e.g. 5-Year Sanchayapatra)"
                    value={scScheme}
                    onChange={(e) => setScScheme(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Instrument No"
                      value={scInstrumentNo}
                      onChange={(e) => setScInstrumentNo(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Principal BDT"
                      value={scPrincipal}
                      onChange={(e) => setScPrincipal(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Profit Rate (e.g. 11.28%)"
                      value={scProfitRate}
                      onChange={(e) => setScProfitRate(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="date"
                      value={scMaturity}
                      onChange={(e) => setScMaturity(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                  </div>
                </div>
              )}

              {invType === 'LAND' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Land Location (e.g. Purbachal Sector 20)"
                    value={landLocation}
                    onChange={(e) => setLandLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Area (Katha)"
                      value={landAreaKatha}
                      onChange={(e) => setLandAreaKatha(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Purchase BDT"
                      value={landPurchasePrice}
                      onChange={(e) => setLandPurchasePrice(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Estimated BDT"
                      value={landCurrentValue}
                      onChange={(e) => setLandCurrentValue(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    />
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="Optional Remarks / Notes"
                value={invRemarks}
                onChange={(e) => setInvRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddInvModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-semibold"
                >
                  Save Investment & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: REGISTER PROPERTY (CASCADING LOCATION) */}
      {/* ---------------------------------------------------- */}
      {showAddPropModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-white mb-3">Register Property</h3>
            <form onSubmit={handleCreateProperty} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Type</label>
                  <select
                    value={propType}
                    onChange={(e) => setPropType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Agricultural">Agricultural</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Sub-Type</label>
                  <input
                    type="text"
                    value={propSubType}
                    onChange={(e) => setPropSubType(e.target.value)}
                    placeholder="Apartment / Plot"
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Cascading Administrative Location */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Division</label>
                  <select
                    value={propDivision}
                    onChange={(e) => {
                      const div = e.target.value;
                      setPropDivision(div);
                      const dists = Object.keys(BD_DIVISIONS_DATA[div] || {});
                      setPropDistrict(dists[0] || '');
                      const upzs = BD_DIVISIONS_DATA[div]?.[dists[0]] || [];
                      setPropUpazila(upzs[0] || '');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    {Object.keys(BD_DIVISIONS_DATA).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">District</label>
                  <select
                    value={propDistrict}
                    onChange={(e) => {
                      const dist = e.target.value;
                      setPropDistrict(dist);
                      const upzs = BD_DIVISIONS_DATA[propDivision]?.[dist] || [];
                      setPropUpazila(upzs[0] || '');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Upazila</label>
                  <select
                    value={propUpazila}
                    onChange={(e) => setPropUpazila(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    {availableUpazilas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mouza, Dag, Khatian */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Mouza"
                  value={propMouza}
                  onChange={(e) => setPropMouza(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
                <input
                  type="text"
                  placeholder="Dag No"
                  value={propDag}
                  onChange={(e) => setPropDag(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
                <input
                  type="text"
                  placeholder="Khatian No"
                  value={propKhatian}
                  onChange={(e) => setPropKhatian(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Measurement (e.g. 5 Katha / 1850 SqFt)"
                  value={propLandMeasurement}
                  onChange={(e) => setPropLandMeasurement(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
                <select
                  value={propSurveyType}
                  onChange={(e) => setPropSurveyType(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                >
                  <option value="City Survey">City Survey</option>
                  <option value="RS">RS Survey</option>
                  <option value="SA">SA Survey</option>
                  <option value="CS">CS Survey</option>
                  <option value="BS">BS Survey</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Cost Price (BDT)"
                  value={propCostPrice}
                  onChange={(e) => setPropCostPrice(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Development Cost (BDT)"
                  value={propDevCost}
                  onChange={(e) => setPropDevCost(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
              </div>

              <input
                type="text"
                placeholder="Remarks (e.g. Rented unit or Land deed #)"
                value={propRemarks}
                onChange={(e) => setPropRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPropModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold"
                >
                  Register & Record Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: LOG FUEL FILL-UP */}
      {/* ---------------------------------------------------- */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-400" />
              Fuel Log & Mileage Engine
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Computes real-time fuel efficiency (km/L) against odometer.
            </p>

            <form onSubmit={handleAddFuelLog} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Select Vehicle</label>
                <select
                  value={fuelVehId}
                  onChange={(e) => setFuelVehId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.reg_no}) - Current: {v.current_odometer} km
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as FuelType)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    <option value="OCTANE">Octane</option>
                    <option value="PETROL">Petrol</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="LPG">LPG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Unit</label>
                  <select
                    value={fuelUnit}
                    onChange={(e) => setFuelUnit(e.target.value as FuelUnitType)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    <option value="LITRE">Litre</option>
                    <option value="KG">Kilogram (CNG)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 35.5"
                    value={fuelQuantity}
                    onChange={(e) => setFuelQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">
                    Current Odometer (km)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 48950"
                    value={fuelOdometer}
                    onChange={(e) => setFuelOdometer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">
                  Cost in BDT (Auto-posts to SQLite Expenses)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 4600"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded text-xs"
                >
                  Calculate & Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: NEW VEHICLE */}
      {/* ---------------------------------------------------- */}
      {showAddVehModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-3">Register New Vehicle</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Vehicle Type</label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value as VehicleType)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  >
                    <option value="CAR">Car</option>
                    <option value="MOTORCYCLE">Motorcycle</option>
                    <option value="MICROBUS">Microbus</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Manufacturer</label>
                  <input
                    type="text"
                    value={vehManufacturer}
                    onChange={(e) => setVehManufacturer(e.target.value)}
                    placeholder="Toyota / Honda"
                    className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Brand (e.g. Corolla)"
                  value={vehBrand}
                  onChange={(e) => setVehBrand(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
                <input
                  type="text"
                  placeholder="Model (e.g. Axio 2019)"
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Reg No (e.g. Dhaka Metro-GA-34-8891)"
                  value={vehRegNo}
                  onChange={(e) => setVehRegNo(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Registration Year"
                  value={vehRegYear}
                  onChange={(e) => setVehRegYear(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
                />
              </div>

              <input
                type="number"
                placeholder="Initial Odometer (km)"
                value={vehOdometer}
                onChange={(e) => setVehOdometer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 rounded"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVehModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded text-xs"
                >
                  Register Vehicle & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
