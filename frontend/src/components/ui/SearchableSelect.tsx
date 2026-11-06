import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type SearchableSelectOption = { value: string; label: string; disabled?: boolean };

export function SearchableSelect({
  value, onChange, options, placeholder, emptyOptionLabel, disabled = false, ariaLabel, searchPlaceholder = 'Tìm kiếm...', emptyLabel = 'Không có lựa chọn phù hợp.',
}: {
  value: string; onChange: (value: string) => void; options: SearchableSelectOption[]; placeholder: string;
  emptyOptionLabel?: string; disabled?: boolean; ariaLabel: string; searchPlaceholder?: string; emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => options.filter(option => option.label.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))), [options, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  function select(next: string) { onChange(next); setOpen(false); setQuery(''); }

  return <div ref={rootRef} className="relative mt-1">
    <button type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
      onClick={() => setOpen(current => !current)}
      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-ink-300 bg-white px-3 py-2 text-left text-sm text-ink-900 outline-none transition focus:ring-2 focus:ring-teal-600 disabled:cursor-not-allowed disabled:bg-ink-50">
      <span className={selected ? 'break-words leading-5' : 'text-ink-500'}>{selected?.label ?? placeholder}</span><ChevronDown size={16} className={'shrink-0 text-ink-500 transition ' + (open ? 'rotate-180' : '')} />
    </button>
    {open && <div className="absolute z-30 mt-1 w-full rounded-lg border border-ink-200 bg-white p-2 shadow-xl">
      <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" /><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} placeholder={searchPlaceholder} className="input w-full pl-9 text-sm" /></div>
      <div id={listId} role="listbox" aria-label={ariaLabel} className="mt-2 max-h-56 overflow-y-auto overscroll-contain">
        {emptyOptionLabel && <button type="button" role="option" aria-selected={!value} onClick={() => select('')} className={'block w-full rounded px-3 py-2 text-left text-sm hover:bg-ink-50 ' + (!value ? 'bg-brand-50 text-brand-800' : '')}>{emptyOptionLabel}</button>}
        {filtered.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} onClick={() => select(option.value)} className={'block w-full rounded px-3 py-2 text-left text-sm leading-5 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 ' + (option.value === value ? 'bg-brand-50 text-brand-800' : '')}>{option.label}</button>)}
        {!filtered.length && <p className="px-3 py-3 text-sm text-ink-600">{emptyLabel}</p>}
      </div>
    </div>}
  </div>;
}
