import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import { ref, set, remove, onValue, get, update as fbUpdate, onDisconnect } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { TEAM_IDS, TEAM_FINANCE, TASK_STATUS_LABELS } from '../constants';

const USER_LABELS = { kann: 'Kann', jero: 'Jero', facu: 'Facu' };

const NOTIF_MAX = 20;
const NOTIF_TTL_MS = 24 * 60 * 60 * 1000;
const pruneNotifs = (arr) => {
  const cutoff = Date.now() - NOTIF_TTL_MS;
  return arr.filter(n => new Date(n.timestamp).getTime() > cutoff).slice(0, NOTIF_MAX);
};


const AppContext = createContext(null);

export const CLIENT_COLORS = [
  '#ff6b6b', '#60a5fa', '#a78bfa', '#fb923c', '#f472b6',
  '#34d399', '#faff05', '#4ecdc4', '#fbbf24', '#e879f9',
];

const INITIAL_CLIENTS = [
  {
    id: 'c1', name: 'Hollywood Browzer', contact: '', country: 'UK', category: 'Beauty',
    contractType: 'Monthly', monthlyRevenue: 3400, revenueCurrency: 'GBP', commissions: 0,
    hasMonthlyPayment: true, hasCommissions: true, commissionRate: 10,
    contractStart: '2026-05-01', contractMonths: 6,
    monthlyRevenueNew: 4400, rateChangeDate: '2026-08-01',
    color: '#f472b6', active: true, weeklyUpdate: '', files: [], contractFile: null,
    proposalFile: null, documents: [], commissionHistory: [],
  },
  {
    id: 'c2', name: '360 Optimum', contact: '', country: '', category: 'Other',
    contractType: 'Monthly', monthlyRevenue: 0, revenueCurrency: 'USD', commissions: 0,
    hasMonthlyPayment: false, hasCommissions: true, commissionRate: 10,
    contractStart: '2026-05-01', contractMonths: 6,
    color: '#38bdf8', active: true, weeklyUpdate: '', files: [], contractFile: null,
    proposalFile: null, documents: [], commissionHistory: [],
  },
  {
    id: 'c3', name: 'Foreshank', contact: '', country: '', category: 'Food',
    contractType: 'Monthly', monthlyRevenue: 0, revenueCurrency: 'USD', commissions: 0,
    hasMonthlyPayment: false, hasCommissions: true, commissionRate: 10,
    contractStart: '2026-05-01', contractMonths: 6,
    color: '#34d399', active: true, weeklyUpdate: '', files: [], contractFile: null,
    proposalFile: null, documents: [], commissionHistory: [],
  },
  {
    id: 'c4', name: 'ADAM', contact: '', country: '', category: 'Other',
    contractType: 'Monthly', monthlyRevenue: 0, revenueCurrency: 'USD', commissions: 0,
    hasMonthlyPayment: false, hasCommissions: false, commissionRate: 0,
    contractStart: '2026-05-01', contractMonths: 6,
    color: '#fb923c', active: true, weeklyUpdate: '', files: [], contractFile: null,
    proposalFile: null, documents: [], commissionHistory: [],
  },
  {
    id: 'c5', name: 'Synced', contact: 'Interno', country: '', category: 'Other',
    contractType: 'Monthly', monthlyRevenue: 0, revenueCurrency: 'USD', commissions: 0,
    hasMonthlyPayment: false, hasCommissions: false, commissionRate: 0,
    contractStart: '2026-05-01', contractMonths: 12,
    color: '#faff05', active: true, weeklyUpdate: '', files: [], contractFile: null,
    proposalFile: null, documents: [], commissionHistory: [], isInternal: true,
  },
];

const INITIAL_TASKS = [
  {
    id: 't1', title: 'Social media contenido Mayo', clientId: 'c1',
    description: 'Posts, stories y reels para el mes',
    priority: 'Alta', deadline: '2026-05-31', assignees: ['kann', 'jero'], status: 'inprogress',
  },
  {
    id: 't2', title: 'Identidad visual', clientId: 'c2',
    description: 'Logo, paleta y brand guidelines',
    priority: 'Alta', deadline: '2026-06-10', assignees: ['kann'], status: 'todo',
  },
  {
    id: 't3', title: 'Campaña contenido Junio', clientId: 'c3',
    description: 'Planificación y diseño de piezas',
    priority: 'Media', deadline: '2026-06-05', assignees: ['jero'], status: 'todo',
  },
  {
    id: 't4', title: 'Branding completo', clientId: 'c4',
    description: 'Identidad visual desde cero',
    priority: 'Alta', deadline: '2026-06-15', assignees: ['kann', 'jero'], status: 'inprogress',
  },
  {
    id: 't5', title: 'Actualizar web synced.graphics', clientId: 'c5',
    description: 'Actualización de portfolio y servicios',
    priority: 'Media', deadline: '2026-06-20', assignees: ['kann'], status: 'todo',
  },
];

const INITIAL_FINANCES = [
  { id: 'h1',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-06-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h2',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-07-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h3',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-08-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h4',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-09-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h5',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-10-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h6',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-11-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h7',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2024-12-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h8',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-01-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h9',  type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-02-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h10', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-03-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h11', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-04-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h12', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-05-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h13', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-06-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h14', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-07-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h15', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-08-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h16', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-09-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h17', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-10-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h18', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-11-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h19', type: 'income', amount: 0, description: 'Proyecto — [completar]', clientId: null, date: '2025-12-01', category: 'Proyecto', paymentType: 'project' },
  { id: 'h20', type: 'income', amount: 0, description: 'Retainers Mayo 2026 — [completar]', clientId: null, date: '2026-05-01', category: 'Retainer', paymentType: 'retainer' },
  { id: 'h21', type: 'expense', amount: 0, description: 'Gastos operativos — [completar]', clientId: null, date: '2026-05-01', category: 'Software', paymentType: 'expense' },
];

const INITIAL_PROJECTS = [
  { id:'pr0a', clientName:'GLAD',           dateStart:'2024-01-01', dateEnd:'2024-02-01', paymentDate:null,         originalAmount:0,    originalCurrency:'GBP', amountUSD:0,       paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr0b', clientName:'Bloody Bens',    dateStart:'2024-02-01', dateEnd:'2024-03-01', paymentDate:null,         originalAmount:0,    originalCurrency:'GBP', amountUSD:0,       paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr0c', clientName:'Aquela Kombucha',dateStart:'2024-03-01', dateEnd:'2024-04-01', paymentDate:null,         originalAmount:0,    originalCurrency:'GBP', amountUSD:0,       paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr0d', clientName:'Raise',          dateStart:'2024-04-01', dateEnd:'2024-05-01', paymentDate:null,         originalAmount:1200, originalCurrency:'GBP', amountUSD:1524,    paidStatus:'paid',    paidAmount:1524,   receiptFile:null, note:'', splitDetails:[{key:'J',pct:100}] },
  { id:'pr0e', clientName:'Coda',           dateStart:'2024-05-01', dateEnd:'2024-06-01', paymentDate:null,         originalAmount:0,    originalCurrency:'GBP', amountUSD:0,       paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr1',  clientName:'Helpbnk',        dateStart:'2024-06-01', dateEnd:'2024-07-01', paymentDate:null,         originalAmount:1000, originalCurrency:'GBP', amountUSD:1350,    paidStatus:'paid',    paidAmount:1350,   receiptFile:null, note:'' },
  { id:'pr2',  clientName:'Monaco',         dateStart:'2024-07-01', dateEnd:'2024-09-01', paymentDate:null,         originalAmount:4250, originalCurrency:'USD', amountUSD:4250,    paidStatus:'paid',    paidAmount:4250,   receiptFile:null, note:'' },
  { id:'pr3',  clientName:'PerfectTED',     dateStart:'2024-08-01', dateEnd:'2024-09-01', paymentDate:null,         originalAmount:300,  originalCurrency:'GBP', amountUSD:406,     paidStatus:'paid',    paidAmount:406,    receiptFile:null, note:'Proyecto P1' },
  { id:'pr4',  clientName:'Reeses',         dateStart:'2024-09-01', dateEnd:'2024-10-01', paymentDate:null,         originalAmount:429,  originalCurrency:'GBP', amountUSD:579.60,  paidStatus:'paid',    paidAmount:579.60, receiptFile:null, note:'' },
  { id:'pr5',  clientName:'Hershey',        dateStart:'2024-10-01', dateEnd:'2024-11-01', paymentDate:null,         originalAmount:475,  originalCurrency:'GBP', amountUSD:641.74,  paidStatus:'paid',    paidAmount:641.74, receiptFile:null, note:'', splitDetails:[{key:'J',pct:50},{key:'SG',pct:50}] },
  { id:'pr6',  clientName:'ED-cuchara',     dateStart:'2024-11-01', dateEnd:'2024-12-01', paymentDate:null,         originalAmount:350,  originalCurrency:'GBP', amountUSD:468.64,  paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr7',  clientName:'PAWZ',           dateStart:'2024-12-01', dateEnd:'2025-01-01', paymentDate:null,         originalAmount:250,  originalCurrency:'GBP', amountUSD:334.74,  paidStatus:'unpaid',  paidAmount:0,      receiptFile:null, note:'' },
  { id:'pr8',  clientName:'PerfectTED',     dateStart:'2025-02-01', dateEnd:'2025-03-01', paymentDate:null,         originalAmount:350,  originalCurrency:'GBP', amountUSD:468.64,  paidStatus:'paid',    paidAmount:468.64, receiptFile:null, note:'Proyecto P2' },
  { id:'pr9',  clientName:'Chotto MAtte',   dateStart:'2025-04-01', dateEnd:'2025-05-01', paymentDate:null,         originalAmount:2000, originalCurrency:'GBP', amountUSD:2677.94, paidStatus:'paid',    paidAmount:2677.94,receiptFile:null, note:'' },
  { id:'pr10', clientName:'Wicker Basket',  dateStart:'2025-09-01', dateEnd:'2025-10-01', paymentDate:'2025-11-16', originalAmount:500,  originalCurrency:'GBP', amountUSD:669.50,  paidStatus:'paid',    paidAmount:669.50, receiptFile:null, note:'Si consigue inversión paga £1300 adicional' },
  { id:'pr11', clientName:'Simply Honest',  dateStart:'2025-11-01', dateEnd:'2025-12-01', paymentDate:'2025-12-02', originalAmount:450,  originalCurrency:'GBP', amountUSD:602.55,  paidStatus:'partial', paidAmount:301.28, receiptFile:null, note:'50% pagado' },
  { id:'pr12a', clientName:'Von Dutch', dateStart:'2025-12-01', dateEnd:'2026-01-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Dic 2025' },
  { id:'pr12b', clientName:'Von Dutch', dateStart:'2026-01-01', dateEnd:'2026-02-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Ene 2026' },
  { id:'pr12c', clientName:'Von Dutch', dateStart:'2026-02-01', dateEnd:'2026-03-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Feb 2026' },
  { id:'pr13', clientName:'Monaco',         dateStart:'2025-12-01', dateEnd:'2026-02-01', paymentDate:null,         originalAmount:2500, originalCurrency:'USD', amountUSD:2500,    paidStatus:'paid',    paidAmount:2500,   receiptFile:null, note:'' },
];

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    // If we expect an array but localStorage has old object format, convert
    if (Array.isArray(fallback) && parsed && !Array.isArray(parsed)) {
      return Object.values(parsed);
    }
    return parsed;
  } catch { return fallback; }
}

function objToArr(val) {
  return val ? Object.values(val) : [];
}

export function AppProvider({ children, currentUser: currentUserProp }) {
  // Initialize from localStorage immediately — app renders right away
  const [clients, setClients] = useState(() => load('sg_clients_v7', INITIAL_CLIENTS));
  const [tasks, setTasks] = useState(() => load('sg_tasks_v3', []));
  const [finances, setFinances] = useState(() => load('sg_finances_v2', INITIAL_FINANCES));
  const [projects, setProjects] = useState(() => load('sg_projects_v2', INITIAL_PROJECTS));
  const [recurringCosts, setRecurringCosts] = useState(() => load('sg_recurring_costs', []));
  const [ideas, setIdeas] = useState(() => load('sg_ideas', []));
  const [meetings, setMeetings] = useState(() => load('sg_meetings', []));
  const [liveTasks, setLiveTasks] = useState(() => load('sg_live_tasks', []));
  const [adPipelines, setAdPipelines] = useState(() => load('sg_ad_pipelines_v1', []));
  const [adPipelinesLoaded, setAdPipelinesLoaded] = useState(false);
  const [mentorias, setMentorias] = useState(() => load('sg_mentorias_v1', []));
  const [notifications, setNotifications] = useState(() => pruneNotifs(load('sg_notifications', [])));
  const [sgAccounts, setSgAccounts] = useState(() => load('sg_accounts_v1', []));
  const [sgPersons,  setSgPersons]  = useState(() => load('sg_persons_v1',  []));
  const [archivedCount, setArchivedCount] = useState(() => load('sg_archived_count', 0));
  const [taskMonthlyHistory, setTaskMonthlyHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sg_task_monthly') || '{}'); } catch { return {}; }
  });
  const taskMonthlyHistoryRef = useRef(taskMonthlyHistory);
  useEffect(() => { taskMonthlyHistoryRef.current = taskMonthlyHistory; }, [taskMonthlyHistory]);
  const [clientActivity, setClientActivity] = useState({});
  const [globalOnlineUsers, setGlobalOnlineUsers] = useState({});
  const [docFocusClientId, setDocFocusClientId] = useState(null);
  const [gcalEvents, setGcalEventsState] = useState({});
  const [brands, setBrands] = useState(() => load('sg_brands', {}));
  const [onboardingTokens, setOnboardingTokens] = useState(() => load('sg_onboarding_tokens', {}));
  // Tracks which Firebase paths have fired at least once (so empty = user deleted everything)
  const fbSyncedRef = useRef(new Set());
  // fbReady: true once tasks + clients + liveTasks have all synced from Firebase (not localStorage)
  const [fbReady, setFbReady] = useState(false);
  const fbReadyPathsRef = useRef(new Set());
  const FB_CRITICAL = ['tasks', 'clients', 'liveTasks'];
  // Undo stack — stores tasks snapshots before each mutation
  const undoStack = useRef([]);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const currentUser = currentUserProp || 'kann';

  // One-time migration: fix Hollywood Browzer monthly revenue 3500→3400 + set August rate change
  useEffect(() => {
    if (!fbReady) return;
    get(ref(db, 'clients/c1')).then(snap => {
      if (!snap.exists()) return;
      const hb = snap.val();
      if (hb && !hb.rateChangeDate) {
        fbUpdate(ref(db, 'clients/c1'), { monthlyRevenue: 3400, monthlyRevenueNew: 4400, rateChangeDate: '2026-08-01' });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbReady]);

  // One-time migration: split Von Dutch pr12 ($6000 single) into 3 monthly $2000 USD debts
  useEffect(() => {
    if (!fbReady) return;
    get(ref(db, 'projects/pr12')).then(snap => {
      if (!snap.exists()) return;
      const p = snap.val();
      if (p && p.amountUSD === 6000) {
        const updates = {
          pr12:  null, // delete old entry
          pr12a: { id:'pr12a', clientName:'Von Dutch', dateStart:'2025-12-01', dateEnd:'2026-01-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Dic 2025' },
          pr12b: { id:'pr12b', clientName:'Von Dutch', dateStart:'2026-01-01', dateEnd:'2026-02-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Ene 2026' },
          pr12c: { id:'pr12c', clientName:'Von Dutch', dateStart:'2026-02-01', dateEnd:'2026-03-01', paymentDate:null, originalAmount:2000, originalCurrency:'USD', amountUSD:2000, paidStatus:'unpaid', paidAmount:0, receiptFile:null, note:'Retainer Feb 2026' },
        };
        fbUpdate(ref(db, 'projects'), updates);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbReady]);

  // Migration: fix Raise (pr0d) — set £1200 paid, 100% Jero
  useEffect(() => {
    if (!fbReady) return;
    get(ref(db, 'projects/pr0d')).then(snap => {
      if (!snap.exists()) return;
      const p = snap.val();
      if (p && (!p.paidAmount || p.paidAmount === 0)) {
        fbUpdate(ref(db, 'projects/pr0d'), {
          originalAmount: 1200, originalCurrency: 'GBP', amountUSD: 1524,
          paidStatus: 'paid', paidAmount: 1524,
          splitDetails: [{ key: 'J', pct: 100 }],
        });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbReady]);

  // Migration: fix Hershey (pr5) — 50% Jero / 50% Synced
  useEffect(() => {
    if (!fbReady) return;
    get(ref(db, 'projects/pr5')).then(snap => {
      if (!snap.exists()) return;
      const p = snap.val();
      if (p && !p.splitDetails) {
        fbUpdate(ref(db, 'projects/pr5'), {
          splitDetails: [{ key: 'J', pct: 50 }, { key: 'SG', pct: 50 }],
        });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbReady]);

  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, EUR: 0.92, GBP: 0.79 });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => {
        if (d.rates) {
          setExchangeRates({ USD: 1, EUR: d.rates.EUR, GBP: d.rates.GBP });
          setRatesUpdatedAt(new Date().toLocaleTimeString());
        }
      })
      .catch(() => {});
  }, []);

  // Auth is managed by App.jsx via onAuthStateChanged — no shared service account here

  // Firebase: listeners fire immediately and sync in real-time; seeding happens in background
  useEffect(() => {
    const collections = [
      { path: 'tasks',          setter: setTasks,          lsKey: 'sg_tasks_v3',        initial: [] },
      { path: 'clients',        setter: setClients,        lsKey: 'sg_clients_v7',      initial: INITIAL_CLIENTS },
      { path: 'finances',       setter: setFinances,       lsKey: 'sg_finances_v2',     initial: INITIAL_FINANCES },
      { path: 'projects',       setter: setProjects,       lsKey: 'sg_projects_v2',     initial: INITIAL_PROJECTS },
      { path: 'ideas',          setter: setIdeas,          lsKey: 'sg_ideas',           initial: [] },
      { path: 'meetings',       setter: setMeetings,       lsKey: 'sg_meetings',        initial: [] },
      { path: 'liveTasks',      setter: setLiveTasks,      lsKey: 'sg_live_tasks',      initial: [] },
      { path: 'adPipelines',    setter: setAdPipelines,    lsKey: 'sg_ad_pipelines_v1', initial: [] },
      { path: 'recurringCosts', setter: setRecurringCosts, lsKey: 'sg_recurring_costs', initial: [] },
      { path: 'sgAccounts',     setter: setSgAccounts,     lsKey: 'sg_accounts_v1',    initial: [] },
      { path: 'sgPersons',      setter: setSgPersons,      lsKey: 'sg_persons_v1',     initial: [] },
      { path: 'mentorias',      setter: setMentorias,      lsKey: 'sg_mentorias_v1',   initial: [] },
    ];

    // Set up real-time listeners immediately — state updates come from Firebase
    const unsubscribes = collections.map(({ path, setter, lsKey }) =>
      onValue(ref(db, path), snap => {
        // First fire with no data: keep localStorage state (Firebase not yet seeded)
        // After first sync: always trust Firebase (empty = user deleted everything)
        if (snap.exists() || fbSyncedRef.current.has(path)) {
          const arr = objToArr(snap.val());
          setter(arr);
          try { localStorage.setItem(lsKey, JSON.stringify(arr)); } catch (_) {}
        }
        if (!fbSyncedRef.current.has(path)) {
          fbSyncedRef.current.add(path);
          if (path === 'adPipelines') setAdPipelinesLoaded(true);
          if (FB_CRITICAL.includes(path)) {
            fbReadyPathsRef.current.add(path);
            if (fbReadyPathsRef.current.size >= FB_CRITICAL.length) {
              setFbReady(true);
            }
          }
        }
      })
    );

    // Seed Firebase from localStorage in the background (fire and forget)
    collections.forEach(({ path, lsKey, initial }) => {
      get(ref(db, path))
        .then(snap => {
          if (!snap.exists()) {
            const data = load(lsKey, initial);
            if (data.length > 0) {
              set(ref(db, path), Object.fromEntries(data.map(i => [String(i.id), i])));
            }
          }
        })
        .catch(() => {}); // Silently ignore if Firebase is unreachable
    });

    // Mentoria reconciliation: push any local sessions that Firebase doesn't have yet.
    // Uses update() (not set()) so it never overwrites what's already in Firebase.
    // This fixes the case where two users each had local sessions that were never merged.
    get(ref(db, 'mentorias'))
      .then(snap => {
        const fbIds = new Set(Object.keys(snap.val() || {}));
        const local = load('sg_mentorias_v1', []);
        const missing = local.filter(m => !fbIds.has(String(m.id)));
        if (missing.length > 0) {
          fbUpdate(ref(db, 'mentorias'), Object.fromEntries(missing.map(m => [String(m.id), m])));
        }
      })
      .catch(() => {});

    return () => unsubscribes.forEach(u => u());
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, 'clientActivity'), snap => {
      setClientActivity(snap.exists() ? snap.val() : {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.startsWith('brand_') || currentUser === 'mentor') return;
    const presenceRef = ref(db, `presence/global/${currentUser}`);
    set(presenceRef, true);
    onDisconnect(presenceRef).remove();
    const unsub = onValue(ref(db, 'presence/global'), snap => {
      setGlobalOnlineUsers(snap.val() || {});
    });
    return () => { unsub(); remove(presenceRef); };
  }, [currentUser]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'brands'), snap => {
      const val = snap.exists() ? snap.val() : {};
      setBrands(val);
      try { localStorage.setItem('sg_brands', JSON.stringify(val)); } catch (_) {}
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, 'onboarding_tokens'), snap => {
      const val = snap.exists() ? snap.val() : {};
      setOnboardingTokens(val);
      localStorage.setItem('sg_onboarding_tokens', JSON.stringify(val));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, 'gcalEvents'), snap => {
      if (!snap.exists()) return;
      const val = snap.val();
      const result = {};
      Object.keys(val).forEach(uid => {
        result[uid] = Object.values(val[uid] || {});
      });
      setGcalEventsState(result);
    });
    return () => unsub();
  }, []);

  const syncGcalEvents = useCallback((userId, events) => {
    const map = {};
    events.forEach(e => { map[e.id] = e; });
    setGcalEventsState(prev => ({ ...prev, [userId]: events }));
    fb(set(ref(db, `gcalEvents/${userId}`), map));
  }, []);

  const clearGcalEvents = useCallback((userId) => {
    setGcalEventsState(prev => ({ ...prev, [userId]: [] }));
    fb(remove(ref(db, `gcalEvents/${userId}`)));
  }, []);

  useEffect(() => {
    const pruned = pruneNotifs(notifications);
    try { localStorage.setItem('sg_notifications', JSON.stringify(pruned)); } catch (_) {
      localStorage.removeItem('sg_notifications');
    }
  }, [notifications]);

  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z' || e.shiftKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (undoStack.current.length === 0) return;
      e.preventDefault();
      const prev = undoStack.current.pop();
      const curr = tasksRef.current;
      const prevById = Object.fromEntries(prev.map(t => [t.id, t]));
      const currById = Object.fromEntries(curr.map(t => [t.id, t]));
      prev.forEach(t => {
        if (!currById[t.id] || JSON.stringify(currById[t.id]) !== JSON.stringify(t))
          fb(set(ref(db, `tasks/${t.id}`), t));
      });
      curr.forEach(t => {
        if (!prevById[t.id]) fb(remove(ref(db, `tasks/${t.id}`)));
      });
      setTasks(prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sg_archived_count', JSON.stringify(archivedCount)); } catch (_) {}
  }, [archivedCount]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'archivedCount'), snap => {
      if (snap.exists()) setArchivedCount(snap.val());
    });
    return () => unsub();
  }, []);

  const monthInitRef = useRef(false);
  useEffect(() => {
    const unsub = onValue(ref(db, 'taskMonthlyHistory'), snap => {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (snap.exists()) {
        const val = snap.val();
        // One-time: if current month has no entry, seed it with the total archivedCount
        if (!monthInitRef.current && val[currentKey] === undefined) {
          const prevArchived = load('sg_archived_count', 0);
          if (prevArchived > 0) {
            val[currentKey] = prevArchived;
            fb(fbUpdate(ref(db, 'taskMonthlyHistory'), { [currentKey]: prevArchived }));
          }
        }
        monthInitRef.current = true;
        setTaskMonthlyHistory(val);
        try { localStorage.setItem('sg_task_monthly', JSON.stringify(val)); } catch (_) {}
      } else {
        const seed = {};
        for (let i = 6; i >= 1; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          seed[key] = 0;
        }
        const prevArchived = load('sg_archived_count', 0);
        seed[currentKey] = prevArchived;
        monthInitRef.current = true;
        setTaskMonthlyHistory(seed);
        localStorage.setItem('sg_task_monthly', JSON.stringify(seed));
        fb(set(ref(db, 'taskMonthlyHistory'), seed));
      }
    });
    return () => unsub();
  }, []);

  // Listen for cross-user notifications (e.g. document comments from other users)
  useEffect(() => {
    const notifRef = ref(db, `userNotifs/${currentUser}`);
    const unsub = onValue(notifRef, snap => {
      if (!snap.exists()) return;
      const fbNotifs = Object.values(snap.val());
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const fresh = fbNotifs.filter(n => !existingIds.has(n.id));
        if (fresh.length === 0) return prev;
        return pruneNotifs([...fresh, ...prev]);
      });
    });
    return () => unsub();
  }, [currentUser]);

  const convertAmount = useCallback((usdAmount) =>
    Math.round(usdAmount * exchangeRates[currency]), [currency, exchangeRates]);

  const fmtAmount = useCallback((usdAmount) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£' };
    const v = convertAmount(usdAmount);
    return `${symbols[currency]}${v.toLocaleString()}`;
  }, [currency, convertAmount]);

  const toUSD = useCallback((amount, fromCurrency) => {
    if (!fromCurrency || fromCurrency === 'USD') return amount;
    const rate = exchangeRates[fromCurrency] || 1;
    return amount / rate;
  }, [exchangeRates]);

  const addNotification = useCallback((action, location) => {
    const user = currentUser;
    const note = { id: Date.now().toString(), user, action, location, timestamp: new Date().toISOString(), read: false };
    setNotifications(p => pruneNotifs([note, ...p]));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(p => p.map(n => ({ ...n, read: true })));
  }, []);

  // Send a notification to all specified recipients via Firebase only (never self)
  const pushNotif = (action, location, recipients = TEAM_IDS) => {
    const user = currentUser;
    const who = USER_LABELS[user] || user;
    const notifId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const notif = { id: notifId, user, action: `${who} ${action}`, location, timestamp: new Date().toISOString(), read: false };
    recipients.filter(u => u !== user).forEach(target => {
      fb(set(ref(db, `userNotifs/${target}/${notifId}`), notif));
    });
  };

  // Helpers: update local state immediately + sync to Firebase in background
  const fb = (promise) => promise.catch(e => console.warn('[Firebase]', e));

  const addDocument = useCallback((clientId, doc) => {
    const user = currentUser;
    const newDoc = { ...doc, id: doc.id || Date.now().toString(), uploadedBy: user, uploadedAt: new Date().toISOString(), notes: [] };
    setClients(p => {
      const updated = p.map(c => {
        if (c.id !== clientId) return c;
        const newDocs = [...(c.documents || []), newDoc];
        fb(fbUpdate(ref(db, `clients/${clientId}`), { documents: newDocs }));
        return { ...c, documents: newDocs };
      });
      return updated;
    });
    const client = clients.find(c => c.id === clientId);
    pushNotif(`subió "${doc.name}"`, `Documentos › ${client?.name || clientId}`);
  }, [clients]);

  const updateDocument = useCallback((clientId, docId, updates) => {
    setClients(p => {
      const updated = p.map(c => {
        if (c.id !== clientId) return c;
        const newDocs = (c.documents || []).map(d => d.id === docId ? { ...d, ...updates } : d);
        fb(fbUpdate(ref(db, `clients/${clientId}`), { documents: newDocs }));
        return { ...c, documents: newDocs };
      });
      return updated;
    });
  }, []);

  const createFolderWithFiles = useCallback((clientId, folderName, fileIds, parentId = null) => {
    const user = currentUser;
    const folderId = Date.now().toString();
    const folderDoc = { id: folderId, name: folderName, type: 'folder', parentId: parentId || null, url: null, size: null, mime: null, uploadedBy: user, uploadedAt: new Date().toISOString(), notes: [] };
    setClients(p => {
      const updated = p.map(c => {
        if (c.id !== clientId) return c;
        const newDocs = (c.documents || []).map(d => fileIds.includes(d.id) ? { ...d, parentId: folderId } : d);
        newDocs.push(folderDoc);
        fb(fbUpdate(ref(db, `clients/${clientId}`), { documents: newDocs }));
        return { ...c, documents: newDocs };
      });
      return updated;
    });
    return folderId;
  }, []);

  const removeDocument = useCallback((clientId, docId) => {
    const client = clients.find(c => c.id === clientId);
    const doc = (client?.documents || []).find(d => d.id === docId);
    setClients(p => p.map(c => c.id === clientId
      ? { ...c, documents: (c.documents || []).filter(d => d.id !== docId) } : c));
    if (client) fb(fbUpdate(ref(db, `clients/${clientId}`), { documents: (client.documents || []).filter(d => d.id !== docId) }));
    if (doc) pushNotif(`eliminó "${doc.name}"`, `Documentos › ${client?.name || clientId}`);
  }, [clients]);

  const addDocumentNote = useCallback((clientId, docId, note) => {
    const user = currentUser;
    const newNote = { text: note, by: user, at: new Date().toISOString() };
    setClients(p => p.map(c => {
      if (c.id !== clientId) return c;
      return { ...c, documents: (c.documents || []).map(d => d.id === docId ? { ...d, notes: [...(d.notes || []), newNote] } : d) };
    }));
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const doc = (client.documents || []).find(d => d.id === docId);
      const updatedDocs = (client.documents || []).map(d =>
        d.id === docId ? { ...d, notes: [...(d.notes || []), newNote] } : d);
      fb(fbUpdate(ref(db, `clients/${clientId}`), { documents: updatedDocs }));
      // Notify all other users
      const userName = USER_LABELS[user] || user;
      const notifId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      TEAM_IDS.filter(u => u !== user).forEach(target => {
        fb(set(ref(db, `userNotifs/${target}/${notifId}`), {
          id: notifId,
          user: 'system',
          action: `${userName} comentó en "${doc?.name || 'un archivo'}"`,
          location: `Documentos › ${client.name}`,
          timestamp: new Date().toISOString(),
          read: false,
        }));
      });
    }
  }, [clients]);

  const addClient = (data) => {
    const id = Date.now().toString();
    const c = {
      ...data, id,
      color: data.color || CLIENT_COLORS[clients.length % CLIENT_COLORS.length],
      weeklyUpdate: '', files: [], contractFile: null, proposalFile: null,
      documents: [], active: true, commissions: 0, commissionHistory: [],
      monthlyRevenueHistory: [], monthlyExpenseHistory: [],
    };
    setClients(p => [...p, c]);
    fb(set(ref(db, `clients/${id}`), c));
  };

  const updateClient = (id, updates) => {
    setClients(p => p.map(c => c.id === id ? { ...c, ...updates } : c));
    fb(fbUpdate(ref(db, `clients/${id}`), updates));
  };

  const deleteClient = (id) => {
    setClients(p => p.filter(c => c.id !== id));
    fb(remove(ref(db, `clients/${id}`)));
  };

  const addProject = (data) => {
    const id = Date.now().toString();
    const p = { ...data, id };
    setProjects(prev => [...prev, p]);
    fb(set(ref(db, `projects/${id}`), p));
    pushNotif(`agregó el proyecto "${data.clientName}"`, 'Finanzas', TEAM_FINANCE);
  };
  const updateProject = (id, updates) => {
    const proj = projects.find(p => p.id === id);
    setProjects(p => p.map(pr => pr.id === id ? { ...pr, ...updates } : pr));
    fb(fbUpdate(ref(db, `projects/${id}`), updates));
    if (proj) pushNotif(`actualizó proyecto "${proj.clientName}"`, 'Finanzas', TEAM_FINANCE);
  };
  const deleteProject = (id) => {
    const proj = projects.find(p => p.id === id);
    setProjects(p => p.filter(pr => pr.id !== id));
    fb(remove(ref(db, `projects/${id}`)));
    if (proj) pushNotif(`eliminó proyecto "${proj.clientName}"`, 'Finanzas', TEAM_FINANCE);
  };

  const archiveTask = (id) => {
    setTasks(p => p.filter(t => t.id !== id));
    fb(remove(ref(db, `tasks/${id}`)));
    const newCount = archivedCount + 1;
    setArchivedCount(newCount);
    fb(set(ref(db, 'archivedCount'), newCount));
    const monthKey = new Date().toISOString().slice(0, 7);
    const updated = { ...taskMonthlyHistoryRef.current, [monthKey]: (taskMonthlyHistoryRef.current[monthKey] || 0) + 1 };
    setTaskMonthlyHistory(updated);
    try { localStorage.setItem('sg_task_monthly', JSON.stringify(updated)); } catch (_) {}
    fb(fbUpdate(ref(db, 'taskMonthlyHistory'), { [monthKey]: updated[monthKey] }));
  };

  const reorderTask = (id, updates) => {
    undoStack.current.push([...tasks]);
    if (undoStack.current.length > 30) undoStack.current.shift();
    const task = tasks.find(t => t.id === id);
    const finalUpdates = { ...updates };
    if (updates.status === 'done' && task?.status !== 'done') finalUpdates.completedAt = Date.now();
    setTasks(p => p.map(t => t.id === id ? { ...t, ...finalUpdates } : t));
    fb(fbUpdate(ref(db, `tasks/${id}`), finalUpdates));
    if (task && finalUpdates.status && finalUpdates.status !== task.status) {
      pushNotif(`movió "${task.title}" → ${TASK_STATUS_LABELS[finalUpdates.status] || finalUpdates.status}`, 'Kanban');
    }
  };

  const addTask = (data) => {
    undoStack.current.push([...tasks]);
    if (undoStack.current.length > 30) undoStack.current.shift();
    const id = Date.now().toString();
    const task = { ...data, id, status: data.status || 'todo', createdBy: currentUser, createdAt: Date.now() };
    setTasks(p => [...p, task]);
    fb(set(ref(db, `tasks/${id}`), task));
    pushNotif(`creó la tarea "${data.title}"`, 'Kanban');
  };
  const updateTask = (id, updates) => {
    undoStack.current.push([...tasks]);
    if (undoStack.current.length > 30) undoStack.current.shift();
    const task = tasks.find(t => t.id === id);
    setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
    fb(fbUpdate(ref(db, `tasks/${id}`), updates));
    if (task) pushNotif(`editó "${updates.title || task.title}"`, 'Kanban');
  };
  const moveTask = (id, status) => {
    undoStack.current.push([...tasks]);
    if (undoStack.current.length > 30) undoStack.current.shift();
    const task = tasks.find(t => t.id === id);
    const updates = { status };
    if (status === 'done' && task?.status !== 'done') updates.completedAt = Date.now();
    setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
    fb(fbUpdate(ref(db, `tasks/${id}`), updates));
    if (task) pushNotif(`movió "${task.title}" → ${TASK_STATUS_LABELS[status] || status}`, 'Kanban');
  };
  const deleteTask = (id) => {
    undoStack.current.push([...tasks]);
    if (undoStack.current.length > 30) undoStack.current.shift();
    const task = tasks.find(t => t.id === id);
    setTasks(p => p.filter(t => t.id !== id));
    fb(remove(ref(db, `tasks/${id}`)));
    if (task) pushNotif(`eliminó "${task.title}"`, 'Kanban');
  };

  const addFinanceEntry = (data) => {
    const id = Date.now().toString();
    const entry = { ...data, id };
    setFinances(p => [...p, entry]);
    fb(set(ref(db, `finances/${id}`), entry));
    pushNotif(`registró ${data.type === 'income' ? 'un ingreso' : 'un gasto'}: "${data.description}"`, 'Finanzas', TEAM_FINANCE);
  };
  const deleteFinanceEntry = (id) => {
    const entry = finances.find(f => f.id === id);
    setFinances(p => p.filter(f => f.id !== id));
    fb(remove(ref(db, `finances/${id}`)));
    if (entry) pushNotif(`eliminó "${entry.description}"`, 'Finanzas', TEAM_FINANCE);
  };

  const addIdea = (data) => {
    const id = Date.now().toString();
    const idea = { ...data, id, createdAt: new Date().toISOString() };
    setIdeas(p => [...p, idea]);
    fb(set(ref(db, `ideas/${id}`), idea));
    pushNotif(`agregó una idea: "${data.title || (data.content || '').slice(0, 40)}"`, 'Banco de ideas');
  };
  const updateIdea = (id, updates) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, ...updates } : i));
    fb(fbUpdate(ref(db, `ideas/${id}`), updates));
  };

  const deleteIdea = (id) => {
    const idea = ideas.find(i => i.id === id);
    setIdeas(p => p.filter(i => i.id !== id));
    fb(remove(ref(db, `ideas/${id}`)));
    if (idea) pushNotif(`eliminó una idea: "${idea.title || (idea.content || '').slice(0, 40)}"`, 'Banco de ideas');
  };

  const addMeeting = (data) => {
    const id = Date.now().toString();
    const meeting = { ...data, id, createdAt: new Date().toISOString() };
    setMeetings(p => [...p, meeting]);
    fb(set(ref(db, `meetings/${id}`), meeting));
    pushNotif(`agendó "${data.title || data.name || 'una reunión'}"`, 'Calendario');
  };
  const updateMeeting = (id, updates) => {
    const meeting = meetings.find(m => m.id === id);
    setMeetings(p => p.map(m => m.id === id ? { ...m, ...updates } : m));
    fb(fbUpdate(ref(db, `meetings/${id}`), updates));
    if (meeting) pushNotif(`actualizó "${updates.title || meeting.title || meeting.name || 'reunión'}"`, 'Calendario');
  };
  const deleteMeeting = (id) => {
    const meeting = meetings.find(m => m.id === id);
    setMeetings(p => p.filter(m => m.id !== id));
    fb(remove(ref(db, `meetings/${id}`)));
    if (meeting) pushNotif(`eliminó "${meeting.title || meeting.name || 'una reunión'}"`, 'Calendario');
  };

  const addLiveTask = (data) => {
    const id = Date.now().toString();
    const task = { ...data, id, createdAt: new Date().toISOString(), status: data.status || 'todo' };
    setLiveTasks(p => [...p, task]);
    fb(set(ref(db, `liveTasks/${id}`), task));
    pushNotif(`agregó live task "${data.title || ''}"`, 'Live Tasks');
  };
  const updateLiveTask = (id, updates) => {
    const task = liveTasks.find(t => t.id === id);
    setLiveTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t));
    fb(fbUpdate(ref(db, `liveTasks/${id}`), updates));
    if (task) pushNotif(`actualizó "${updates.title || task.title || ''}"`, 'Live Tasks');
  };
  const deleteLiveTask = (id) => {
    const task = liveTasks.find(t => t.id === id);
    setLiveTasks(p => p.filter(t => t.id !== id));
    fb(remove(ref(db, `liveTasks/${id}`)));
    if (task) pushNotif(`eliminó "${task.title || ''}"`, 'Live Tasks');
  };
  const moveLiveTask = (id, status) => {
    const task = liveTasks.find(t => t.id === id);
    setLiveTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    fb(fbUpdate(ref(db, `liveTasks/${id}`), { status }));
    if (task) pushNotif(`movió "${task.title}" → ${TASK_STATUS_LABELS[status] || status}`, 'Live Tasks');
  };

  const addAdPipeline = (data) => {
    const id = Date.now().toString();
    const pipeline = { ...data, id, createdAt: new Date().toISOString(), createdBy: currentUser, step1: null, step2: null, step3: null, step4: null };
    setAdPipelines(p => [...p, pipeline]);
    fb(set(ref(db, `adPipelines/${id}`), pipeline));
    pushNotif(`creó pipeline "${data.name || ''}"`, 'Live Tasks');
  };
  const updateAdPipeline = (id, updates) => {
    setAdPipelines(p => p.map(x => x.id === id ? { ...x, ...updates } : x));
    fb(fbUpdate(ref(db, `adPipelines/${id}`), updates));
  };
  const deleteAdPipeline = (id) => {
    setAdPipelines(p => p.filter(x => x.id !== id));
    fb(remove(ref(db, `adPipelines/${id}`)));
    pushNotif('eliminó un pipeline', 'Live Tasks');
  };

  const saveMentoriasLS = (arr) => {
    try { localStorage.setItem('sg_mentorias_v1', JSON.stringify(arr)); } catch (_) {}
  };
  const addMentoria = (data) => {
    const id = data.id || Date.now().toString();
    const number = mentorias.length > 0 ? Math.max(...mentorias.map(m => m.number || 0)) + 1 : 1;
    const session = { id, number, date: data.date, duration: data.duration || '', status: data.status || 'programada', createdAt: new Date().toISOString(), createdBy: currentUser };
    setMentorias(p => { const next = [...p, session]; saveMentoriasLS(next); return next; });
    fb(set(ref(db, `mentorias/${id}`), session));
    pushNotif(`creó sesión de mentoría #${number}`, 'Mentoría', ['kann', 'jero']);
  };
  const updateMentoria = (id, updates) => {
    setMentorias(p => { const next = p.map(m => m.id === id ? { ...m, ...updates } : m); saveMentoriasLS(next); return next; });
    fb(fbUpdate(ref(db, `mentorias/${id}`), updates));
  };
  const addMentoriaItem = (sessionId, data) => {
    const itemId = Date.now().toString();
    const item = { ...data, id: itemId, status: 'pendiente', createdBy: currentUser, createdAt: new Date().toISOString() };
    setMentorias(p => { const next = p.map(m => m.id === sessionId ? { ...m, items: { ...(m.items || {}), [itemId]: item } } : m); saveMentoriasLS(next); return next; });
    fb(set(ref(db, `mentorias/${sessionId}/items/${itemId}`), item));
  };
  const updateMentoriaItem = (sessionId, itemId, updates) => {
    setMentorias(p => { const next = p.map(m => m.id === sessionId ? { ...m, items: { ...(m.items || {}), [itemId]: { ...(m.items?.[itemId] || {}), ...updates } } } : m); saveMentoriasLS(next); return next; });
    fb(fbUpdate(ref(db, `mentorias/${sessionId}/items/${itemId}`), updates));
  };
  const deleteMentoriaItem = (sessionId, itemId) => {
    setMentorias(p => { const next = p.map(m => m.id === sessionId ? { ...m, items: Object.fromEntries(Object.entries(m.items || {}).filter(([k]) => k !== itemId)) } : m); saveMentoriasLS(next); return next; });
    fb(remove(ref(db, `mentorias/${sessionId}/items/${itemId}`)));
  };
  const updateMentoriaNotes = (sessionId, block, text) => {
    const noteData = { text, updatedBy: currentUser, updatedAt: new Date().toISOString() };
    setMentorias(p => { const next = p.map(m => m.id === sessionId ? { ...m, notes: { ...(m.notes || {}), [block]: noteData } } : m); saveMentoriasLS(next); return next; });
    fb(fbUpdate(ref(db, `mentorias/${sessionId}/notes/${block}`), noteData));
  };
  const deleteMentoria = (id) => {
    setMentorias(p => { const next = p.filter(m => m.id !== id); saveMentoriasLS(next); return next; });
    fb(remove(ref(db, `mentorias/${id}`)));
    pushNotif('eliminó una sesión de mentoría', 'Mentoría', ['kann', 'jero']);
  };

  const saveBrand = (slug, data) => {
    const brandData = { ...data, slug, updatedAt: new Date().toISOString() };
    setBrands(p => ({ ...p, [slug]: brandData }));
    fb(set(ref(db, `brands/${slug}`), brandData));
    pushNotif(`guardó brand setup "${data.config?.display_name || slug}"`, 'Brand Setup');
  };

  const getBrand = (slug) => brands[slug] || null;

  // Returns the most recent onboarding invite for a client, plus a derived status.
  const getClientOnboarding = (clientId) => {
    if (!clientId) return { status: 'not_invited', token: null, tokenId: null };
    const entries = Object.entries(onboardingTokens || {})
      .filter(([, t]) => t.clientId === clientId)
      .sort(([, a], [, b]) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (entries.length === 0) return { status: 'not_invited', token: null, tokenId: null };
    const [tokenId, token] = entries[0];
    if (token.used) return { status: 'completed', token, tokenId };
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return { status: 'expired', token, tokenId };
    return { status: 'pending', token, tokenId };
  };

  const addRecurringCost = (data) => {
    const id = Date.now().toString();
    const cost = { ...data, id };
    setRecurringCosts(p => [...p, cost]);
    fb(set(ref(db, `recurringCosts/${id}`), cost));
    pushNotif(`agregó costo fijo "${data.name}"`, 'Finanzas', TEAM_FINANCE);
  };
  const updateRecurringCost = (id, updates) => {
    const cost = recurringCosts.find(c => c.id === id);
    setRecurringCosts(p => p.map(c => c.id === id ? { ...c, ...updates } : c));
    fb(fbUpdate(ref(db, `recurringCosts/${id}`), updates));
    if (cost) pushNotif(`actualizó costo "${updates.name || cost.name}"`, 'Finanzas', TEAM_FINANCE);
  };
  const deleteRecurringCost = (id) => {
    const cost = recurringCosts.find(c => c.id === id);
    setRecurringCosts(p => p.filter(c => c.id !== id));
    fb(remove(ref(db, `recurringCosts/${id}`)));
    if (cost) pushNotif(`eliminó costo "${cost.name}"`, 'Finanzas', TEAM_FINANCE);
  };

  const addSgPerson = (data) => {
    const id = Date.now().toString();
    const p = { ...data, id };
    setSgPersons(prev => [...prev, p]);
    fb(set(ref(db, `sgPersons/${id}`), p));
  };
  const deleteSgPerson = (id) => {
    setSgPersons(prev => prev.filter(p => p.id !== id));
    fb(remove(ref(db, `sgPersons/${id}`)));
  };

  const addSgAccount = (data) => {
    const id = Date.now().toString();
    const acc = { ...data, id };
    setSgAccounts(p => [...p, acc]);
    fb(set(ref(db, `sgAccounts/${id}`), acc));
  };
  const updateSgAccount = (id, updates) => {
    setSgAccounts(p => p.map(a => a.id === id ? { ...a, ...updates } : a));
    fb(fbUpdate(ref(db, `sgAccounts/${id}`), updates));
  };
  const deleteSgAccount = (id) => {
    setSgAccounts(p => p.filter(a => a.id !== id));
    fb(remove(ref(db, `sgAccounts/${id}`)));
  };

  const getClientExpenses = (clientId) =>
    finances.filter(f => f.clientId === clientId && f.type === 'expense')
      .reduce((s, f) => s + f.amount, 0);

  const getClientRevenue = (clientId) =>
    finances.filter(f => f.clientId === clientId && f.type === 'income')
      .reduce((s, f) => s + f.amount, 0);

  return (
    <AppContext.Provider value={{
      clients, tasks, finances,
      addClient, updateClient, deleteClient,
      addTask, updateTask, moveTask, deleteTask, reorderTask,
      addFinanceEntry, deleteFinanceEntry,
      getClientExpenses, getClientRevenue,
      currency, setCurrency, exchangeRates, ratesUpdatedAt,
      convertAmount, fmtAmount, toUSD,
      currentUser,
      notifications, addNotification, markAllRead,
      addDocument, updateDocument, removeDocument, addDocumentNote, createFolderWithFiles,
      projects, addProject, updateProject, deleteProject,
      recurringCosts, addRecurringCost, updateRecurringCost, deleteRecurringCost,
      ideas, addIdea, updateIdea, deleteIdea,
      meetings, addMeeting, updateMeeting, deleteMeeting,
      liveTasks, addLiveTask, updateLiveTask, deleteLiveTask, moveLiveTask,
      adPipelines, adPipelinesLoaded, addAdPipeline, updateAdPipeline, deleteAdPipeline,
      mentorias, addMentoria, updateMentoria, deleteMentoria,
      addMentoriaItem, updateMentoriaItem, deleteMentoriaItem, updateMentoriaNotes,
      clientActivity, globalOnlineUsers, fbReady,
      archivedCount, archiveTask, taskMonthlyHistory,
      docFocusClientId, setDocFocusClientId,
      gcalEvents, syncGcalEvents, clearGcalEvents,
      brands, saveBrand, getBrand,
      sgAccounts, addSgAccount, updateSgAccount, deleteSgAccount,
      sgPersons, addSgPerson, deleteSgPerson,
      onboardingTokens, getClientOnboarding,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be within AppProvider');
  return ctx;
};
