import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const FIXED_PERSONS = [
  { id: 'jero', label: 'Jero', bg: '#60a5fa', text: '#000', initials: 'J' },
  { id: 'kann', label: 'Kann', bg: '#faff05', text: '#000', initials: 'K' },
  { id: 'facu', label: 'Facu', bg: '#a78bfa', text: '#000', initials: 'F' },
];

const PRESET_COLORS = [
  '#f87171','#fb923c','#fbbf24','#34d399','#2dd4bf',
  '#38bdf8','#818cf8','#e879f9','#f472b6','#a3e635',
];

const CATEGORIES = ['Design', 'Marketing', 'Dev', 'Comunicación', 'Finanzas', 'Hosting', 'Otro'];

const CAT_STYLE = {
  Design:       { bg: '#7c3aed18', color: '#a78bfa' },
  Marketing:    { bg: '#ea580c18', color: '#fb923c' },
  Dev:          { bg: '#0284c718', color: '#38bdf8' },
  Comunicación: { bg: '#16a34a18', color: '#4ade80' },
  Finanzas:     { bg: '#b4500618', color: '#fbbf24' },
  Hosting:      { bg: '#0f766e18', color: '#2dd4bf' },
  Otro:         { bg: '#52525b18', color: '#a1a1aa' },
};

const CURR_SYM = { USD: '$', EUR: '€', GBP: '£' };

const EMPTY_ACCOUNT = {
  software: '', url: '', loginEmail: '', loginUser: '',
  person: 'jero', category: 'Design', payer: 'jero',
  price: '', currency: 'USD', billingCycle: 'monthly', renewalDate: '', notes: '',
};

// ── Account modal ──────────────────────────────────────────────────────────────
function AccountModal({ account, defaultPerson, allPersons, onClose, onSave }) {
  const [form, setForm] = useState(
    account ? { ...account } : { ...EMPTY_ACCOUNT, person: defaultPerson || 'jero', payer: defaultPerson || 'jero' }
  );
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = "w-full bg-black border border-[#111] rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]";
  const lbl = "text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#111]">
          <h2 className="text-white font-semibold">{account ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.software.trim()) return; onSave(form); onClose(); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Software / Servicio *</label>
              <input value={form.software} onChange={e => f('software', e.target.value)} className={inp} placeholder="Ej. Adobe CC" required /></div>
            <div><label className={lbl}>URL</label>
              <input value={form.url} onChange={e => f('url', e.target.value)} className={inp} placeholder="https://..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Pertenece a</label>
              <select value={form.person} onChange={e => f('person', e.target.value)} className={inp}>
                {allPersons.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select></div>
            <div><label className={lbl}>Categoría</label>
              <select value={form.category} onChange={e => f('category', e.target.value)} className={inp}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Email de acceso</label>
              <input value={form.loginEmail} onChange={e => f('loginEmail', e.target.value)} className={inp} placeholder="email@ejemplo.com" /></div>
            <div><label className={lbl}>Usuario (si es distinto)</label>
              <input value={form.loginUser} onChange={e => f('loginUser', e.target.value)} className={inp} placeholder="@usuario" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>¿Quién paga?</label>
              <select value={form.payer} onChange={e => f('payer', e.target.value)} className={inp}>
                {allPersons.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select></div>
            <div><label className={lbl}>Facturación</label>
              <select value={form.billingCycle} onChange={e => f('billingCycle', e.target.value)} className={inp}>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
                <option value="lifetime">Pago único</option>
                <option value="free">Gratis</option>
              </select></div>
          </div>
          {form.billingCycle !== 'free' && (
            <div className="grid grid-cols-3 gap-3">
              <div><label className={lbl}>Precio</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => f('price', e.target.value)} className={inp} placeholder="0.00" /></div>
              <div><label className={lbl}>Moneda</label>
                <select value={form.currency} onChange={e => f('currency', e.target.value)} className={inp}>
                  {['USD','GBP','EUR'].map(c => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className={lbl}>Renovación</label>
                <input type="date" value={form.renewalDate} onChange={e => f('renewalDate', e.target.value)} className={inp} /></div>
            </div>
          )}
          <button type="submit" className="w-full py-2.5 rounded-full text-sm font-semibold text-black" style={{ background: '#faff05' }}>
            {account ? 'Guardar cambios' : 'Agregar cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Add person modal ───────────────────────────────────────────────────────────
function AddPersonModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold mb-4">Nueva persona</h2>
        <div className="space-y-4">
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 block">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-black border border-[#111] rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05]"
              placeholder="Ej. Lucas" autoFocus />
          </div>
          <div>
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px #000, 0 0 0 4px ${c}` : 'none' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => { if (!name.trim()) return; onSave({ label: name.trim(), bg: color, text: '#000', initials: name.trim().slice(0,2).toUpperCase() }); onClose(); }}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-black"
              style={{ background: '#faff05' }}>
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Account row with inline notes ──────────────────────────────────────────────
function AccountRow({ acc, onEdit, onDelete, onSaveNotes }) {
  const [notes, setNotes] = useState(acc.notes || '');
  const cat = CAT_STYLE[acc.category] || CAT_STYLE.Otro;
  const hasPrice = acc.billingCycle !== 'free' && acc.price;
  const suffix = acc.billingCycle === 'monthly' ? '/mes' : acc.billingCycle === 'annual' ? '/año' : '';

  return (
    <div className="group px-3 py-2.5 hover:bg-white/[0.02] transition-colors border-b border-[#0d0d0d] last:border-0">
      <div className="flex items-start gap-3">

        {/* Left: account info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="text-white text-xs font-semibold leading-tight">{acc.software}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ background: cat.bg, color: cat.color }}>{acc.category}</span>
          </div>
          {acc.loginEmail && <p className="text-zinc-500 text-[10px] leading-snug">{acc.loginEmail}</p>}
          {acc.loginUser && !acc.loginEmail && <p className="text-zinc-500 text-[10px] leading-snug">{acc.loginUser}</p>}
          {(hasPrice || acc.renewalDate) && (
            <div className="flex items-center gap-2 mt-0.5">
              {hasPrice && <span className="text-zinc-600 text-[10px]">{CURR_SYM[acc.currency] || '$'}{parseFloat(acc.price).toFixed(2)}{suffix}</span>}
              {acc.renewalDate && (() => {
                const days = Math.ceil((new Date(acc.renewalDate + 'T00:00:00') - new Date()) / 86400000);
                const cls = days < 0 ? 'text-red-400' : days <= 7 ? 'text-orange-400' : days <= 30 ? 'text-yellow-400' : 'text-zinc-600';
                return <span className={`text-[10px] ${cls}`}>· {days < 0 ? 'Vencida' : days === 0 ? 'Hoy' : `${days}d`}</span>;
              })()}
            </div>
          )}
          {acc.url && (
            <a href={acc.url} target="_blank" rel="noopener noreferrer"
              className="text-zinc-700 text-[10px] hover:text-[#faff05] transition-colors truncate max-w-[160px] block mt-0.5">
              {acc.url.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          )}
        </div>

        {/* Right: notes pad */}
        <div className="w-36 flex-shrink-0">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => onSaveNotes(acc.id, notes)}
            placeholder="Notas..."
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#131313] rounded-lg px-2 py-1.5 text-zinc-400 text-[10px] leading-relaxed placeholder-zinc-800 focus:outline-none focus:border-[#faff05]/30 resize-none transition-colors hover:border-[#1a1a1a]"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
          <button onClick={() => onEdit(acc)}
            className="w-5 h-5 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => onDelete(acc)}
            className="w-5 h-5 rounded-md bg-red-500/15 hover:bg-red-500/30 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Person block ───────────────────────────────────────────────────────────────
function PersonBlock({ person, accounts, onAddAccount, onEdit, onDelete, onDeletePerson, onSaveNotes, isCustom }) {
  return (
    <div className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#111] flex-shrink-0"
        style={{ background: person.bg + '10' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: person.bg, color: person.text }}>
          {person.initials}
        </div>
        <p className="text-white text-sm font-semibold flex-1">{person.label}</p>
        {isCustom && (
          <button onClick={() => onDeletePerson(person.id)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-700 hover:text-red-400 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button onClick={() => onAddAccount(person.id)}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: person.bg + '30', color: person.bg }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      {accounts.length === 0 ? (
        <button onClick={() => onAddAccount(person.id)}
          className="flex-1 py-8 text-center text-zinc-700 text-xs hover:text-zinc-500 transition-colors">
          Sin cuentas · Agregar primera
        </button>
      ) : (
        <div className="overflow-y-auto">
          {accounts.map(acc => (
            <AccountRow key={acc.id} acc={acc} onEdit={onEdit} onDelete={onDelete} onSaveNotes={onSaveNotes} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail view (full screen, rendered by ClientesDashboard) ───────────────────
export function DirectorioSGDetail({ onBack }) {
  const { sgAccounts, addSgAccount, updateSgAccount, deleteSgAccount, sgPersons, addSgPerson, deleteSgPerson } = useApp();
  const [accountModal, setAccountModal] = useState(null);
  const [confirmDeleteAcc, setConfirmDeleteAcc] = useState(null);
  const [showAddPerson, setShowAddPerson] = useState(false);

  const allPersons = [
    ...FIXED_PERSONS,
    ...(sgPersons || []).map(p => ({ ...p, initials: p.initials || p.label.slice(0,2).toUpperCase() })),
  ];

  const handleSaveAccount = (form) => {
    if (accountModal?.account) updateSgAccount(accountModal.account.id, form);
    else addSgAccount(form);
    setAccountModal(null);
  };

  const accountsFor = (personId) => (sgAccounts || []).filter(a => a.person === personId);
  const totalAccounts = (sgAccounts || []).length;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Directorio
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#faff0520' }}>
          <svg className="w-4 h-4" style={{ color: '#faff05' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-white font-semibold">Synced Graphics</h2>
          <p className="text-zinc-600 text-xs">{allPersons.length} personas · {totalAccounts} cuentas</p>
        </div>
      </div>

      {/* Person blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allPersons.map((person, i) => (
          <PersonBlock
            key={person.id}
            person={person}
            accounts={accountsFor(person.id)}
            onAddAccount={(pid) => setAccountModal({ defaultPerson: pid })}
            onEdit={(acc) => setAccountModal({ account: acc, defaultPerson: acc.person })}
            onDelete={(acc) => setConfirmDeleteAcc(acc)}
            onDeletePerson={(pid) => deleteSgPerson(pid)}
            onSaveNotes={(id, notes) => updateSgAccount(id, { notes })}
            isCustom={i >= FIXED_PERSONS.length}
          />
        ))}
        <button onClick={() => setShowAddPerson(true)}
          className="bg-[#080808] border border-dashed border-[#1a1a1a] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-zinc-700 hover:bg-white/[0.015] transition-all group min-h-[120px]">
          <div className="w-8 h-8 rounded-full bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-zinc-600 text-xs group-hover:text-zinc-400 transition-colors">Agregar persona</p>
        </button>
      </div>

      {accountModal !== null && (
        <AccountModal account={accountModal.account || null} defaultPerson={accountModal.defaultPerson}
          allPersons={allPersons} onClose={() => setAccountModal(null)} onSave={handleSaveAccount} />
      )}
      {showAddPerson && (
        <AddPersonModal onClose={() => setShowAddPerson(false)} onSave={(data) => addSgPerson(data)} />
      )}
      {confirmDeleteAcc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#080808] border border-[#111] rounded-2xl w-full max-w-sm p-6 text-center">
            <p className="text-white font-semibold mb-1">¿Eliminar cuenta?</p>
            <p className="text-zinc-400 text-sm mb-6">"{confirmDeleteAcc.software}" será eliminada permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAcc(null)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-zinc-400 bg-zinc-800 hover:text-white transition-colors">Cancelar</button>
              <button onClick={() => { deleteSgAccount(confirmDeleteAcc.id); setConfirmDeleteAcc(null); }}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Folder card (shown in the Directorio grid) ─────────────────────────────────
export default function DirectorioSGCard({ onEnter }) {
  const { sgAccounts, sgPersons } = useApp();
  const totalAccounts = (sgAccounts || []).length;
  const allPersons = [
    ...FIXED_PERSONS,
    ...(sgPersons || []).map(p => ({ ...p })),
  ];

  return (
    <button
      onClick={onEnter}
      className="bg-[#080808] border border-[#111] rounded-2xl overflow-hidden hover:border-zinc-600 hover:scale-[1.02] transition-all text-left group">
      <div className="h-20 flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #faff05bb, #faff0540)' }}>
        <svg className="w-10 h-10 text-black/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <div className="absolute top-2 right-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/30 text-white/80">
            {totalAccounts} cuenta{totalAccounts !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-white text-sm font-semibold truncate group-hover:text-[#faff05] transition-colors">Synced Graphics</p>
        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#faff0520] text-[#faff05]">
          Directorio · {allPersons.length} personas
        </span>
      </div>
    </button>
  );
}
