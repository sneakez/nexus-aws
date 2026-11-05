import { Menu, Search, ChevronRight } from 'lucide-react';
interface TopbarProps {
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  onMobileMenu?: () => void;
  onNavigate?: (pageId: string) => void;
  showSearch?: boolean;
}
export function Topbar({
  title, search, onSearch, searchPlaceholder = 'Tìm kiếm…',
  onMobileMenu, showSearch = true,
}: TopbarProps) {
  return <header className="sticky top-0 z-30 border-b border-[#D9E3E8] bg-white/95 backdrop-blur-md">
    <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMobileMenu} className="rounded-lg p-2 text-slate-600 lg:hidden" aria-label="Mở menu"><Menu size={20} /></button>
        <nav className="flex min-w-0 items-center gap-1.5 text-xs" aria-label="Breadcrumb">
          <span className="hidden font-semibold text-slate-500 sm:inline">NexusOMS</span>
          <ChevronRight size={13} className="hidden shrink-0 text-slate-400 sm:inline" />
          <span className="truncate font-bold text-[#123A52]">{title}</span>
        </nav>
      </div>
      {showSearch && <label className="relative hidden md:block">
        <Search size={14} aria-hidden="true" className="absolute left-2.5 top-2.5 text-slate-500" />
        <input aria-label={searchPlaceholder} value={search} onChange={event => onSearch(event.target.value)}
          placeholder={searchPlaceholder} className="input w-48 pl-8 text-xs lg:w-64" />
      </label>}
    </div>
    {showSearch && <div className="border-t border-slate-100 px-4 py-2 md:hidden">
      <input aria-label={searchPlaceholder} value={search} onChange={event => onSearch(event.target.value)}
        placeholder={searchPlaceholder} className="input w-full text-xs" />
    </div>}
  </header>;
}
