import React, { useState, useRef } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';

const CURR_SYM = { USD: '$', EUR: '€', GBP: '£' };
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PRIORITY_STYLE = {
  Alta:  { bg: 'bg-red-500/15',   text: 'text-red-400' },
  Media: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  Baja:  { bg: 'bg-zinc-800',     text: 'text-zinc-400' },
};
const STATUS_LABEL = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const STATUS_COLOR  = { todo: '#71717a', inprogress: '#faff05', done: '#34d399' };
const COLUMNS = ['todo', 'inprogress', 'done'];

// ── Brand icons ────────────────────────────────────────────────────────────────
function getBrandIcon(name) {
  const n = (name || '').toLowerCase();
  const W = (children) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      {children}
    </svg>
  );
  if (n.includes('monaco')) return W(<>
    <path d="M5 4h14M5 4l7 9 7-9M12 13v5M9 18h6" />
    <circle cx="11" cy="7" r="1" fill="currentColor" stroke="none" />
    <line x1="11" y1="6" x2="11" y2="4" />
  </>);
  if (n.includes('chotto')) return W(<>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </>);
  if (n.includes('tecoda') || n.includes('wicker')) return W(<>
    <rect x="8" y="5" width="8" height="14" rx="2" />
    <ellipse cx="12" cy="5" rx="4" ry="1.5" />
    <line x1="10" y1="8" x2="14" y2="8" />
  </>);
  if (n.includes('von dutch') || n.includes('vondutch')) return W(<>
    <path d="M7 13C7 9 9 6 12 6C15 6 17 9 17 13" />
    <line x1="4" y1="13" x2="20" y2="13" />
    <path d="M4 13Q4 16 7 16H17Q20 16 20 13" />
  </>);
  if (n.includes('perfect')) return W(<>
    <path d="M7 10h10l-1.5 8H8.5L7 10z" />
    <line x1="6" y1="10" x2="18" y2="10" />
    <path d="M17 12h1.5a1.5 1.5 0 000-3H17" />
    <path d="M10 8q-1-1.5 0-3M14 8q-1-1.5 0-3" />
  </>);
  if (n.includes('raise')) return W(<>
    <circle cx="12" cy="12" r="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </>);
  if (n.includes('aquela') || n.includes('kombucha')) return W(<>
    <rect x="8" y="5" width="8" height="14" rx="2" />
    <ellipse cx="12" cy="5" rx="4" ry="1.5" />
    <line x1="10" y1="8" x2="14" y2="8" />
  </>);
  if (n.includes('pawz')) return W(<>
    <ellipse cx="12" cy="15" rx="4" ry="3.5" />
    <circle cx="7.5" cy="10.5" r="1.5" />
    <circle cx="10.5" cy="9" r="1.5" />
    <circle cx="13.5" cy="9" r="1.5" />
    <circle cx="16.5" cy="10.5" r="1.5" />
  </>);
  if (n === 'adam' || n.startsWith('adam ')) return W(<>
    <circle cx="12" cy="7" r="3.5" />
    <path d="M5 20v-1a7 7 0 0114 0v1" />
  </>);
  if (n.includes('foreshank')) return W(<>
    <circle cx="12" cy="12" r="8" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
  </>);
  if (n.includes('360') || n.includes('optimum')) return W(<>
    <rect x="4" y="9" width="16" height="6" rx="3" />
    <line x1="12" y1="9" x2="12" y2="15" />
  </>);
  if (n.includes('hollywood') || n.includes('browzer')) return W(<>
    <path d="M2 12C5 7 19 7 22 12C19 17 5 17 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <line x1="8" y1="9" x2="7" y2="7" />
    <line x1="11" y1="8" x2="11" y2="5" />
    <line x1="14" y1="8" x2="14" y2="5" />
    <line x1="17" y1="9" x2="18" y2="7" />
  </>);
  if (n.includes('glad')) return W(<>
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="9" y1="7" x2="9" y2="17" />
    <line x1="15" y1="7" x2="15" y2="17" />
  </>);
  if (n.includes('coda')) return W(<>
    <path d="M7 10h10l-1.5 8H8.5L7 10z" />
    <line x1="6" y1="10" x2="18" y2="10" />
    <path d="M17 12h1.5a1.5 1.5 0 000-3H17" />
    <path d="M10 8q-1-1 0-2.5M14 8q-1-1 0-2.5" />
  </>);
  if (n.includes('reese')) return W(<>
    <path d="M5 14C5 10 8 7 12 7C16 7 19 10 19 14" />
    <path d="M5 14h14v2l-1 4H6l-1-4V14Z" />
    <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8.5" r="0.8" fill="currentColor" stroke="none" />
  </>);
  if (n.includes('hershey')) return W(<>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="6" x2="12" y2="18" />
    <circle cx="7.5" cy="9" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="9" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="15" r="1.5" fill="currentColor" stroke="none" />
  </>);
  if (n.includes('simply') || n.includes('honest')) return W(<>
    <path d="M7 10h10l-1.5 8H8.5L7 10z" />
    <line x1="6" y1="10" x2="18" y2="10" />
    <path d="M17 12h1.5a1.5 1.5 0 000-3H17" />
    <line x1="12" y1="10" x2="12" y2="7" />
    <rect x="10" y="5" width="4" height="3" rx="0.5" />
  </>);
  return null;
}

// ── Client icon card ───────────────────────────────────────────────────────────
function ClientCard({ client, onClick }) {
  const icon = getBrandIcon(client.name);
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <button onClick={onClick}
      className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden hover:border-zinc-600 hover:scale-[1.02] transition-all text-left group">
      <div className="h-20 flex items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${client.color}cc, ${client.color}55)` }}>
        {icon ? (
          <div className="w-10 h-10 text-black/70">{icon}</div>
        ) : (
          <span className="text-3xl font-black text-black/70 select-none">{initials}</span>
        )}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/30 text-white/80">
            {client.active ? 'Activo' : 'Pasado'}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-white text-sm font-semibold truncate group-hover:text-[#faff05] transition-colors">{client.name}</p>
        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: client.color + '22', color: client.color }}>{client.category}</span>
      </div>
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, count, color, icon }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {icon && <span style={{ color }}>{icon}</span>}
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      {count != null && <span className="text-zinc-600 text-xs">{count}</span>}
      <div className="flex-1 h-px bg-zinc-800/60" />
    </div>
  );
}

// ── Mini chart tooltip ─────────────────────────────────────────────────────────
function MiniTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#080808] border border-[#111] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-500 mb-0.5">{label}</p>
      <p className="text-green-400 font-semibold">${payload[0]?.value?.toLocaleString()}</p>
    </div>
  );
}

// ── Task card (kanban style) ───────────────────────────────────────────────────
function ClientTaskCard({ task, clientColor, onMove, onDelete }) {
  const pr = PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.Media;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const daysLeft = task.deadline
    ? Math.ceil((new Date(task.deadline) - new Date()) / 86400000)
    : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-[#080808] border border-[#111] rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-[#1a1a1a] transition-all group"
      style={{ borderLeft: `3px solid ${clientColor}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.bg} ${pr.text}`}>{task.priority}</span>
        <button onClick={() => onDelete(task.id)}
          className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-white text-xs font-medium mb-1 leading-snug">{task.title}</p>
      {task.description && <p className="text-zinc-500 text-[10px] mb-2 leading-relaxed line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {(task.assignees || []).map(a => (
            <div key={a} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-[#111]"
              style={{ background: a === 'kann' ? '#faff05' : '#60a5fa', color: '#000' }}>
              {a === 'kann' ? 'K' : 'J'}
            </div>
          ))}
        </div>
        {task.deadline && (
          <span className={`text-[10px] flex items-center gap-0.5 ${daysLeft !== null && daysLeft < 3 ? 'text-red-400' : daysLeft !== null && daysLeft < 7 ? 'text-amber-400' : 'text-zinc-600'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            {daysLeft !== null ? (daysLeft < 0 ? 'Vencida' : daysLeft === 0 ? 'Hoy' : `${daysLeft}d`) : task.deadline}
          </span>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-[#111] flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLUMNS.filter(c => c !== task.status).map(col => (
          <button key={col} onClick={() => onMove(task.id, col)}
            className="text-zinc-500 hover:text-white text-[10px] px-2 py-1 rounded-lg bg-[#222] hover:bg-[#2a2a2a] transition-all">
            → {STATUS_LABEL[col]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Contract file upload ───────────────────────────────────────────────────────
function ContractUpload({ client }) {
  const { updateClient } = useApp();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      alert('Archivo demasiado grande. Máximo 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateClient(client.id, {
        contractFile: { name: f.name, dataUrl: reader.result, size: f.size, type: f.type, uploadedAt: new Date().toISOString() },
      });
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (client.contractFile?.dataUrl) {
    return (
      <div className="mt-3 pt-3 border-t border-[#111]">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">Contrato adjunto</p>
        <div className="flex items-center gap-2 bg-[#080808] rounded-xl px-3 py-2.5">
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: client.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-300 text-xs truncate">{client.contractFile.name}</p>
            {client.contractFile.size && <p className="text-zinc-600 text-[10px]">{formatSize(client.contractFile.size)}</p>}
          </div>
          <a href={client.contractFile.dataUrl} target="_blank" rel="noreferrer" download={client.contractFile.name}
            className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors flex-shrink-0">
            Ver
          </a>
          <button onClick={() => fileRef.current?.click()}
            className="text-zinc-600 hover:text-zinc-400 transition-colors text-[10px] flex-shrink-0">
            Reemplazar
          </button>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg"
          onChange={handleFile} />
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#111]">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg"
        onChange={handleFile} />
      <button onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-[#1a1a1a] text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all text-xs">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Subir contrato
      </button>
    </div>
  );
}

// ── Client detail view ─────────────────────────────────────────────────────────
function ClientDetail({ client, onBack, onNavigate }) {
  const { tasks, finances, projects, fmtAmount, moveTask, deleteTask, setDocFocusClientId } = useApp();
  const [dragOver, setDragOver] = useState(null);

  const sym = CURR_SYM[client.revenueCurrency] || '$';
  const clientTasks    = tasks.filter(t => t.clientId === client.id);
  const clientFinances = finances.filter(f => f.clientId === client.id);
  const clientProjects = projects.filter(p => p.clientName === client.name);

  const totalIncome   = clientFinances.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
  const totalExpenses = clientFinances.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
  const totalComm     = (client.commissionHistory || []).reduce((s, h) => s + (h.commissionAmount || 0), 0);
  const margin        = totalIncome + totalComm - totalExpenses;

  const tasksByStatus = {
    todo:       clientTasks.filter(t => t.status === 'todo'),
    inprogress: clientTasks.filter(t => t.status === 'inprogress'),
    done:       clientTasks.filter(t => t.status === 'done'),
  };

  const chartData = [...(client.monthlyRevenueHistory || [])]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map(h => {
      const [yr, mo] = h.month.split('-');
      return { label: `${MONTH_LABELS[parseInt(mo) - 1]} ${yr.slice(2)}`, income: h.amount || 0 };
    });

  const buildHistory = () => {
    if (!client.contractStart) return [];
    const start = new Date(client.contractStart);
    const count = (client.contractMonths || 6) + 2;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      const rev  = (client.monthlyRevenueHistory || []).find(h => h.month === key);
      const exp  = (client.monthlyExpenseHistory || []).find(h => h.month === key);
      const comm = (client.commissionHistory || []).find(h => h.month === key);
      return { key, label, revenue: rev?.amount, expense: exp?.amount, expenseNote: exp?.note, clientSales: comm?.clientSales, commissionAmount: comm?.commissionAmount };
    });
  };
  const history = buildHistory();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const docs = client.documents || [];
  const totalDocs = docs.length + (client.contractFile ? 1 : 0) + (client.proposalFile ? 1 : 0);

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) moveTask(taskId, colId);
    setDragOver(null);
  };

  const openDocumentos = () => {
    setDocFocusClientId(client.id);
    onNavigate('documentos');
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a clientes
      </button>

      {/* Header card */}
      <div className="rounded-2xl overflow-hidden border border-[#111]">
        <div className="h-3 w-full" style={{ background: `linear-gradient(90deg, ${client.color}, ${client.color}44)` }} />
        <div className="bg-[#080808] px-6 py-5 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: client.color }}>
            {getBrandIcon(client.name)
              ? <div className="w-8 h-8 text-black">{getBrandIcon(client.name)}</div>
              : <span className="text-xl font-black text-black">{client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white text-xl font-bold">{client.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: client.color + '22', color: client.color }}>{client.category}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${client.active ? 'bg-green-500/15 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {client.active ? 'Activo' : 'Pasado'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {client.contact && <span className="text-zinc-500 text-xs">{client.contact}</span>}
              {client.country && <span className="text-zinc-500 text-xs">📍 {client.country}</span>}
              {client.contractStart && (
                <span className="text-zinc-600 text-xs">Contrato: {client.contractStart?.slice(0, 7)} · {client.contractMonths} meses</span>
              )}
            </div>
          </div>
          {client.hasMonthlyPayment && (
            <div className="text-right flex-shrink-0">
              <p className="text-green-400 text-xl font-bold">{sym}{(client.monthlyRevenue || 0).toLocaleString()}</p>
              <p className="text-zinc-600 text-xs">{client.revenueCurrency}/mes</p>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales',  value: totalIncome,   color: '#4ade80', icon: '↑' },
          { label: 'Comisiones',        value: totalComm,     color: '#faff05', icon: '%' },
          { label: 'Gastos',            value: totalExpenses, color: '#f87171', icon: '↓', neg: true },
          { label: 'Margen neto',       value: margin,        color: margin >= 0 ? '#4ade80' : '#f87171', icon: '=' },
        ].map(k => (
          <div key={k.label} className="bg-[#080808] border border-[#111] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-xs uppercase tracking-wider">{k.label}</p>
              <span className="font-bold text-sm" style={{ color: k.color }}>{k.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: k.color }}>
              {k.neg && totalExpenses > 0 ? '-' : ''}{fmtAmount(Math.abs(k.value))}
            </p>
          </div>
        ))}
      </div>

      {/* Mini chart + Contract info */}
      <div className="grid grid-cols-5 gap-4">
        {/* Income chart */}
        <div className="col-span-3 bg-[#080808] border border-[#111] rounded-2xl p-5">
          <SectionHeader title="Ingresos mensuales" color={client.color}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
          {chartData.length === 0
            ? <div className="flex items-center justify-center h-28 text-zinc-700 text-sm">Sin historial de ingresos</div>
            : (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-${client.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={client.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={client.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<MiniTooltip />} />
                  <Area type="monotone" dataKey="income" stroke={client.color} strokeWidth={2}
                    fill={`url(#grad-${client.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Contract details + upload */}
        <div className="col-span-2 bg-[#080808] border border-[#111] rounded-2xl p-5 flex flex-col">
          <SectionHeader title="Contrato" color={client.color}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
          <div className="space-y-2 text-xs flex-1">
            <div className="flex justify-between"><span className="text-zinc-500">Inicio</span><span className="text-zinc-300">{client.contractStart || '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Duración</span><span className="text-zinc-300">{client.contractMonths ? `${client.contractMonths} meses` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Pago mensual</span>
              <span className={client.hasMonthlyPayment ? 'text-green-400' : 'text-red-400'}>
                {client.hasMonthlyPayment ? `Sí · ${sym}${(client.monthlyRevenue||0).toLocaleString()}` : 'No'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">Comisiones</span>
              <span className={client.hasCommissions ? 'text-green-400' : 'text-zinc-600'}>
                {client.hasCommissions ? `${client.commissionRate}% de ventas` : 'No'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-zinc-500">Proyectos</span><span className="text-zinc-300">{clientProjects.length}</span></div>
          </div>
          {/* Contract file upload */}
          <ContractUpload client={client} />
        </div>
      </div>

      {/* ── Documentos folder button ── */}
      <div>
        <SectionHeader title="Documentos" count={`${totalDocs} archivos`} color={client.color}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} />
        <button onClick={openDocumentos}
          className="w-full bg-[#080808] border border-[#111] rounded-2xl p-5 flex items-center justify-between hover:border-zinc-600 transition-all group text-left">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: client.color + '18', border: `1.5px solid ${client.color}40` }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke={client.color}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm group-hover:text-[#faff05] transition-colors">{client.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {totalDocs === 0 ? 'Sin archivos todavía · click para subir' : `${totalDocs} archivo${totalDocs !== 1 ? 's' : ''} guardado${totalDocs !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span className="text-xs">Abrir carpeta</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* ── Tareas (Kanban) ── */}
      <div>
        <SectionHeader title="Tareas" count={`${clientTasks.length} tareas`} color={client.color}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(colId => {
            const colTasks = tasksByStatus[colId];
            const isOver = dragOver === colId;
            return (
              <div key={colId}
                onDragOver={e => { e.preventDefault(); setDragOver(colId); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, colId)}
                className={`rounded-2xl p-3 min-h-48 transition-all ${isOver ? 'bg-white/[0.03] ring-1 ring-[#faff05]/30' : 'bg-[#141414]'}`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[colId] }} />
                  <span className="text-xs font-medium" style={{ color: STATUS_COLOR[colId] }}>{STATUS_LABEL[colId]}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 ml-auto">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0
                    ? <div className="text-center py-6 text-zinc-700 text-xs border-2 border-dashed border-[#111] rounded-xl">Sin tareas</div>
                    : colTasks.map(t => (
                        <ClientTaskCard key={t.id} task={t} clientColor={client.color}
                          onMove={moveTask} onDelete={deleteTask} />
                      ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Proyectos ── */}
      {clientProjects.length > 0 && (
        <div>
          <SectionHeader title="Proyectos" count={`${clientProjects.length} proyectos`} color={client.color}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
          <div className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden">
            {clientProjects.map(p => {
              const badge = {
                paid:    { label: 'Cobrado', cls: 'bg-green-500/15 text-green-400' },
                partial: { label: 'Parcial',  cls: 'bg-amber-500/15 text-amber-400' },
                unpaid:  { label: 'En deuda', cls: 'bg-red-500/15 text-red-400' },
              }[p.paidStatus] || {};
              return (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-[#111] last:border-0">
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: client.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{p.clientName}</p>
                    <p className="text-zinc-600 text-xs">{p.dateStart?.slice(0,7)} → {p.dateEnd?.slice(0,7)}{p.note ? ` · ${p.note}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{CURR_SYM[p.originalCurrency] || '$'}{Number(p.originalAmount).toLocaleString()}</p>
                    {p.paymentDate && <p className="text-zinc-600 text-[10px]">Pago: {p.paymentDate}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Movimientos ── */}
      {clientFinances.length > 0 && (
        <div>
          <SectionHeader title="Movimientos" count={`${clientFinances.length} registros`} color={client.color}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
          <div className="bg-[#080808] border border-[#111] rounded-2xl p-4 space-y-1.5 max-h-72 overflow-y-auto">
            {[...clientFinances].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id} className="flex items-center gap-3 bg-[#080808] rounded-xl px-3 py-2.5">
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${entry.type === 'income' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{entry.description}</p>
                  <p className="text-zinc-600 text-[10px]">{entry.category} · {entry.date}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${entry.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Historial mensual ── */}
      {history.length > 0 && (
        <div>
          <SectionHeader title="Historial mensual" color={client.color}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <div className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden">
            <div className={`grid gap-2 text-[10px] text-zinc-500 uppercase tracking-wider px-5 py-3 border-b border-[#111] ${client.hasCommissions ? 'grid-cols-5' : 'grid-cols-3'}`}>
              <span>Mes</span><span>Ingreso real</span><span>Gasto</span>
              {client.hasCommissions && <><span>Ventas cliente</span><span>Comisión</span></>}
            </div>
            <div className="divide-y divide-zinc-800/40 max-h-72 overflow-y-auto">
              {history.map(row => {
                const isCurrent = row.key === currentKey;
                const isFuture = row.key > currentKey;
                return (
                  <div key={row.key} className={`grid gap-2 px-5 py-3 items-start ${client.hasCommissions ? 'grid-cols-5' : 'grid-cols-3'} ${isCurrent ? 'bg-[#faff05]/5' : ''}`}>
                    <span className={`text-xs font-medium ${isCurrent ? 'text-[#faff05]' : isFuture ? 'text-zinc-600' : 'text-zinc-300'}`}>
                      {isCurrent ? '● ' : ''}{row.label}
                    </span>
                    <span className="text-green-400 text-xs">
                      {row.revenue != null ? `${sym}${Number(row.revenue).toLocaleString()}` : (client.hasMonthlyPayment ? <span className="text-zinc-600">{sym}{(client.monthlyRevenue||0).toLocaleString()} (est.)</span> : '—')}
                    </span>
                    <div>
                      <span className="text-xs">{row.expense != null ? <span className="text-red-400">-{sym}{Number(row.expense).toLocaleString()}</span> : <span className="text-zinc-700">—</span>}</span>
                      {row.expenseNote && <p className="text-zinc-600 text-[10px] truncate">{row.expenseNote}</p>}
                    </div>
                    {client.hasCommissions && (
                      <>
                        <span className="text-zinc-400 text-xs">{row.clientSales != null ? `${sym}${Number(row.clientSales).toLocaleString()}` : '—'}</span>
                        <span className={`text-xs font-medium ${row.commissionAmount > 0 ? 'text-green-400' : 'text-zinc-700'}`}>
                          {row.commissionAmount > 0 ? `${sym}${Number(row.commissionAmount).toLocaleString()}` : '—'}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main grid ──────────────────────────────────────────────────────────────────
export default function ClientesDashboard({ onNavigate }) {
  const { clients, projects } = useApp();
  const [selected, setSelected] = useState(null);

  if (selected) {
    const live = clients.find(c => c.id === selected.id) || selected;
    return <ClientDetail client={live} onBack={() => setSelected(null)} onNavigate={onNavigate} />;
  }

  const activeClients = clients.filter(c => c.active && !c.isInternal);
  const pastClients   = clients.filter(c => !c.active && !c.isInternal);
  const projectClientNames = [...new Set(projects.map(p => p.clientName))].filter(name => !clients.some(c => c.name === name));

  return (
    <div className="space-y-8">
      {/* ── Active ── */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-white font-semibold">Clientes Activos</h2>
          <span className="text-zinc-600 text-sm">{activeClients.length} clientes</span>
          <div className="flex-1 h-px bg-zinc-800" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        {activeClients.length === 0
          ? <p className="text-zinc-600 text-sm">Sin clientes activos</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {activeClients.map(c => <ClientCard key={c.id} client={c} onClick={() => setSelected(c)} />)}
            </div>
          )}
      </div>

      {/* ── Past retainers ── */}
      {pastClients.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-zinc-400 font-semibold">Retainers Pasados</h2>
            <span className="text-zinc-600 text-sm">{pastClients.length} clientes</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-blue-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pastClients.map(c => <ClientCard key={c.id} client={c} onClick={() => setSelected(c)} />)}
          </div>
        </div>
      )}

      {/* ── Project-only ── */}
      {projectClientNames.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-zinc-400 font-semibold">Solo Proyectos</h2>
            <span className="text-zinc-600 text-sm">{projectClientNames.length} marcas</span>
            <div className="flex-1 h-px bg-zinc-800" />
            <div className="w-2 h-2 rounded-full bg-purple-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {projectClientNames.map(name => {
              const clientProjects = projects.filter(p => p.clientName === name);
              const paid = clientProjects.filter(p => p.paidStatus === 'paid').length;
              return (
                <div key={name} className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden">
                  <div className="h-20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a78bfacc, #a78bfa33)' }}>
                    {getBrandIcon(name)
                      ? <div className="w-10 h-10 text-black/70">{getBrandIcon(name)}</div>
                      : <span className="text-3xl font-black text-black/70">{name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-white text-sm font-semibold truncate">{name}</p>
                    <p className="text-zinc-500 text-xs">{clientProjects.length} proyectos · {paid} pagos</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
