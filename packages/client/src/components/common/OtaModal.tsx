import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export const OtaModal: React.FC = () => {
  const {
    isOtaModalOpen,
    setOtaModalOpen,
    otaInfo,
    checkOtaUpdates,
    applyOtaUpdateAction,
    revertOtaAction,
    isApplyingOta,
  } = useAppStore();

  const [isChecking, setIsChecking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOtaModalOpen) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkOtaUpdates();
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstall = async () => {
    const success = await applyOtaUpdateAction();
    if (success) {
      setSuccessMessage('UI update installed successfully! Reloading in 1s...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={() => !isApplyingOta && setOtaModalOpen(false)}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                <span>Over-The-Air Update</span>
                <span className="text-[10px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Hot Push
                </span>
              </h3>
              <p className="text-xs text-gray-400">Instant UI updates without re-downloading desktop installer</p>
            </div>
          </div>
          <button
            onClick={() => setOtaModalOpen(false)}
            disabled={isApplyingOta}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {successMessage ? (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center space-x-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs font-medium">{successMessage}</div>
            </div>
          ) : otaInfo?.hasUpdate ? (
            <>
              {/* Version Comparison Card */}
              <div className="p-4 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Installed UI</div>
                  <div className="text-sm font-mono font-bold text-gray-300 mt-0.5">
                    v{otaInfo.currentVersion}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-8 h-[1px] bg-orange-500/50"></div>
                  <Sparkles className="w-4 h-4 text-orange-400 my-1 animate-spin" />
                  <div className="w-8 h-[1px] bg-orange-500/50"></div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">Available UI</div>
                  <div className="text-sm font-mono font-bold text-orange-400 mt-0.5">
                    v{otaInfo.latestVersion}
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              <div>
                <div className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>What's New in {otaInfo.releaseName || `v${otaInfo.latestVersion}`}</span>
                  {otaInfo.assetSize ? (
                    <span className="text-[11px] text-gray-500 font-normal">
                      Package size: {(otaInfo.assetSize / 1024).toFixed(0)} KB
                    </span>
                  ) : null}
                </div>
                <div className="max-h-40 overflow-y-auto p-3 rounded-lg bg-gray-950/80 border border-gray-800 text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {otaInfo.releaseNotes || 'UI performance enhancements, style fixes, and feature improvements.'}
                </div>
              </div>

              <div className="text-[11px] text-gray-400 bg-gray-950 p-2.5 rounded border border-gray-800/80 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
                <span>Only replaces the web bundle (~350 KB). All your data, environments, and collections are 100% preserved.</span>
              </div>
            </>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-100">You're Up To Date</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  InternalAPI is currently running the latest UI version ({otaInfo?.currentVersion ? `v${otaInfo.currentVersion}` : 'latest'}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/40 flex items-center justify-between">
          <div>
            {otaInfo?.isOtaActive && !successMessage && (
              <button
                onClick={revertOtaAction}
                disabled={isApplyingOta}
                className="text-[11px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Discard downloaded update and restore factory bundled build"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert to factory version</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!otaInfo?.hasUpdate && !successMessage && (
              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check Again'}</span>
              </button>
            )}

            {otaInfo?.hasUpdate && !successMessage && (
              <>
                <button
                  onClick={() => setOtaModalOpen(false)}
                  disabled={isApplyingOta}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleInstall}
                  disabled={isApplyingOta}
                  className="flex items-center space-x-2 px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-md shadow-sm transition-colors disabled:opacity-50"
                >
                  {isApplyingOta ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Installing (~350 KB)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Install & Reload</span>
                    </>
                  )}
                </button>
              </>
            )}

            {successMessage && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors"
              >
                Reload Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

