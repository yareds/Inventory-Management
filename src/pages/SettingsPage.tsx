import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertTriangle,
  Building,
  DollarSign,
  ShieldCheck,
  BellRing,
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { seedDatabase } from '../lib/seed';

export function SettingsPage() {
  const { settings, updateSettings, loading } = useSettings();
  const { currentUser, isSuperAdmin } = useAuth();

  const [formData, setFormData] = useState({
    businessName: settings.businessName || 'Inventory Management',
    currency: settings.currency || 'USD',
    currencySymbol: settings.currencySymbol || '$',
    lowStockThreshold: settings.lowStockThreshold || 10,
    allowNegativeStock: settings.allowNegativeStock || false,
    enableLowStockAlerts: settings.enableLowStockAlerts !== false,
  });

  React.useEffect(() => {
    if (!loading && settings) {
      setFormData({
        businessName: settings.businessName || 'Inventory Management',
        currency: settings.currency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        lowStockThreshold: settings.lowStockThreshold || 10,
        allowNegativeStock: settings.allowNegativeStock || false,
        enableLowStockAlerts: settings.enableLowStockAlerts !== false,
      });
    }
  }, [settings, loading]);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateSettings(formData);
      setSuccessMsg('Settings saved successfully and applied across all modules.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will seed the database with sample categories, suppliers, and products if not already initialized. Continue?')) {
      return;
    }

    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedDatabase(currentUser?.email);
      setSeedResult(res.message);
    } catch (err: any) {
      alert('Failed to seed data: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">System & Organization Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business profile, default currency formatting, alert parameters, and database controls.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        {/* Business Profile */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-indigo-600" />
            Business Organization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Reorder Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Financial Units */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            Financial Display & Currency
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Code (ISO 4217)
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="CAD">CAD - Canadian Dollar ($)</option>
                <option value="AUD">AUD - Australian Dollar ($)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="INR">INR - Indian Rupee (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Currency Display Symbol
              </label>
              <input
                type="text"
                required
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Inventory Control & Invariant Policies */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Inventory Policy & Guardrails
          </h3>

          <div className="space-y-4 mt-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="neg-stock"
                checked={formData.allowNegativeStock}
                onChange={(e) => setFormData({ ...formData, allowNegativeStock: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <label htmlFor="neg-stock" className="font-semibold text-slate-900 block cursor-pointer">
                  Allow Negative Inventory Balances
                </label>
                <span className="text-slate-500 block mt-0.5">
                  When disabled (recommended), the system strictly rejects any stock dispatch or transaction that would drop quantity below zero.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="stock-alerts"
                checked={formData.enableLowStockAlerts}
                onChange={(e) => setFormData({ ...formData, enableLowStockAlerts: e.target.checked })}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <label htmlFor="stock-alerts" className="font-semibold text-slate-900 block cursor-pointer">
                  Enable Low Stock & Reorder Push Notifications
                </label>
                <span className="text-slate-500 block mt-0.5">
                  Generates in-app alert notifications whenever an inventory transaction causes an item to hit or cross below its reorder threshold.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Developer & Database Seed Station */}
      {isSuperAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Data Seeding & Initialization
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly populate your Firestore database with demonstration categories, vendors, and initial products.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding Database...' : 'Seed Sample Catalog'}
            </button>
          </div>

          {seedResult && (
            <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              {seedResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
