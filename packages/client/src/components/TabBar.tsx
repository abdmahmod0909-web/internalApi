import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import {
  Plus,
  X,
  Columns,
  Rows,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import type { HttpMethod } from '@internalapi/shared';

function getMethodBadgeColor(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'text-emerald-400';
    case 'POST':
      return 'text-amber-400';
    case 'PUT':
      return 'text-blue-400';
    case 'PATCH':
      return 'text-purple-400';
    case 'DELETE':
      return 'text-rose-400';
    default:
      return 'text-gray-400';
  }
}

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, openTab, layout, setLayout } = useAppStore();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check scroll boundaries
  const updateScrollState = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [tabs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Smooth scroll
  const scroll = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const amount = direction === 'left' ? -220 : 220;
    tabsContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 260);
  };

  const handleNewTab = () => {
    openTab();
    setTimeout(() => {
      if (tabsContainerRef.current) {
        tabsContainerRef.current.scrollTo({
          left: tabsContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
        setTimeout(updateScrollState, 260);
      }
    }, 50);
  };

  const closeOtherTabs = (currentId: string) => {
    tabs.forEach((t) => {
      if (t.id !== currentId) closeTab(t.id);
    });
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center justify-between bg-gray-950 border-b border-gray-800 px-1.5 select-none h-9">
      {/* Scrollable Tabs Area + Inline Actions (Directly after tabs!) */}
      <div className="flex items-center flex-1 min-w-0 overflow-hidden relative">
        {/* Left Scroll Chevron (only appears when scrolled) */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-850 rounded transition-colors shrink-0 z-10 mr-0.5"
            title="Scroll tabs left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Scrollable Tabs Container */}
        <div
          ref={tabsContainerRef}
          onScroll={updateScrollState}
          className="flex items-center space-x-1 overflow-x-auto no-scrollbar scroll-smooth flex-initial max-w-full"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const methodColor = getMethodBadgeColor(tab.request.method);

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center space-x-2 px-3 py-1.5 text-xs cursor-pointer border-t-2 transition-all shrink-0 max-w-[190px] ${
                  isActive
                    ? 'bg-gray-900 text-white border-orange-500 font-medium'
                    : 'text-gray-400 border-transparent hover:bg-gray-900/60 hover:text-gray-200'
                }`}
                title={tab.name || tab.request.url || 'Untitled Request'}
              >
                <span className={`text-[10px] font-bold ${methodColor} shrink-0`}>
                  {tab.request.method}
                </span>
                <span className="truncate">{tab.name || tab.request.url || 'Untitled Request'}</span>
                {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></span>}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity ml-1"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Postman-Style Controls Immediately Following the Tabs: [ > ] [ + ] [ v ] */}
        <div className="flex items-center shrink-0 pl-1 z-10 bg-gray-950">
          {/* Right Scroll Chevron (appears when tabs overflow) */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-850 rounded transition-colors"
              title="Scroll tabs right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Add Request Button (+) Placed directly after the last tab! */}
          <button
            onClick={handleNewTab}
            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-850 rounded transition-colors mx-0.5"
            title="New Request Tab (Ctrl+T)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* More Tabs Dropdown (v) for Quick Navigation */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-1.5 rounded transition-colors ${
                isDropdownOpen
                  ? 'bg-gray-800 text-orange-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-850'
              }`}
              title="View all open tabs"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-1 w-72 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <span>Open Tabs ({tabs.length})</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={() => closeOtherTabs(activeTabId)}
                      className="text-orange-400 hover:underline normal-case text-[11px]"
                    >
                      Close others
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const methodColor = getMethodBadgeColor(tab.request.method);

                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          setActiveTabId(tab.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-gray-800 transition-colors ${
                          isActive ? 'bg-orange-500/10 text-orange-400 font-medium' : 'text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <span className={`text-[10px] font-bold ${methodColor} shrink-0`}>
                            {tab.request.method}
                          </span>
                          <span className="truncate">{tab.name || tab.request.url || 'Untitled Request'}</span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {isActive && <Check className="w-3 h-3 text-orange-400" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            className="p-1 hover:text-rose-400 text-gray-500 rounded"
                            title="Close tab"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Far Right: Two-pane layout toggle: Side-by-side vs Stacked */}
      <div className="flex items-center pl-2 shrink-0">
        <button
          onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
          className="flex items-center space-x-1 p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-850 rounded transition-colors"
          title={layout === 'horizontal' ? 'Switch to Top & Bottom layout' : 'Switch to Side-by-Side layout'}
        >
          {layout === 'horizontal' ? (
            <Rows className="w-3.5 h-3.5" />
          ) : (
            <Columns className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
