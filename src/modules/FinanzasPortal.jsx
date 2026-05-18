import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';
import ClientesPortal from './ClientesPortal';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CATEGORIES_INCOME  = ['Retainer','Proyecto','Comisión','Consultoría','Extra'];
const CATEGORIES_EXPENSE = ['Software','Producción','Assets','Marketing','Infraestructura','Otro'];
const CURRENCY_SYMBOLS   = { USD:'$', EUR:'€', GBP:'£' };

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, symbol, chartData }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter(p => p.value != null && p.value !== 0);
  if (!items.length) return null;
  const monthData = chartData?.find(d => d.month === label);
  const incomeBreakdown = (monthData?._breakdown || []).filter(b => !b.isDebt);
  const debtBreakdown   = (monthData?._breakdown || []).filter(b => b.isDebt);
  return (
    <div className="bg-[#1c1c1c] border border-zinc-700 rounded-xl px-4 py-3 shadow-xl min-w-[200px]">
      <p className="text-zinc-400 text-xs mb-2 font-medium">{label}</p>
      {items.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-sm mb-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-zinc-400 text-xs">{p.name.replace('Fut','').replace('_fut','')}:</span>
          <span className="text-white font-semibold text-xs">{symbol}{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
      {incomeBreakdown.length > 0 && (
        <>
          <div className="h-px bg-zinc-700 my-2" />
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Por cliente</p>
          {incomeBreakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
              <span className="text-zinc-300 text-xs flex-1 truncate">{b.name}</span>
              <span className="text-white text-xs font-medium">{symbol}{Math.round(b.amount).toLocaleString()}</span>
            </div>
          ))}
        </>
      )}
      {debtBreakdown.length > 0 && (
        <>
          <div className="h-px bg-zinc-700 my-2" />
          <p className="text-red-500 text-[10px] uppercase tracking-wider mb-1.5">Deudas pendientes</p>
          {debtBreakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
              <span className="text-red-300 text-xs flex-1 truncate">{b.name}</span>
              <span className="text-red-400 text-xs font-medium">-{symbol}{Math.round(b.amount).toLocaleString()}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Contract Gantt ─────────────────────────────────────────────────────────────
function ContractGantt({ clients, months }) {
  const now = new Date();

  // Range follows the selected period: start = period start, end = max(contract ends, 6mo forward)
  const periodMonthsBack = Math.min(months, 24);
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (periodMonthsBack - 1), 1);
  let rangeEnd = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  clients.forEach(c => {
    if (c.contractStart && c.contractMonths) {
      const end = new Date(c.contractStart);
      end.setMonth(end.getMonth() + c.contractMonths);
      if (end > rangeEnd) rangeEnd = new Date(end);
    }
  });

  const totalMs = rangeEnd - rangeStart;
  const toPct = (date) => Math.max(0, Math.min(100, ((new Date(date) - rangeStart) / totalMs) * 100));
  const todayPct = toPct(now);

  // Quarter labels
  const quarterLabels = [];
  const cur = new Date(rangeStart.getFullYear(), Math.floor(rangeStart.getMonth() / 3) * 3, 1);
  while (cur <= rangeEnd) {
    const pct = toPct(cur);
    if (pct >= 0 && pct <= 100) {
      quarterLabels.push({ label: `${MONTHS[cur.getMonth()]} '${cur.getFullYear().toString().slice(2)}`, pct });
    }
    cur.setMonth(cur.getMonth() + 3);
  }

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white font-medium text-sm">Timeline de contratos</h3>
        <span className="text-zinc-600 text-xs">— últimos 2 años hasta fin de contratos activos</span>
      </div>

      <div className="relative pr-2">
        {/* Quarter tick labels */}
        <div className="relative h-5 mb-2">
          {quarterLabels.map((q, i) => (
            <span key={i} className="absolute text-[9px] text-zinc-600 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${q.pct}%` }}>
              {q.label}
            </span>
          ))}
        </div>

        {/* Grid lines (quarters) */}
        <div className="relative">
          {quarterLabels.map((q, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-zinc-800/60"
              style={{ left: `${q.pct}%` }} />
          ))}

          {/* TODAY line */}
          <div className="absolute top-0 bottom-0 w-0.5 z-20" style={{ left: `${todayPct}%`, background: '#faff05' }}>
            <span className="absolute -top-5 left-1 text-[9px] font-bold text-[#faff05] whitespace-nowrap">HOY</span>
          </div>

          {/* Client rows */}
          <div className="space-y-2 py-1">
            {clients.map(client => {
              if (!client.contractStart) return null;
              const startPct = toPct(client.contractStart);
              const endDate = new Date(client.contractStart);
              endDate.setMonth(endDate.getMonth() + (client.contractMonths || 6));
              const endPct = toPct(endDate);
              const widthPct = Math.max(endPct - startPct, 1.5);
              const isActive = new Date(client.contractStart) <= now && endDate >= now;

              return (
                <div key={client.id} className="flex items-center gap-3 h-8">
                  <span className="text-zinc-400 text-xs w-36 flex-shrink-0 truncate text-right pr-2">{client.name}</span>
                  <div className="flex-1 relative h-6 rounded-sm overflow-visible">
                    {/* Past portion (darker) */}
                    {startPct < todayPct && (
                      <div className="absolute h-full rounded-l-full"
                        style={{
                          left: `${startPct}%`,
                          width: `${Math.min(todayPct, endPct) - startPct}%`,
                          background: client.color + '55',
                          borderTop: `1px solid ${client.color}88`,
                          borderBottom: `1px solid ${client.color}88`,
                          borderLeft: `1px solid ${client.color}`,
                        }} />
                    )}
                    {/* Future portion (more vivid) */}
                    {endPct > todayPct && (
                      <div className="absolute h-full flex items-center px-2"
                        style={{
                          left: `${Math.max(startPct, todayPct)}%`,
                          width: `${endPct - Math.max(startPct, todayPct)}%`,
                          background: client.color + 'cc',
                          borderRadius: startPct >= todayPct ? '9999px' : '0 9999px 9999px 0',
                          border: `1px solid ${client.color}`,
                        }}>
                        <span className="text-[9px] font-bold text-black whitespace-nowrap overflow-hidden">
                          {client.contractMonths}m · {MONTHS[endDate.getMonth()]} '{endDate.getFullYear().toString().slice(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Entry Modal ────────────────────────────────────────────────────────────
function AddEntryModal({ onClose, defaultType = 'income' }) {
  const { addFinanceEntry, clients } = useApp();
  const [form, setForm] = useState({
    type: defaultType, amount: '', description: '', clientId: '',
    date: new Date().toISOString().split('T')[0],
    category: defaultType === 'expense' ? 'Software' : 'Retainer',
    paymentType: defaultType === 'expense' ? 'expense' : 'retainer',
  });

  const incomeSubTypes = [
    { value: 'retainer', label: '🔄 Retainer' },
    { value: 'project',  label: '💼 Proyecto' },
    { value: 'commission', label: '💸 Comisión' },
  ];

  const cats = form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  const handleTypeChange = (t) => setForm(p => ({
    ...p, type: t,
    category: t === 'income' ? 'Retainer' : 'Software',
    paymentType: t === 'income' ? 'retainer' : 'expense',
  }));

  const handleSubType = (sub) => {
    const map = { retainer: 'Retainer', project: 'Proyecto', commission: 'Comisión' };
    setForm(p => ({ ...p, paymentType: sub, category: map[sub] || p.category }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addFinanceEntry({ ...form, amount: Number(form.amount) });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Registrar movimiento</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1">
            {['income','expense'].map(t => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.type===t?'text-black':'text-zinc-500 hover:text-white'}`}
                style={form.type===t?{background:t==='income'?'#4ade80':'#f87171'}:{}}>
                {t==='income'?'↑ Ingreso':'↓ Gasto'}
              </button>
            ))}
          </div>
          {form.type === 'income' && (
            <div className="flex gap-1.5">
              {incomeSubTypes.map(st => (
                <button key={st.value} type="button" onClick={() => handleSubType(st.value)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${form.paymentType===st.value?'border-[#faff05] text-white bg-[#faff05]/10':'border-zinc-800 text-zinc-500'}`}>
                  {st.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto (USD) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                placeholder="0" min="0" step="0.01" required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]" required />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción *</label>
            <input value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
              className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Retainer Mayo — Hollywood Browzer" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
              <select value={form.clientId} onChange={e => setForm(p=>({...p,clientId:e.target.value}))}
                className="w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                <option value="">— Sin cliente —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-black" style={{background:'#faff05'}}>
            Registrar movimiento
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Recurring Cost Modal ───────────────────────────────────────────────────────
function RecurringCostModal({ cost, onClose }) {
  const { addRecurringCost, updateRecurringCost } = useApp();
  const isEdit = !!cost;
  const [form, setForm] = useState({
    name:      cost?.name      || '',
    amount:    cost?.amount    ?? '',
    startDate: cost?.startDate || new Date().toISOString().split('T')[0],
    endDate:   cost?.endDate   || '',
    note:      cost?.note      || '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { name: form.name.trim(), amount: Number(form.amount) || 0, startDate: form.startDate, endDate: form.endDate || null, note: form.note };
    if (isEdit) updateRecurringCost(cost.id, data);
    else addRecurringCost(data);
    onClose();
  };

  const inputCls = 'w-full bg-[#1a1a1a] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold text-sm">{isEdit ? 'Editar costo fijo' : 'Nuevo costo fijo mensual'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="ej. Photoshop (x2)" required />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto mensual (USD) *</label>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} placeholder="40" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Desde *</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Hasta (opcional)</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nota</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} placeholder="ej. dos licencias Photoshop" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-black" style={{ background: '#faff05' }}>
            {isEdit ? 'Guardar cambios' : 'Agregar costo fijo'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Synced Cost Section ────────────────────────────────────────────────────────
function SyncedCostSection({ onAddExpense }) {
  const { finances, clients, fmtAmount, deleteFinanceEntry, recurringCosts, deleteRecurringCost, updateRecurringCost } = useApp();
  const [expandedExpenses, setExpandedExpenses] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editRecurring, setEditRecurring] = useState(null);

  const now = new Date();
  const allExpenses = finances.filter(f => f.type === 'expense').sort((a, b) => b.date.localeCompare(a.date));
  const distinctMonths = new Set(allExpenses.map(f => f.date.slice(0, 7))).size || 1;
  const totalExp = allExpenses.reduce((s, f) => s + f.amount, 0);
  const avgVariable = totalExp / distinctMonths;

  // Active recurring costs: started and not ended
  const activeRecurring = recurringCosts.filter(rc => {
    const start = new Date(rc.startDate);
    const end = rc.endDate ? new Date(rc.endDate) : null;
    return start <= now && (!end || end >= now);
  });
  const monthlyFixed = activeRecurring.reduce((s, rc) => s + rc.amount, 0);
  const totalMonthly = avgVariable + monthlyFixed;

  // Category breakdown (one-time expenses)
  const byCategory = {};
  allExpenses.forEach(f => { byCategory[f.category] = (byCategory[f.category] || 0) + f.amount; });
  const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 5);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs">↓</span>
            Costo de vida de Synced
          </h3>
          <p className="text-zinc-600 text-xs mt-0.5">Costos fijos + gastos variables</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-red-400">{fmtAmount(totalMonthly)}<span className="text-zinc-600 text-xs font-normal">/mes aprox.</span></p>
          <p className="text-zinc-600 text-[10px]">
            Fijos: {fmtAmount(monthlyFixed)} · Variables: {fmtAmount(avgVariable)}/mes prom.
          </p>
        </div>
      </div>

      {/* ── Costos Fijos (Recurring) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Costos fijos mensuales</span>
          <button onClick={() => setShowRecurringModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-zinc-700 text-zinc-400 hover:border-[#faff05]/60 hover:text-[#faff05] transition-colors bg-[#111]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Agregar
          </button>
        </div>
        {recurringCosts.length === 0 ? (
          <p className="text-zinc-700 text-xs py-2">Sin costos fijos registrados</p>
        ) : (
          <div className="space-y-1.5">
            {recurringCosts.map(rc => {
              const isActive = new Date(rc.startDate) <= now && (!rc.endDate || new Date(rc.endDate) >= now);
              return (
                <div key={rc.id} className="flex items-center gap-3 bg-[#111] rounded-xl px-3 py-2.5 group">
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isActive ? 'bg-red-400' : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium">{rc.name}</p>
                    <p className="text-zinc-600 text-[10px]">
                      Desde {fmtDate(rc.startDate)}{rc.endDate ? ` → ${fmtDate(rc.endDate)}` : ' · en curso'}
                      {rc.note && <span className="text-zinc-700"> · {rc.note}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold ${isActive ? 'text-red-400' : 'text-zinc-600'}`}>
                      {isActive ? '-' : ''}{fmtAmount(rc.amount)}/mes
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditRecurring(rc); setShowRecurringModal(true); }} className="text-zinc-600 hover:text-white transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => deleteRecurringCost(rc.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Gastos Variables ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Gastos variables registrados</span>
          <button onClick={onAddExpense}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-zinc-700 text-zinc-400 hover:border-red-500/60 hover:text-red-400 transition-colors bg-[#111]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Registrar gasto
          </button>
        </div>

        {topCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {topCategories.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] rounded-xl border border-zinc-800">
                <span className="text-zinc-400 text-xs">{cat}</span>
                <span className="text-red-400 text-xs font-semibold">{fmtAmount(amt)}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setExpandedExpenses(e => !e)}
          className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
          <svg className={`w-3 h-3 transition-transform ${expandedExpenses ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expandedExpenses ? 'Ocultar' : 'Ver'} todos los gastos ({allExpenses.length})
        </button>

        {expandedExpenses && (
          <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {allExpenses.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">Sin gastos registrados</p>}
            {allExpenses.map(entry => {
              const client = clients.find(c => c.id === entry.clientId);
              return (
                <div key={entry.id} className="flex items-center gap-3 bg-[#111] rounded-xl px-3 py-2.5 group">
                  <div className="w-1.5 h-8 rounded-full bg-red-400/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{entry.description}</p>
                    <p className="text-zinc-600 text-[10px]">
                      {entry.category}
                      {client ? <span style={{ color: client.color }}> · {client.name}</span> : <span className="text-zinc-700"> · Synced</span>}
                      <span className="ml-1">{entry.date}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-red-400 text-xs font-semibold">-{fmtAmount(entry.amount)}</span>
                    <button onClick={() => deleteFinanceEntry(entry.id)} className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRecurringModal && (
        <RecurringCostModal
          cost={editRecurring}
          onClose={() => { setShowRecurringModal(false); setEditRecurring(null); }}
        />
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function FinanzasPortal() {
  const {
    finances, clients, projects, deleteFinanceEntry,
    currency, setCurrency, exchangeRates, ratesUpdatedAt,
    convertAmount, fmtAmount, toUSD,
  } = useApp();

  const [showAdd, setShowAdd]             = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [period, setPeriod]         = useState('6M');

  const symbol = CURRENCY_SYMBOLS[currency];
  const now = new Date();

  // 'Todo' = months since first project (Jan 2024) + 3 future
  const allMonths = Math.max(
    Math.ceil(((now.getFullYear() * 12 + now.getMonth()) - (2024 * 12 + 0))) + 4,
    24
  );
  const periodMonths = { '1M': 1, '3M': 3, '6M': 6, '1A': 12, '2A': 24, 'Todo': allMonths };
  const months = periodMonths[period];

  // Label format: short for short periods, with year for longer ones
  const monthLabel = (d) =>
    months <= 6
      ? MONTHS[d.getMonth()]
      : `${MONTHS[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`;

  const currentLabel = monthLabel(now);

  // Historical chart data (finances + project income merged, with per-client breakdown for tooltip)
  const historicalData = useMemo(() => {
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const entries = (filterClient === 'all' ? finances : finances.filter(f => f.clientId === filterClient))
        .filter(f => f.date.startsWith(str));
      const inc = entries.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
      const exp = entries.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);

      // Per-client income breakdown
      const byClientId = {};
      entries.filter(f => f.type === 'income').forEach(f => {
        const key = f.clientId || '__none__';
        byClientId[key] = (byClientId[key] || 0) + f.amount;
      });
      const breakdown = Object.entries(byClientId)
        .filter(([, amt]) => amt > 0)
        .map(([clientId, amount]) => {
          const c = clients.find(x => x.id === clientId);
          return { name: c?.name || 'Sin cliente', color: c?.color || '#71717a', amount };
        });

      // Project income and debt: projects whose dateStart is in this month
      const monthProjects = projects.filter(p => (p.dateStart || '').startsWith(str));
      const projInc = monthProjects
        .filter(p => p.paidAmount > 0)
        .reduce((s, p) => s + (p.paidAmount || 0), 0);
      monthProjects.filter(p => p.paidAmount > 0).forEach(p => {
        breakdown.push({ name: `${p.clientName} (proyecto)`, color: '#16a34a', amount: p.paidAmount });
      });

      // Debt: unpaid or partial amounts for projects starting this month
      let deudaMes = 0;
      monthProjects.forEach(p => {
        const total = p.amountUSD || p.originalAmount || 0;
        let debt = 0;
        if (p.paidStatus === 'unpaid') debt = total;
        else if (p.paidStatus === 'partial') debt = Math.max(0, total - (p.paidAmount || 0));
        if (debt > 0) {
          deudaMes += debt;
          breakdown.push({ name: p.clientName, color: '#ef4444', amount: debt, isDebt: true });
        }
      });

      const totalInc = inc + projInc;
      return {
        month: monthLabel(d),
        Ingresos: convertAmount(inc),
        Proyectos: convertAmount(projInc),
        Gastos: convertAmount(exp),
        Margen: convertAmount(totalInc - exp),
        Deuda: convertAmount(deudaMes),
        _breakdown: breakdown,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finances, projects, clients, filterClient, period, convertAmount]);

  // Monthly forecast from active retainer clients (converted to USD first, then to display currency)
  const monthlyForecastUSD = clients
    .filter(c => c.active && c.contractType === 'Monthly')
    .reduce((s, c) => s + toUSD(c.monthlyRevenue || 0, c.revenueCurrency), 0);

  const avgExpUSD = useMemo(() => {
    const ms = new Set(finances.filter(f => f.type === 'expense').map(f => f.date.slice(0, 7))).size || 1;
    return finances.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0) / ms;
  }, [finances]);

  // Build full chart data: historical + current (bridge) + 3 future months
  const chartDataFull = useMemo(() => {
    const data = historicalData.map(d => ({ ...d, IngresosFut: null, ProyectosFut: null, GastosFut: null, MargenFut: null }));

    // Bridge: last historical point connects to future
    if (data.length > 0) {
      const last = data[data.length - 1];
      last.IngresosFut  = last.Ingresos;
      last.ProyectosFut = last.Proyectos;
      last.GastosFut    = last.Gastos;
      last.MargenFut    = last.Margen;
    }

    // 3 future months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      data.push({
        month: monthLabel(d),
        Ingresos: null, Proyectos: null, Gastos: null, Margen: null, Deuda: null,
        IngresosFut:  convertAmount(monthlyForecastUSD),
        ProyectosFut: 0,
        GastosFut:    convertAmount(avgExpUSD),
        MargenFut:    convertAmount(monthlyForecastUSD - avgExpUSD),
      });
    }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicalData, monthlyForecastUSD, avgExpUSD, convertAmount]);

  // KPIs filtered by current period AND client/type
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const filteredFinances = finances.filter(f => {
    const mc = filterClient === 'all' || f.clientId === filterClient;
    const mt = filterType === 'all' || f.type === filterType;
    const inPeriod = new Date(f.date) >= periodStart;
    return mc && mt && inPeriod;
  });
  const financeIncome  = filteredFinances.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
  const projectIncomePeriod = projects
    .filter(p => p.paidAmount > 0 && new Date(p.dateStart || '2000-01-01') >= periodStart)
    .reduce((s, p) => s + p.paidAmount, 0);
  const totalIncome    = financeIncome + (filterClient === 'all' ? projectIncomePeriod : 0);
  const totalExpenses  = filteredFinances.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
  const netProfit      = totalIncome - totalExpenses;

  const selectedClientObj = clients.find(c => c.id === filterClient);

  // Forecast table (next 6 months)
  const forecastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const inc = monthlyForecastUSD;
    const exp = avgExpUSD;
    return { month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, income: inc, expenses: exp, net: inc - exp };
  });

  return (
    <div className="space-y-5">
      {/* ── Currency + Period ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Moneda</span>
          <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1">
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${currency===c?'text-black':'text-zinc-400 hover:text-white'}`}
                style={currency===c?{background:'#faff05'}:{}}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
          {ratesUpdatedAt && (
            <span className="text-zinc-600 text-xs">
              1 USD = {exchangeRates.EUR?.toFixed(4)} EUR / {exchangeRates.GBP?.toFixed(4)} GBP
              <span className="ml-1 text-zinc-700">({ratesUpdatedAt})</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Período</span>
          <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1">
            {[['1M','1M'],['3M','3M'],['6M','6M'],['1A','1A'],['2A','2A'],['Todo','Todo']].map(([v,l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period===v?'text-black':'text-zinc-400 hover:text-white'}`}
                style={period===v?{background:'#faff05'}:{}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ingresos',   usd: totalIncome,   color: '#4ade80', icon: '↑' },
          { label: 'Gastos',     usd: totalExpenses, color: '#f87171', icon: '↓' },
          { label: 'Margen neto',usd: netProfit,     color: netProfit>=0?'#4ade80':'#f87171', icon: '=' },
          { label: 'Margen %',   usd: null, icon:'%', color: netProfit>=0?'#4ade80':'#f87171',
            display: totalIncome ? `${Math.round((netProfit/totalIncome)*100)}%` : '—' },
        ].map(item => (
          <div key={item.label} className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">{item.label}</p>
              <span className="font-bold" style={{color:item.color}}>{item.icon}</span>
            </div>
            <p className="font-bold text-xl" style={{color:item.color}}>
              {item.display ?? fmtAmount(item.usd)}
            </p>
            <p className="text-zinc-600 text-xs mt-0.5">
              {filterClient==='all' ? 'Agencia global' : selectedClientObj?.name}
              {currency !== 'USD' && item.usd != null && (
                <span className="ml-1 text-zinc-700">(${item.usd.toLocaleString()} USD)</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── Profit split KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ganancia Kann',  value: netProfit * 0.30, sub: '30% del margen neto', icon: 'K', bg: '#faff05' },
          { label: 'Ganancia Jero',  value: netProfit * 0.30, sub: '30% del margen neto', icon: 'J', bg: '#60a5fa' },
          { label: 'Ganancia Synced',value: netProfit * 0.40, sub: '40% antes de gastos empresa', icon: 'SG', bg: '#a78bfa' },
          { label: 'Gastos Synced',  value: -totalExpenses,   sub: 'Sale del 40% de Synced', icon: '↓', bg: '#f87171' },
        ].map(item => {
          const display = item.label === 'Gastos Synced'
            ? fmtAmount(totalExpenses)
            : fmtAmount(Math.max(0, item.value));
          const color = item.label === 'Gastos Synced'
            ? '#f87171'
            : item.value >= 0 ? '#4ade80' : '#f87171';
          return (
            <div key={item.label} className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">{item.label}</p>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-black flex-shrink-0"
                  style={{ background: item.bg }}>
                  {item.icon}
                </div>
              </div>
              <p className="font-bold text-xl" style={{ color }}>
                {item.label === 'Gastos Synced' ? '-' : ''}{display}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">{item.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterClient('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterClient==='all'?'text-black':'text-zinc-500 bg-[#1a1a1a] hover:text-white'}`}
            style={filterClient==='all'?{background:'#faff05'}:{}}>
            Ver Todo
          </button>
          {clients.map(c => (
            <button key={c.id} onClick={() => setFilterClient(filterClient===c.id?'all':c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-l-2 ${filterClient===c.id?'text-black':'text-zinc-500 bg-[#1a1a1a] hover:text-white'}`}
              style={filterClient===c.id?{background:c.color,borderLeftColor:c.color}:{borderLeftColor:c.color}}>
              {c.name}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black flex-shrink-0"
          style={{background:'#faff05'}}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar
        </button>
      </div>

      {/* ── Main Chart with future prediction ── */}
      <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-white font-medium">Flujo de caja</h3>
            <p className="text-zinc-600 text-xs mt-0.5">
              {{'1M':'Último mes','3M':'Últimos 3 meses','6M':'Últimos 6 meses','1A':'Último año','2A':'Últimos 2 años','Todo':'Toda la empresa'}[period]}
              {' '}+ 3 meses de predicción
              {filterClient !== 'all' && ` · ${selectedClientObj?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block rounded" /> Histórico</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-zinc-600 inline-block rounded border-dashed border-t border-zinc-500" /> Predicción</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={chartDataFull} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gMrg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gFutInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3f3f46" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gFutExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3f3f46" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gDeuda" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
            <XAxis dataKey="month"
              tick={{ fill: '#52525b', fontSize: months > 12 ? 9 : 11 }}
              axisLine={false} tickLine={false}
              interval={months > 12 ? 1 : 0} />
            <YAxis tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${symbol}${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
            <Tooltip content={(props) => <CustomTooltip {...props} symbol={symbol} chartData={chartDataFull} />} />

            {/* Vertical "HOY" line */}
            <ReferenceLine x={currentLabel} stroke="#3f3f46" strokeWidth={2}
              label={{ value: '│ HOY', position: 'insideTopRight', fill: '#faff05', fontSize: 9, dy: -2 }} />

            {/* Historical series */}
            <Area type="monotone" dataKey="Ingresos" stroke="#4ade80" strokeWidth={2}
              fill="url(#gInc)" dot={false} connectNulls={false} name="Ingresos" />
            <Area type="monotone" dataKey="Proyectos" stroke="#16a34a" strokeWidth={2}
              fill="#16a34a22" dot={false} connectNulls={false} name="Proyectos" />
            <Area type="monotone" dataKey="Gastos" stroke="#f87171" strokeWidth={2}
              fill="url(#gExp)" dot={false} connectNulls={false} name="Gastos" />

            {/* Deuda de proyectos (red dashed wave with fill) */}
            <Area type="monotone" dataKey="Deuda" stroke="#ef4444" strokeWidth={1.5}
              fill="url(#gDeuda)" dot={false} connectNulls={false} strokeDasharray="5 3" name="Deuda" />

            {/* Future prediction series (grey) */}
            <Area type="monotone" dataKey="IngresosFut" stroke="#52525b" strokeWidth={1.5}
              fill="url(#gFutInc)" dot={false} connectNulls={false} strokeDasharray="4 4" name="Ingresos ↗" />
            <Area type="monotone" dataKey="GastosFut" stroke="#3f3f46" strokeWidth={1.5}
              fill="url(#gFutExp)" dot={false} connectNulls={false} strokeDasharray="4 4" name="Gastos ↗" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Chart legend */}
        <div className="flex items-center gap-5 mt-4 flex-wrap">
          {[
            { color: '#4ade80', label: 'Ingresos retainer', dashed: false },
            { color: '#16a34a', label: 'Proyectos cobrados', dashed: false },
            { color: '#f87171', label: 'Gastos', dashed: false },
            { color: '#ef4444', label: 'Deuda proyectos', dashed: true },
            { color: '#52525b', label: 'Predicción', dashed: true },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <svg width="20" height="6">
                {item.dashed
                  ? <line x1="0" y1="3" x2="20" y2="3" stroke={item.color} strokeWidth="2" strokeDasharray="4 3" />
                  : <line x1="0" y1="3" x2="20" y2="3" stroke={item.color} strokeWidth="2.5" />
                }
              </svg>
              <span className="text-zinc-500 text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contract Timeline (Gantt) ── */}
      <ContractGantt clients={clients.filter(c => c.contractStart && !c.isInternal)} months={months} />

      {/* ── Synced cost of living ── */}
      <SyncedCostSection onAddExpense={() => setShowAddExpense(true)} />

      {/* ── Forecast + Transactions ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Forecast */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-5">
          <h3 className="text-white font-medium mb-1">Forecast — próximos 6 meses</h3>
          <p className="text-zinc-600 text-xs mb-4">
            Retainers activos: {fmtAmount(monthlyForecastUSD)}/mes
          </p>
          <div>
            <div className="grid grid-cols-4 gap-2 text-[10px] text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800">
              <span>Mes</span><span className="text-right">Ingresos</span>
              <span className="text-right">Gastos</span><span className="text-right">Neto</span>
            </div>
            {forecastMonths.map(row => (
              <div key={row.month} className="grid grid-cols-4 gap-2 py-2 border-b border-zinc-800/30 text-xs">
                <span className="text-zinc-400">{row.month}</span>
                <span className="text-right text-green-400">{fmtAmount(row.income)}</span>
                <span className="text-right text-red-400">{fmtAmount(row.expenses)}</span>
                <span className={`text-right font-semibold ${row.net>=0?'text-green-400':'text-red-400'}`}>{fmtAmount(row.net)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-[#1a1a1a] border border-zinc-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Movimientos</h3>
            <div className="flex gap-1">
              {[['all','Todos'],['income','Ingresos'],['expense','Gastos']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterType(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterType===v?'text-black':'text-zinc-500 bg-[#111]'}`}
                  style={filterType===v?{background:v==='income'?'#4ade80':v==='expense'?'#f87171':'#faff05'}:{}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {[...filteredFinances]
              .filter(f => f.amount > 0)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(entry => {
                const client = clients.find(c => c.id === entry.clientId);
                const ptIcon = { retainer:'🔄', project:'💼', commission:'💸' }[entry.paymentType] || '';
                return (
                  <div key={entry.id} className="flex items-center justify-between bg-[#111] rounded-xl px-3 py-2.5 group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${entry.type==='income'?'bg-green-400':'bg-red-400'}`} />
                      <div>
                        <p className="text-white text-xs font-medium">{ptIcon && <span className="mr-1">{ptIcon}</span>}{entry.description}</p>
                        <p className="text-zinc-600 text-[10px]">
                          {entry.category}
                          {client && <span style={{color:client.color}}> · {client.name}</span>}
                          <span className="ml-1">{entry.date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${entry.type==='income'?'text-green-400':'text-red-400'}`}>
                          {entry.type==='income'?'+':'-'}{fmtAmount(entry.amount)}
                        </span>
                        {currency !== 'USD' && <p className="text-zinc-700 text-[10px]">${entry.amount.toLocaleString()} USD</p>}
                      </div>
                      <button onClick={() => deleteFinanceEntry(entry.id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            {filteredFinances.filter(f => f.amount > 0).length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-6">Sin movimientos registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium px-2">Clientes</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <ClientesPortal />

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} />}
      {showAddExpense && <AddEntryModal onClose={() => setShowAddExpense(false)} defaultType="expense" />}
    </div>
  );
}
