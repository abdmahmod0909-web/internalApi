import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import {
  Plus,
  X,
  Folder,
  Columns,
  Rows,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Save,
} from 'lucide-react';
import type { HttpMethod } from '@internalapi/shared';
import type { TabItem } from '../store/useAppStore.js';
import { UnsavedChangesModal } from './common/UnsavedChangesModal.js';

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
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    closeTabs,
    duplicateTab,
    saveTabRequest,
    closeUnsavedPreference,
    setCloseUnsavedPreference,
    openTab,
    layout,
    setLayout,
  } = useAppStore();

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Tab Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  // Unsaved confirmation queue state
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [unsavedQueue, setUnsavedQueue] = useState<TabItem[]>([]);
  const [unsavedIndex, setUnsavedIndex] = useState(0);
  const [pendingCloseTargetIds, setPendingCloseTargetIds] = useState<string[]>([]);

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

  // Close dropdown & context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smooth scroll
  const scroll = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const amount = direction === 'left' ? -220 : 220;
    tabsContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 260);
  };

  const handleNewTab = () => {
    openTab();
    setIsDropdownOpen(false);
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

  /**
   * Main close request handler: checks for unsaved changes and applies preferences.
   */
  const handleRequestCloseTabs = (targetTabIds: string[]) => {
    setContextMenu(null);
    setIsDropdownOpen(false);

    const targetTabs = tabs.filter((t) => targetTabIds.includes(t.id));
    const unsaved = targetTabs.filter((t) => t.isDirty);

    // If no unsaved tabs among targets, close immediately
    if (unsaved.length === 0) {
      closeTabs(targetTabIds);
      return;
    }

    // If user previously remembered "save"
    if (closeUnsavedPreference === 'save') {
      (async () => {
        for (const t of unsaved) {
          await saveTabRequest(t.id);
        }
        closeTabs(targetTabIds);
      })();
      return;
    }

    // If user previously remembered "discard"
    if (closeUnsavedPreference === 'discard') {
      closeTabs(targetTabIds);
      return;
    }

    // Otherwise, open confirmation modal queue for unsaved tabs
    setUnsavedQueue(unsaved);
    setUnsavedIndex(0);
    setPendingCloseTargetIds(targetTabIds);
    setIsUnsavedModalOpen(true);
  };

  // Unsaved Modal: Save current item in queue
  const handleModalSave = async (remember: boolean) => {
    if (unsavedIndex >= unsavedQueue.length) return;
    const currentItem = unsavedQueue[unsavedIndex];

    await saveTabRequest(currentItem.id);

    if (remember) {
      setCloseUnsavedPreference('save');
      // Save all remaining unsaved tabs automatically
      for (let i = unsavedIndex + 1; i < unsavedQueue.length; i++) {
        await saveTabRequest(unsavedQueue[i].id);
      }
      closeTabs(pendingCloseTargetIds);
      setIsUnsavedModalOpen(false);
      setUnsavedQueue([]);
      return;
    }

    // Advance to next unsaved item if any remain
    if (unsavedIndex + 1 < unsavedQueue.length) {
      setUnsavedIndex(unsavedIndex + 1);
    } else {
      closeTabs(pendingCloseTargetIds);
      setIsUnsavedModalOpen(false);
      setUnsavedQueue([]);
    }
  };

  // Unsaved Modal: Don't save current item in queue
  const handleModalDontSave = (remember: boolean) => {
    if (unsavedIndex >= unsavedQueue.length) return;

    if (remember) {
      setCloseUnsavedPreference('discard');
      closeTabs(pendingCloseTargetIds);
      setIsUnsavedModalOpen(false);
      setUnsavedQueue([]);
      return;
    }

    // Advance to next unsaved item if any remain
    if (unsavedIndex + 1 < unsavedQueue.length) {
      setUnsavedIndex(unsavedIndex + 1);
    } else {
      closeTabs(pendingCloseTargetIds);
      setIsUnsavedModalOpen(false);
      setUnsavedQueue([]);
    }
  };

  // Unsaved Modal: Save all remaining items in queue
  const handleModalSaveAll = async (remember: boolean) => {
    if (remember) {
      setCloseUnsavedPreference('save');
    }
    for (let i = unsavedIndex; i < unsavedQueue.length; i++) {
      await saveTabRequest(unsavedQueue[i].id);
    }
    closeTabs(pendingCloseTargetIds);
    setIsUnsavedModalOpen(false);
    setUnsavedQueue([]);
  };

  // Unsaved Modal: Don't save all remaining items in queue
  const handleModalDontSaveAll = (remember: boolean) => {
    if (remember) {
      setCloseUnsavedPreference('discard');
    }
    closeTabs(pendingCloseTargetIds);
    setIsUnsavedModalOpen(false);
    setUnsavedQueue([]);
  };

  // Unsaved Modal: Cancel operation
  const handleModalCancel = () => {
    setIsUnsavedModalOpen(false);
    setUnsavedQueue([]);
    setPendingCloseTargetIds([]);
  };

  // Right-click context menu on tab
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  };

  // Quick close helpers
  const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
  const tabsToTheRight = activeIdx >= 0 ? tabs.slice(activeIdx + 1) : [];
  const unsavedCount = tabs.filter((t) => t.isDirty).length;
  const savedCount = tabs.length - unsavedCount;

  return (
    <div className="flex items-center justify-between bg-gray-950 border-b border-gray-800 px-1.5 select-none h-9 relative">
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
            const isColTab = tab.type === 'collection';
            const methodColor = getMethodBadgeColor(tab.request.method);

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
                className={`group flex items-center space-x-2 px-3 py-1.5 text-xs cursor-pointer border-t-2 transition-all shrink-0 max-w-[190px] ${
                  isActive
                    ? 'bg-gray-900 text-white border-orange-500 font-medium'
                    : 'text-gray-400 border-transparent hover:bg-gray-900/60 hover:text-gray-200'
                }`}
                title={tab.name || (isColTab ? 'Collection Settings' : tab.request.url || 'Untitled Request')}
              >
                {isColTab ? (
                  <Folder className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : (
                  <span className={`text-[10px] font-bold ${methodColor} shrink-0`}>
                    {tab.request.method}
                  </span>
                )}
                <span className="truncate">{tab.name || (isColTab ? 'Untitled Collection' : tab.request.url || 'Untitled Request')}</span>
                {tab.isDirty && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"
                    title="Unsaved changes"
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestCloseTabs([tab.id]);
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

          {/* More Tabs Dropdown (v) with Full Tab Actions */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-1.5 rounded transition-colors ${
                isDropdownOpen
                  ? 'bg-gray-800 text-orange-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-850'
              }`}
              title="Tab actions & open tabs"
            >
              <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-1 w-72 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-gray-200">
                {/* Header & Quick Action Buttons */}
                <div className="px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <span>Tab Actions</span>
                  <span className="text-orange-400 font-mono">{tabs.length} open</span>
                </div>

                {/* Dropdown Action Menu Items */}
                <div className="py-1 border-b border-gray-800/80">
                  <button
                    onClick={() => handleRequestCloseTabs(tabs.map((t) => t.id))}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Close All Tabs</span>
                  </button>

                  <button
                    disabled={tabs.length <= 1}
                    onClick={() =>
                      handleRequestCloseTabs(tabs.filter((t) => t.id !== activeTabId).map((t) => t.id))
                    }
                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-amber-400" />
                    <span>Close Other Tabs</span>
                  </button>

                  <button
                    disabled={unsavedCount === 0}
                    onClick={() =>
                      handleRequestCloseTabs(tabs.filter((t) => t.isDirty).map((t) => t.id))
                    }
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                      <span>Close Unsaved Tabs</span>
                    </div>
                    {unsavedCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-orange-500/20 text-orange-400 font-mono">
                        {unsavedCount}
                      </span>
                    )}
                  </button>

                  <button
                    disabled={savedCount === 0}
                    onClick={() =>
                      handleRequestCloseTabs(tabs.filter((t) => !t.isDirty).map((t) => t.id))
                    }
                    className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Close Saved Tabs</span>
                    </div>
                    {savedCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-mono">
                        {savedCount}
                      </span>
                    )}
                  </button>

                  <button
                    disabled={tabsToTheRight.length === 0}
                    onClick={() => handleRequestCloseTabs(tabsToTheRight.map((t) => t.id))}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span>Close Tabs to the Right</span>
                  </button>
                </div>

                {/* Preference / Settings Status Row */}
                <div className="px-3 py-2 bg-gray-950/60 border-b border-gray-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-gray-400 truncate">
                    <span>Unsaved close:</span>
                    <span className="font-semibold text-gray-200 capitalize">
                      {closeUnsavedPreference === 'ask'
                        ? 'Prompt (Default)'
                        : closeUnsavedPreference === 'save'
                        ? 'Auto-Save'
                        : 'Auto-Discard'}
                    </span>
                  </div>
                  {closeUnsavedPreference !== 'ask' && (
                    <button
                      onClick={() => setCloseUnsavedPreference('ask')}
                      className="text-orange-400 hover:underline text-[10px] flex items-center space-x-1"
                      title="Reset preference back to prompt every time"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Open Tabs List */}
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Open Tabs</span>
                  <button
                    onClick={handleNewTab}
                    className="text-orange-400 hover:underline normal-case text-[11px] flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Tab</span>
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
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
                          {tab.isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {isActive && <Check className="w-3 h-3 text-orange-400" />}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestCloseTabs([tab.id]);
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

      {/* Tab Context Menu (Right Click) */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1 text-xs text-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRequestCloseTabs([contextMenu.tabId])}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Close Tab</span>
          </button>

          <button
            onClick={() =>
              handleRequestCloseTabs(tabs.filter((t) => t.id !== contextMenu.tabId).map((t) => t.id))
            }
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5 text-amber-400" />
            <span>Close Other Tabs</span>
          </button>

          <button
            onClick={() => {
              const cIdx = tabs.findIndex((t) => t.id === contextMenu.tabId);
              if (cIdx >= 0) {
                const toRight = tabs.slice(cIdx + 1);
                handleRequestCloseTabs(toRight.map((t) => t.id));
              }
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            <span>Close Tabs to Right</span>
          </button>

          <button
            onClick={() =>
              handleRequestCloseTabs(tabs.filter((t) => !t.isDirty).map((t) => t.id))
            }
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Close Saved Tabs</span>
          </button>

          <button
            onClick={() =>
              handleRequestCloseTabs(tabs.filter((t) => t.isDirty).map((t) => t.id))
            }
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            <span>Close Unsaved Tabs</span>
          </button>

          <button
            onClick={() => handleRequestCloseTabs(tabs.map((t) => t.id))}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Close All Tabs</span>
          </button>

          <div className="border-t border-gray-800 my-1" />

          <button
            onClick={() => {
              duplicateTab(contextMenu.tabId);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-purple-400" />
            <span>Duplicate Tab</span>
          </button>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        queue={unsavedQueue}
        currentIndex={unsavedIndex}
        onSave={handleModalSave}
        onDontSave={handleModalDontSave}
        onSaveAll={handleModalSaveAll}
        onDontSaveAll={handleModalDontSaveAll}
        onCancel={handleModalCancel}
      />
    </div>
  );
};
