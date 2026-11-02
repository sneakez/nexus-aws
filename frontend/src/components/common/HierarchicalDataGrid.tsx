import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Search,
  Maximize2,
  Minimize2,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DataGridColumn<T> {
  id: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right' | string;
  sortable?: boolean;
  sortValue?: (item: T) => number | string;
  sticky?: 'left' | 'right' | string;
  className?: string;
  hideOnMobile?: boolean;
}

export interface DataGridColumnGroup<T> {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  columns: DataGridColumn<T>[];
  defaultVisible?: boolean;
}

export type GridPresetType = 'simple' | 'operations' | 'analytics' | 'all';

export interface GridPreset {
  id: GridPresetType;
  label: string;
  groupIds: string[];
}

export interface HierarchicalDataGridProps<T> {
  data: T[];
  groups: DataGridColumnGroup<T>[];
  rowKey: (item: T) => string;
  renderExpandedRow?: (item: T) => React.ReactNode;
  renderMobileCard?: (item: T, isExpanded: boolean, onToggleExpand: () => void, isSelected?: boolean, onToggleSelect?: () => void) => React.ReactNode;
  onRowClick?: (item: T) => void;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterControls?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  emptyState?: React.ReactNode;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
  pageSize?: number;
  pageSizeOptions?: number[];
  enablePagination?: boolean;
  selectable?: boolean;
  selectedRowIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
  externalSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  storageKey?: string;
  customPresets?: GridPreset[];
  className?: string;
}

export function HierarchicalDataGrid<T>({
  data,
  groups,
  rowKey,
  renderExpandedRow,
  renderMobileCard,
  onRowClick,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchFilter,
  filterControls,
  title,
  subtitle,
  actions,
  emptyState,
  defaultSort,
  pageSize: initialPageSize = 15,
  pageSizeOptions = [10, 15, 25, 50],
  enablePagination = true,
  selectable = false,
  selectedRowIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  externalSearchQuery,
  onSearchQueryChange,
  storageKey,
  customPresets,
  className
}: HierarchicalDataGridProps<T>) {
  // Search query
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery ?? '');

  // Synchronize with external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Expanded rows
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [actualPageSize, setActualPageSize] = useState(initialPageSize);

  // Selection states
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const isSelectionEnabled = selectable || Boolean(bulkActions);

  // Default presets based on groups
  const presets: GridPreset[] = useMemo(() => {
    if (customPresets && customPresets.length > 0) return customPresets;
    const allGroupIds = groups.map(g => g.id);

    const infoIds = groups.filter(g => g.id.includes('info') || g.id.includes('sku') || g.id.includes('order')).map(g => g.id);
    const financeIds = groups.filter(g => g.id.includes('finance') || g.id.includes('revenue')).map(g => g.id);
    const opIds = groups.filter(g => g.id.includes('operations') || g.id.includes('stock') || g.id.includes('inventory')).map(g => g.id);
    const econIds = groups.filter(g => g.id.includes('economics') || g.id.includes('margin') || g.id.includes('costs')).map(g => g.id);
    const actionIds = groups.filter(g => g.id.includes('action')).map(g => g.id);

    return [
      {
        id: 'simple',
        label: 'Đơn giản',
        groupIds: Array.from(new Set([...infoIds, ...(financeIds.length ? financeIds : opIds), ...actionIds]))
      },
      {
        id: 'operations',
        label: 'Vận hành',
        groupIds: Array.from(new Set([...infoIds, ...opIds, ...actionIds]))
      },
      {
        id: 'analytics',
        label: 'Phân tích',
        groupIds: Array.from(new Set([...infoIds, ...financeIds, ...econIds, ...actionIds]))
      },
      {
        id: 'all',
        label: 'Toàn bộ',
        groupIds: allGroupIds
      }
    ];
  }, [groups, customPresets]);

  const [activePreset, setActivePreset] = useState<GridPresetType | null>(null);

  // Visible groups with localStorage initialization
  const [visibleGroupIds, setVisibleGroupIds] = useState<Set<string>>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`nexus_grid_cols_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return new Set<string>(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved grid column preferences', e);
      }
    }

    const initial = new Set<string>();
    groups.forEach(g => {
      if (g.defaultVisible !== false) {
        initial.add(g.id);
      }
    });
    return initial;
  });

  const savePreferences = (newSet: Set<string>) => {
    setVisibleGroupIds(newSet);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`nexus_grid_cols_${storageKey}`, JSON.stringify(Array.from(newSet)));
      } catch (e) {
        console.warn('Failed to save grid column preferences', e);
      }
    }
  };

  const applyPreset = (presetId: GridPresetType) => {
    const target = presets.find(p => p.id === presetId);
    if (target) {
      const nextSet = new Set(target.groupIds);
      setActivePreset(presetId);
      savePreferences(nextSet);
    }
  };

  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // Sorting state
  const [sortState, setSortState] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(
    defaultSort || null
  );

  const activeGroups = useMemo(() => {
    return groups.filter(g => visibleGroupIds.has(g.id));
  }, [groups, visibleGroupIds]);

  const activeColumns = useMemo(() => {
    const cols: Array<DataGridColumn<T> & { groupId: string }> = [];
    activeGroups.forEach(g => {
      g.columns.forEach(c => {
        cols.push({ ...c, groupId: g.id });
      });
    });
    return cols;
  }, [activeGroups]);

  // Filter by search
  const searchedData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    const q = searchQuery.trim().toLowerCase();
    return data.filter(item => searchFilter(item, q));
  }, [data, searchQuery, searchFilter]);

  // Reset page when search or data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, data.length]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState) return searchedData;
    const { columnId, direction } = sortState;

    let targetCol: DataGridColumn<T> | undefined;
    for (const g of groups) {
      targetCol = g.columns.find(c => c.id === columnId);
      if (targetCol) break;
    }

    if (!targetCol || !targetCol.sortValue) return searchedData;

    const sortFn = targetCol.sortValue;
    return [...searchedData].sort((a, b) => {
      const valA = sortFn(a);
      const valB = sortFn(b);
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedData, sortState, groups]);

  // Pagination calculation
  const totalPages = useMemo(() => {
    if (!enablePagination || sortedData.length === 0) return 1;
    return Math.max(1, Math.ceil(sortedData.length / actualPageSize));
  }, [sortedData.length, actualPageSize, enablePagination]);

  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    if (!enablePagination) return sortedData;
    const startIdx = (clampedPage - 1) * actualPageSize;
    return sortedData.slice(startIdx, startIdx + actualPageSize);
  }, [sortedData, clampedPage, actualPageSize, enablePagination]);

  // Row selection helpers
  const handleToggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  };

  const handleToggleSelectAll = () => {
    const next = new Set<string>();
    const currentKeys = paginatedData.map(rowKey);
    const allSelectedOnPage = currentKeys.every(k => selectedIds.has(k));

    if (!allSelectedOnPage) {
      // Select all on current page
      selectedIds.forEach(k => next.add(k));
      currentKeys.forEach(k => next.add(k));
    } else {
      // Deselect all on current page
      selectedIds.forEach(k => {
        if (!currentKeys.includes(k)) next.add(k);
      });
    }

    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  };

  const handleClearSelection = () => {
    const next = new Set<string>();
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  };

  // Header checkbox indeterminate ref
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    const currentKeys = paginatedData.map(rowKey);
    const countSelected = currentKeys.filter(k => selectedIds.has(k)).length;
    headerCheckboxRef.current.indeterminate = countSelected > 0 && countSelected < currentKeys.length;
  }, [paginatedData, selectedIds, rowKey]);

  // Toggle single row expand
  const toggleRowExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all rows expand
  const toggleExpandAll = () => {
    if (expandedRowIds.size === paginatedData.length) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(paginatedData.map(rowKey)));
    }
  };

  const toggleGroupVisibility = (groupId: string) => {
    setActivePreset(null);
    const next = new Set(visibleGroupIds);
    if (next.has(groupId)) {
      if (next.size > 1) {
        next.delete(groupId);
      }
    } else {
      next.add(groupId);
    }
    savePreferences(next);
  };

  const handleSortClick = (column: DataGridColumn<T>) => {
    if (!column.sortable) return;
    setSortState(prev => {
      if (prev?.columnId === column.id) {
        if (prev.direction === 'asc') return { columnId: column.id, direction: 'desc' };
        return null;
      }
      return { columnId: column.id, direction: 'asc' };
    });
  };

  const startRecord = sortedData.length === 0 ? 0 : (clampedPage - 1) * actualPageSize + 1;
  const endRecord = Math.min(sortedData.length, clampedPage * actualPageSize);

  return (
    <div className={cn('rounded-xl bg-white border border-[#D9E3E8] shadow-xs overflow-hidden flex flex-col relative', className)}>
      {/* Floating Bulk Action Bar */}
      {isSelectionEnabled && selectedIds.size > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-[#081B2C] text-white px-4 py-2 rounded-lg shadow-lg border border-slate-700 flex items-center gap-3 animate-fade-in-up text-xs font-sans">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#1E647F] text-white flex items-center justify-center text-[10px] font-bold">
              {selectedIds.size}
            </span>
            <span>Đã chọn {selectedIds.size} mục</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {bulkActions && bulkActions(Array.from(selectedIds), handleClearSelection)}

          <button
            onClick={handleClearSelection}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="Bỏ chọn tất cả"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Action & Filter Toolbar */}
      <div className="p-3 sm:p-4 border-b border-[#D9E3E8] bg-[#F4F8FA] flex items-center justify-between gap-3 flex-wrap">
        {/* Left Zone: Title, Search & Custom Filters (Query Data) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {title && (
            <div className="mr-2">
              <h3 className="text-sm sm:text-base font-extrabold text-[#123A52] tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>}
            </div>
          )}

          {searchFilter && (
            <div className="relative w-64 sm:w-72 md:w-80 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  onSearchQueryChange?.(e.target.value);
                }}
                className="w-full text-sm py-2 pl-8 pr-3 rounded-lg border border-[#D9E3E8] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E647F]/20 focus:border-[#1E647F] transition-all font-sans"
              />
            </div>
          )}

          {filterControls}
        </div>

        {/* Right Zone: Presets, Column Selector, Expand/Collapse & Actions (View Settings) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 4 Standard Presets */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase px-1.5">Góc nhìn:</span>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                  activePreset === p.id
                    ? 'bg-white text-[#123A52] shadow-2xs font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                )}
                title={`Chuyển sang góc nhìn ${p.label}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Column Group Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGroupSelector(!showGroupSelector)}
              className={cn(
                'btn btn-secondary text-sm py-2 px-3 flex items-center gap-1.5 transition-all cursor-pointer border-[#D9E3E8]',
                visibleGroupIds.size < groups.length && 'border-[#1E647F] text-[#1E647F] bg-teal-50/50'
              )}
              title="Tùy chỉnh nhóm cột hiển thị"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline font-semibold">Nhóm Cột ({visibleGroupIds.size}/{groups.length})</span>
              <ChevronDown size={13} className={cn('transition-transform', showGroupSelector && 'rotate-180')} />
            </button>

            {showGroupSelector && (
              <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-1.5 animate-fade-in-up text-xs font-sans">
                <div className="lg:hidden pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Góc nhìn mẫu:</span>
                  <div className="grid grid-cols-2 gap-1">
                    {presets.map(p => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p.id)}
                        className={cn(
                          'px-2 py-1 rounded text-[10px] font-bold border text-center transition-all',
                          activePreset === p.id
                            ? 'bg-teal-50 border-teal-500 text-teal-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Ẩn / Hiện Nhóm Cột</span>
                  <button
                    onClick={() => {
                      const all = new Set(groups.map(g => g.id));
                      setActivePreset('all');
                      savePreferences(all);
                    }}
                    className="text-teal-600 hover:text-teal-700 font-normal normal-case cursor-pointer"
                  >
                    Hiện tất cả
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                  {groups.map(group => {
                    const isVisible = visibleGroupIds.has(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupVisibility(group.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                          isVisible ? 'bg-teal-50/60 text-teal-900 font-bold' : 'text-slate-500 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('w-4 h-4 rounded flex items-center justify-center text-[10px] border', isVisible ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300')}>
                            {isVisible && <Check size={11} />}
                          </span>
                          <span>{group.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">({group.columns.length} cột)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Expand/Collapse All */}
          {renderExpandedRow && (
            <button
              onClick={toggleExpandAll}
              className="btn btn-secondary text-sm py-2 px-3 text-slate-600 hover:text-slate-900 hidden sm:flex items-center gap-1.5 border-slate-200"
              title={expandedRowIds.size === paginatedData.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả dòng'}
            >
              {expandedRowIds.size === paginatedData.length ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden md:inline font-semibold">
                {expandedRowIds.size === paginatedData.length ? 'Thu gọn' : 'Mở tất cả'}
              </span>
            </button>
          )}

          {actions}
        </div>
      </div>

      {/* Main Table: Desktop & Tablet */}
      <div className="hidden md:block overflow-x-auto relative">
        <table className="w-full text-sm text-left border-separate border-spacing-0">
          {/* Level 1: Grouped Column Headers */}
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-sans text-xs font-bold uppercase tracking-wider">
              {/* Select All Checkbox Header */}
              {isSelectionEnabled && (
                <th
                  style={{ width: 44, minWidth: 44, maxWidth: 44 }}
                  className="py-2.5 px-2.5 text-center sticky left-0 bg-slate-100 z-30 border-r border-b border-slate-200"
                >
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(rowKey(item)))}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    title="Chọn tất cả trên trang hiện tại"
                  />
                </th>
              )}

              {renderExpandedRow && (
                <th
                  style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                  className={cn(
                    'py-2.5 px-2 text-center z-30 border-r border-b border-slate-200 bg-slate-100',
                    isSelectionEnabled ? 'sticky left-[44px]' : 'sticky left-0'
                  )}
                />
              )}

              {activeGroups.map((group, gIdx) => {
                const isGroupSticky = group.columns.length > 0 && group.columns.every(c => c.sticky === 'left');
                const groupStickyPos = isGroupSticky
                  ? (isSelectionEnabled ? (renderExpandedRow ? 'left-[80px]' : 'left-[44px]') : (renderExpandedRow ? 'left-9' : 'left-0'))
                  : undefined;

                return (
                  <th
                    key={group.id}
                    colSpan={group.columns.length}
                    className={cn(
                      'py-2.5 px-4 font-black text-slate-800 text-center border-r border-b border-slate-200 last:border-r-0 whitespace-nowrap',
                      gIdx % 2 === 0 ? 'bg-[#F1F5F9]' : 'bg-teal-50/70 text-teal-900',
                      isGroupSticky && cn('sticky z-30 bg-[#F1F5F9] border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]', groupStickyPos)
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{group.title}</span>
                      {group.badge && (
                        <span className={cn('badge text-[11px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap', group.badgeColor || 'bg-teal-100 text-teal-800 border-teal-200')}>
                          {group.badge}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Level 2: Individual Sub-Column Headers */}
            <tr className="bg-slate-50 text-slate-700 font-sans font-bold text-xs sm:text-sm">
              {isSelectionEnabled && (
                <th
                  style={{ width: 44, minWidth: 44, maxWidth: 44 }}
                  className="py-2.5 px-2.5 text-center sticky left-0 bg-[#F8FAFC] z-30 border-r border-b border-slate-200"
                />
              )}

              {renderExpandedRow && (
                <th
                  style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                  className={cn(
                    'py-2.5 px-2 text-center z-30 border-r border-b border-slate-200 bg-[#F8FAFC]',
                    isSelectionEnabled ? 'sticky left-[44px]' : 'sticky left-0'
                  )}
                />
              )}

              {activeColumns.map((col) => {
                const isSorted = sortState?.columnId === col.id;
                const isStickyLeft = col.sticky === 'left';
                const stickyLeftPos = isStickyLeft
                  ? (isSelectionEnabled ? (renderExpandedRow ? 'left-[80px]' : 'left-[44px]') : (renderExpandedRow ? 'left-9' : 'left-0'))
                  : undefined;

                return (
                  <th
                    key={col.id}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => handleSortClick(col)}
                    className={cn(
                      'py-2.5 px-3.5 transition-colors select-none font-bold whitespace-nowrap group border-b border-slate-200',
                      col.sortable && 'cursor-pointer hover:bg-slate-100 hover:text-slate-900',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      isStickyLeft && cn('sticky z-30 bg-[#F8FAFC] border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]', stickyLeftPos),
                      col.className
                    )}
                  >
                    <div className={cn('inline-flex items-center gap-1.5', col.align === 'right' && 'justify-end')}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="inline-flex items-center text-slate-500 group-hover:text-slate-800 transition-colors">
                          {isSorted ? (
                            sortState.direction === 'asc' ? (
                              <ArrowUp size={12} className="text-teal-600 font-bold stroke-[2.5]" />
                            ) : (
                              <ArrowDown size={12} className="text-teal-600 font-bold stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown size={12} className="text-slate-500 group-hover:text-teal-600 transition-colors" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 font-sans text-slate-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={activeColumns.length + (renderExpandedRow ? 1 : 0) + (isSelectionEnabled ? 1 : 0)}
                  className="py-12 text-center text-slate-400 border-b border-slate-200"
                >
                  {emptyState || (
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-slate-700">Không tìm thấy bản ghi phù hợp</p>
                      <p className="text-xs text-slate-400">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => {
                const id = rowKey(item);
                const isExpanded = expandedRowIds.has(id);
                const isSelected = selectedIds.has(id);

                return (
                  <React.Fragment key={id}>
                    {/* Primary Row */}
                    <tr
                      onClick={() => onRowClick ? onRowClick(item) : toggleRowExpand(id)}
                      className={cn(
                        'transition-colors group hover:bg-[#F0FDFA]',
                        isSelected ? 'bg-teal-50/50' : isExpanded ? 'bg-teal-50/20 font-medium' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFC]',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
                      {/* Selection Checkbox Cell */}
                      {isSelectionEnabled && (
                        <td
                          style={{ width: 44, minWidth: 44, maxWidth: 44 }}
                          className={cn(
                            'py-3 px-2.5 text-center sticky left-0 z-20 border-r border-b border-slate-200 transition-colors',
                            isSelected
                              ? 'bg-teal-50 group-hover:bg-[#E6F8F6]'
                              : rowIdx % 2 === 0
                                ? 'bg-white group-hover:bg-[#F0FDFA]'
                                : 'bg-[#FAFCFC] group-hover:bg-[#F0FDFA]'
                          )}
                          onClick={(e) => handleToggleSelectRow(id, e)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Expand Toggle Chevron Column */}
                      {renderExpandedRow && (
                        <td
                          style={{ width: 36, minWidth: 36, maxWidth: 36 }}
                          className={cn(
                            'py-3 px-2 text-center z-20 border-r border-b border-slate-200 transition-colors',
                            isSelectionEnabled ? 'sticky left-[44px]' : 'sticky left-0',
                            isSelected
                              ? 'bg-teal-50 group-hover:bg-[#E6F8F6]'
                              : rowIdx % 2 === 0
                                ? 'bg-white group-hover:bg-[#F0FDFA]'
                                : 'bg-[#FAFCFC] group-hover:bg-[#F0FDFA]'
                          )}
                          onClick={(e) => toggleRowExpand(id, e)}
                        >
                          <button
                            type="button"
                            className={cn(
                              'w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-100/50 transition-all mx-auto cursor-pointer',
                              isExpanded && 'bg-teal-100 text-teal-700 rotate-90'
                            )}
                            title={isExpanded ? 'Thu gọn dòng' : 'Mở rộng chi tiết dòng'}
                          >
                            <ChevronRight size={13} className="transition-transform duration-200" />
                          </button>
                        </td>
                      )}

                      {/* Data Columns */}
                      {activeColumns.map((col) => {
                        const isStickyLeft = col.sticky === 'left';
                        const stickyLeftPos = isStickyLeft
                          ? (isSelectionEnabled ? (renderExpandedRow ? 'left-[80px]' : 'left-[44px]') : (renderExpandedRow ? 'left-9' : 'left-0'))
                          : undefined;

                        return (
                          <td
                            key={col.id}
                            style={{ width: col.width, minWidth: col.width }}
                            className={cn(
                              'py-3 px-3.5 align-middle whitespace-nowrap transition-colors border-b border-slate-100',
                              col.align === 'right' && 'text-right font-medium',
                              col.align === 'center' && 'text-center',
                              isStickyLeft
                                ? cn(
                                    'sticky z-20 border-r border-slate-200 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] font-bold',
                                    isSelected
                                      ? 'bg-teal-50 group-hover:bg-[#E6F8F6]'
                                      : rowIdx % 2 === 0
                                        ? 'bg-white group-hover:bg-[#F0FDFA]'
                                        : 'bg-[#FAFCFC] group-hover:bg-[#F0FDFA]',
                                    stickyLeftPos
                                  )
                                : '',
                              col.className
                            )}
                          >
                            {col.accessor(item)}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Nested Expandable Row Container */}
                    {renderExpandedRow && isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-teal-200/80">
                        <td colSpan={activeColumns.length + 1 + (isSelectionEnabled ? 1 : 0)} className="p-0">
                          <div className="p-4 sm:p-5 border-l-4 border-teal-500 bg-white space-y-3 animate-fade-in-up">
                            {renderExpandedRow(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout (< 768px) */}
      <div className="md:hidden divide-y divide-slate-100">
        {paginatedData.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {emptyState || 'Không có dữ liệu phù hợp'}
          </div>
        ) : (
          paginatedData.map((item) => {
            const id = rowKey(item);
            const isExpanded = expandedRowIds.has(id);
            const isSelected = selectedIds.has(id);

            if (renderMobileCard) {
              return (
                <div key={id} className={cn('p-3.5 space-y-2.5', isSelected && 'bg-teal-50/40')}>
                  {renderMobileCard(
                    item,
                    isExpanded,
                    () => toggleRowExpand(id),
                    isSelected,
                    () => handleToggleSelectRow(id)
                  )}
                  {renderExpandedRow && isExpanded && (
                    <div className="pt-2 border-t border-slate-200 mt-2 space-y-2">
                      {renderExpandedRow(item)}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={id} className={cn('p-3.5 space-y-2', isSelected && 'bg-teal-50/40')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelectionEnabled && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    )}
                    <span className="font-mono font-bold text-slate-900 text-xs">{id}</span>
                  </div>
                  {renderExpandedRow && (
                    <button
                      onClick={() => toggleRowExpand(id)}
                      className="text-xs text-teal-600 font-semibold flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Đóng' : 'Chi tiết'}</span>
                      <ChevronRight size={12} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeColumns.slice(0, 4).map((col) => (
                    <div key={col.id}>
                      <span className="text-[10px] text-slate-400 block">{col.header}:</span>
                      <div className="font-medium text-slate-800">{col.accessor(item)}</div>
                    </div>
                  ))}
                </div>

                {renderExpandedRow && isExpanded && (
                  <div className="pt-2 border-t border-slate-100 mt-2 space-y-2">
                    {renderExpandedRow(item)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer & Interactive Pagination Bar */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs sm:text-sm text-slate-600 font-sans flex items-center justify-between flex-wrap gap-3">
        {/* Record count info */}
        <div className="flex items-center gap-2">
          <span>
            Hiển thị <strong className="text-slate-900 font-bold">{startRecord} - {endRecord}</strong> trong số <strong className="text-slate-900 font-bold">{sortedData.length}</strong> bản ghi
          </span>
          {searchQuery && <span className="text-slate-400 font-sans">(đã lọc từ {data.length})</span>}
        </div>

        {/* Pagination controls & Page Size Selector */}
        {enablePagination && totalPages > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium">Dòng:</span>
              <select
                value={actualPageSize}
                onChange={e => {
                  setActualPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1 px-2.5 border border-slate-200 rounded-md bg-white text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={clampedPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={clampedPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={15} />
              </button>

              <span className="px-2.5 py-1 text-xs sm:text-sm font-sans font-semibold text-slate-700 bg-white border border-slate-200 rounded">
                {clampedPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={clampedPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang cuối"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Column group status badges */}
        <div className="hidden sm:flex items-center gap-2 text-[10px]">
          <span className="badge bg-slate-200 text-slate-700 border-slate-300">
            {activeGroups.length} Nhóm Cột
          </span>
          <span className="badge bg-teal-50 text-teal-800 border-teal-200">
            {activeColumns.length} Cột Dữ Liệu
          </span>
        </div>
      </div>
    </div>
  );
}
