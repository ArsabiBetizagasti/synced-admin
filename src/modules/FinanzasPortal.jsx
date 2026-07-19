import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';
import ClientesPortal from './ClientesPortal';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CATEGORIES_INCOME  = ['Retainer','Proyecto','Comisión','Consultoría','Extra'];
const CATEGORIES_EXPENSE = ['Software','Producción','Assets','Marketing','Infraestructura','Otro'];
const CURRENCY_SYMBOLS   = { USD:'$', EUR:'€', GBP:'£' };

function fmtRcDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Returns the amount this recurring cost contributes in a given month (0 if not active)
function getRecurringCostForMonth(rc, monthDate) {
  const now = new Date();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const m = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  if (rc.status === 'finished' && m > nowStart) return 0;
  const start = new Date(rc.startDate + 'T12:00:00');
  const startM = new Date(start.getFullYear(), start.getMonth(), 1);
  const sub = rc.subType || 'monthly';
  if (sub === 'once') return startM.getTime() === m.getTime() ? (rc.amount || 0) : 0;
  if (sub === 'monthly') {
    let end = null;
    if (rc.endDate) { const ed = new Date(rc.endDate + 'T12:00:00'); end = new Date(ed.getFullYear(), ed.getMonth(), 1); }
    else if (rc.months) end = new Date(start.getFullYear(), start.getMonth() + Number(rc.months), 1);
    return (m >= startM && (!end || m < end)) ? (rc.amount || 0) : 0;
  }
  if (sub === 'annual') {
    let end = null;
    if (rc.endDate) { const ed = new Date(rc.endDate + 'T12:00:00'); end = new Date(ed.getFullYear(), ed.getMonth(), 1); }
    if (m < startM) return 0;
    if (end && m >= end) return 0;
    const diff = (m.getFullYear() - startM.getFullYear()) * 12 + m.getMonth() - startM.getMonth();
    return diff % 12 === 0 ? (rc.amount || 0) : 0;
  }
  // legacy (no subType = monthly)
  let end = null;
  if (rc.endDate) { const ed = new Date(rc.endDate + 'T12:00:00'); end = new Date(ed.getFullYear(), ed.getMonth(), 1); }
  else if (rc.months) end = new Date(start.getFullYear(), start.getMonth() + Number(rc.months), 1);
  return (m >= startM && (!end || m < end)) ? (rc.amount || 0) : 0;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, symbol, chartData }) {
  if (!active || !payload?.length) return null;
  // On the bridge month, both historical and future series are set — hide the future duplicates
  const futToHist = { RetainersFut: 'Retainers', IngresosFut: 'Ingresos', ProyectosFut: 'Proyectos', GastosFut: 'Gastos', MargenFut: 'Margen' };
  const items = payload.filter(p => {
    if (p.value == null || p.value === 0) return false;
    const histKey = futToHist[p.dataKey];
    if (histKey) return !payload.some(x => x.dataKey === histKey && x.value != null && x.value !== 0);
    return true;
  });
  if (!items.length) return null;
  const monthData = chartData?.find(d => d.month === label);
  const incomeBreakdown  = (monthData?._breakdown    || []).filter(b => !b.isDebt);
  const debtBreakdown    = (monthData?._breakdown    || []).filter(b =>  b.isDebt);
  const expenseBreakdown = (monthData?._expBreakdown || []).filter(b => b.amount > 0);
  const hasGastos = items.some(p => p.dataKey === 'Gastos' || p.dataKey === 'GastosFut');
  return (
    <div className="bg-[#1c1c1c] border border-[#1a1a1a] rounded-xl px-4 py-3 shadow-xl min-w-[200px] max-w-[260px]">
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
      {hasGastos && expenseBreakdown.length > 0 && (
        <>
          <div className="h-px bg-zinc-700 my-2" />
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1.5">Detalle gastos</p>
          {expenseBreakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-400/60" />
              <span className="text-zinc-300 text-xs flex-1 truncate">{b.name}</span>
              <span className="text-red-400 text-xs font-medium">-{symbol}{Math.round(b.amount).toLocaleString()}</span>
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
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold">Registrar movimiento</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-1 bg-[#080808] rounded-full p-1">
            {['income','expense'].map(t => (
              <button key={t} type="button" onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${form.type===t?'text-black':'text-zinc-500 hover:text-white'}`}
                style={form.type===t?{background:t==='income'?'#4ade80':'#f87171'}:{}}>
                {t==='income'?'↑ Ingreso':'↓ Gasto'}
              </button>
            ))}
          </div>
          {form.type === 'income' && (
            <div className="flex gap-1.5">
              {incomeSubTypes.map(st => (
                <button key={st.value} type="button" onClick={() => handleSubType(st.value)}
                  className={`flex-1 py-1.5 px-2 rounded-full text-xs font-medium border transition-all ${form.paymentType===st.value?'border-[#faff05] text-white bg-[#faff05]/10':'border-[#111] text-zinc-500'}`}>
                  {st.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto (USD) *</label>
              <input type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                placeholder="0" min="0" step="0.01" required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]" required />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Descripción *</label>
            <input value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
              className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Retainer Mayo — Hollywood Browzer" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Cliente</label>
              <select value={form.clientId} onChange={e => setForm(p=>({...p,clientId:e.target.value}))}
                className="w-full bg-[#080808] border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                <option value="">— Sin cliente —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-full text-sm font-semibold text-black" style={{background:'#faff05'}}>
            Registrar movimiento
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Synced Entry Modal ─────────────────────────────────────────────────────────
function SyncedEntryModal({ cost, onClose }) {
  const { addRecurringCost, updateRecurringCost } = useApp();
  const isEdit = !!cost;
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    type:      cost?.type      || 'expense',
    subType:   cost?.subType   || 'monthly',
    name:      cost?.name      || '',
    amount:    cost?.amount    ?? '',
    currency:  cost?.currency  || 'USD',
    startDate: cost?.startDate || today,
    months:    cost?.months    || '',
    endDate:   cost?.endDate   || '',
    note:      cost?.note      || '',
  });
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      type:      form.type,
      subType:   form.subType,
      name:      form.name.trim(),
      amount:    Number(form.amount) || 0,
      currency:  form.currency,
      startDate: form.startDate,
      months:    form.subType === 'monthly' && form.months ? Number(form.months) : null,
      endDate:   form.subType === 'annual' ? (form.endDate || null) : null,
      note:      form.note.trim(),
      status:    cost?.status || 'active',
    };
    if (isEdit) updateRecurringCost(cost.id, data);
    else addRecurringCost(data);
    onClose();
  };

  const inputCls = 'w-full bg-black border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] transition-colors';
  const subTypes = [
    { value: 'once',    label: 'Único' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'annual',  label: 'Anual' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold text-sm">{isEdit ? 'Editar registro' : 'Nuevo registro'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type: Gasto / Ganancia */}
          <div className="flex gap-1 bg-black rounded-full p-1">
            {[['expense','↓ Gasto'],['income','↑ Ganancia']].map(([t, lbl]) => (
              <button key={t} type="button" onClick={() => sf('type', t)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${form.type===t?'text-black':'text-zinc-500 hover:text-white'}`}
                style={form.type===t?{background:t==='expense'?'#f87171':'#4ade80'}:{}}>
                {lbl}
              </button>
            ))}
          </div>
          {/* SubType: Único / Mensual / Anual */}
          <div className="flex gap-1.5">
            {subTypes.map(st => (
              <button key={st.value} type="button" onClick={() => sf('subType', st.value)}
                className={`flex-1 py-1.5 px-2 rounded-full text-xs font-medium border transition-all ${form.subType===st.value?'border-[#faff05] text-white bg-[#faff05]/10':'border-[#111] text-zinc-500 hover:text-zinc-300'}`}>
                {st.label}
              </button>
            ))}
          </div>
          {/* Name */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nombre *</label>
            <input value={form.name} onChange={e => sf('name', e.target.value)} className={inputCls}
              placeholder={form.type==='expense'?'ej. Photoshop, AWS, Alquiler':'ej. Consultoría, Venta, Bono'} required />
          </div>
          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={e => sf('amount', e.target.value)}
                className={inputCls} placeholder="0" required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Moneda</label>
              <select value={form.currency} onChange={e => sf('currency', e.target.value)} className={inputCls}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          {/* Date fields based on subType */}
          {form.subType === 'once' && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha *</label>
              <input type="date" value={form.startDate} onChange={e => sf('startDate', e.target.value)} className={inputCls} required />
            </div>
          )}
          {form.subType === 'monthly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Desde *</label>
                <input type="date" value={form.startDate} onChange={e => sf('startDate', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Meses (vacío = sin fin)</label>
                <input type="number" min="1" value={form.months} onChange={e => sf('months', e.target.value)}
                  className={inputCls} placeholder="ej. 8" />
              </div>
            </div>
          )}
          {form.subType === 'annual' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Desde *</label>
                <input type="date" value={form.startDate} onChange={e => sf('startDate', e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Hasta</label>
                <input type="date" value={form.endDate} onChange={e => sf('endDate', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
          {/* Note */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nota</label>
            <input value={form.note} onChange={e => sf('note', e.target.value)} className={inputCls} placeholder="Descripción adicional (opcional)" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-full text-sm font-semibold text-black" style={{ background: '#faff05' }}>
            {isEdit ? 'Guardar cambios' : 'Registrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Synced Entry Row ────────────────────────────────────────────────────────────
const CURR_SYM = { USD: '$', EUR: '€', GBP: '£' };

const RC_TAG = {
  once:    { label: 'Pago único', bg: '#18181b', color: '#a1a1aa', border: '#27272a' },
  monthly: { label: 'Mensual',    bg: '#0c1a30', color: '#60a5fa', border: '#1e3a5f' },
  annual:  { label: 'Anual',      bg: '#1a0f28', color: '#c084fc', border: '#4a1d7a' },
};

function SyncedEntryRow({ rc, onEdit, onFinish, onRestore, onDelete }) {
  const isFinished = rc.status === 'finished';
  const isIncome   = (rc.type || 'expense') === 'income';
  const color      = isFinished ? '#52525b' : (isIncome ? '#4ade80' : '#f87171');
  const sub        = rc.subType || 'monthly';
  const sym        = CURR_SYM[rc.currency || 'USD'] || '$';
  const tag        = RC_TAG[sub] || RC_TAG.monthly;

  const dateDetail = () => {
    if (sub === 'once') return fmtRcDate(rc.startDate);
    if (sub === 'monthly') {
      const start = new Date(rc.startDate + 'T12:00:00');
      let endStr = null;
      if (rc.endDate) endStr = rc.endDate;
      else if (rc.months) { const e = new Date(start.getFullYear(), start.getMonth() + Number(rc.months), 1); endStr = e.toISOString().split('T')[0]; }
      return `${fmtRcDate(rc.startDate)}${endStr ? ` → ${fmtRcDate(endStr)}` : ' · en curso'}`;
    }
    if (sub === 'annual') return `${fmtRcDate(rc.startDate)}${rc.endDate ? ` → ${fmtRcDate(rc.endDate)}` : ''}`;
    return fmtRcDate(rc.startDate);
  };

  // Annual: show monthly equivalent (amount/12); monthly: full amount/mes; once: full amount
  const displayAmt = sub === 'annual'
    ? Number((rc.amount || 0) / 12).toLocaleString(undefined, { maximumFractionDigits: 1 })
    : Number(rc.amount || 0).toLocaleString();
  const suffix = sub === 'once' ? '' : '/mes';

  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 group border ${isFinished ? 'border-[#111] bg-transparent opacity-60' : 'bg-[#0a0a0a] border-[#111]'}`}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: `${color}22`, color }}>
        {isIncome ? '↑' : '↓'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isFinished ? 'line-through text-zinc-500' : 'text-white'}`}>{rc.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0"
            style={{ background: tag.bg, color: tag.color, borderColor: tag.border }}>
            {tag.label}
          </span>
          <span className="text-zinc-600 text-[10px] truncate">
            {dateDetail()}{rc.note ? ` · ${rc.note}` : ''}
          </span>
        </div>
      </div>
      <span className={`text-xs font-bold flex-shrink-0 ${isFinished ? 'line-through' : ''}`} style={{ color }}>
        {isIncome ? '+' : '-'}{sym}{displayAmt}{suffix}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!isFinished && (
          <>
            <button onClick={onEdit} className="text-zinc-600 hover:text-white transition-colors" title="Editar">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button onClick={onFinish} className="text-zinc-600 hover:text-yellow-400 transition-colors" title="Marcar finalizado">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </>
        )}
        {isFinished && onRestore && (
          <button onClick={onRestore} className="text-zinc-600 hover:text-green-400 transition-colors" title="Reactivar">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors" title="Eliminar">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Synced Margin Chart ────────────────────────────────────────────────────────
function MarginTooltip({ active, payload, label, symbol }) {
  if (!active || !payload?.length) return null;
  const get = key => payload.find(p => p.dataKey === key)?.value ?? 0;
  const mar = get('Margen');
  return (
    <div className="bg-[#1c1c1c] border border-[#222] rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
      <p className="text-zinc-400 text-xs mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6 text-xs">
          <span className="text-blue-400">↑ Ingresos acum.</span>
          <span className="text-white font-semibold">{symbol}{get('Ingresos').toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6 text-xs">
          <span className="text-red-400">↓ Gastos acum.</span>
          <span className="text-white font-semibold">{symbol}{get('Gastos').toLocaleString()}</span>
        </div>
        <div className="h-px bg-zinc-700 my-1" />
        <div className="flex justify-between gap-6 text-xs">
          <span className="text-green-400 font-medium">= Margen global</span>
          <span className="font-bold" style={{ color: mar >= 0 ? '#4ade80' : '#f87171' }}>
            {symbol}{mar.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function SyncedMarginChart({ chartData, symbol }) {
  const data = useMemo(() => {
    let cumIngresos = 0, cumGastos = 0;
    return chartData
      .filter(d => d.Margen != null)
      .filter(d => {
        const inc = Math.round((d.Retainers || 0) + (d.Ingresos || 0) + (d.Proyectos || 0));
        const exp = Math.round(d.Gastos || 0);
        return inc > 0 || exp > 0;
      })
      .map(d => {
        cumIngresos += Math.round((d.Retainers || 0) + (d.Ingresos || 0) + (d.Proyectos || 0));
        cumGastos   += Math.round(d.Gastos || 0);
        return {
          month: d.month,
          Ingresos: cumIngresos,
          Gastos:   cumGastos,
          Margen:   cumIngresos - cumGastos,
        };
      });
  }, [chartData]);

  return (
    <div className="bg-[#080808] border border-[#111] rounded-2xl p-5 flex flex-col h-full">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-white font-medium flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">=</span>
          Margen neto mensual
        </h3>
        <p className="text-zinc-600 text-xs mt-0.5">Acumulado mes a mes · línea = margen neto global</p>
      </div>
      <div className="flex-1" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${symbol}${Math.abs(v) >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
            <Tooltip content={(props) => <MarginTooltip {...props} symbol={symbol} />} />
            <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 3" />

            {/* Context bars (background) */}
            <Bar dataKey="Ingresos" fill="#60a5fa" opacity={0.35} radius={[2,2,0,0]} maxBarSize={16} name="Ingresos" />
            <Bar dataKey="Gastos"   fill="#f87171" opacity={0.3}  radius={[2,2,0,0]} maxBarSize={16} name="Gastos" />

            {/* Main net margin line */}
            <Line type="monotone" dataKey="Margen" stroke="#4ade80" strokeWidth={2.5}
              dot={false} activeDot={{ r: 4, fill: '#4ade80', strokeWidth: 0 }} name="Margen" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
          <span className="w-3 h-2 rounded-sm bg-blue-400/40 inline-block" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
          <span className="w-3 h-2 rounded-sm bg-red-400/35 inline-block" /> Gastos
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#4ade80" strokeWidth="2.5" /></svg> Margen neto
        </span>
      </div>
    </div>
  );
}

// ── Synced Cost Section ────────────────────────────────────────────────────────
function SyncedCostSection() {
  const { recurringCosts, updateRecurringCost, deleteRecurringCost } = useApp();
  const [showModal, setShowModal]     = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [showFinished, setShowFinished] = useState(false);

  const active   = recurringCosts.filter(rc => rc.status !== 'finished');
  const finished = recurringCosts.filter(rc => rc.status === 'finished');

  return (
    <div className="bg-[#080808] border border-[#111] rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs">↓</span>
            Costo de vida de Synced
          </h3>
          <p className="text-zinc-600 text-xs mt-0.5">Gastos e ingresos fijos y recurrentes · se reflejan en el gráfico</p>
        </div>
        <button onClick={() => { setEditingCost(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-black flex-shrink-0"
          style={{ background: '#faff05' }}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar
        </button>
      </div>

      {/* Active entries */}
      {active.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-zinc-600 text-sm">Sin registros activos</p>
          <p className="text-zinc-700 text-xs mt-1">Registrá gastos únicos, mensuales o anuales para verlos en el gráfico</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(rc => (
            <SyncedEntryRow
              key={rc.id} rc={rc}
              onEdit={() => { setEditingCost(rc); setShowModal(true); }}
              onFinish={() => updateRecurringCost(rc.id, { status: 'finished' })}
              onDelete={() => deleteRecurringCost(rc.id)}
            />
          ))}
        </div>
      )}

      {/* Finished entries (collapsible) */}
      {finished.length > 0 && (
        <div>
          <button onClick={() => setShowFinished(v => !v)}
            className="flex items-center gap-1.5 text-zinc-500 text-xs hover:text-zinc-300 transition-colors mt-1">
            <svg className={`w-3 h-3 transition-transform ${showFinished ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Finalizados ({finished.length})
          </button>
          {showFinished && (
            <div className="space-y-2 mt-2">
              {finished.map(rc => (
                <SyncedEntryRow
                  key={rc.id} rc={rc}
                  onEdit={() => { setEditingCost(rc); setShowModal(true); }}
                  onRestore={() => updateRecurringCost(rc.id, { status: 'active' })}
                  onDelete={() => deleteRecurringCost(rc.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <SyncedEntryModal
          cost={editingCost}
          onClose={() => { setShowModal(false); setEditingCost(null); }}
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
    recurringCosts,
  } = useApp();

  const [period, setPeriod] = useState('Todo');

  const symbol = CURRENCY_SYMBOLS[currency];
  const now = new Date();

  // 'Todo' = months since Synced was founded (Feb 2024), future handled separately
  const SYNCED_BIRTH = 2024 * 12 + 1; // February 2024
  const allMonths = (now.getFullYear() * 12 + now.getMonth()) - SYNCED_BIRTH + 1;
  const periodMonths = { '1M': 1, '3M': 3, '6M': 6, '1A': 12, '2A': 24, 'Todo': allMonths };
  const months = periodMonths[period];

  // Label format: short for short periods, with year for longer ones
  const monthLabel = (d) =>
    months <= 6
      ? MONTHS[d.getMonth()]
      : `${MONTHS[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`;

  const currentLabel = monthLabel(now);

  // Historical chart data (finances + project income + auto-generated retainers from contracts)
  const historicalData = useMemo(() => {
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const entries = (finances)
        .filter(f => f.date.startsWith(str));
      const inc = entries.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
      const exp = entries.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);

      // Auto-generated retainer income from active client contracts
      const retainerClients = (clients)
        .filter(c => c.active && c.contractStart && c.monthlyRevenue > 0 && !c.isInternal);
      let retainerInc = 0;
      const breakdown = [];
      retainerClients.forEach(c => {
        const contractStart = new Date(c.contractStart);
        const contractEnd = new Date(c.contractStart);
        contractEnd.setMonth(contractEnd.getMonth() + (c.contractMonths || 6));
        if (d >= contractStart && d < contractEnd) {
          const revenue = (c.rateChangeDate && c.monthlyRevenueNew && d >= new Date(c.rateChangeDate))
            ? c.monthlyRevenueNew
            : c.monthlyRevenue;
          const amtUSD = toUSD(revenue, c.revenueCurrency);
          retainerInc += amtUSD;
          breakdown.push({ name: `${c.name} (retainer)`, color: c.color, amount: amtUSD });
        }
      });

      // Per-client manual income breakdown
      const byClientId = {};
      entries.filter(f => f.type === 'income').forEach(f => {
        const key = f.clientId || '__none__';
        byClientId[key] = (byClientId[key] || 0) + f.amount;
      });
      Object.entries(byClientId)
        .filter(([, amt]) => amt > 0)
        .forEach(([clientId, amount]) => {
          const c = clients.find(x => x.id === clientId);
          breakdown.push({ name: c?.name || 'Sin cliente', color: c?.color || '#71717a', amount });
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

      // Registered recurring costs/income (from SyncedCostSection) + expense breakdown
      let rcExp = 0, rcInc = 0;
      const expBreakdown = [];
      entries.filter(f => f.type === 'expense').forEach(f => {
        expBreakdown.push({ name: f.description || f.category || 'Gasto', amount: convertAmount(f.amount) });
      });
      recurringCosts.forEach(rc => {
        const amt = getRecurringCostForMonth(rc, d);
        if (amt <= 0) return;
        const amtUSD = toUSD(amt, rc.currency || 'USD');
        if ((rc.type || 'expense') === 'income') rcInc += amtUSD;
        else { rcExp += amtUSD; expBreakdown.push({ name: rc.name, amount: convertAmount(amtUSD) }); }
      });

      const totalInc = inc + projInc + retainerInc + rcInc;
      return {
        month: monthLabel(d),
        Retainers: convertAmount(retainerInc),
        Ingresos: convertAmount(inc + rcInc),
        Proyectos: convertAmount(projInc),
        Gastos: convertAmount(exp + rcExp),
        Margen: convertAmount(totalInc - exp - rcExp),
        Deuda: convertAmount(deudaMes),
        _breakdown: breakdown,
        _expBreakdown: expBreakdown,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finances, projects, clients, period, convertAmount, toUSD, recurringCosts]);

  // Monthly forecast from active retainer clients (converted to USD first, then to display currency)
  // Uses monthlyRevenueNew when rateChangeDate is reached
  const monthlyForecastUSD = clients
    .filter(c => c.active && c.contractType === 'Monthly')
    .reduce((s, c) => {
      const revenue = (c.rateChangeDate && c.monthlyRevenueNew && now >= new Date(c.rateChangeDate))
        ? c.monthlyRevenueNew
        : (c.monthlyRevenue || 0);
      return s + toUSD(revenue, c.revenueCurrency);
    }, 0);

  // Max future months to show in 'Todo' period: extends to cover all active recurring entries
  const maxFutureMths = useMemo(() => {
    let maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    recurringCosts.forEach(rc => {
      if (rc.status === 'finished') return;
      const sub = rc.subType || 'monthly';
      if (sub === 'once') return;
      if (sub === 'monthly') {
        let end = null;
        if (rc.endDate) { const ed = new Date(rc.endDate + 'T12:00:00'); end = new Date(ed.getFullYear(), ed.getMonth(), 1); }
        else if (rc.months) { const s = new Date(rc.startDate + 'T12:00:00'); end = new Date(s.getFullYear(), s.getMonth() + Number(rc.months), 1); }
        if (end && end > maxDate) maxDate = end;
      }
      if (sub === 'annual' && rc.endDate) {
        const ed = new Date(rc.endDate + 'T12:00:00');
        const end = new Date(ed.getFullYear(), ed.getMonth(), 1);
        if (end > maxDate) maxDate = end;
      }
    });
    const mths = (maxDate.getFullYear() - now.getFullYear()) * 12 + maxDate.getMonth() - now.getMonth();
    return Math.max(3, mths);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringCosts]);

  const futureMths = period === 'Todo' ? maxFutureMths : 3;

  // Build full chart data: historical + current (bridge) + future months
  const chartDataFull = useMemo(() => {
    const data = historicalData.map(d => ({ ...d, RetainersFut: null, IngresosFut: null, ProyectosFut: null, GastosFut: null, MargenFut: null }));

    // Bridge: last historical point connects to future
    if (data.length > 0) {
      const last = data[data.length - 1];
      last.RetainersFut = last.Retainers;
      last.IngresosFut  = last.Ingresos;
      last.ProyectosFut = last.Proyectos;
      last.GastosFut    = last.Gastos;
      last.MargenFut    = last.Margen;
    }

    // Future months: show specific planned recurring costs per month
    for (let i = 1; i <= futureMths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      let futRcExp = 0, futRcInc = 0;
      recurringCosts.forEach(rc => {
        const amt = getRecurringCostForMonth(rc, d);
        if (amt <= 0) return;
        if ((rc.type || 'expense') === 'income') futRcInc += toUSD(amt, rc.currency || 'USD');
        else futRcExp += toUSD(amt, rc.currency || 'USD');
      });
      data.push({
        month: monthLabel(d),
        Retainers: null, Ingresos: null, Proyectos: null, Gastos: null, Margen: null, Deuda: null,
        RetainersFut: convertAmount(monthlyForecastUSD + futRcInc),
        IngresosFut:  0,
        ProyectosFut: 0,
        GastosFut:    convertAmount(futRcExp),
        MargenFut:    convertAmount(monthlyForecastUSD + futRcInc - futRcExp),
      });
    }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicalData, monthlyForecastUSD, convertAmount, recurringCosts, futureMths, toUSD]);

  // KPIs filtered by current period AND client/type
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const filteredFinances = finances.filter(f => {
    const mc = true;
    const inPeriod = new Date(f.date) >= periodStart;
    return mc && inPeriod;
  });
  const financeIncome  = filteredFinances.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
  const projectIncomePeriod = projects
    .filter(p => p.paidAmount > 0 && new Date(p.dateStart || '2000-01-01') >= periodStart)
    .reduce((s, p) => s + p.paidAmount, 0);

  // Auto-generated retainer income for the KPI period
  const retainerIncomePeriod = useMemo(() => {
    const retainerClients = (clients)
      .filter(c => c.active && c.contractStart && c.monthlyRevenue > 0 && !c.isInternal);
    let total = 0;
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      retainerClients.forEach(c => {
        const contractStart = new Date(c.contractStart);
        const contractEnd = new Date(c.contractStart);
        contractEnd.setMonth(contractEnd.getMonth() + (c.contractMonths || 6));
        if (d >= contractStart && d < contractEnd) {
          const revenue = (c.rateChangeDate && c.monthlyRevenueNew && d >= new Date(c.rateChangeDate))
            ? c.monthlyRevenueNew : c.monthlyRevenue;
          total += toUSD(revenue, c.revenueCurrency);
        }
      });
    }
    return total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, months, toUSD]);

  // Recurring costs/income from SyncedCostSection — summed across the selected period
  const recurringExpensesInPeriod = useMemo(() => {
    let total = 0;
    recurringCosts.forEach(rc => {
      if ((rc.type || 'expense') !== 'expense') return;
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
        total += toUSD(getRecurringCostForMonth(rc, d), rc.currency || 'USD');
      }
    });
    return total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringCosts, months, toUSD]);

  const recurringIncomeInPeriod = useMemo(() => {
    let total = 0;
    recurringCosts.forEach(rc => {
      if ((rc.type || 'expense') !== 'income') return;
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
        total += toUSD(getRecurringCostForMonth(rc, d), rc.currency || 'USD');
      }
    });
    return total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringCosts, months, toUSD]);

  const totalIncome   = financeIncome + projectIncomePeriod + retainerIncomePeriod + recurringIncomeInPeriod;
  const totalExpenses = filteredFinances.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0) + recurringExpensesInPeriod;
  const netProfit     = totalIncome - totalExpenses;

  // Per-project attribution using splitDetails; non-project income uses 40/40/20 default
  const DEFAULT_SPLIT = [{ key: 'K', pct: 40 }, { key: 'J', pct: 40 }, { key: 'SG', pct: 20 }];
  const profitSplit = useMemo(() => {
    const kannBreakdown = [], jeroBreakdown = [], syncedBreakdown = [];
    let kannProj = 0, jeroProj = 0, syncedProj = 0;
    projects
      .filter(p => p.paidAmount > 0 && new Date(p.dateStart || '2000-01-01') >= periodStart)
      .forEach(p => {
        const split = (p.splitDetails && p.splitDetails.length > 0) ? p.splitDetails : DEFAULT_SPLIT;
        const kPct  = split.find(s => s.key === 'K')?.pct  || 0;
        const jPct  = split.find(s => s.key === 'J')?.pct  || 0;
        const sgPct = split.find(s => s.key === 'SG')?.pct || 0;
        const kAmt  = p.paidAmount * kPct  / 100;
        const jAmt  = p.paidAmount * jPct  / 100;
        const sgAmt = p.paidAmount * sgPct / 100;
        kannProj   += kAmt;
        jeroProj   += jAmt;
        syncedProj += sgAmt;
        if (kAmt  > 0) kannBreakdown.push({ name: p.clientName, amount: kAmt,  pct: kPct  });
        if (jAmt  > 0) jeroBreakdown.push({ name: p.clientName, amount: jAmt,  pct: jPct  });
        if (sgAmt > 0) syncedBreakdown.push({ name: p.clientName, amount: sgAmt, pct: sgPct });
      });
    const otherIncome = financeIncome + retainerIncomePeriod + recurringIncomeInPeriod;
    return {
      kann:   kannProj   + otherIncome * 0.40,
      jero:   jeroProj   + otherIncome * 0.40,
      synced: syncedProj + otherIncome * 0.20 - totalExpenses,
      kannBreakdown,
      jeroBreakdown,
      syncedBreakdown,
      otherIncome,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, periodStart, financeIncome, retainerIncomePeriod, recurringIncomeInPeriod, totalExpenses]);


  return (
    <div className="space-y-5">
      {/* ── Currency + Period ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Moneda</span>
          <div className="flex gap-1 bg-[#080808] rounded-full p-1">
            {Object.keys(CURRENCY_SYMBOLS).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${currency===c?'text-black':'text-zinc-400 hover:text-white'}`}
                style={currency===c?{background:'#faff05'}:{}}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
          {ratesUpdatedAt && (
            <span className="hidden sm:inline text-zinc-600 text-xs">
              1 USD = {exchangeRates.EUR?.toFixed(4)} EUR / {exchangeRates.GBP?.toFixed(4)} GBP
              <span className="ml-1 text-zinc-700">({ratesUpdatedAt})</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs uppercase tracking-wider flex-shrink-0">Período</span>
          <div className="flex gap-0.5 bg-[#080808] rounded-full p-1 overflow-x-auto no-scrollbar">
            {[['1M','1M'],['3M','3M'],['6M','6M'],['1A','1A'],['2A','2A'],['Todo','Todo']].map(([v,l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${period===v?'text-black':'text-zinc-400 hover:text-white'}`}
                style={period===v?{background:'#faff05'}:{}}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs fila 1: Ingresos | Gastos | Margen+% ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Ingresos */}
        <div className="bg-[#080808] border border-[#111] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Ingresos</p>
            <span className="text-green-400 font-bold text-sm">↑</span>
          </div>
          <p className="font-bold text-2xl text-green-400">{fmtAmount(totalIncome)}</p>
          <p className="text-zinc-600 text-xs mt-1">Agencia global</p>
        </div>
        {/* Gastos */}
        <div className="bg-[#080808] border border-[#111] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Gastos</p>
            <span className="text-red-400 font-bold text-sm">↓</span>
          </div>
          <p className="font-bold text-2xl text-red-400">{fmtAmount(totalExpenses)}</p>
          <p className="text-zinc-600 text-xs mt-1">Agencia global</p>
        </div>
        {/* Margen neto + % en la misma caja */}
        <div className="col-span-2 sm:col-span-1 bg-[#080808] border border-[#111] rounded-2xl p-4 flex gap-0">
          <div className="flex-1 pr-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Margen neto</p>
              <span className="font-bold text-sm" style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>=</span>
            </div>
            <p className="font-bold text-2xl" style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>
              {fmtAmount(netProfit)}
            </p>
            <p className="text-zinc-600 text-xs mt-1">Agencia global</p>
          </div>
          <div className="w-px bg-[#1a1a1a] self-stretch" />
          <div className="flex-1 pl-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Margen %</p>
              <span className="font-bold text-sm" style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>%</span>
            </div>
            <p className="font-bold text-2xl" style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>
              {totalIncome ? `${Math.round((netProfit / totalIncome) * 100)}%` : '—'}
            </p>
            <p className="text-xs mt-1 font-medium" style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' }}>
              {netProfit >= 0 ? 'de ganancia' : 'de pérdida'}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPIs fila 2: Kann | Jero | Synced (con ecuación) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 items-start">
        {/* Kann + Jero con hover breakdown */}
        {[
          { label: 'Ganancia Kann', total: profitSplit.kann, breakdown: profitSplit.kannBreakdown, avatar: '/admin/kann-avatar.png' },
          { label: 'Ganancia Jero', total: profitSplit.jero, breakdown: profitSplit.jeroBreakdown, avatar: '/admin/jero-avatar.png' },
        ].map(item => (
          <div key={item.label} className="relative bg-[#080808] border border-[#111] rounded-2xl p-4 group cursor-default">
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">{item.label}</p>
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <img src={item.avatar} alt="" className="w-full h-full object-cover" draggable={false} />
              </div>
            </div>
            <p className="text-zinc-600 text-[10px] mb-2">40% del margen · ajust. por proyecto</p>
            <p className="font-bold text-2xl" style={{ color: item.total >= 0 ? '#4ade80' : '#f87171' }}>
              {fmtAmount(item.total)}
            </p>
            {/* Hover breakdown flotante */}
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#111] border border-[#1f1f1f] rounded-xl p-3 shadow-xl
                            opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
              <div className="space-y-1.5">
                {item.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400 text-xs truncate flex-1">{b.name}</span>
                    <span className="text-zinc-600 text-xs flex-shrink-0">{b.pct}%</span>
                    <span className="text-zinc-200 text-xs font-medium flex-shrink-0">{fmtAmount(b.amount)}</span>
                  </div>
                ))}
                <div className="h-px bg-[#222] my-1" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500 text-xs flex-1">Retainers / otros</span>
                  <span className="text-zinc-600 text-xs flex-shrink-0">40%</span>
                  <span className="text-zinc-300 text-xs font-medium flex-shrink-0">{fmtAmount(profitSplit.otherIncome * 0.40)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Synced — ecuación: 20% base − gastos = neto */}
        {(() => {
          const syncedGross = profitSplit.synced + totalExpenses;
          const syncedNet   = profitSplit.synced;
          const netColor    = syncedNet >= 0 ? '#4ade80' : '#f87171';
          return (
            <div className="col-span-2 sm:col-span-1 bg-[#080808] border border-[#111] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Ganancia Synced</p>
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src="/admin/sin-activar.png" alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
              </div>
              {/* Labels */}
              <div className="flex gap-1 mb-1">
                <span className="text-zinc-600 text-[10px] flex-1">20% base</span>
                <span className="flex-shrink-0 w-6" />
                <span className="text-zinc-600 text-[10px] flex-1">Gastos</span>
                <span className="flex-shrink-0 w-6" />
                <span className="text-zinc-600 text-[10px] flex-1">Neto</span>
              </div>
              {/* Valores — operadores alineados al centro vertical del número */}
              <div className="flex items-center gap-1">
                <p className="font-bold text-2xl text-green-400 flex-1 truncate">{fmtAmount(syncedGross)}</p>
                <span className="text-zinc-500 font-bold text-xl flex-shrink-0 w-6 text-center">−</span>
                <p className="font-bold text-2xl text-red-400 flex-1 truncate">{fmtAmount(totalExpenses)}</p>
                <span className="text-zinc-500 font-bold text-xl flex-shrink-0 w-6 text-center">=</span>
                <p className="font-bold text-2xl flex-1 truncate" style={{ color: netColor }}>{fmtAmount(syncedNet)}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Main Chart with future prediction ── */}
      <div className="bg-[#080808] border border-[#111] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-white font-medium">Flujo de caja</h3>
            <p className="text-zinc-600 text-xs mt-0.5">
              {{'1M':'Último mes','3M':'Últimos 3 meses','6M':'Últimos 6 meses','1A':'Último año','2A':'Últimos 2 años','Todo':'Toda la empresa'}[period]}
              {' '}+ {futureMths} {futureMths === 1 ? 'mes' : 'meses'} de predicción
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
              <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
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
            <Area type="monotone" dataKey="Ingresos" stroke="#4ade80" strokeWidth={1.5}
              fill="url(#gInc)" dot={false} connectNulls={false} name="Extra" />
            <Area type="monotone" dataKey="Gastos" stroke="#f87171" strokeWidth={2}
              fill="url(#gExp)" dot={false} connectNulls={false} name="Gastos" />
            {/* Deuda de proyectos (red dashed wave with fill) */}
            <Area type="monotone" dataKey="Deuda" stroke="#ef4444" strokeWidth={1.5}
              fill="url(#gDeuda)" dot={false} connectNulls={false} strokeDasharray="5 3" name="Deuda" />
            <Area type="monotone" dataKey="Retainers" stroke="#34d399" strokeWidth={2}
              fill="url(#gRet)" dot={false} connectNulls={false} name="Retainers" />
            <Area type="monotone" dataKey="Proyectos" stroke="#16a34a" strokeWidth={2}
              fill="#16a34a22" dot={false} connectNulls={false} name="Proyectos" />

            {/* Future prediction series (grey) */}
            <Area type="monotone" dataKey="RetainersFut" stroke="#52525b" strokeWidth={1.5}
              fill="url(#gFutInc)" dot={false} connectNulls={false} strokeDasharray="4 4" name="Retainers ↗" />
            <Area type="monotone" dataKey="IngresosFut" stroke="#3f3f46" strokeWidth={1}
              fill="none" dot={false} connectNulls={false} strokeDasharray="4 4" name="Extra ↗" />
            <Area type="monotone" dataKey="GastosFut" stroke="#ef4444" strokeWidth={1.5}
              fill="url(#gExp)" dot={false} connectNulls={false} strokeDasharray="4 4" name="Gastos ↗" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Chart legend */}
        <div className="flex items-center gap-5 mt-4 flex-wrap">
          {[
            { color: '#34d399', label: 'Retainers (contratos)', dashed: false },
            { color: '#4ade80', label: 'Ingresos extra', dashed: false },
            { color: '#16a34a', label: 'Proyectos cobrados', dashed: false },
            { color: '#f87171', label: 'Gastos', dashed: false },
            { color: '#ef4444', label: 'Deuda / Gastos futuros', dashed: true },
            { color: '#52525b', label: 'Ingresos proyectados', dashed: true },
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

      {/* ── Synced cost of living + Margin chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SyncedCostSection />
        <SyncedMarginChart chartData={chartDataFull} symbol={symbol} />
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium px-2">Clientes</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Desktop-only notice on mobile */}
      <div className="sm:hidden flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-zinc-400 text-sm font-medium text-center">Solo disponible en desktop</p>
        <p className="text-zinc-600 text-xs text-center">Abrí el admin desde una computadora para ver la sección de Clientes.</p>
      </div>
      <div className="hidden sm:block">
        <ClientesPortal />
      </div>

    </div>
  );
}
