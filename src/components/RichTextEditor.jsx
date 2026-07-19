import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

// ─── Toolbar button ───────────────────────────────────────────────────────────
function Btn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all flex-shrink-0 ${
        active
          ? 'bg-[#faff05] text-black'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
      }`}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-zinc-700 mx-0.5 flex-shrink-0" />;
}

// ─── Link popover ─────────────────────────────────────────────────────────────
function LinkPopover({ onConfirm, onCancel }) {
  const [url, setUrl] = useState('');
  return (
    <div className="absolute top-full left-0 mt-1 z-20 bg-[#1a1a1a] border border-zinc-700 rounded-xl p-2 flex items-center gap-2 shadow-xl min-w-[280px]">
      <input
        autoFocus
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onConfirm(url); }
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="https://..."
        className="flex-1 bg-transparent text-white text-xs placeholder-zinc-600 outline-none"
      />
      <button type="button" onClick={() => onConfirm(url)}
        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#faff05] text-black">
        OK
      </button>
      <button type="button" onClick={onCancel}
        className="text-[10px] text-zinc-500 hover:text-white px-1">
        ✕
      </button>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange, placeholder = 'Describe la tarea en detalle...', readOnly = false, fill = false, editorMinH = 'min-h-[120px]', editorMaxH = 'max-h-[300px]' }) {
  const fileRef = useRef(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-400 underline cursor-pointer' },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: 'rounded-xl max-w-full my-2' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => !readOnly && onChange?.(editor.getHTML()),
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) { insertImageFile(file); return true; }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            insertImageFile(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  const insertImageFile = useCallback((file) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(insertImageFile);
    e.target.value = '';
  };

  const handleLink = (url) => {
    setShowLinkPopover(false);
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    editor?.chain().focus().setLink({ href }).run();
  };

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const newVal = value || '';
    if (editor.getHTML() !== newVal) editor.commands.setContent(newVal, false);
  }, [value, editor]);

  if (!editor) return null;

  const isActive = (name, attrs) => editor.isActive(name, attrs);

  return (
    <div className={`rounded-xl border bg-[#111] overflow-hidden transition-colors flex flex-col ${
      readOnly ? 'border-zinc-800/40' : 'border-zinc-800 focus-within:border-[#faff05]'
    } ${fill ? 'flex-1 min-h-0' : ''}`}>
      {/* Toolbar */}
      {!readOnly && <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-zinc-800 flex-wrap flex-shrink-0">
        {/* Text format */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={isActive('bold')} title="Negrita (Ctrl+B)">
          <span className="font-bold text-sm">B</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={isActive('italic')} title="Cursiva (Ctrl+I)">
          <span className="italic font-serif text-sm">I</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={isActive('underline')} title="Subrayado (Ctrl+U)">
          <span className="underline text-sm">U</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={isActive('strike')} title="Tachado">
          <span className="line-through text-sm">S</span>
        </Btn>

        <Divider />

        {/* Headings */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={isActive('heading', { level: 2 })} title="Título grande">
          <span className="font-bold text-[11px]">H2</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={isActive('heading', { level: 3 })} title="Título pequeño">
          <span className="font-bold text-[11px]">H3</span>
        </Btn>

        <Divider />

        {/* Lists */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={isActive('bulletList')} title="Lista con viñetas">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={isActive('orderedList')} title="Lista numerada">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={isActive('blockquote')} title="Cita">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
          </svg>
        </Btn>

        <Divider />

        {/* Link */}
        <div className="relative">
          <Btn
            onClick={() => {
              if (isActive('link')) { editor.chain().focus().unsetLink().run(); }
              else setShowLinkPopover(v => !v);
            }}
            active={isActive('link')}
            title="Agregar enlace">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </Btn>
          {showLinkPopover && (
            <LinkPopover onConfirm={handleLink} onCancel={() => setShowLinkPopover(false)} />
          )}
        </div>

        {/* Image upload */}
        <Btn onClick={() => fileRef.current?.click()} active={false} title="Insertar imagen">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />

        <Divider />

        {/* Clear formatting */}
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} active={false} title="Limpiar formato">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Btn>
      </div>}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={`rich-editor overflow-y-auto px-3 py-2.5 text-sm text-white ${
          fill ? 'flex-1 min-h-0' : `${editorMinH} ${editorMaxH}`
        } ${readOnly ? 'cursor-default' : ''}`}
      />

      {/* Hint */}
      {!readOnly && <div className="px-3 py-1.5 border-t border-zinc-800/50 flex items-center gap-3 flex-shrink-0">
        <span className="text-zinc-700 text-[10px]">Ctrl+B negrita · Ctrl+I cursiva · Ctrl+U subrayado</span>
        <span className="text-zinc-700 text-[10px] ml-auto">Pegá imágenes directo acá</span>
      </div>}
    </div>
  );
}
