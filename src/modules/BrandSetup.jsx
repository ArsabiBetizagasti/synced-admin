import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { ref as dbRef, set as dbSet } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const ONBOARDING_BASE_URL = 'https://onboarding.synced.graphics';

const storage = getStorage();

// ── Design tokens ──────────────────────────────────────────────────────────────
const inputCls = 'w-full bg-black border border-[#111] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-[#faff05] transition-colors';
const labelCls = 'text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block';
const cardCls  = 'bg-[#080808] border border-[#111] rounded-2xl p-5';

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugify(str) {
  return (str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Tag input — type + Enter to add
function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Type and press Enter'}
          className={inputCls + ' flex-1'} />
        <button type="button" onClick={add}
          className="px-3 py-2.5 rounded-xl text-xs font-semibold text-black flex-shrink-0"
          style={{ background: '#faff05' }}>+</button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map(v => (
            <span key={v} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(values.filter(x => x !== v))}
                className="text-zinc-500 hover:text-white ml-0.5 transition-colors">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Color row: swatch + hex text
function ColorRow({ label, hex, notes, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={hex || '#000000'}
        onChange={e => onChange({ label, hex: e.target.value, notes })}
        className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent flex-shrink-0" />
      <input value={label} placeholder="Element (e.g. Background)"
        onChange={e => onChange({ label: e.target.value, hex, notes })}
        className={inputCls + ' flex-1'} />
      <input value={hex} placeholder="#FFFFFF"
        onChange={e => onChange({ label, hex: e.target.value, notes })}
        className={inputCls + ' w-28'} />
      <input value={notes} placeholder="Notes"
        onChange={e => onChange({ label, hex, notes: e.target.value })}
        className={inputCls + ' flex-1'} />
      <button type="button" onClick={onRemove}
        className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 text-lg leading-none">×</button>
    </div>
  );
}

// Product card in Step 4
function ProductCard({ product, index, onChange, onRemove, onImageUpload, uploading }) {
  const currencies = ['GBP', 'USD', 'EUR', 'UYU'];
  return (
    <div className={cardCls + ' space-y-3'}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-xs uppercase tracking-wider">Product {index + 1}</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!product.hero}
              onChange={e => onChange({ ...product, hero: e.target.checked })}
              className="w-3.5 h-3.5 accent-[#faff05]" />
            <span className="text-xs text-zinc-400">Hero SKU</span>
          </label>
        </div>
        <button type="button" onClick={onRemove}
          className="text-zinc-700 hover:text-red-400 transition-colors text-sm">Remove</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Product name</label>
          <input value={product.name} placeholder="Bolsa Honduras"
            onChange={e => onChange({ ...product, name: e.target.value })}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>SKU</label>
          <input value={product.sku} placeholder="bolsa-hn"
            onChange={e => onChange({ ...product, sku: e.target.value })}
            className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Price</label>
          <div className="flex gap-2">
            <select value={product.currency || 'GBP'}
              onChange={e => onChange({ ...product, currency: e.target.value })}
              className={inputCls + ' w-20 flex-shrink-0'}>
              {currencies.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={product.price} placeholder="29.99"
              onChange={e => onChange({ ...product, price: e.target.value })}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Hero image</label>
          <div className="flex items-center gap-2">
            {product.heroImageUrl
              ? <img src={product.heroImageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#111]" />
              : <div className="w-9 h-9 rounded-lg border border-dashed border-[#333] flex items-center justify-center text-zinc-700 text-xs flex-shrink-0">img</div>
            }
            <label className="cursor-pointer flex-1">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files[0] && onImageUpload(index, e.target.files[0])} />
              <span className={inputCls + ' block text-center cursor-pointer text-zinc-500 text-xs'}>
                {uploading ? 'Uploading…' : 'Choose file'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Key benefits (up to 3)</label>
        {[0, 1, 2].map(i => (
          <input key={i} value={product.benefits?.[i] || ''} placeholder={`Benefit ${i + 1}`}
            onChange={e => {
              const b = [...(product.benefits || ['', '', ''])];
              b[i] = e.target.value;
              onChange({ ...product, benefits: b });
            }}
            className={inputCls + ' mb-2'} />
        ))}
      </div>
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────────────

function StepWebsite({ form, set }) {
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  const analyze = async () => {
    const url = form.websiteUrl.trim();
    if (!url) return;
    setFetching(true);
    setFetchMsg('');
    try {
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxy);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('meta[property="og:title"]')?.content
        || doc.querySelector('title')?.textContent || '';
      const desc = doc.querySelector('meta[property="og:description"]')?.content
        || doc.querySelector('meta[name="description"]')?.content || '';

      const updates = {};
      if (title && !form.displayName) updates.displayName = title.split('|')[0].split('–')[0].trim();
      if (desc && !form.tagline) updates.tagline = desc.slice(0, 120);
      if (!form.instagram) {
        const igMatch = html.match(/instagram\.com\/([\w.]+)/i);
        if (igMatch) updates.instagram = `@${igMatch[1]}`;
      }

      set(p => ({ ...p, ...updates }));
      setFetchMsg(`Pulled: ${Object.keys(updates).join(', ') || 'nothing new'}`);
    } catch {
      setFetchMsg('Could not fetch — fill manually.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Brand website URL</label>
        <div className="flex gap-2">
          <input value={form.websiteUrl}
            onChange={e => set(p => ({ ...p, websiteUrl: e.target.value }))}
            placeholder="https://hollywoodbrowzer.com"
            className={inputCls + ' flex-1'} />
          <button type="button" onClick={analyze} disabled={fetching || !form.websiteUrl}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-black flex-shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: '#faff05' }}>
            {fetching ? '…' : 'Auto-fill'}
          </button>
        </div>
        {fetchMsg && <p className="text-xs text-zinc-500 mt-1.5">{fetchMsg}</p>}
        <p className="text-xs text-zinc-600 mt-2">Pulls title, description, and Instagram handle from the page. You can edit everything after.</p>
      </div>

      <div>
        <label className={labelCls}>Brand slug (used as file key)</label>
        <div className="flex gap-2 items-center">
          <input value={form.slug}
            onChange={e => set(p => ({ ...p, slug: slugify(e.target.value) }))}
            placeholder="hollywood-browzer"
            className={inputCls} />
        </div>
        <p className="text-xs text-zinc-600 mt-1.5">Lowercase, hyphens only. This is how the MCP identifies the brand.</p>
      </div>

      <div>
        <label className={labelCls}>Instagram handle</label>
        <input value={form.instagram}
          onChange={e => set(p => ({ ...p, instagram: e.target.value }))}
          placeholder="@hollywoodbrowzer"
          className={inputCls} />
      </div>
    </div>
  );
}

function StepIdentity({ form, set }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Display name</label>
          <input value={form.displayName}
            onChange={e => set(p => ({ ...p, displayName: e.target.value }))}
            placeholder="Hollywood Browzer"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Category / niche</label>
          <input value={form.category}
            onChange={e => set(p => ({ ...p, category: e.target.value }))}
            placeholder="beauty-tools"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Tagline</label>
        <input value={form.tagline}
          onChange={e => set(p => ({ ...p, tagline: e.target.value }))}
          placeholder="The OG dermaplaning tool"
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Mission — what problem does this brand solve?</label>
        <textarea value={form.mission} rows={2}
          onChange={e => set(p => ({ ...p, mission: e.target.value }))}
          placeholder="Hollywood Browzer helps people remove facial hair and peach fuzz at home…"
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <label className={labelCls}>USP — what makes it different from competitors?</label>
        <textarea value={form.usp} rows={2}
          onChange={e => set(p => ({ ...p, usp: e.target.value }))}
          placeholder="Original, doctor-designed precision tool — not a generic razor"
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <label className={labelCls}>Brand tone / voice</label>
        <textarea value={form.tone} rows={2}
          onChange={e => set(p => ({ ...p, tone: e.target.value }))}
          placeholder="Confident, witty, approachable. Speaks to women 25–45 who want results without jargon."
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <label className={labelCls}>Banned words / phrases</label>
        <TagInput values={form.bannedWords}
          onChange={v => set(p => ({ ...p, bannedWords: v }))}
          placeholder="Type a word and press Enter" />
      </div>
    </div>
  );
}

function StepVisual({ form, set }) {
  const addColor = () => set(p => ({ ...p, colors: [...p.colors, { label: '', hex: '#ffffff', notes: '' }] }));
  const updateColor = (i, val) => set(p => ({ ...p, colors: p.colors.map((c, idx) => idx === i ? val : c) }));
  const removeColor = (i) => set(p => ({ ...p, colors: p.colors.filter((_, idx) => idx !== i) }));

  const lightingNevers = ['Flash', 'Ring light', 'Overhead-only', 'Direct sun'];

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Aesthetic tagline (one phrase)</label>
        <input value={form.aestheticTagline}
          onChange={e => set(p => ({ ...p, aestheticTagline: e.target.value }))}
          placeholder="Nonchalant domestic"
          className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Aesthetic description</label>
        <textarea value={form.aestheticDesc} rows={3}
          onChange={e => set(p => ({ ...p, aestheticDesc: e.target.value }))}
          placeholder="Scene exists before the camera arrives. Not staged for the ad. Warm domestic, slightly cluttered, lived-in."
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + ' mb-0'}>Color palette</label>
          <button type="button" onClick={addColor}
            className="text-xs text-zinc-500 hover:text-[#faff05] transition-colors">+ Add color</button>
        </div>
        {form.colors.length === 0 && (
          <p className="text-zinc-700 text-xs">No colors yet. Click + Add color.</p>
        )}
        <div className="space-y-2">
          {form.colors.map((c, i) => (
            <ColorRow key={i} {...c}
              onChange={val => updateColor(i, val)}
              onRemove={() => removeColor(i)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Heading font</label>
          <input value={form.fontHeading}
            onChange={e => set(p => ({ ...p, fontHeading: e.target.value }))}
            placeholder="Inter" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Body font</label>
          <input value={form.fontBody}
            onChange={e => set(p => ({ ...p, fontBody: e.target.value }))}
            placeholder="Inter Regular" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Lighting — description</label>
        <input value={form.lightingDesc}
          onChange={e => set(p => ({ ...p, lightingDesc: e.target.value }))}
          placeholder="Natural window light. Left side, 45 degrees, always diffused."
          className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Color temperature (Kelvin)</label>
          <input value={form.lightingKelvin}
            onChange={e => set(p => ({ ...p, lightingKelvin: e.target.value }))}
            placeholder="3800–4500K" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Camera / device</label>
          <input value={form.camera}
            onChange={e => set(p => ({ ...p, camera: e.target.value }))}
            placeholder="iPhone 14+ 1x or 2x, portrait mode OFF"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Lighting — never do</label>
        <div className="flex flex-wrap gap-2">
          {lightingNevers.map(opt => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-400">
              <input type="checkbox"
                checked={form.lightingNevers.includes(opt)}
                onChange={e => {
                  const updated = e.target.checked
                    ? [...form.lightingNevers, opt]
                    : form.lightingNevers.filter(x => x !== opt);
                  set(p => ({ ...p, lightingNevers: updated }));
                }}
                className="w-3.5 h-3.5 accent-[#faff05]" />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Never in frame (objects / elements)</label>
        <TagInput values={form.neverInFrame}
          onChange={v => set(p => ({ ...p, neverInFrame: v }))}
          placeholder="e.g. raw beans, bright mugs" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Max objects in frame</label>
          <input type="number" min={1} max={10} value={form.maxObjects}
            onChange={e => set(p => ({ ...p, maxObjects: parseInt(e.target.value) || 4 }))}
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Art direction test question</label>
          <input value={form.adTest}
            onChange={e => set(p => ({ ...p, adTest: e.target.value }))}
            placeholder="Could this exist as a WhatsApp photo?"
            className={inputCls} />
        </div>
      </div>
    </div>
  );
}

function StepProducts({ form, set }) {
  const [uploading, setUploading] = useState({});

  const addProduct = () => set(p => ({
    ...p,
    products: [...p.products, { name: '', sku: '', price: '', currency: 'GBP', hero: false, benefits: ['', '', ''], heroImageUrl: '' }],
  }));

  const updateProduct = (i, val) => set(p => ({ ...p, products: p.products.map((pr, idx) => idx === i ? val : pr) }));
  const removeProduct = (i) => set(p => ({ ...p, products: p.products.filter((_, idx) => idx !== i) }));

  const uploadImage = useCallback(async (index, file) => {
    setUploading(u => ({ ...u, [index]: true }));
    try {
      const slug = form.slug || 'unknown';
      const sku = form.products[index]?.sku || `product-${index}`;
      const path = `brands/${slug}/products/${sku}/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file);
        task.on('state_changed', null, reject, async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          updateProduct(index, { ...form.products[index], heroImageUrl: url });
          resolve();
        });
      });
    } catch (e) {
      console.warn('Image upload failed', e);
    } finally {
      setUploading(u => ({ ...u, [index]: false }));
    }
  }, [form.slug, form.products]);

  return (
    <div className="space-y-4">
      {form.products.length === 0 && (
        <div className="text-center py-8 text-zinc-600 text-sm">No products yet. Add your first SKU below.</div>
      )}
      {form.products.map((pr, i) => (
        <ProductCard key={i} product={pr} index={i}
          onChange={val => updateProduct(i, val)}
          onRemove={() => removeProduct(i)}
          onImageUpload={uploadImage}
          uploading={!!uploading[i]} />
      ))}
      <button type="button" onClick={addProduct}
        className="w-full py-3 rounded-xl border border-dashed border-[#333] text-zinc-500 text-sm hover:border-[#faff05] hover:text-[#faff05] transition-all">
        + Add product
      </button>
    </div>
  );
}

function StepStrategy({ form, set }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Why did they start this brand?</label>
        <textarea value={form.whyStarted} rows={3}
          onChange={e => set(p => ({ ...p, whyStarted: e.target.value }))}
          placeholder="The real story — the problem they saw, the moment it clicked."
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <label className={labelCls}>Vision — where do they want this in 5 years?</label>
        <textarea value={form.vision} rows={2}
          onChange={e => set(p => ({ ...p, vision: e.target.value }))}
          placeholder="Market position, revenue, what it becomes."
          className={inputCls + ' resize-none'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Goal — 1 month</label>
          <textarea value={form.goal1m} rows={2}
            onChange={e => set(p => ({ ...p, goal1m: e.target.value }))}
            className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className={labelCls}>Goal — 3 months</label>
          <textarea value={form.goal3m} rows={2}
            onChange={e => set(p => ({ ...p, goal3m: e.target.value }))}
            className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className={labelCls}>Goal — 6 months</label>
          <textarea value={form.goal6m} rows={2}
            onChange={e => set(p => ({ ...p, goal6m: e.target.value }))}
            className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className={labelCls}>Goal — 1 year</label>
          <textarea value={form.goal1y} rows={2}
            onChange={e => set(p => ({ ...p, goal1y: e.target.value }))}
            className={inputCls + ' resize-none'} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Biggest challenge right now</label>
        <textarea value={form.biggestChallenge} rows={2}
          onChange={e => set(p => ({ ...p, biggestChallenge: e.target.value }))}
          className={inputCls + ' resize-none'} />
      </div>

      <div>
        <label className={labelCls}>What's worked (or hasn't) in past marketing</label>
        <textarea value={form.pastMarketing} rows={2}
          onChange={e => set(p => ({ ...p, pastMarketing: e.target.value }))}
          className={inputCls + ' resize-none'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Who else approves creative/strategy?</label>
          <input value={form.decisionMaker}
            onChange={e => set(p => ({ ...p, decisionMaker: e.target.value }))}
            placeholder="e.g. Just them, or a co-founder"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>How they measure success</label>
          <input value={form.successMetric}
            onChange={e => set(p => ({ ...p, successMetric: e.target.value }))}
            placeholder="e.g. Profitable ROAS every month"
            className={inputCls} />
        </div>
      </div>
    </div>
  );
}

function StepMarket({ form, set }) {
  const currencies = ['GBP', 'USD', 'EUR', 'UYU'];
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Ideal customer profile (1 sentence)</label>
        <textarea value={form.icp} rows={2}
          onChange={e => set(p => ({ ...p, icp: e.target.value }))}
          placeholder="Women 25–45 in the UK who want smooth skin at home without a salon visit."
          className={inputCls + ' resize-none'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Primary market(s)</label>
          <input value={form.market}
            onChange={e => set(p => ({ ...p, market: e.target.value }))}
            placeholder="UK (primary), DE, FR"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Monthly ad spend</label>
          <div className="flex gap-2">
            <select value={form.spendCurrency}
              onChange={e => set(p => ({ ...p, spendCurrency: e.target.value }))}
              className={inputCls + ' w-20 flex-shrink-0'}>
              {currencies.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.monthlySpend} placeholder="5000"
              onChange={e => set(p => ({ ...p, monthlySpend: e.target.value }))}
              className={inputCls} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Target CPA</label>
          <div className="flex gap-2">
            <select value={form.cpaCurrency}
              onChange={e => set(p => ({ ...p, cpaCurrency: e.target.value }))}
              className={inputCls + ' w-20 flex-shrink-0'}>
              {currencies.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.targetCpa} placeholder="12.00"
              onChange={e => set(p => ({ ...p, targetCpa: e.target.value }))}
              className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Average order value</label>
          <input value={form.aov} placeholder="35.00"
            onChange={e => set(p => ({ ...p, aov: e.target.value }))}
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Competitors</label>
        <TagInput values={form.competitors}
          onChange={v => set(p => ({ ...p, competitors: v }))}
          placeholder="Brand name + Enter" />
      </div>

      <div>
        <label className={labelCls}>Notes (profitable order config, thresholds, anything else)</label>
        <textarea value={form.notes} rows={3}
          onChange={e => set(p => ({ ...p, notes: e.target.value }))}
          placeholder="Free shipping above £40. Profitable at 2+ units per order."
          className={inputCls + ' resize-none'} />
      </div>
    </div>
  );
}

// ── Blank form ─────────────────────────────────────────────────────────────────
const BLANK = {
  websiteUrl: '', slug: '', instagram: '',
  displayName: '', category: '', tagline: '', mission: '', usp: '', tone: '',
  bannedWords: [],
  aestheticTagline: '', aestheticDesc: '',
  colors: [],
  fontHeading: '', fontBody: '',
  lightingDesc: '', lightingKelvin: '', lightingNevers: [],
  camera: '',
  neverInFrame: [], maxObjects: 4, adTest: '',
  products: [],
  icp: '', market: '', monthlySpend: '', spendCurrency: 'GBP',
  targetCpa: '', cpaCurrency: 'GBP', aov: '',
  competitors: [], notes: '',
  // Step 6 — Strategy
  whyStarted: '', vision: '',
  goal1m: '', goal3m: '', goal6m: '', goal1y: '',
  biggestChallenge: '', pastMarketing: '', decisionMaker: '', successMetric: '',
};

const STEPS = [
  { num: 1, label: 'Website' },
  { num: 2, label: 'Identity' },
  { num: 3, label: 'Visual' },
  { num: 4, label: 'Products' },
  { num: 5, label: 'Market' },
  { num: 6, label: 'Strategy' },
];

// ── AI brief builder ────────────────────────────────────────────────────────────
// Produces a plain-text brief from a saved brand record — meant to be pasted
// into an AI agent (or read by a human) to get instant context on a client.
function buildAiBrief(client, brand) {
  const c = brand?.config || {};
  const a = brand?.art_direction || {};
  const s = brand?.strategy || {};
  const obj = s.objectives || {};
  const products = brand?.products || [];
  const lines = [];
  const push = (label, val) => { if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) lines.push(`${label}: ${Array.isArray(val) ? val.join(', ') : val}`); };

  lines.push(`# ${c.display_name || client?.name || 'Brand'} — Client Brief`);
  lines.push('');
  lines.push('## Identity');
  push('Category', c.category);
  push('Website', c.website);
  push('Instagram', c.instagram);
  push('Tagline', c.tagline);
  push('Mission', c.mission);
  push('USP', c.usp);
  push('Brand voice', c.tone);
  push('Banned words', c.banned_words);
  lines.push('');
  lines.push('## Story & Strategy');
  push('Why they started', s.why_started);
  push('5-year vision', s.vision);
  push('Biggest challenge', s.biggest_challenge);
  push('Past marketing', s.past_marketing);
  push('Decision maker(s)', s.decision_maker);
  push('How they measure success', s.success_metric);
  lines.push('');
  lines.push('## Objectives by timeframe');
  push('1 month', obj.month_1);
  push('3 months', obj.month_3);
  push('6 months', obj.month_6);
  push('1 year', obj.year_1);
  lines.push('');
  lines.push('## Market & Competition');
  push('ICP', c.icp);
  push('Market(s)', c.market);
  push('Competitors', c.competitor_brands);
  push('Monthly ad spend', c.monthly_spend ? `${c.monthly_spend} ${c.spend_currency || ''}` : '');
  push('Target CPA', c.target_cpa ? `${c.target_cpa} ${c.cpa_currency || ''}` : '');
  push('AOV', c.aov);
  push('Notes', c.notes);
  lines.push('');
  lines.push('## Visual / Art direction');
  push('Aesthetic', a.aesthetic_tagline);
  push('Aesthetic description', a.aesthetic_desc);
  if (a.colors?.length) push('Colors', a.colors.map(col => `${col.label || ''} ${col.hex || ''}`.trim()).join(', '));
  push('Fonts', [a.font_heading, a.font_body].filter(Boolean).join(' / '));
  push('Lighting', a.lighting_desc);
  push('Camera', a.camera);
  push('Never in frame', a.never_in_frame);
  lines.push('');
  if (products.length) {
    lines.push('## Products');
    products.forEach(p => {
      lines.push(`- ${p.name || 'Unnamed'} (${p.sku || 'no sku'})${p.price ? ` — ${p.price} ${p.currency || ''}` : ''}`);
      (p.benefits || []).filter(Boolean).forEach(b => lines.push(`  · ${b}`));
    });
  }
  return lines.join('\n');
}

// ── Read-only client profile view ───────────────────────────────────────────────
function ProfileField({ label, value }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
        {Array.isArray(value) ? value.join(', ') : String(value)}
      </p>
    </div>
  );
}

function ProfileSection({ title, children }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className={cardCls + ' space-y-3'}>
      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-2 gap-4">{items}</div>
    </div>
  );
}

function ClientProfile({ client, brand, onboarding, onEdit, onGenerateLink, generatingLink, inviteUrl, copyInviteUrl, copied }) {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const c = brand?.config || {};
  const a = brand?.art_direction || {};
  const s = brand?.strategy || {};
  const obj = s.objectives || {};
  const products = brand?.products || [];

  const copyBrief = () => {
    navigator.clipboard.writeText(buildAiBrief(client, brand)).then(() => {
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#111] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: client?.color || '#333', color: '#000' }}>
            {(client?.name || '').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{c.display_name || client?.name}</p>
            <p className="text-zinc-600 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Onboarding completado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copyBrief}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border border-[#222]"
            style={{ color: copiedBrief ? '#22c55e' : '#faff05', borderColor: copiedBrief ? '#22c55e40' : '#faff0540' }}>
            {copiedBrief ? 'Copiado!' : 'Copiar brief para IA'}
          </button>
          <button type="button" onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 border border-[#222] hover:border-zinc-500 hover:text-white transition-all">
            Editar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Invite link management (regenerate) */}
        <div className={cardCls + ' flex items-center justify-between gap-4'}>
          <div>
            <p className="text-zinc-300 text-sm font-medium">Link de onboarding</p>
            <p className="text-zinc-600 text-xs mt-0.5">
              {onboarding?.token?.usedAt ? `Completado el ${new Date(onboarding.token.usedAt).toLocaleDateString()}` : 'Ya completado por el cliente'}
            </p>
          </div>
          {inviteUrl ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-zinc-500 bg-[#111] rounded-lg px-2.5 py-1.5 max-w-[220px] truncate font-mono">{inviteUrl}</span>
              <button type="button" onClick={copyInviteUrl}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex-shrink-0"
                style={{ background: copied ? '#22c55e22' : '#faff0522', color: copied ? '#22c55e' : '#faff05' }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={onGenerateLink} disabled={generatingLink}
              className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 border border-[#222] hover:border-[#faff05] hover:text-[#faff05] transition-all disabled:opacity-40 flex-shrink-0">
              {generatingLink ? 'Generando…' : 'Generar nuevo link'}
            </button>
          )}
        </div>

        <ProfileSection title="Identidad">
          <ProfileField label="Categoría" value={c.category} />
          <ProfileField label="Website" value={c.website} />
          <ProfileField label="Instagram" value={c.instagram} />
          <ProfileField label="Tagline" value={c.tagline} />
          <ProfileField label="Misión" value={c.mission} />
          <ProfileField label="USP" value={c.usp} />
          <ProfileField label="Tono de voz" value={c.tone} />
          <ProfileField label="Palabras prohibidas" value={c.banned_words} />
        </ProfileSection>

        <ProfileSection title="Historia y estrategia">
          <ProfileField label="Por qué empezaron" value={s.why_started} />
          <ProfileField label="Visión a 5 años" value={s.vision} />
          <ProfileField label="Mayor desafío actual" value={s.biggest_challenge} />
          <ProfileField label="Marketing pasado" value={s.past_marketing} />
          <ProfileField label="Quién aprueba decisiones" value={s.decision_maker} />
          <ProfileField label="Cómo miden el éxito" value={s.success_metric} />
        </ProfileSection>

        <ProfileSection title="Objetivos por plazo">
          <ProfileField label="1 mes" value={obj.month_1} />
          <ProfileField label="3 meses" value={obj.month_3} />
          <ProfileField label="6 meses" value={obj.month_6} />
          <ProfileField label="1 año" value={obj.year_1} />
        </ProfileSection>

        <ProfileSection title="Mercado y competencia">
          <ProfileField label="ICP" value={c.icp} />
          <ProfileField label="Mercado(s)" value={c.market} />
          <ProfileField label="Competidores" value={c.competitor_brands} />
          <ProfileField label="Gasto mensual en ads" value={c.monthly_spend ? `${c.monthly_spend} ${c.spend_currency || ''}` : ''} />
          <ProfileField label="CPA objetivo" value={c.target_cpa ? `${c.target_cpa} ${c.cpa_currency || ''}` : ''} />
          <ProfileField label="AOV" value={c.aov} />
          <ProfileField label="Notas" value={c.notes} />
        </ProfileSection>

        <ProfileSection title="Visual / Dirección de arte">
          <ProfileField label="Estética" value={a.aesthetic_tagline} />
          <ProfileField label="Descripción estética" value={a.aesthetic_desc} />
          <ProfileField label="Fuentes" value={[a.font_heading, a.font_body].filter(Boolean).join(' / ')} />
          <ProfileField label="Iluminación" value={a.lighting_desc} />
          <ProfileField label="Cámara" value={a.camera} />
          <ProfileField label="Nunca en cuadro" value={a.never_in_frame} />
          {!!a.colors?.length && (
            <div className="col-span-2">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-1.5">Paleta de colores</p>
              <div className="flex flex-wrap gap-2">
                {a.colors.map((col, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-[#111] rounded-full pl-1 pr-2.5 py-1">
                    <span className="w-4 h-4 rounded-full border border-[#222]" style={{ background: col.hex || '#000' }} />
                    <span className="text-zinc-300 text-xs">{col.label || col.hex}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </ProfileSection>

        {products.length > 0 && (
          <div className={cardCls + ' space-y-3'}>
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Productos</p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#0c0c0c] rounded-xl p-3 border border-[#111]">
                  {p.heroImageUrl
                    ? <img src={p.heroImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg border border-dashed border-[#333] flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-zinc-200 text-sm font-medium truncate">{p.name || 'Sin nombre'}</p>
                    <p className="text-zinc-600 text-xs truncate">{(p.benefits || []).filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main module ────────────────────────────────────────────────────────────────
export default function BrandSetup() {
  const { clients, brands, saveBrand, updateClient, getClientOnboarding } = useApp();
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState('profile'); // 'profile' (read-only) | 'edit' (wizard)

  const activeClients = clients.filter(c => !c.isInternal && c.active);
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const onboardingForSelected = getClientOnboarding(selectedClientId);
  // Client-submitted onboarding writes straight to brands/{slug} without linking
  // clients/{id}.brandSlug — fall back to the completed token's slug so submitted
  // answers still surface here even before that link is made.
  const completedSlugForSelected = onboardingForSelected.status === 'completed' ? onboardingForSelected.token?.slug : null;
  const existingBrandForSelected = selectedClient?.brandSlug
    ? brands[selectedClient.brandSlug]
    : (completedSlugForSelected ? brands[completedSlugForSelected] : null);

  // Once a client-submitted brand shows up unlinked, persist the link so it
  // stays fast/consistent on future loads and matches the manual save-flow behavior.
  useEffect(() => {
    if (selectedClient && !selectedClient.brandSlug && completedSlugForSelected && brands[completedSlugForSelected]) {
      updateClient(selectedClient.id, { brandSlug: completedSlugForSelected });
    }
  }, [selectedClient?.id, selectedClient?.brandSlug, completedSlugForSelected, brands]);

  const selectClient = (client) => {
    setSelectedClientId(client.id);
    setSaved(false);
    setInviteUrl('');
    const clientOnb = getClientOnboarding(client.id);
    const existingSlug = client.brandSlug || (clientOnb.status === 'completed' ? clientOnb.token?.slug : null);
    const existingBrand = existingSlug ? brands[existingSlug] : null;
    setMode(existingBrand ? 'profile' : 'edit');
    if (existingBrand) {
      setForm({
        ...BLANK,
        websiteUrl:      existingBrand.meta?.websiteUrl || '',
        slug:            existingBrand.slug || existingSlug,
        instagram:       existingBrand.config?.instagram || '',
        displayName:     existingBrand.config?.display_name || '',
        category:        existingBrand.config?.category || '',
        tagline:         existingBrand.config?.tagline || '',
        mission:         existingBrand.config?.mission || '',
        usp:             existingBrand.config?.usp || '',
        tone:            existingBrand.config?.tone || '',
        bannedWords:     existingBrand.config?.banned_words || [],
        aestheticTagline:existingBrand.art_direction?.aesthetic_tagline || '',
        aestheticDesc:   existingBrand.art_direction?.aesthetic_desc || '',
        colors:          existingBrand.art_direction?.colors || [],
        fontHeading:     existingBrand.art_direction?.font_heading || '',
        fontBody:        existingBrand.art_direction?.font_body || '',
        lightingDesc:    existingBrand.art_direction?.lighting_desc || '',
        lightingKelvin:  existingBrand.art_direction?.lighting_kelvin || '',
        lightingNevers:  existingBrand.art_direction?.lighting_nevers || [],
        camera:          existingBrand.art_direction?.camera || '',
        neverInFrame:    existingBrand.art_direction?.never_in_frame || [],
        maxObjects:      existingBrand.art_direction?.max_objects || 4,
        adTest:          existingBrand.art_direction?.ad_test || '',
        products:        existingBrand.products || [],
        icp:             existingBrand.config?.icp || '',
        market:          existingBrand.config?.market || '',
        monthlySpend:    existingBrand.config?.monthly_spend || '',
        spendCurrency:   existingBrand.config?.spend_currency || 'GBP',
        targetCpa:       existingBrand.config?.target_cpa || '',
        cpaCurrency:     existingBrand.config?.cpa_currency || 'GBP',
        aov:             existingBrand.config?.aov || '',
        competitors:     existingBrand.config?.competitor_brands || [],
        notes:           existingBrand.config?.notes || '',
        whyStarted:      existingBrand.strategy?.why_started || '',
        vision:          existingBrand.strategy?.vision || '',
        goal1m:          existingBrand.strategy?.objectives?.month_1 || '',
        goal3m:          existingBrand.strategy?.objectives?.month_3 || '',
        goal6m:          existingBrand.strategy?.objectives?.month_6 || '',
        goal1y:          existingBrand.strategy?.objectives?.year_1 || '',
        biggestChallenge:existingBrand.strategy?.biggest_challenge || '',
        pastMarketing:   existingBrand.strategy?.past_marketing || '',
        decisionMaker:   existingBrand.strategy?.decision_maker || '',
        successMetric:   existingBrand.strategy?.success_metric || '',
      });
    } else {
      setForm({ ...BLANK, displayName: client.name, slug: slugify(client.name) });
    }
    setStep(1);
  };

  const generateInviteLink = async () => {
    if (!form.slug && !selectedClient) return;
    setGeneratingLink(true);
    const slug = form.slug || slugify(selectedClient.name);
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const tokenData = {
      slug, clientId: selectedClientId, clientName: selectedClient?.name || '',
      brandName: form.displayName || selectedClient?.name || '',
      createdAt: new Date().toISOString(), expiresAt, used: false,
    };
    try {
      await dbSet(dbRef(db, `onboarding_tokens/${token}`), tokenData);
      setInviteUrl(`${ONBOARDING_BASE_URL}?t=${token}`);
    } catch (e) {
      console.warn('Token write failed', e);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!form.slug) return;
    setSaving(true);
    try {
      const brandData = {
        slug: form.slug,
        meta: { clientId: selectedClientId, websiteUrl: form.websiteUrl, createdAt: brands[form.slug]?.meta?.createdAt || new Date().toISOString(), formVersion: '1.0' },
        config: {
          slug: form.slug, display_name: form.displayName, category: form.category,
          market: form.market, website: form.websiteUrl, instagram: form.instagram,
          tagline: form.tagline, mission: form.mission, usp: form.usp, tone: form.tone,
          icp: form.icp, competitor_brands: form.competitors, banned_words: form.bannedWords,
          target_cpa: parseFloat(form.targetCpa) || 0, cpa_currency: form.cpaCurrency,
          monthly_spend: parseFloat(form.monthlySpend) || 0, spend_currency: form.spendCurrency,
          aov: parseFloat(form.aov) || 0, notes: form.notes,
        },
        art_direction: {
          aesthetic_tagline: form.aestheticTagline, aesthetic_desc: form.aestheticDesc,
          colors: form.colors, font_heading: form.fontHeading, font_body: form.fontBody,
          lighting_desc: form.lightingDesc, lighting_kelvin: form.lightingKelvin,
          lighting_nevers: form.lightingNevers, camera: form.camera,
          never_in_frame: form.neverInFrame, max_objects: form.maxObjects, ad_test: form.adTest,
        },
        strategy: {
          why_started:      form.whyStarted,
          vision:           form.vision,
          objectives: {
            month_1: form.goal1m,
            month_3: form.goal3m,
            month_6: form.goal6m,
            year_1:  form.goal1y,
          },
          biggest_challenge: form.biggestChallenge,
          past_marketing:    form.pastMarketing,
          decision_maker:    form.decisionMaker,
          success_metric:    form.successMetric,
        },
        products: form.products,
      };
      saveBrand(form.slug, brandData);
      if (selectedClientId) updateClient(selectedClientId, { brandSlug: form.slug });
      setSaved(true);
      setMode('profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="w-56 flex-shrink-0 border-r border-[#111] flex flex-col">
        <div className="px-4 py-4 border-b border-[#111]">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">Onboarding</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {activeClients.map(client => {
            const onb = getClientOnboarding(client.id);
            const completedSlug = onb.status === 'completed' ? onb.token?.slug : null;
            const hasBrand = (!!client.brandSlug && !!brands[client.brandSlug]) || (!!completedSlug && !!brands[completedSlug]);
            const isSelected = client.id === selectedClientId;
            let statusNode;
            if (hasBrand) {
              statusNode = <span className="text-green-500">● Completado</span>;
            } else if (onb.status === 'pending') {
              statusNode = <span className="text-amber-400">● Invitación enviada</span>;
            } else if (onb.status === 'expired') {
              statusNode = <span className="text-red-400">● Enlace vencido</span>;
            } else {
              statusNode = 'Sin invitar';
            }
            return (
              <button key={client.id} onClick={() => selectClient(client)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isSelected ? 'bg-[#111]' : 'hover:bg-[#0a0a0a]'}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: client.color, color: '#000' }}>
                  {(client.name || '').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{client.name}</p>
                  <p className="text-[10px] text-zinc-700 mt-0.5">
                    {statusNode}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!selectedClientId ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm text-center px-10">
            Selecciona un cliente para generar su link de onboarding o revisar sus respuestas.
          </div>
        ) : mode === 'profile' && existingBrandForSelected ? (
          <ClientProfile
            client={selectedClient}
            brand={existingBrandForSelected}
            onboarding={onboardingForSelected}
            onEdit={() => { setStep(1); setMode('edit'); }}
            onGenerateLink={generateInviteLink}
            generatingLink={generatingLink}
            inviteUrl={inviteUrl}
            copyInviteUrl={copyInviteUrl}
            copied={copied}
          />
        ) : (
          <>
            <div className="px-6 py-4 border-b border-[#111] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: selectedClient?.color || '#333', color: '#000' }}>
                  {(selectedClient?.name || '').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{form.displayName || selectedClient?.name}</p>
                  {form.slug && <p className="text-zinc-600 text-xs">{form.slug}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {existingBrandForSelected && (
                  <button type="button" onClick={() => setMode('profile')}
                    className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 border border-[#222] hover:border-zinc-500 hover:text-white transition-all">
                    Ver perfil
                  </button>
                )}
                {saved && (
                  <span className="text-xs text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Saved
                  </span>
                )}
                {inviteUrl ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-500 bg-[#111] rounded-lg px-2.5 py-1.5 max-w-[200px] truncate font-mono">{inviteUrl}</span>
                    <button type="button" onClick={copyInviteUrl}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex-shrink-0"
                      style={{ background: copied ? '#22c55e22' : '#faff0522', color: copied ? '#22c55e' : '#faff05' }}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={generateInviteLink} disabled={generatingLink}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-zinc-400 border border-[#222] hover:border-[#faff05] hover:text-[#faff05] transition-all disabled:opacity-40">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {generatingLink ? 'Generating…' : 'Send to client'}
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 pt-4 pb-3 flex gap-1.5 flex-shrink-0">
              {STEPS.map(s => (
                <button key={s.num} type="button" onClick={() => setStep(s.num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    step === s.num ? 'text-black' : step > s.num ? 'bg-green-500/15 text-green-400' : 'bg-[#111] text-zinc-600 hover:text-zinc-400'
                  }`}
                  style={step === s.num ? { background: '#faff05' } : {}}>
                  {s.num}. {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {step === 1 && <StepWebsite form={form} set={setForm} />}
              {step === 2 && <StepIdentity form={form} set={setForm} />}
              {step === 3 && <StepVisual form={form} set={setForm} />}
              {step === 4 && <StepProducts form={form} set={setForm} />}
              {step === 5 && <StepMarket form={form} set={setForm} />}
              {step === 6 && <StepStrategy form={form} set={setForm} />}
            </div>

            <div className="px-6 py-4 border-t border-[#111] flex items-center gap-3 flex-shrink-0">
              <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[#111] text-zinc-400 hover:text-white disabled:opacity-30 transition-all">
                Back
              </button>
              {step < STEPS.length ? (
                <button type="button" onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
                  className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-black"
                  style={{ background: '#faff05' }}>

                  Next
                </button>
              ) : (
                <button type="button" onClick={handleSave} disabled={saving || !form.slug}
                  className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50 transition-opacity" style={{ background: '#faff05' }}>
                  {saving ? 'Saving…' : 'Save Brand'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
