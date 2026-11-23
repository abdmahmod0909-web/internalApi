import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore, applyDynamicThemeStyles, BUILT_IN_THEMES } from './store/useAppStore.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { TabBar } from './components/TabBar.js';
import { RequestBuilder } from './components/request/RequestBuilder.js';
import { CollectionSettingsTab } from './components/request/CollectionSettingsTab.js';
import { ResponseViewer } from './components/response/ResponseViewer.js';
import { FlowBuilder } from './components/flows/FlowBuilder.js';
import { EnvironmentModal } from './components/environments/EnvironmentModal.js';
import { WorkspaceModal } from './components/workspaces/WorkspaceModal.js';
import { CommandPalette } from './components/common/CommandPalette.js';
import { ImportModal } from './components/common/ImportModal.js';
import { ExportModal } from './components/common/ExportModal.js';
import { OtaModal } from './components/common/OtaModal.js';
import { LoginModal } from './components/auth/LoginModal.js';
import { TeamModal } from './components/auth/TeamModal.js';
import { ProfileModal } from './components/auth/ProfileModal.js';
import { CloudSyncModal } from './components/auth/CloudSyncModal.js';
import { GripVertical, GripHorizontal, Palette, Sparkles, ChevronRight } from 'lucide-react';

export const App: React.FC = () => {
  const {
    currentUser,
    loadCollections,
    loadInitialData,
    sendRequest,
    saveCurrentRequest,
    theme,
    setTheme,
    availableThemes,
    otaInfo,
    setOtaModalOpen,
    splitRatio,
    setSplitRatio,
    layout,
    isImportModalOpen,
    setImportModalOpen,
    activeView,
    tabs,
    activeTabId,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isQuickThemeOpen, setIsQuickThemeOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = layout === 'horizontal';

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isCollectionTab = activeTab?.type === 'collection' && Boolean(activeTab.collectionId);
  const activeThemeDef =
    availableThemes.find((t) => t.id === theme) ||
    BUILT_IN_THEMES.find((t) => t.id === theme) ||
    BUILT_IN_THEMES[0];

  // Apply dynamic theme tokens and CSS rules whenever active theme or OTA theme catalog updates
  useEffect(() => {
    if (activeThemeDef) {
      applyDynamicThemeStyles(activeThemeDef);
    } else {
      document.documentElement.className = `theme-${theme}`;
    }
  }, [theme, activeThemeDef]);

  // Global keyboard shortcuts
  useEffect(() => {
    loadInitialData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const state = useAppStore.getState();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        if (activeTab?.request?.url?.trim()) {
          sendRequest();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentRequest();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setOtaModalOpen(true, 'themes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time synchronization across browser tabs and automatic background refresh
  useEffect(() => {
    if (!currentUser) return;

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('internalapi_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'sync_collections') {
          loadCollections();
        }
      };
    }

    // Background sync every 10 seconds to pull team updates in real time
    const interval = setInterval(() => {
      loadCollections();
    }, 10000);

    const handleFocus = () => {
      loadCollections();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      channel?.close();
    };
  }, [currentUser]);

  // Resizable split divider drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let rawPercent = 50;
      if (isHorizontal) {
        rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        rawPercent = ((e.clientY - rect.top) / rect.height) * 100;
      }

      // Clamp between 20% and 80%
      const clamped = Math.max(20, Math.min(80, rawPercent));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    const cursorType = isHorizontal ? 'col-resize' : 'row-resize';

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = cursorType;
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isHorizontal, setSplitRatio]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 font-sans antialiased selection:bg-orange-500/20">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center/Right Content Area: Either Flow Canvas or Request Tabs/Panes */}
        {activeView === 'flows' ? (
          <FlowBuilder />
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <TabBar />

            {isCollectionTab && activeTab?.collectionId ? (
              <CollectionSettingsTab key={activeTab.collectionId} collectionId={activeTab.collectionId} />
            ) : (
              /* Resizable Split View: Request Builder & Response Viewer */
              <div
                ref={containerRef}
                className={`flex flex-1 overflow-hidden relative ${
                  isHorizontal ? 'flex-row' : 'flex-col'
                }`}
              >
                {/* First Pane: Request Builder (Left in horizontal, Top in vertical) */}
                <div
                  style={
                    isHorizontal
                      ? { width: `${splitRatio}%`, height: '100%' }
                      : { height: `${splitRatio}%`, width: '100%' }
                  }
                  className="flex flex-col overflow-hidden shrink-0"
                >
                  <RequestBuilder />
                </div>

                {/* Draggable Divider Bar */}
                <div
                  onMouseDown={handleMouseDown}
                  className={`relative select-none shrink-0 transition-all duration-150 z-10 flex items-center justify-center group ${
                    isHorizontal
                      ? 'w-1.5 h-full cursor-col-resize'
                      : 'h-1.5 w-full cursor-row-resize'
                  } ${
                    isDragging
                      ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.45)]'
                      : 'bg-gray-800 hover:bg-orange-500/80'
                  }`}
                  title={isHorizontal ? 'Drag horizontally to resize' : 'Drag vertically to resize'}
                >
                  <div
                    className={`flex items-center justify-center text-gray-500 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity ${
                      isHorizontal ? 'w-4 h-8' : 'w-8 h-4'
                    }`}
                  >
                    {isHorizontal ? (
                      <GripVertical className="w-3.5 h-3.5" />
                    ) : (
                      <GripHorizontal className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                {/* Second Pane: Response Viewer (Right in horizontal, Bottom in vertical) */}
                <div
                  style={
                    isHorizontal
                      ? { width: `${100 - splitRatio}%`, height: '100%' }
                      : { height: `${100 - splitRatio}%`, width: '100%' }
                  }
                  className="flex flex-col overflow-hidden shrink-0"
                >
                  <ResponseViewer />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Quick Theme & OTA Studio Launcher */}
      <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end">
        {isQuickThemeOpen && (
          <div className="mb-2 w-64 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-2.5 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-gray-800">
              <span className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-orange-400" />
                <span>Quick Theme Switch</span>
              </span>
              <span className="text-[10px] text-gray-500">Ctrl+Shift+T</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
              {availableThemes.map((t) => {
                const selected = t.id === theme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setIsQuickThemeOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      selected
                        ? 'bg-orange-500/15 text-orange-400 font-semibold'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full border shrink-0"
                        style={{
                          backgroundColor: t.colors.accent,
                          borderColor: t.colors.borderStrong,
                        }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                    {t.isOta && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                        OTA
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsQuickThemeOpen(false);
                setOtaModalOpen(true, 'themes');
              }}
              className="w-full mt-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open OTA Theme Studio</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsQuickThemeOpen((prev) => !prev)}
          title="Switch Theme or Open OTA Theme Studio (Ctrl+Shift+T)"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gray-900/95 hover:bg-gray-800 border border-gray-800 shadow-lg text-[11px] font-medium text-gray-300 transition-all"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: activeThemeDef?.colors.accent || '#f97316' }}
          />
          <span>{activeThemeDef?.name || 'Theme'}</span>
          {otaInfo?.hasUpdate && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="OTA Update Available" />
          )}
        </button>
      </div>

      {/* Modals */}
      <WorkspaceModal />
      <EnvironmentModal />
      <CommandPalette />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} />
      <ExportModal />
      <OtaModal />
      <LoginModal />
      <TeamModal />
      <ProfileModal />
      <CloudSyncModal />
    </div>
  );
};
export default App;