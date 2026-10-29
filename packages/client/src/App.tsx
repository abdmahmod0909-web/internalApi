import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { TabBar } from './components/TabBar.js';
import { RequestBuilder } from './components/request/RequestBuilder.js';
import { ResponseViewer } from './components/response/ResponseViewer.js';
import { EnvironmentModal } from './components/environments/EnvironmentModal.js';
import { CommandPalette } from './components/common/CommandPalette.js';

export const App: React.FC = () => {
  const { loadInitialData, sendRequest, saveCurrentRequest } = useAppStore();

  useEffect(() => {
    loadInitialData();

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendRequest();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 font-sans">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center/Right Request & Response Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />

          {/* Split View: Request Builder (Left) & Response Viewer (Right) */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 flex flex-col h-full border-r border-gray-800">
              <RequestBuilder />
            </div>
            <div className="w-1/2 flex flex-col h-full">
              <ResponseViewer />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EnvironmentModal />
      <CommandPalette />
    </div>
  );
};
export default App;

