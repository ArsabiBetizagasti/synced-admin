import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { ref as dbRef, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { QUESTIONS, WELCOME, THANKYOU } from './questions';

// ── Helpers ────────────────────────────────────────────────────────────────────
function getToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('t') || '';
}

function slugify(str) {
  return (str || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function buildFirebasePayload(answers, slug, clientId, token) {
  const data = {
    slug,
    meta: {
      clientId: clientId || '',
      tokenUsed: token,
      submittedAt: new Date().toISOString(),
      formVersion: '1.0',
      source: 'client-onboarding',
    },
    config: {},
    art_direction: {},
    strategy: { objectives: {} },
    products: [{ name: '', sku: '', hero: true, benefits: [], heroImageUrl: '' }],
  };

  QUESTIONS.forEach(q => {
    const val = answers[q.id];
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return;

    const path = q.path;
    if (path.startsWith('config.')) {
      data.config[path.replace('config.', '')] = val;
    } else if (path.startsWith('art_direction.')) {
      data.art_direction[path.replace('art_direction.', '')] = val;
    } else if (path.startsWith('strategy.objectives.')) {
      data.strategy.objectives[path.replace('strategy.objectives.', '')] = val;
    } else if (path.startsWith('strategy.')) {
      data.strategy[path.replace('strategy.', '')] = val;
    } else if (path === 'products[0].heroImageUrl') {
      data.products[0].heroImageUrl = val;
    } else if (path === 'products[0].name') {
      data.products[0].name = val;
    } else if (path === 'products[0].benefits') {
      data.products[0].benefits = Array.isArray(val) ? val.filter(Boolean) : [];
    }
  });

  if (data.config.display_name) {
    data.products[0].sku = slugify(data.config.display_name + '-hero');
  }
  return data;
}

// ── Input components ───────────────────────────────────────────────────────────
const inputCls = 'w-full text-2xl md:text-3xl bg-transparent border-b-2 border-zinc-200 focus:border-zinc-800 outline-none pb-3 transition-colors placeholder-zinc-300 text-zinc-800 font-light';
const textareaCls = 'w-full text-xl md:text-2xl bg-transparent border-b-2 border-zinc-200 focus:border-zinc-800 outline-none pb-3 transition-colors placeholder-zinc-300 text-zinc-800 resize-none leading-relaxed font-light';

function TextInput({ question, value, onChange, onEnter }) {
  return (
    <input
      type={question.type === 'url' ? 'url' : question.type === 'number' ? 'number' : 'text'}
      value={value}
      autoFocus
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter()}
      placeholder={question.placeholder}
      className={inputCls}
    />
  );
}

function TextareaInput({ question, value, onChange, onEnter }) {
  return (
    <textarea
      value={value}
      autoFocus
      rows={3}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && e.metaKey && onEnter()}
      placeholder={question.placeholder}
      className={textareaCls}
    />
  );
}

function TagsInput({ question, value = [], onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <div className="flex gap-3 mb-3">
        <input
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={question.placeholder}
          className={inputCls + ' flex-1'}
        />
        <button type="button" onClick={add}
          className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition-colors flex-shrink-0 self-end mb-1">
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {value.map(v => (
            <span key={v} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-600 text-sm px-3 py-1.5 rounded-full">
              {v}
              <button type="button" onClick={() => onChange(value.filter(x => x !== v))}
                className="text-zinc-400 hover:text-zinc-700 transition-colors leading-none">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPaletteInput({ value = [], onChange }) {
  const add = () => onChange([...value, { label: '', hex: '#000000', notes: '' }]);
  const update = (i, field, val) => onChange(value.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {value.map((c, i) => (
        <div key={i} className="flex items-center gap-3">
          <input type="color" value={c.hex || '#000000'}
            onChange={e => update(i, 'hex', e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-zinc-200 flex-shrink-0 p-0.5" />
          <input value={c.label} placeholder="Color name (e.g. Background)"
            onChange={e => update(i, 'label', e.target.value)}
            className="flex-1 text-lg bg-transparent border-b border-zinc-200 focus:border-zinc-600 outline-none pb-1 transition-colors placeholder-zinc-300 text-zinc-700 font-light" />
          <input value={c.hex} placeholder="#FFFFFF"
            onChange={e => update(i, 'hex', e.target.value)}
            className="w-24 text-sm bg-transparent border-b border-zinc-200 focus:border-zinc-600 outline-none pb-1 transition-colors placeholder-zinc-300 text-zinc-600 font-mono" />
          <button type="button" onClick={() => remove(i)}
            className="text-zinc-300 hover:text-zinc-500 transition-colors text-xl flex-shrink-0 pb-1">×</button>
        </div>
      ))}
      {value.length < 5 && (
        <button type="button" onClick={add}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 text-sm transition-colors mt-2">
          <span className="w-6 h-6 rounded-full border border-zinc-200 flex items-center justify-center text-xs leading-none">+</span>
          Add a color
        </button>
      )}
    </div>
  );
}

function BenefitsInput({ question, value = ['', '', ''], onChange }) {
  const placeholders = question.placeholder || ['Key benefit 1', 'Key benefit 2', 'Key benefit 3'];
  const update = (i, v) => {
    const next = [...(value.length === 3 ? value : ['', '', ''])];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="space-y-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-end gap-3">
          <span className="text-zinc-300 text-lg font-light w-5 flex-shrink-0 pb-3">{i + 1}</span>
          <input
            value={value[i] || ''}
            placeholder={placeholders[i]}
            autoFocus={i === 0}
            onChange={e => update(i, e.target.value)}
            className="flex-1 text-xl bg-transparent border-b border-zinc-200 focus:border-zinc-700 outline-none pb-3 transition-colors placeholder-zinc-300 text-zinc-800 font-light"
          />
        </div>
      ))}
    </div>
  );
}

function ImageUploadInput({ question, value, onChange, slug }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const path = `brands/${slug || 'onboarding'}/products/hero/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    task.on(
      'state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { setError('Upload failed. Try again.'); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setUploading(false);
      }
    );
  };

  if (value) {
    return (
      <div className="flex items-center gap-5">
        <img src={value} alt="" className="w-20 h-20 rounded-xl object-cover border border-zinc-100" />
        <div>
          <p className="text-zinc-600 text-sm font-medium">Image uploaded</p>
          <button type="button" onClick={() => onChange('')}
            className="text-zinc-400 text-sm hover:text-zinc-600 transition-colors mt-1 underline">
            Change image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block cursor-pointer">
        <input type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          uploading ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
        }`}>
          {uploading ? (
            <div>
              <div className="w-48 h-1 bg-zinc-100 rounded-full mx-auto mb-4">
                <div className="h-full bg-zinc-800 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-zinc-500 text-sm">Uploading {progress}%</p>
            </div>
          ) : (
            <div>
              <svg className="w-8 h-8 text-zinc-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-zinc-500 text-sm">Click to upload or drag and drop</p>
              <p className="text-zinc-300 text-xs mt-1">JPG, PNG — min 800×800px</p>
            </div>
          )}
        </div>
      </label>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}

// ── Question screen ────────────────────────────────────────────────────────────
function QuestionScreen({ question, value, onChange, onNext, onBack, index, total, isLast, slug }) {
  const canAdvance = !question.required ||
    (value !== '' && value !== undefined && !(Array.isArray(value) && value.length === 0));

  const renderInput = () => {
    switch (question.type) {
      case 'textarea':
        return <TextareaInput question={question} value={value || ''} onChange={onChange} onEnter={onNext} />;
      case 'tags':
        return <TagsInput question={question} value={value || []} onChange={onChange} />;
      case 'color_palette':
        return <ColorPaletteInput value={value || []} onChange={onChange} />;
      case 'benefits':
        return <BenefitsInput question={question} value={value || ['', '', '']} onChange={onChange} />;
      case 'image_upload':
        return <ImageUploadInput question={question} value={value || ''} onChange={onChange} slug={slug} />;
      default:
        return (
          <TextInput
            question={question}
            value={value || ''}
            onChange={onChange}
            onEnter={canAdvance ? onNext : () => {}}
          />
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white px-6 py-12 md:px-20 md:py-20">
      {/* Progress bar */}
      <div className="mb-16">
        <div className="w-full h-0.5 bg-zinc-100 rounded-full">
          <div
            className="h-full bg-zinc-800 rounded-full transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <p className="text-zinc-300 text-xs mt-2 font-light">{index + 1} of {total}</p>
      </div>

      {/* Question content */}
      <div className="flex-1 flex flex-col justify-center max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-zinc-300 text-sm">{index + 1}</span>
          <span className="text-zinc-300 text-sm">→</span>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-zinc-800 mb-8 leading-tight">
          {question.label}
          {!question.required && (
            <span className="text-zinc-300 text-xl font-light ml-2">optional</span>
          )}
        </h2>

        <div className="mb-6">{renderInput()}</div>

        {question.hint && (
          <p className="text-zinc-400 text-sm mt-3 font-light">{question.hint}</p>
        )}
        {question.type === 'textarea' && (
          <p className="text-zinc-300 text-xs mt-3">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded text-zinc-400 text-xs font-mono">⌘ Enter</kbd>
            {' '}to continue
          </p>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-10">
          {index > 0 && (
            <button type="button" onClick={onBack}
              className="px-4 py-2.5 rounded-full text-sm font-medium text-zinc-400 hover:text-zinc-700 border border-zinc-200 hover:border-zinc-400 transition-all">
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!canAdvance}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            {isLast ? 'Submit answers' : 'OK'}
            {!isLast && (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {!question.required && index < total - 1 && (
          <button type="button" onClick={onNext}
            className="text-zinc-300 text-xs mt-4 hover:text-zinc-500 transition-colors text-left">
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}

// ── Welcome screen ─────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, clientName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-zinc-300 uppercase mb-8">
        Synced Graphics
      </p>
      <h1 className="text-4xl md:text-5xl font-semibold text-zinc-800 mb-5 leading-tight max-w-lg">
        {clientName ? `Hey ${clientName} — ` : ''}{WELCOME.heading}
      </h1>
      <p className="text-zinc-400 text-lg max-w-md mb-10 leading-relaxed font-light">
        {WELCOME.subheading}
      </p>
      <button
        onClick={onStart}
        className="px-8 py-4 rounded-full bg-zinc-800 text-white font-semibold text-base hover:bg-zinc-700 transition-colors"
      >
        {WELCOME.cta}
      </button>
      <p className="text-zinc-300 text-xs mt-5 font-light">
        Takes about 10–12 minutes · No account needed
      </p>
    </div>
  );
}

// ── Thank you screen ───────────────────────────────────────────────────────────
function ThankYouScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mb-8">
        <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-xs font-semibold tracking-widest text-zinc-300 uppercase mb-5">Synced Graphics</p>
      <h1 className="text-4xl md:text-5xl font-semibold text-zinc-800 mb-4 leading-tight">
        {THANKYOU.heading}
      </h1>
      <p className="text-zinc-400 text-lg max-w-md leading-relaxed font-light">
        {THANKYOU.subheading}
      </p>
    </div>
  );
}

// ── Error screen ───────────────────────────────────────────────────────────────
function ErrorScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-zinc-300 uppercase mb-8">Synced Graphics</p>
      <h1 className="text-3xl font-semibold text-zinc-800 mb-3">This link isn't valid.</h1>
      <p className="text-zinc-400 text-base max-w-sm leading-relaxed font-light">
        {message || 'The link may have expired or already been used. Contact your Synced account manager.'}
      </p>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-zinc-200 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main app ───────────────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const token = getToken();
  const DEV_MODE = import.meta.env.DEV && token === 'dev';

  useEffect(() => {
    if (DEV_MODE) {
      setTokenData({ slug: 'dev-brand', clientId: 'dev', clientName: 'Dev Client', brandName: 'My Brand' });
      setPhase('welcome');
      return;
    }
    if (!token) {
      setErrorMsg('No onboarding token found in the URL.');
      setPhase('error');
      return;
    }
    get(dbRef(db, `onboarding_tokens/${token}`))
      .then(snap => {
        if (!snap.exists()) {
          setErrorMsg("This link doesn't exist or has expired.");
          setPhase('error');
          return;
        }
        const data = snap.val();
        if (data.used) {
          setErrorMsg("This link has already been used. Contact your Synced account manager if you need to make changes.");
          setPhase('error');
          return;
        }
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setErrorMsg('This link has expired. Ask your Synced account manager for a new one.');
          setPhase('error');
          return;
        }
        setTokenData(data);
        if (data.brandName) {
          setAnswers(a => ({ ...a, display_name: data.brandName }));
        }
        setPhase('welcome');
      })
      .catch(() => {
        setErrorMsg('Could not verify your link. Check your connection and try again.');
        setPhase('error');
      });
  }, [token]);

  const handleAnswer = (value) => {
    const q = QUESTIONS[currentQ];
    setAnswers(a => ({ ...a, [q.id]: value }));
  };

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(i => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => setCurrentQ(i => Math.max(0, i - 1));

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const slug = tokenData?.slug || slugify(answers.display_name || 'brand');
    const payload = buildFirebasePayload(answers, slug, tokenData?.clientId, token);

    try {
      await set(dbRef(db, `brands/${slug}`), payload);
      await set(dbRef(db, `onboarding_tokens/${token}/used`), true);
      await set(dbRef(db, `onboarding_tokens/${token}/usedAt`), new Date().toISOString());
      setPhase('done');
    } catch (e) {
      console.error(e);
      alert('Something went wrong saving your answers. Please try again.');
      setSubmitting(false);
    }
  };

  if (phase === 'loading') return <LoadingScreen />;
  if (phase === 'error') return <ErrorScreen message={errorMsg} />;
  if (phase === 'done') return <ThankYouScreen />;
  if (phase === 'welcome') {
    return <WelcomeScreen clientName={tokenData?.clientName} onStart={() => setPhase('form')} />;
  }

  const q = QUESTIONS[currentQ];
  return (
    <QuestionScreen
      key={currentQ}
      question={q}
      value={answers[q.id]}
      onChange={handleAnswer}
      onNext={handleNext}
      onBack={handleBack}
      index={currentQ}
      total={QUESTIONS.length}
      isLast={currentQ === QUESTIONS.length - 1}
      slug={tokenData?.slug}
    />
  );
}
