import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from './store/useAppStore.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { TabBar } from './components/TabBar.js';
import { RequestBuilder } from './components/request/RequestBuilder.js';
import { ResponseViewer } from './components/response/ResponseViewer.js';
import { FlowBuilder } from './components/flows/FlowBuilder.js';
import { EnvironmentModal } from './components/environments/EnvironmentModal.js';
import { WorkspaceModal } from './components/workspaces/WorkspaceModal.js';
import { CommandPalette } from './components/common/CommandPalette.js';
import { ImportModal } from './components/common/ImportModal.js';
import { GripVertical, GripHorizontal } from 'lucide-react';

export const App: React.FC = () => {
  const {
    loadInitialData,
    sendRequest,
    saveCurrentRequest,
    theme,
    splitRatio,
    setSplitRatio,
    layout,
    isImportModalOpen,
    setImportModalOpen,
    activeView,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = layout === 'horizontal';

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 font-sans">
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

            {/* Resizable Split View: Request Builder & Response Viewer */}
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
                className={`relative select-none shrink-0 transition-colors z-10 flex items-center justify-center ${
                  isHorizontal
                    ? 'w-1.5 h-full cursor-col-resize'
                    : 'h-1.5 w-full cursor-row-resize'
                } ${
                  isDragging
                    ? 'bg-orange-500'
                    : 'bg-gray-800 hover:bg-orange-500/80'
                }`}
                title={isHorizontal ? 'Drag horizontally to resize' : 'Drag vertically to resize'}
              >
                <div
                  className={`flex items-center justify-center text-gray-500 pointer-events-none opacity-40 hover:opacity-100 ${
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
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkspaceModal />
      <EnvironmentModal />
      <CommandPalette />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
};
export default App;
