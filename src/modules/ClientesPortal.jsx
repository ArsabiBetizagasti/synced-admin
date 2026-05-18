import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const CATEGORIES = ['Beauty', 'Sport', 'Food', 'Drink', 'Tech', 'Fashion', 'Health', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const CURR_SYM = { USD: '$', EUR: '€', GBP: '£' };
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const COLOR_SWATCHES = [
  '#f472b6','#34d399','#38bdf8','#fb923c','#a78bfa',
  '#faff05','#f87171','#60a5fa','#4ade80','#fbbf24',
  '#e879f9','#4ecdc4','#ff6b6b','#c084fc','#86efac',
];

// ── Confirmation Dialog ────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">¿Confirmar acción?</p>
        <p className="text-zinc-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function buildCommissionMonths(client) {
  if (!client.contractStart) return [];
  const start = new Date(client.contractStart);
  const count = (client.contractMonths || 6) + 2;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
    const existing = (client.commissionHistory || []).find(h => h.month === key);
    return { month: key, label, clientSales: existing?.clientSales ?? '', commissionAmount: existing?.commissionAmount ?? '' };
  });
}

// ── Yes/No Toggle ──────────────────────────────────────────────────────────────
function YesNo({ label, value, onChange }) {
  return (
    <div>
      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">{label}</label>
      <div className="flex gap-2">
        {[true, false].map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              value === v
                ? v ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-red-500 bg-red-500/10 text-red-400'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}>
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === v ? (v ? 'border-green-500' : 'border-red-500') : 'border-zinc-600'}`}>
              {value === v && <span className={`w-2 h-2 rounded-full ${v ? 'bg-green-500' : 'bg-red-500'}`} />}
            </span>
            {v ? 'Sí' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]';

// ── Add Client Modal (retainer/commission) ─────────────────────────────────────
function AddClientModal({ onClose }) {
  const { addClient, addNotification } = useApp();
  const [form, setForm] = useState({
    name: '', contact: '', country: '', category: 'Beauty',
    color: COLOR_SWATCHES[0],
    hasMonthlyPayment: null, monthlyRevenue: '', revenueCurrency: 'USD',
    hasCommissions: null, commissionRate: '10',
    contractStart: new Date().toISOString().split('T')[0], contractMonths: '6',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const canSubmit = form.name.trim() && form.hasMonthlyPayment !== null && form.hasCommissions !== null &&
    (form.hasMonthlyPayment === false || form.monthlyRevenue !== '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    addClient({
      name: form.name.trim(), contact: form.contact, country: form.country,
      category: form.category, contractType: 'Monthly', color: form.color,
      monthlyRevenue: form.hasMonthlyPayment ? Number(form.monthlyRevenue) : 0,
      revenueCurrency: form.revenueCurrency,
      hasMonthlyPayment: form.hasMonthlyPayment,
      hasCommissions: form.hasCommissions,
      commissionRate: form.hasCommissions ? Number(form.commissionRate) : 0,
      contractStart: form.contractStart,
      contractMonths: Number(form.contractMonths) || 6,
      commissions: 0,
    });
    addNotification(`agregó el cliente "${form.name}"`, 'Clientes');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Nuevo cliente (retainer / comisión)</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Nombre de empresa" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Contacto</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} className={inputCls} placeholder="Nombre responsable" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">País</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} placeholder="UK" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Duración (meses)</label>
              <input type="number" value={form.contractMonths} onChange={e => set('contractMonths', e.target.value)} className={inputCls} placeholder="6" min="1" />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Color del cliente</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          <div className="h-px bg-zinc-800" />
          <YesNo label="¿Hace pago mensual?" value={form.hasMonthlyPayment} onChange={v => set('hasMonthlyPayment', v)} />
          {form.hasMonthlyPayment === true && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto mensual</label>
              <div className="flex gap-2">
                <input type="number" value={form.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)}
                  className="flex-1 bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                  placeholder="3500" min="0" required={form.hasMonthlyPayment} />
                <select value={form.revenueCurrency} onChange={e => set('revenueCurrency', e.target.value)}
                  className="bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="h-px bg-zinc-800" />
          <YesNo label="¿Tiene comisiones de venta?" value={form.hasCommissions} onChange={v => set('hasCommissions', v)} />
          {form.hasCommissions === true && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Porcentaje de comisión</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.commissionRate} onChange={e => set('commissionRate', e.target.value)}
                  className="w-24 bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                  placeholder="10" min="0" max="100" step="0.5" />
                <span className="text-zinc-400 text-sm font-medium">%</span>
              </div>
            </div>
          )}
          <button type="submit" disabled={!canSubmit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-40"
            style={{ background: '#faff05' }}>
            Agregar cliente
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Edit Client Modal ──────────────────────────────────────────────────────────
function EditClientModal({ client, onClose }) {
  const { updateClient, addNotification } = useApp();
  const [form, setForm] = useState({
    name:             client.name,
    contact:          client.contact || '',
    country:          client.country || '',
    category:         client.category || 'Other',
    color:            client.color || COLOR_SWATCHES[0],
    hasMonthlyPayment: client.hasMonthlyPayment ?? null,
    monthlyRevenue:   client.monthlyRevenue ?? '',
    revenueCurrency:  client.revenueCurrency || 'USD',
    hasCommissions:   client.hasCommissions ?? null,
    commissionRate:   client.commissionRate ?? '10',
    contractStart:    client.contractStart || '',
    contractMonths:   client.contractMonths || '6',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateClient(client.id, {
      name:             form.name.trim(),
      contact:          form.contact,
      country:          form.country,
      category:         form.category,
      color:            form.color,
      hasMonthlyPayment: form.hasMonthlyPayment,
      monthlyRevenue:   form.hasMonthlyPayment ? Number(form.monthlyRevenue) : 0,
      revenueCurrency:  form.revenueCurrency,
      hasCommissions:   form.hasCommissions,
      commissionRate:   form.hasCommissions ? Number(form.commissionRate) : 0,
      contractStart:    form.contractStart,
      contractMonths:   Number(form.contractMonths) || 6,
    });
    addNotification(`actualizó datos de "${form.name}"`, 'Clientes');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: form.color }} />
            <h2 className="text-white font-semibold">Editar cliente</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Nombre de empresa" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Contacto</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} className={inputCls} placeholder="Nombre responsable" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">País</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} placeholder="UK" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Duración (meses)</label>
              <input type="number" value={form.contractMonths} onChange={e => set('contractMonths', e.target.value)} className={inputCls} placeholder="6" min="1" />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Inicio de contrato</label>
            <input type="date" value={form.contractStart} onChange={e => set('contractStart', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Color del cliente</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          <div className="h-px bg-zinc-800" />
          <YesNo label="¿Hace pago mensual?" value={form.hasMonthlyPayment} onChange={v => set('hasMonthlyPayment', v)} />
          {form.hasMonthlyPayment === true && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto mensual</label>
              <div className="flex gap-2">
                <input type="number" value={form.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)}
                  className="flex-1 bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                  placeholder="3500" min="0" />
                <select value={form.revenueCurrency} onChange={e => set('revenueCurrency', e.target.value)}
                  className="bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="h-px bg-zinc-800" />
          <YesNo label="¿Tiene comisiones de venta?" value={form.hasCommissions} onChange={v => set('hasCommissions', v)} />
          {form.hasCommissions === true && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Porcentaje de comisión</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.commissionRate} onChange={e => set('commissionRate', e.target.value)}
                  className="w-24 bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                  placeholder="10" min="0" max="100" step="0.5" />
                <span className="text-zinc-400 text-sm font-medium">%</span>
              </div>
            </div>
          )}
          <button type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: '#faff05' }}>
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  );
}

// ── SPLIT_MEMBERS used in ProjectModal and ProjectsSection ────────────────────
const SPLIT_MEMBERS = [
  { key: 'K',  bg: '#faff05', color: '#000',    label: 'Kann' },
  { key: 'J',  bg: '#60a5fa', color: '#000',    label: 'Jero' },
  { key: 'SG', bg: '#222',    color: '#faff05', label: 'Synced' },
];

// ── Add/Edit Project Modal ─────────────────────────────────────────────────────
function ProjectModal({ project, onClose }) {
  const { addProject, updateProject, addNotification } = useApp();
  const isEdit = !!project;
  const today = new Date().toISOString().split('T')[0];
  const defaultSplit = [{ key: 'K', pct: 30 }, { key: 'J', pct: 30 }, { key: 'SG', pct: 40 }];
  const [form, setForm] = useState({
    clientName:       project?.clientName || '',
    country:          project?.country || '',
    dateStart:        project?.dateStart || today,
    dateEnd:          project?.dateEnd || '',
    originalAmount:   project?.originalAmount ?? '',
    originalCurrency: project?.originalCurrency || 'GBP',
    amountUSD:        project?.amountUSD ?? '',
    paidStatus:       project?.paidStatus || 'unpaid',
    paidAmount:       project?.paidAmount ?? '',
    paymentDate:      project?.paymentDate || '',
    receiptFile:      project?.receiptFile || null,
    note:             project?.note || '',
    splitDetails:     project?.splitDetails || defaultSplit,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleSplitMember = (key) => {
    setForm(p => {
      const exists = p.splitDetails.find(s => s.key === key);
      if (exists) return { ...p, splitDetails: p.splitDetails.filter(s => s.key !== key) };
      return { ...p, splitDetails: [...p.splitDetails, { key, pct: 0 }] };
    });
  };

  const setSplitPct = (key, pct) => {
    setForm(p => ({ ...p, splitDetails: p.splitDetails.map(s => s.key === key ? { ...s, pct: Number(pct) || 0 } : s) }));
  };

  const splitTotal = form.splitDetails.reduce((s, m) => s + (m.pct || 0), 0);

  const handleReceipt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set('receiptFile', { name: file.name, data: ev.target.result, type: file.type });
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = Number(form.originalAmount) || 0;
    const usd = form.originalCurrency === 'USD' ? amt : (Number(form.amountUSD) || 0);
    const data = {
      clientName:       form.clientName.trim(),
      country:          form.country.trim(),
      dateStart:        form.dateStart,
      dateEnd:          form.dateEnd || null,
      originalAmount:   amt,
      originalCurrency: form.originalCurrency,
      amountUSD:        usd,
      paidStatus:       form.paidStatus,
      paidAmount:       form.paidStatus === 'paid' ? usd : (Number(form.paidAmount) || 0),
      paymentDate:      form.paymentDate || null,
      receiptFile:      form.receiptFile,
      note:             form.note,
      splitDetails:     form.splitDetails,
    };
    if (isEdit) {
      updateProject(project.id, data);
      addNotification(`actualizó proyecto de ${data.clientName}`, 'Proyectos');
    } else {
      addProject(data);
      addNotification(`registró proyecto de ${data.clientName}`, 'Proyectos');
    }
    onClose();
  };

  const statusOpts = [
    { value: 'paid',    label: 'Cobrado',  color: '#4ade80' },
    { value: 'partial', label: 'Parcial',  color: '#fbbf24' },
    { value: 'unpaid',  label: 'En deuda', color: '#f87171' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#080808] border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{isEdit ? 'Editar proyecto' : 'Registrar proyecto'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Empresa *</label>
              <input value={form.clientName} onChange={e => set('clientName', e.target.value)} className={inputCls} placeholder="Nombre" required />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">País</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} placeholder="UK" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha inicio</label>
              <input type="date" value={form.dateStart} onChange={e => set('dateStart', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha fin</label>
              <input type="date" value={form.dateEnd} onChange={e => set('dateEnd', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto del proyecto</label>
            <div className="flex gap-2">
              <input type="number" value={form.originalAmount} onChange={e => set('originalAmount', e.target.value)}
                className="flex-1 bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
                placeholder="0" min="0" step="0.01" />
              <select value={form.originalCurrency} onChange={e => set('originalCurrency', e.target.value)}
                className="bg-[#080808] border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#faff05]">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {form.originalCurrency !== 'USD' && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Equivalente en USD</label>
              <input type="number" value={form.amountUSD} onChange={e => set('amountUSD', e.target.value)}
                className={inputCls} placeholder="0" min="0" step="0.01" />
            </div>
          )}

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block">Estado de pago</label>
            <div className="flex gap-2">
              {statusOpts.map(s => (
                <button key={s.value} type="button" onClick={() => set('paidStatus', s.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.paidStatus === s.value ? 'border-transparent' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                  style={form.paidStatus === s.value ? { background: s.color + '22', color: s.color, borderColor: s.color + '44' } : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {form.paidStatus === 'partial' && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Monto ya pagado (USD)</label>
              <input type="number" value={form.paidAmount} onChange={e => set('paidAmount', e.target.value)} className={inputCls} placeholder="0" min="0" step="0.01" />
            </div>
          )}

          {(form.paidStatus === 'paid' || form.paidStatus === 'partial') && (
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Fecha de pago</label>
              <input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Comprobante de pago</label>
            {form.receiptFile ? (
              <div className="flex items-center gap-2 bg-[#080808] border border-zinc-700 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-zinc-300 text-xs flex-1 truncate">{form.receiptFile.name}</span>
                <button type="button" onClick={() => set('receiptFile', null)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 bg-[#080808] border border-dashed border-zinc-700 rounded-xl px-3 py-2.5 cursor-pointer hover:border-zinc-500 transition-colors">
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-zinc-500 text-xs">Subir comprobante (PDF, imagen)</span>
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleReceipt} />
              </label>
            )}
          </div>

          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Nota</label>
            <input value={form.note} onChange={e => set('note', e.target.value)} className={inputCls} placeholder="—" />
          </div>

          {/* Team split */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-zinc-500 text-xs uppercase tracking-wider">Distribución del equipo</label>
              <span className={`text-xs font-semibold ${splitTotal === 100 ? 'text-green-400' : 'text-amber-400'}`}>{splitTotal}%</span>
            </div>
            <div className="space-y-2">
              {SPLIT_MEMBERS.map(m => {
                const active = form.splitDetails.find(s => s.key === m.key);
                return (
                  <div key={m.key} className="flex items-center gap-3">
                    <button type="button" onClick={() => toggleSplitMember(m.key)}
                      className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border transition-all ${active ? 'border-zinc-600' : 'border-zinc-800 opacity-40'}`}
                      style={active ? { background: m.bg + '15' } : {}}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: m.bg, color: m.color }}>{m.key}</div>
                      <span className="text-white text-sm">{m.label}</span>
                    </button>
                    {active && (
                      <div className="flex items-center gap-1.5">
                        <input type="number" min="0" max="100" value={active.pct}
                          onChange={e => setSplitPct(m.key, e.target.value)}
                          className="w-16 bg-[#080808] border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#faff05]" />
                        <span className="text-zinc-500 text-sm">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-black" style={{ background: '#faff05' }}>
            {isEdit ? 'Guardar cambios' : 'Registrar proyecto'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Expanded Commission Section ────────────────────────────────────────────────
function buildMonthRows(client) {
  const base = buildCommissionMonths(client);
  return base.map(r => {
    const rev = (client.monthlyRevenueHistory || []).find(h => h.month === r.month);
    const exp = (client.monthlyExpenseHistory || []).find(h => h.month === r.month);
    return { ...r, actualRevenue: rev?.amount ?? '', expense: exp?.amount ?? '', expenseNote: exp?.note ?? '' };
  });
}

function ClientExpanded({ client }) {
  const { updateClient, addNotification } = useApp();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState(() => buildMonthRows(client));

  const sym = CURR_SYM[client.revenueCurrency] || '$';
  const rate = client.commissionRate || 10;
  const hasPayment = client.hasMonthlyPayment;
  const hasComm = client.hasCommissions;

  const updateRow = (month, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.month !== month) return r;
      const updated = { ...r, [field]: value };
      if (field === 'clientSales' && value !== '' && hasComm)
        updated.commissionAmount = (Number(value) * rate / 100).toFixed(2);
      return updated;
    }));
  };

  const save = () => {
    const commHistory = rows
      .filter(r => r.clientSales !== '' || r.commissionAmount !== '')
      .map(r => ({ month: r.month, clientSales: Number(r.clientSales) || 0, commissionAmount: Number(r.commissionAmount) || 0 }));
    const revHistory = rows
      .filter(r => r.actualRevenue !== '')
      .map(r => ({ month: r.month, amount: Number(r.actualRevenue) || 0 }));
    const expHistory = rows
      .filter(r => r.expense !== '' || r.expenseNote !== '')
      .map(r => ({ month: r.month, amount: Number(r.expense) || 0, note: r.expenseNote || '' }));
    const currentKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const currentComm = commHistory.find(h => h.month === currentKey);
    updateClient(client.id, {
      commissionHistory: commHistory,
      commissions: currentComm?.commissionAmount || 0,
      monthlyRevenueHistory: revHistory,
      monthlyExpenseHistory: expHistory,
    });
    addNotification(`actualizó datos de ${client.name}`, 'Finanzas & Clientes');
    setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  // Columns: Mes | Ingreso real | Gasto | [Ventas cliente] | [Comisión]
  const totalCols = 3 + (hasComm ? 2 : 0);
  const colClass = { 3:'grid-cols-3', 4:'grid-cols-4', 5:'grid-cols-5' }[totalCols] || 'grid-cols-5';

  return (
    <div className="bg-[#0c0c0c] border-t border-zinc-800/60 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-5">
          {hasPayment && <span className="text-xs text-zinc-500">Retainer: <span className="text-green-400 font-semibold">{sym}{(client.monthlyRevenue || 0).toLocaleString()}/{client.revenueCurrency}/mes</span></span>}
          {hasComm && <span className="text-xs text-zinc-500">Comisión: <span className="text-green-400 font-semibold">{rate}% de ventas</span></span>}
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-green-400 text-xs">✓ Guardado</span>}
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setRows(buildMonthRows(client)); }} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
              <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black" style={{ background: '#faff05' }}>Guardar</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-zinc-800 hover:text-white transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Editar
            </button>
          )}
        </div>
      </div>
      {rows.length > 0 && (
        <div className="bg-[#080808] rounded-xl overflow-hidden border border-zinc-800/50">
          <div className={`grid ${colClass} gap-3 text-[10px] text-zinc-500 uppercase tracking-wider px-4 py-2.5 border-b border-zinc-800`}>
            <span>Mes</span>
            <span>Ingreso real</span>
            <span>Gasto</span>
            {hasComm && <span>Ventas cliente</span>}
            {hasComm && <span>Comisión ({rate}%)</span>}
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/40">
            {rows.map(row => {
              const now = new Date();
              const rowDate = new Date(row.month + '-01');
              const isCurrent = row.month === `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
              const isFuture = rowDate > now;
              return (
                <div key={row.month} className={`grid ${colClass} gap-3 px-4 py-2.5 items-center ${isCurrent ? 'bg-[#faff05]/5' : ''}`}>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-[#faff05]' : isFuture ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {isCurrent ? '● ' : ''}{row.label}
                  </span>
                  {/* Ingreso real */}
                  {editing
                    ? <input type="number" min="0" value={row.actualRevenue} onChange={e => updateRow(row.month, 'actualRevenue', e.target.value)} placeholder="0" className="bg-[#222] border border-zinc-700 rounded-lg px-2 py-1 text-green-400 text-xs focus:outline-none focus:border-[#faff05] w-full" />
                    : <span className="text-green-400 text-xs font-medium">{row.actualRevenue !== '' ? `${sym}${Number(row.actualRevenue).toLocaleString()}` : (hasPayment ? `${sym}${(client.monthlyRevenue||0).toLocaleString()}` : '—')}</span>
                  }
                  {/* Gasto + Nota */}
                  {editing
                    ? <div className="space-y-1">
                        <input type="number" min="0" value={row.expense} onChange={e => updateRow(row.month, 'expense', e.target.value)} placeholder="0" className="bg-[#222] border border-zinc-700 rounded-lg px-2 py-1 text-red-400 text-xs focus:outline-none focus:border-[#faff05] w-full" />
                        <input type="text" value={row.expenseNote} onChange={e => updateRow(row.month, 'expenseNote', e.target.value)} placeholder="Nota (ej. software...)" className="bg-[#222] border border-zinc-700 rounded-lg px-2 py-1 text-zinc-400 text-[10px] focus:outline-none focus:border-[#faff05] w-full" />
                      </div>
                    : <div>
                        <span className="text-xs">{row.expense !== '' ? <span className="text-red-400">-{sym}{Number(row.expense).toLocaleString()}</span> : <span className="text-zinc-600">—</span>}</span>
                        {row.expenseNote && <p className="text-zinc-600 text-[10px] truncate mt-0.5" title={row.expenseNote}>{row.expenseNote}</p>}
                      </div>
                  }
                  {hasComm && (editing
                    ? <input type="number" min="0" value={row.clientSales} onChange={e => updateRow(row.month, 'clientSales', e.target.value)} placeholder="0" className="bg-[#222] border border-zinc-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#faff05] w-full" />
                    : <span className="text-zinc-400 text-xs">{row.clientSales !== '' ? `${sym}${Number(row.clientSales).toLocaleString()}` : '—'}</span>
                  )}
                  {hasComm && (editing
                    ? <input type="number" min="0" value={row.commissionAmount} onChange={e => updateRow(row.month, 'commissionAmount', e.target.value)} placeholder="0" className="bg-[#222] border border-zinc-700 rounded-lg px-2 py-1 text-green-400 text-xs focus:outline-none focus:border-[#faff05] w-full" />
                    : <span className={`text-xs font-medium ${Number(row.commissionAmount) > 0 ? 'text-green-400' : 'text-zinc-600'}`}>
                        {Number(row.commissionAmount) > 0 ? `${sym}${Number(row.commissionAmount).toLocaleString()}` : '—'}
                      </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Projects Section ───────────────────────────────────────────────────────────
function ProjectsSection() {
  const { projects, deleteProject } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // A/B suffix for duplicate client names
  const nameCounts = {};
  projects.forEach(p => { nameCounts[p.clientName] = (nameCounts[p.clientName] || 0) + 1; });
  const nameIndex = {};
  const displayNames = new Map();
  projects.forEach(p => {
    if (nameCounts[p.clientName] <= 1) {
      displayNames.set(p.id, p.clientName);
    } else {
      nameIndex[p.clientName] = (nameIndex[p.clientName] || 0) + 1;
      displayNames.set(p.id, `${p.clientName} ${String.fromCharCode(64 + nameIndex[p.clientName])}`);
    }
  });

  const filtered = projects
    .filter(p => {
      const name = displayNames.get(p.id) || p.clientName;
      return name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const da = new Date(a.dateStart || '1900-01-01');
      const db = new Date(b.dateStart || '1900-01-01');
      return sortOrder === 'newest' ? db - da : da - db;
    });

  const statusBadge = (s) => ({
    paid:    { label: 'Cobrado',  bg: 'bg-green-500/15',  text: 'text-green-400' },
    partial: { label: 'Parcial',  bg: 'bg-amber-500/15',  text: 'text-amber-400' },
    unpaid:  { label: 'En deuda', bg: 'bg-red-500/15',    text: 'text-red-400' },
  }[s] || { label: s, bg: 'bg-zinc-800', text: 'text-zinc-400' });

  const fmtAmount = (p) => {
    if (!p.originalAmount) return '—';
    const sym = CURR_SYM[p.originalCurrency] || '$';
    return `${sym}${Number(p.originalAmount).toLocaleString()}`;
  };

  const debtLine = (p) => {
    if (p.paidStatus === 'partial') {
      const debt = (p.amountUSD || p.originalAmount) - (p.paidAmount || 0);
      return debt > 0 ? `Debe: $${Math.round(debt).toLocaleString()}` : null;
    }
    if (p.paidStatus === 'unpaid' && p.originalAmount > 0) {
      const sym = CURR_SYM[p.originalCurrency] || '$';
      return `Deuda: ${sym}${Number(p.originalAmount).toLocaleString()}`;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-[#080808] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-44"
              placeholder="Buscar proyecto..." />
          </div>
          {/* Sort toggle */}
          <button onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-zinc-800 bg-[#080808] text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {sortOrder === 'newest' ? 'Más reciente' : 'Más antiguo'}
          </button>
          <span className="text-zinc-600 text-xs">{projects.length} proyectos registrados</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors bg-[#080808] flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar proyecto
        </button>
      </div>

      <div className="bg-[#080808] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Empresa', 'País', 'Fechas', 'Monto', 'Estado', 'Equipo', 'Nota', ''].map(h => (
                <th key={h} className="text-left text-zinc-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const badge = statusBadge(p.paidStatus);
              const debt = debtLine(p);
              const split = p.splitDetails || [{ key: 'K', pct: 30 }, { key: 'J', pct: 30 }, { key: 'SG', pct: 40 }];
              return (
                <tr key={p.id} className="border-b border-zinc-800/40 hover:bg-white/[0.02] transition-colors group">

                  {/* Empresa */}
                  <td className="px-4 py-3 text-white text-sm font-medium">{displayNames.get(p.id) || p.clientName}</td>

                  {/* País */}
                  <td className="px-4 py-3 text-zinc-400 text-xs">{p.country || '—'}</td>

                  {/* Fechas */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {p.dateStart   && <p className="text-zinc-500 text-[11px]">Inicio: {p.dateStart.slice(0, 7)}</p>}
                      {p.dateEnd     && <p className="text-zinc-500 text-[11px]">Fin: {p.dateEnd.slice(0, 7)}</p>}
                      {p.paymentDate && <p className="text-green-500 text-[11px]">Pago: {p.paymentDate}</p>}
                      {!p.dateStart && !p.dateEnd && !p.paymentDate && <span className="text-zinc-700 text-xs">—</span>}
                    </div>
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{fmtAmount(p)}</p>
                    {debt && <p className="text-red-400 text-xs">{debt}</p>}
                  </td>

                  {/* Estado + comprobante */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                    {p.receiptFile && (
                      <p className="flex items-center gap-1 text-zinc-500 text-[10px] mt-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        comprobante
                      </p>
                    )}
                  </td>

                  {/* Equipo split */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {split.map(s => {
                        const m = SPLIT_MEMBERS.find(x => x.key === s.key);
                        if (!m) return null;
                        return (
                          <div key={m.key} className="flex items-center gap-1" title={`${m.label}: ${s.pct}%`}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                              style={{ background: m.bg, color: m.color }}>{m.key}</div>
                            <span className="text-zinc-500 text-[10px]">{s.pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  {/* Nota */}
                  <td className="px-4 py-3 text-zinc-600 text-xs max-w-[160px] truncate" title={p.note}>{p.note || '—'}</td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditProject(p)} className="text-zinc-600 hover:text-white transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => deleteProject(p.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-zinc-600 text-sm">Sin proyectos registrados</div>}
      </div>

      {showAdd && <ProjectModal onClose={() => setShowAdd(false)} />}
      {editProject && <ProjectModal project={editProject} onClose={() => setEditProject(null)} />}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientesPortal() {
  const { clients, projects, deleteClient, updateClient, getClientExpenses, getClientRevenue } = useApp();
  const [expandedId, setExpandedId] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [editClient, setEditClient] = useState(null);

  const now = new Date();
  const isExpired = (c) => {
    if (!c.contractStart || !c.contractMonths) return false;
    const end = new Date(c.contractStart);
    end.setMonth(end.getMonth() + Number(c.contractMonths));
    return end < now;
  };

  const activeClients = clients.filter(c => c.active && !c.isInternal);
  const pastRetainers = clients.filter(c => !c.active && !c.isInternal);
  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  const archiveClient = (client) => {
    updateClient(client.id, { active: false, color: '#60a5fa' });
  };

  const restoreClient = (client) => {
    updateClient(client.id, { active: true });
  };

  // Project KPIs
  const paidProjects = projects.filter(p => p.paidStatus === 'paid');
  const debtProjects = projects.filter(p => p.paidStatus !== 'paid');
  const totalPaid = paidProjects.reduce((s, p) => s + p.paidAmount, 0);
  const totalDebt = debtProjects.reduce((s, p) => s + (p.amountUSD - p.paidAmount), 0);

  const filtered = clients.filter(c => {
    if (c.isInternal || !c.active) return false;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || c.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#080808] border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Clientes Totales</p>
            <span className="text-lg">👥</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeClients.length + pastRetainers.length + projects.length}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{activeClients.length} activos · {pastRetainers.length} pasados · {projects.length} proyectos</p>
        </div>

        <div className="bg-[#080808] border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Clientes Activos</p>
            <span className="text-lg">🟢</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>{activeClients.length}</p>
          <p className="text-zinc-600 text-xs mt-0.5">Con contrato vigente</p>
        </div>

        <div className="bg-[#080808] border border-green-500/10 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Proyectos Cobrados</p>
            <span className="text-lg">✅</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-bold text-green-400">
              {paidProjects.length}<span className="text-zinc-600 text-base font-medium">/{projects.length}</span>
            </p>
            <p className="text-xl font-bold text-green-400">${Math.round(totalPaid).toLocaleString()}</p>
          </div>
          <p className="text-zinc-600 text-xs mt-0.5">{paidProjects.length} clientes pagos</p>
        </div>

        <div className="bg-[#080808] border border-red-500/10 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Con Deuda</p>
            <span className="text-lg">🔴</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-bold text-red-400">{debtProjects.length}</p>
            <p className="text-xl font-bold text-red-400">-${Math.round(totalDebt).toLocaleString()}</p>
          </div>
          <p className="text-zinc-600 text-xs mt-0.5">{debtProjects.length} clientes en deuda</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="bg-[#080808] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#faff05] w-48"
              placeholder="Buscar cliente..." />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['All', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterCat === cat ? 'text-black' : 'text-zinc-500 bg-[#080808] hover:text-white'}`}
                style={filterCat === cat ? { background: '#faff05' } : {}}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowAddClient(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-black flex-shrink-0"
          style={{ background: '#faff05' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Clients Table (retainer/commission) */}
      <div className="bg-[#080808] border border-zinc-800/50 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Cliente', 'País', 'Categoría', 'Pago Mensual', 'Comisiones', 'Gastos', 'Margen', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-zinc-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => {
              const sym = CURR_SYM[client.revenueCurrency] || '$';
              const expenses = getClientExpenses(client.id);
              const revenue = getClientRevenue(client.id);
              const commissions = client.commissions || 0;
              const margin = revenue + commissions - expenses;
              const isExpanded = expandedId === client.id;
              return (
                <React.Fragment key={client.id}>
                  <tr onClick={() => toggle(client.id)}
                    className="border-b border-zinc-800/50 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: client.color }} />
                        <div>
                          <p className="text-white text-sm font-medium group-hover:text-[#faff05] transition-colors flex items-center gap-1.5">
                            {client.name}
                            {client.isInternal && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#faff05]/15 text-[#faff05]">Interno</span>}
                          </p>
                          <p className="text-zinc-600 text-xs">{client.contact || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{client.country || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: client.color + '22', color: client.color }}>{client.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      {client.hasMonthlyPayment ? (
                        <div>
                          <p className="text-green-400 text-sm font-semibold">{sym}{(client.monthlyRevenue || 0).toLocaleString()}</p>
                          <p className="text-zinc-600 text-[10px]">{client.revenueCurrency}/mes</p>
                        </div>
                      ) : client.hasMonthlyPayment === false ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </div>
                          <span className="text-red-400 text-xs">No</span>
                        </div>
                      ) : <span className="text-zinc-600 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {client.hasCommissions ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
                            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-green-400 text-sm font-semibold">{client.commissionRate}%</span>
                        </div>
                      ) : client.hasCommissions === false ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center">
                            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </div>
                          <span className="text-red-400 text-xs">No</span>
                        </div>
                      ) : <span className="text-zinc-600 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 text-red-400 text-sm">{expenses > 0 ? `-$${expenses.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>${margin.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${client.active ? 'bg-green-500/15 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {client.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit button */}
                        <button onClick={e => { e.stopPropagation(); setEditClient(client); }}
                          title="Editar cliente"
                          className="text-zinc-700 hover:text-[#faff05] transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        {/* Archive button */}
                        <button onClick={e => { e.stopPropagation(); archiveClient(client); }}
                          title="Mover a pasados"
                          className="text-zinc-700 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" /></svg>
                        </button>
                        {/* Delete with confirmation */}
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: client.id, name: client.name }); }}
                          className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <svg className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <ClientExpanded client={clients.find(c => c.id === client.id) || client} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-zinc-600">No se encontraron clientes</div>}
      </div>

      {/* Past Retainers Section */}
      {pastRetainers.length > 0 && (
        <>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium px-2">Retainers Pasados</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="bg-[#080808] border border-zinc-800/50 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Cliente','País','Categoría','Retainer','Comisiones','Período',''].map(h => (
                    <th key={h} className="text-left text-zinc-500 text-xs uppercase tracking-wider px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastRetainers.map(client => {
                  const sym = CURR_SYM[client.revenueCurrency] || '$';
                  const isEx = expandedId === client.id;
                  const endDate = client.contractStart ? (() => { const d = new Date(client.contractStart); d.setMonth(d.getMonth() + (client.contractMonths || 6)); return d.toISOString().slice(0,7); })() : '—';
                  return (
                    <React.Fragment key={client.id}>
                      <tr onClick={() => toggle(client.id)} className="border-b border-zinc-800/50 hover:bg-white/[0.02] cursor-pointer transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                            <p className="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">{client.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-sm">{client.country || '—'}</td>
                        <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">{client.category}</span></td>
                        <td className="px-4 py-3">
                          {client.hasMonthlyPayment ? <span className="text-blue-400 text-sm font-semibold">{sym}{(client.monthlyRevenue||0).toLocaleString()}/{client.revenueCurrency}</span> : <span className="text-zinc-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {client.hasCommissions ? <span className="text-blue-400 text-sm font-semibold">{client.commissionRate}%</span> : <span className="text-zinc-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{client.contractStart?.slice(0,7)} → {endDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Edit button */}
                            <button onClick={e => { e.stopPropagation(); setEditClient(client); }}
                              title="Editar cliente"
                              className="text-zinc-700 hover:text-[#faff05] opacity-0 group-hover:opacity-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            {/* Restore to active */}
                            <button onClick={e => { e.stopPropagation(); restoreClient(client); }}
                              title="Volver a activo"
                              className="text-zinc-700 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: client.id, name: client.name }); }} className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <svg className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${isEx ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                      {isEx && (
                        <tr><td colSpan={7} className="p-0">
                          <ClientExpanded client={clients.find(c => c.id === client.id) || client} />
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Projects Section */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-zinc-500 text-xs uppercase tracking-wider font-medium px-2">Proyectos Pasados</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <ProjectsSection />

      {showAddClient && <AddClientModal onClose={() => setShowAddClient(false)} />}
      {editClient && <EditClientModal client={editClient} onClose={() => setEditClient(null)} />}
      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar a "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => { deleteClient(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
