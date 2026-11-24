import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import type { ThemeDefinition } from '../../store/useAppStore.js';
import {
Sparkles,
Download,
RotateCcw,
CheckCircle2,
X,
Loader2,
RefreshCw,
Zap,
Palette,
Check,
CloudDownload,
Upload,
Sun,
Moon,
Eye,
} from 'lucide-react';

const SAMPLE_OTA_THEME_JSON = JSON.stringify(
{
version: '1.4.0',
themes: [
{
id: 'oatmeal-linen',
name: 'Oatmeal Linen OTA',
description: 'Soft warm oatmeal daylight palette delivered Over-The-Air for zero-glare reading.',
category: 'light',
badge: 'OTA Warm Light',
colors: {
bgBase: '#efe9de',
bgSurface: '#f8f4ec',
bgElevated: '#ece5d7',
bgHover: '#e2d9c8',
borderSubtle: '#ddd3c0',
borderStrong: '#c7baa2',
textPrimary: '#2b251e',
textSecondary: '#52473b',
textMuted: '#7a6d5d',
accent: '#b85c2c',
accentHover: '#9e4c21',
accentSoft: 'rgba(184, 92, 44, 0.12)',
accentText: '#a64f22',
success: '#2d7a53',
warning: '#b57416',
danger: '#c23b45',
scrollbarThumb: '#c7baa2',
scrollbarTrack: '#efe9de',
},
},
],
},
null,
2
);

export const OtaModal: React.FC = () => {
const {
isOtaModalOpen,
setOtaModalOpen,
otaModalTab,
setOtaModalTab,
otaInfo,
checkOtaUpdates,
applyOtaUpdateAction,
revertOtaAction,
isApplyingOta,
theme,
setTheme,
availableThemes,
otaThemeVersion,
hasOtaThemes,
isSyncingThemes,
syncOtaThemesAction,
installOtaThemePackAction,
revertOtaThemesAction,
} = useAppStore();

const [isChecking, setIsChecking] = useState(false);
const [successMessage, setSuccessMessage] = useState<string | null>(null);
const [themeFeedback, setThemeFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
const [showPushEditor, setShowPushEditor] = useState(false);
const [customPackJson, setCustomPackJson] = useState(SAMPLE_OTA_THEME_JSON);
const [themeCategoryFilter, setThemeCategoryFilter] = useState<'all' | 'dark' | 'light'>('all');

if (!isOtaModalOpen) return null;

const filteredThemes = availableThemes.filter((t) => {
if (themeCategoryFilter === 'all') return true;
return t.category === themeCategoryFilter;
});

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
setSuccessMessage('UI & Theme update installed successfully! Reloading in 1s...');
setTimeout(() => {
window.location.reload();
}, 1200);
}
};

const handleSyncThemes = async () => {
setThemeFeedback(null);
const res = await syncOtaThemesAction(otaInfo?.themeManifestUrl);
if (res.synced) {
setThemeFeedback({
type: 'success',
text: 'Latest OTA theme pack synced and applied live!',
});
} else {
setThemeFeedback({
type: 'info',
text: res.message || 'All built-in and OTA themes are up to date.',
});
}
};

const handlePushCustomTheme = async () => {
setThemeFeedback(null);
try {
const parsed = JSON.parse(customPackJson);
const res = await installOtaThemePackAction(parsed);
if (res.success) {
setThemeFeedback({
type: 'success',
text: 'OTA theme pack delivered and activated across your workspace!',
});
setShowPushEditor(false);
} else {
setThemeFeedback({
type: 'error',
text: res.error || 'Failed to install OTA theme pack.',
});
}
} catch (err: any) {
setThemeFeedback({
type: 'error',
text: `Invalid JSON: ${err.message}`,
});
}
};

const renderThemeCard = (item: ThemeDefinition) => {
const isActive = theme === item.id;
const c = item.colors;

```
return (
  <button
    key={item.id}
    type="button"
    onClick={() => setTheme(item.id)}
    className={`group text-left rounded-xl border p-3 transition-all duration-150 flex flex-col justify-between ${
      isActive
        ? 'border-orange-500 ring-1 ring-orange-500/40 bg-gray-950 shadow-lg'
        : 'border-gray-800 hover:border-gray-700 bg-gray-950/60 hover:bg-gray-950'
    }`}
  >
    {/* Mini UI Preview Window */}
    <div
      className="w-full h-16 rounded-lg overflow-hidden border mb-2.5 flex flex-col shadow-inner"
      style={{
        backgroundColor: c.bgBase,
        borderColor: c.borderSubtle,
      }}
    >
      {/* Mini Topbar */}
      <div
        className="h-3.5 px-2 flex items-center justify-between border-b"
        style={{
          backgroundColor: c.bgSurface,
          borderColor: c.borderSubtle,
        }}
      >
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.danger }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.warning }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.success }} />
        </div>
        <span
          className="w-6 h-1.5 rounded-full"
          style={{ backgroundColor: c.accent }}
        />
      </div>

      {/* Mini Workspace Split */}
      <div className="flex-1 flex">
        <div
          className="w-1/4 border-r p-1.5 space-y-1"
          style={{
            backgroundColor: c.bgSurface,
            borderColor: c.borderSubtle,
          }}
        >
          <div className="h-1 w-full rounded" style={{ backgroundColor: c.textMuted, opacity: 0.45 }} />
          <div className="h-1 w-3/4 rounded" style={{ backgroundColor: c.accent }} />
          <div className="h-1 w-4/5 rounded" style={{ backgroundColor: c.textMuted, opacity: 0.35 }} />
        </div>
        <div className="flex-1 p-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1">
            <div
              className="h-2.5 flex-1 rounded border"
              style={{ backgroundColor: c.bgElevated, borderColor: c.borderSubtle }}
            />
            <div
              className="h-2.5 w-6 rounded"
              style={{ backgroundColor: c.accent }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div
              className="h-4 rounded border"
              style={{ backgroundColor: c.bgElevated, borderColor: c.borderSubtle }}
            />
            <div
              className="h-4 rounded border"
              style={{ backgroundColor: c.bgSurface, borderColor: c.borderSubtle }}
            />
          </div>
        </div>
      </div>
    </div>

    {/* Theme Title & Badges */}
    <div>
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-semibold text-xs text-gray-100 truncate flex items-center gap-1.5">
          {item.category === 'light' ? (
            <Sun className="w-3 h-3 text-amber-400 shrink-0"/>
          ) : (
            <Moon className="w-3 h-3 text-sky-400 shrink-0"/>
          )}
          <span>{item.name}</span>
        </span>
        {isActive ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 shrink-0">
            <Check className="w-2.5 h-2.5"/>
            Active
          </span>
        ) : item.badge ? (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
              item.isOta
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-300 border border-gray-700'
            }`}
          >
            {item.badge}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-snug">
        {item.description}
      </p>
    </div>
  </button>
);

```

};

return (
<div
className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
onClick={() => !isApplyingOta && setOtaModalOpen(false)}
>
<div
className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden text-gray-200 flex flex-col max-h-[88vh]"
onClick={(e) => e.stopPropagation()}
>
{/* Header */}







Over-The-Air Studio

Hot Push



Eye-tuned themes & instant UI updates delivered without re-downloading the desktop installer



<button
onClick={() => setOtaModalOpen(false)}
disabled={isApplyingOta}
className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
>




```
    {/* Navigation Tabs */}
    <div className="flex items-center justify-between gap-2 px-6 pt-3 border-b border-gray-800 bg-gray-950/30 shrink-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOtaModalTab('themes')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            otaModalTab === 'themes'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5"/>
          <span>Themes & Eye-Care ({availableThemes.length})</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-800 text-gray-300 font-mono">
            v{otaThemeVersion}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOtaModalTab('updates')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            otaModalTab === 'updates'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5"/>
          <span>UI Bundle Updates</span>
          {otaInfo?.hasUpdate && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        </button>
      </div>

      {otaModalTab === 'themes' && (
        <div className="flex items-center gap-1 pb-2">
          {(['all', 'dark', 'light'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setThemeCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                themeCategoryFilter === cat
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'dark' ? 'Low-Glare Dark' : 'Warm Light'}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Modal Body */}
    <div className="p-6 overflow-y-auto flex-1 space-y-5">
      {otaModalTab === 'themes' ? (
        <>
          {/* Theme OTA Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gray-950 border border-gray-800">
            <div>
              <div className="text-xs font-semibold text-gray-100 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-orange-400"/>
                <span>Eye-Comfort OTA Theme Channel</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Pack v{otaThemeVersion}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Calibrated contrast & softened surfaces for long sessions. Sync remote OTA themes or push custom JSON.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPushEditor((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-orange-400"/>
                <span>{showPushEditor ? 'Close JSON' : 'Push OTA Theme'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncThemes}
                disabled={isSyncingThemes}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSyncingThemes ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                ) : (
                  <CloudDownload className="w-3.5 h-3.5"/>
                )}
                <span>{isSyncingThemes ? 'Syncing...' : 'Sync OTA Themes'}</span>
              </button>
            </div>
          </div>

          {themeFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                themeFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : themeFeedback.type === 'error'
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-gray-950 border-gray-800 text-gray-300'
              }`}
            >
              <span>{themeFeedback.text}</span>
              <button
                type="button"
                onClick={() => setThemeFeedback(null)}
                className="text-xs opacity-70 hover:opacity-100 ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Optional OTA JSON Hot-Push Panel */}
          {showPushEditor && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">
                  OTA Theme Pack Payload (Delivered via /api/ota/themes/apply)
                </span>
                <span className="text-[10px] text-gray-400">Persists across restarts</span>
              </div>
              <textarea
                value={customPackJson}
                onChange={(e) => setCustomPackJson(e.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full p-2.5 rounded-lg bg-gray-900 border border-gray-800 font-mono text-[11px] text-gray-200 focus:outline-none focus:border-orange-500 select-text"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPushEditor(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePushCustomTheme}
                  disabled={isSyncingThemes}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
                >
                  <Zap className="w-3.5 h-3.5"/>
                  <span>Deploy Theme Over OTA</span>
                </button>
              </div>
            </div>
          )}

          {/* Theme Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredThemes.map(renderThemeCard)}
          </div>
        </>
      ) : successMessage ? (
        <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center space-x-3 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0"/>
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
              <Sparkles className="w-4 h-4 text-orange-400 my-1 animate-spin"/>
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
              {otaInfo.releaseNotes || 'UI performance enhancements, eye-comfort theme upgrades, and feature improvements.'}
            </div>
          </div>

          <div className="text-[11px] text-gray-400 bg-gray-950 p-2.5 rounded border border-gray-800/80 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
            <span>Replaces the web bundle & syncs latest OTA themes. All your data, environments, and collections are 100% preserved.</span>
          </div>
        </>
      ) : (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-400"/>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-100">You're Up To Date</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              InternalAPI is currently running the latest UI version ({otaInfo?.currentVersion ? `v${otaInfo.currentVersion}` : 'latest'}) and Theme Pack v{otaThemeVersion}.
            </p>
          </div>
        </div>
      )}
    </div>

    {/* Footer Actions */}
    <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/40 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {otaInfo?.isOtaActive && !successMessage && (
          <button
            onClick={revertOtaAction}
            disabled={isApplyingOta}
            className="text-[11px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            title="Discard downloaded update and restore factory bundled build"
          >
            <RotateCcw className="w-3 h-3"/>
            <span>Revert UI bundle</span>
          </button>
        )}

        {hasOtaThemes && otaModalTab === 'themes' && (
          <button
            onClick={revertOtaThemesAction}
            className="text-[11px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            title="Reset OTA theme overrides back to built-in themes"
          >
            <RotateCcw className="w-3 h-3"/>
            <span>Reset OTA themes</span>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {otaModalTab === 'updates' && !otaInfo?.hasUpdate && !successMessage && (
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw ${isChecking ''}`} 'animate-spin' : ? className="{`w-3.5" h-3.5/>
            <span>{isChecking ? 'Checking...' : 'Check Again'}</span>
          </button>
        )}

        {otaModalTab === 'updates' && otaInfo?.hasUpdate && !successMessage && (
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
                  <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                  <span>Installing (~350 KB)...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5"/>
                  <span>Install & Reload</span>
                </>
              )}
            </button>
          </>
        )}

        {otaModalTab === 'themes' && (
          <button
            onClick={() => setOtaModalOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md transition-colors"
          >
            Done
          </button>
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

```

);
};