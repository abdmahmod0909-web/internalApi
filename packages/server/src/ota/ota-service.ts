import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import { fetch } from 'undici';

export interface OtaThemeTokens {
bgBase: string;
bgSurface: string;
bgElevated: string;
bgHover: string;
borderSubtle: string;
borderStrong: string;
textPrimary: string;
textSecondary: string;
textMuted: string;
accent: string;
accentHover: string;
accentSoft: string;
accentText: string;
success: string;
warning: string;
danger: string;
scrollbarThumb: string;
scrollbarTrack: string;
}

export interface OtaThemeDefinition {
id: string;
name: string;
description: string;
category: 'dark' | 'light';
isOta?: boolean;
version?: string;
badge?: string;
colors: OtaThemeTokens;
}

export interface OtaThemeManifest {
version: string;
updatedAt: string;
source?: string;
themes: OtaThemeDefinition[];
}

/

* Returns the persistent cross-platform user-data directory where
* Over-The-Air (OTA) UI bundles are installed.
*/
export function getOtaDistPath(): string {
if (process.env.APPDATA) {
// Windows: %APPDATA%/InternalAPI/ota_client_dist
return path.join(process.env.APPDATA, 'InternalAPI', 'ota_client_dist');
} else if (process.platform === 'darwin' && process.env.HOME) {
// macOS: ~/Library/Application Support/InternalAPI/ota_client_dist
return path.join(process.env.HOME, 'Library', 'Application Support', 'InternalAPI', 'ota_client_dist');
} else if (process.env.HOME) {
// Linux: ~/.config/InternalAPI/ota_client_dist
return path.join(process.env.HOME, '.config', 'InternalAPI', 'ota_client_dist');
}
return path.resolve(process.cwd(), '.data/ota_client_dist');
}

/

* Returns the persistent path where OTA-delivered theme packs are cached.
*/
export function getOtaThemesFilePath(): string {
const otaDist = getOtaDistPath();
return path.join(path.dirname(otaDist), 'ota_themes_manifest.json');
}

/

* Default OTA-ready theme catalog with eye-comfort contrast tuning,
* warm anti-glare light presets, and low-glare dark presets.
*/
export function getDefaultOtaThemeManifest(): OtaThemeManifest {
return {
version: '1.3.0',
updatedAt: '2026-11-24T00:00:00.000Z',
source: 'bundled',
themes: [
{
id: 'dark',
name: 'Obsidian Carbon',
description: 'Softened low-halation charcoal dark mode with balanced off-white text and warm amber accents.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#111318',
bgSurface: '#171a21',
bgElevated: '#1e222b',
bgHover: '#262b36',
borderSubtle: '#262b36',
borderStrong: '#363d4d',
textPrimary: '#e6e9ef',
textSecondary: '#bcc3d0',
textMuted: '#7c8599',
accent: '#ea7c3c',
accentHover: '#d96b2b',
accentSoft: 'rgba(234, 124, 60, 0.14)',
accentText: '#f2965e',
success: '#2bb673',
warning: '#e5a93c',
danger: '#e55c70',
scrollbarThumb: '#2e3442',
scrollbarTrack: '#111318',
},
},
{
id: 'midnight',
name: 'Twilight Slate',
description: 'Calming twilight indigo-slate workspace tuned to reduce blue-light glare during night debugging.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#0e131f',
bgSurface: '#141b2b',
bgElevated: '#1b2438',
bgHover: '#232f47',
borderSubtle: '#232f47',
borderStrong: '#334363',
textPrimary: '#e2e8f0',
textSecondary: '#b8c4d9',
textMuted: '#7888a6',
accent: '#56a8e8',
accentHover: '#3d94d6',
accentSoft: 'rgba(86, 168, 232, 0.14)',
accentText: '#7cc0f5',
success: '#38c793',
warning: '#eab348',
danger: '#eb6e80',
scrollbarThumb: '#293754',
scrollbarTrack: '#0e131f',
},
},
{
id: 'light',
name: 'Daylight Soft',
description: 'Anti-glare soft alabaster paper surfaces with comfortable slate ink and muted terracotta highlights.',
category: 'light',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#eceff3',
bgSurface: '#f7f8fa',
bgElevated: '#eef1f5',
bgHover: '#e3e7ed',
borderSubtle: '#dce1e8',
borderStrong: '#c5cdd8',
textPrimary: '#1e293b',
textSecondary: '#475569',
textMuted: '#6e7c91',
accent: '#d96226',
accentHover: '#bf5119',
accentSoft: 'rgba(217, 98, 38, 0.11)',
accentText: '#c2531b',
success: '#15805d',
warning: '#c27815',
danger: '#cf364c',
scrollbarThumb: '#c5cdd8',
scrollbarTrack: '#eceff3',
},
},
{
id: 'warm-paper',
name: 'Warm Paper',
description: 'E-ink inspired warm cream and ivory palette designed to eliminate harsh white screen glare.',
category: 'light',
version: '1.3.0',
badge: 'Warm Light',
colors: {
bgBase: '#f2ece1',
bgSurface: '#faf6ee',
bgElevated: '#efe8da',
bgHover: '#e5dccb',
borderSubtle: '#e0d6c3',
borderStrong: '#cbbda4',
textPrimary: '#2c261f',
textSecondary: '#544a3d',
textMuted: '#7d705e',
accent: '#c85a28',
accentHover: '#b04a1c',
accentSoft: 'rgba(200, 90, 40, 0.12)',
accentText: '#b54d1f',
success: '#2d7a53',
warning: '#b87614',
danger: '#c43b45',
scrollbarThumb: '#cbbda4',
scrollbarTrack: '#f2ece1',
},
},
{
id: 'sage-latte',
name: 'Botanical Sage',
description: 'Restful mineral-sage daylight palette with soft eucalyptus accents for fatigue-free reading.',
category: 'light',
version: '1.3.0',
badge: 'Warm Light',
colors: {
bgBase: '#e7ede8',
bgSurface: '#f3f7f4',
bgElevated: '#e4ece6',
bgHover: '#d7e2da',
borderSubtle: '#d0ddd4',
borderStrong: '#b5c7bb',
textPrimary: '#1e2b24',
textSecondary: '#415449',
textMuted: '#687d71',
accent: '#2b7a5b',
accentHover: '#216349',
accentSoft: 'rgba(43, 122, 91, 0.12)',
accentText: '#236b4e',
success: '#267854',
warning: '#b87a19',
danger: '#c73e4d',
scrollbarThumb: '#b5c7bb',
scrollbarTrack: '#e7ede8',
},
},
{
id: 'catppuccin-mocha',
name: 'Mocha Velvet',
description: 'Low-glare warm mocha surfaces paired with soft lavender-cream typography and gentle peach accents.',
category: 'dark',
version: '1.3.0',
badge: 'Low-Glare',
colors: {
bgBase: '#181825',
bgSurface: '#1e1e2e',
bgElevated: '#27273a',
bgHover: '#313247',
borderSubtle: '#313247',
borderStrong: '#45475e',
textPrimary: '#cdd6f4',
textSecondary: '#a6adc8',
textMuted: '#7f849c',
accent: '#e68a65',
accentHover: '#d67852',
accentSoft: 'rgba(230, 138, 101, 0.15)',
accentText: '#f0a282',
success: '#8bd59d',
warning: '#eed49f',
danger: '#ed8796',
scrollbarThumb: '#3b3d54',
scrollbarTrack: '#181825',
},
},
{
id: 'gruvbox-warm',
name: 'Gruvbox Amber',
description: 'Earthy warm espresso-charcoal dark theme with zero harsh blue tones and creamy parchment text.',
category: 'dark',
version: '1.3.0',
badge: 'Low-Glare',
colors: {
bgBase: '#1d2021',
bgSurface: '#262727',
bgElevated: '#302f2e',
bgHover: '#3c3937',
borderSubtle: '#3c3836',
borderStrong: '#504945',
textPrimary: '#ebdbb2',
textSecondary: '#d5c4a1',
textMuted: '#928374',
accent: '#d79921',
accentHover: '#c28617',
accentSoft: 'rgba(215, 153, 33, 0.15)',
accentText: '#fabd2f',
success: '#98971a',
warning: '#d79921',
danger: '#cc241d',
scrollbarThumb: '#48423e',
scrollbarTrack: '#1d2021',
},
},
{
id: 'rose-pine-moon',
name: 'Rosé Pine Dusk',
description: 'Muted twilight mauve-slate canvas with soft ivory text and gentle rose-gold accents.',
category: 'dark',
version: '1.3.0',
badge: 'Low-Glare',
colors: {
bgBase: '#1f1d2e',
bgSurface: '#26233a',
bgElevated: '#312e49',
bgHover: '#3b3757',
borderSubtle: '#393552',
borderStrong: '#4e496e',
textPrimary: '#e0def4',
textSecondary: '#b8b5d1',
textMuted: '#817c9c',
accent: '#ea9a97',
accentHover: '#db8683',
accentSoft: 'rgba(234, 154, 151, 0.15)',
accentText: '#f2b1ae',
success: '#9ccfd8',
warning: '#f6c177',
danger: '#eb6f92',
scrollbarThumb: '#443f61',
scrollbarTrack: '#1f1d2e',
},
},
{
id: 'forest-moss',
name: 'Deep Moss',
description: 'Matte organic olive-charcoal workspace crafted for calm, multi-hour engineering focus.',
category: 'dark',
version: '1.3.0',
badge: 'Low-Glare',
colors: {
bgBase: '#141815',
bgSurface: '#1b201c',
bgElevated: '#232a25',
bgHover: '#2c352e',
borderSubtle: '#2b342d',
borderStrong: '#3c493f',
textPrimary: '#dce3dc',
textSecondary: '#b4c2b5',
textMuted: '#788a7a',
accent: '#5ca374',
accentHover: '#4b8f62',
accentSoft: 'rgba(92, 163, 116, 0.15)',
accentText: '#78bd8f',
success: '#5ca374',
warning: '#cfa24e',
danger: '#d46666',
scrollbarThumb: '#333e35',
scrollbarTrack: '#141815',
},
},
{
id: 'nord',
name: 'Arctic Nord',
description: 'Cool Scandinavian polar slate palette with calming frost cyan accents.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#242933',
bgSurface: '#2e3440',
bgElevated: '#3b4252',
bgHover: '#434c5e',
borderSubtle: '#434c5e',
borderStrong: '#4c566a',
textPrimary: '#e5e9f0',
textSecondary: '#d8dee9',
textMuted: '#8899b3',
accent: '#88c0d0',
accentHover: '#77b1c2',
accentSoft: 'rgba(136, 192, 208, 0.16)',
accentText: '#8fbcbb',
success: '#a3be8c',
warning: '#ebcb8b',
danger: '#bf616a',
scrollbarThumb: '#4c566a',
scrollbarTrack: '#242933',
},
},
{
id: 'dracula',
name: 'Dracula Soft',
description: 'Velvet charcoal surfaces with toned-down violet highlights for comfortable contrast.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#1c1e26',
bgSurface: '#232630',
bgElevated: '#2b2e3b',
bgHover: '#353949',
borderSubtle: '#36394a',
borderStrong: '#4c5069',
textPrimary: '#ececf1',
textSecondary: '#c5c8da',
textMuted: '#8289a8',
accent: '#a984e8',
accentHover: '#966fd9',
accentSoft: 'rgba(169, 132, 232, 0.16)',
accentText: '#c3a6f5',
success: '#5ad683',
warning: '#e6db7a',
danger: '#eb6767',
scrollbarThumb: '#44475a',
scrollbarTrack: '#1c1e26',
},
},
{
id: 'emerald',
name: 'Emerald Sage',
description: 'Softened forest-slate console aesthetic with gentle mint-emerald telemetry accents.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#0f1715',
bgSurface: '#141f1c',
bgElevated: '#1b2925',
bgHover: '#22342f',
borderSubtle: '#22352f',
borderStrong: '#304a42',
textPrimary: '#e2eee9',
textSecondary: '#b5cfc5',
textMuted: '#729488',
accent: '#2bb082',
accentHover: '#22966e',
accentSoft: 'rgba(43, 176, 130, 0.15)',
accentText: '#52c99f',
success: '#2bb082',
warning: '#e0a43b',
danger: '#e06072',
scrollbarThumb: '#283d37',
scrollbarTrack: '#0f1715',
},
},
{
id: 'cyberpunk',
name: 'Dusk Plum',
description: 'Muted ultraviolet night theme with softened rose-berry accents that avoid neon glare.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#15111f',
bgSurface: '#1c1729',
bgElevated: '#241e34',
bgHover: '#2e2642',
borderSubtle: '#2f2745',
borderStrong: '#433861',
textPrimary: '#ede8f5',
textSecondary: '#c9bede',
textMuted: '#897ca3',
accent: '#e05a7a',
accentHover: '#cc4767',
accentSoft: 'rgba(224, 90, 122, 0.15)',
accentText: '#ed7b96',
success: '#42bfa8',
warning: '#e6be49',
danger: '#e05a7a',
scrollbarThumb: '#382e52',
scrollbarTrack: '#15111f',
},
},
{
id: 'solarized',
name: 'Solarized Dusk',
description: 'Precision-engineered warm teal-slate palette with creamy parchment text to eliminate eye fatigue.',
category: 'dark',
version: '1.3.0',
badge: 'Eye-Tuned',
colors: {
bgBase: '#00212b',
bgSurface: '#002b36',
bgElevated: '#073642',
bgHover: '#0d4452',
borderSubtle: '#0e4959',
borderStrong: '#1a6175',
textPrimary: '#e8e2cf',
textSecondary: '#a3b2b2',
textMuted: '#6f878f',
accent: '#2aa198',
accentHover: '#21867e',
accentSoft: 'rgba(42, 161, 152, 0.16)',
accentText: '#4fd1c5',
success: '#859900',
warning: '#b58900',
danger: '#dc322f',
scrollbarThumb: '#145363',
scrollbarTrack: '#00212b',
},
},
],
};
}

/

* Validates and normalizes an incoming OTA theme definition.
*/
function normalizeOtaTheme(raw: any, fallbackVersion: string): OtaThemeDefinition | null {
if (!raw || typeof raw !== 'object' || !raw.id || !raw.name || !raw.colors) {
return null;
}
const c = raw.colors;
const requiredKeys: (keyof OtaThemeTokens)[] = [
'bgBase',
'bgSurface',
'bgElevated',
'borderSubtle',
'textPrimary',
'accent',
];
for (const key of requiredKeys) {
if (typeof c[key] !== 'string' || !c[key].trim()) {
return null;
}
}

return {
id: String(raw.id).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
name: String(raw.name).trim(),
description: String(raw.description || 'Over-The-Air delivered custom workspace theme').trim(),
category: raw.category === 'light' ? 'light' : 'dark',
isOta: true,
version: String(raw.version || fallbackVersion),
badge: raw.badge ? String(raw.badge) : 'OTA',
colors: {
bgBase: c.bgBase,
bgSurface: c.bgSurface,
bgElevated: c.bgElevated,
bgHover: c.bgHover || c.bgElevated,
borderSubtle: c.borderSubtle,
borderStrong: c.borderStrong || c.borderSubtle,
textPrimary: c.textPrimary,
textSecondary: c.textSecondary || c.textPrimary,
textMuted: c.textMuted || '#64748b',
accent: c.accent,
accentHover: c.accentHover || c.accent,
accentSoft: c.accentSoft || 'rgba(234, 124, 60, 0.15)',
accentText: c.accentText || c.accent,
success: c.success || '#2bb673',
warning: c.warning || '#e5a93c',
danger: c.danger || '#e55c70',
scrollbarThumb: c.scrollbarThumb || c.borderStrong || c.borderSubtle,
scrollbarTrack: c.scrollbarTrack || c.bgBase,
},
};
}

/

* Returns the merged active theme manifest (defaults + persisted OTA themes).
*/
export function getOtaThemesManifest(): OtaThemeManifest & { hasOtaThemes: boolean } {
const defaults = getDefaultOtaThemeManifest();
const themesFile = getOtaThemesFilePath();

if (fs.existsSync(themesFile)) {
try {
const raw = JSON.parse(fs.readFileSync(themesFile, 'utf8'));
if (raw && Array.isArray(raw.themes) && raw.themes.length > 0) {
const mergedMap = new Map<string, OtaThemeDefinition>();
for (const t of defaults.themes) {
mergedMap.set(t.id, t);
}
for (const incoming of raw.themes) {
const normalized = normalizeOtaTheme(incoming, raw.version || defaults.version);
if (normalized) {
mergedMap.set(normalized.id, normalized);
}
}
return {
version: raw.version || defaults.version,
updatedAt: raw.updatedAt || new Date().toISOString(),
source: raw.source || 'ota',
hasOtaThemes: true,
themes: Array.from(mergedMap.values()),
};
}
} catch (_) {}
}

return {
...defaults,
hasOtaThemes: false,
};
}

/

* Saves an OTA theme pack directly to persistent storage so clients receive it over OTA.
*/
export function applyOtaThemePack(payload: {
version?: string;
source?: string;
themes: any[];
}): OtaThemeManifest & { hasOtaThemes: boolean; installedCount: number } {
if (!payload || !Array.isArray(payload.themes) || payload.themes.length === 0) {
throw new Error('Theme pack must include a non-empty "themes" array');
}

const targetVersion = payload.version || `1.${Date.now().toString().slice(-4)}.0`;
const normalizedThemes: OtaThemeDefinition[] = [];
for (const item of payload.themes) {
const norm = normalizeOtaTheme(item, targetVersion);
if (norm) {
normalizedThemes.push(norm);
}
}

if (normalizedThemes.length === 0) {
throw new Error('No valid theme definitions found in OTA theme pack');
}

const themesFile = getOtaThemesFilePath();
const parentDir = path.dirname(themesFile);
if (!fs.existsSync(parentDir)) {
fs.mkdirSync(parentDir, { recursive: true });
}

// Merge with any previously installed OTA themes
let existingOta: OtaThemeDefinition[] = [];
if (fs.existsSync(themesFile)) {
try {
const prev = JSON.parse(fs.readFileSync(themesFile, 'utf8'));
if (Array.isArray(prev?.themes)) {
existingOta = prev.themes;
}
} catch (_) {}
}

const otaMap = new Map<string, OtaThemeDefinition>();
for (const t of existingOta) {
const norm = normalizeOtaTheme(t, targetVersion);
if (norm) otaMap.set(norm.id, norm);
}
for (const t of normalizedThemes) {
otaMap.set(t.id, t);
}

const savedManifest: OtaThemeManifest = {
version: targetVersion,
updatedAt: new Date().toISOString(),
source: payload.source || 'ota-push',
themes: Array.from(otaMap.values()),
};

fs.writeFileSync(themesFile, JSON.stringify(savedManifest, null, 2), 'utf8');

return {
...getOtaThemesManifest(),
installedCount: normalizedThemes.length,
};
}

/

* Syncs OTA themes from a remote manifest URL or GitHub Release asset (`themes.json` / `ota-themes.json`).
*/
export async function syncOtaThemesFromRemote(
repo = 'abdmahmod0909-web/internalApi',
manifestUrl?: string
) {
let candidateUrls: string[] = [];

if (manifestUrl && manifestUrl.trim()) {
candidateUrls.push(manifestUrl.trim());
} else {
// 1. Check latest GitHub release for a `themes.json` or `ota-themes.json` asset
try {
const apiRes = await fetch(`[https://api.github.com/repos/$](https://api.github.com/repos/$){repo}/releases/latest`, {
headers: {
'User-Agent': 'InternalAPI-OTA/1.0',
'Accept': 'application/vnd.github.v3+json',
},
});
if (apiRes.ok) {
const release = (await apiRes.json()) as any;
const assets = release.assets || [];
const themeAsset = assets.find(
(a: any) =>
a.name === 'themes.json' ||
a.name === 'ota-themes.json' ||
a.name === 'themes-manifest.json'
);
if (themeAsset?.browser_download_url) {
candidateUrls.push(themeAsset.browser_download_url);
}
}
} catch (_) {}

```
// 2. Fallback to direct release download URL & raw main branch theme manifest
candidateUrls.push(
  `[https://github.com/$](https://github.com/$){repo}/releases/latest/download/themes.json`,
  `[https://raw.githubusercontent.com/$](https://raw.githubusercontent.com/$){repo}/main/ota-themes.json`
);

```

}

for (const url of candidateUrls) {
try {
const res = await fetch(url, {
headers: { 'User-Agent': 'InternalAPI-OTA/1.0' },
});
if (!res.ok) continue;
const data = (await res.json()) as any;
if (data && Array.isArray(data.themes) && data.themes.length > 0) {
const result = applyOtaThemePack({
version: data.version || '1.3.0',
source: url,
themes: data.themes,
});
return {
synced: true,
source: url,
...result,
};
}
} catch (_) {}
}

// If no remote manifest is published yet, return the active manifest gracefully
const current = getOtaThemesManifest();
return {
synced: false,
message: 'No external OTA theme manifest found; using latest built-in & cached OTA themes.',
...current,
};
}

/

* Reverts OTA themes back to the built-in theme catalog.
*/
export function revertOtaThemes() {
const themesFile = getOtaThemesFilePath();
if (fs.existsSync(themesFile)) {
fs.unlinkSync(themesFile);
}
return {
success: true,
...getOtaThemesManifest(),
};
}

/

* Reads the application version from a static folder's version.json.
*/
export function getCurrentVersion(staticPath?: string | null): string {
try {
if (staticPath) {
const vFile = path.join(staticPath, 'version.json');
if (fs.existsSync(vFile)) {
const data = JSON.parse(fs.readFileSync(vFile, 'utf8'));
if (data.version) return data.version;
}
}
} catch (_) {}
return '1.0.0';
}

/

* Returns current OTA status (active version, installation timestamp, theme pack status).
*/
export function getOtaStatus(baseStaticPath?: string | null) {
const otaPath = getOtaDistPath();
const isOtaActive = fs.existsSync(path.join(otaPath, 'index.html'));
let otaVersion: string | null = null;
let otaInstalledAt: string | null = null;

if (isOtaActive) {
try {
const vFile = path.join(otaPath, 'version.json');
if (fs.existsSync(vFile)) {
const v = JSON.parse(fs.readFileSync(vFile, 'utf8'));
otaVersion = v.version || null;
otaInstalledAt = v.installedAt || null;
}
} catch (_) {}
}

const currentVersion = isOtaActive && otaVersion ? otaVersion : getCurrentVersion(baseStaticPath);
const themeManifest = getOtaThemesManifest();

return {
isOtaActive,
otaPath,
currentVersion,
otaVersion,
otaInstalledAt,
themePackVersion: themeManifest.version,
hasOtaThemes: themeManifest.hasOtaThemes,
themeCount: themeManifest.themes.length,
};
}

/

* Compare two semantic versions (e.g. "1.0.3" vs "1.0.2").
* Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
*/
export function compareVersions(v1: string, v2: string): number {
const p1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const p2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
const num1 = p1[i] || 0;
const num2 = p2[i] || 0;
if (num1 > num2) return 1;
if (num1 < num2) return -1;
}
return 0;
}

/

* Checks GitHub Releases for a newer UI bundle asset and optional OTA theme manifest.
* Includes rate-limit-proof redirect fallback if GitHub REST API returns 403.
*/
export async function checkForUpdates(baseStaticPath?: string | null, repo = 'abdmahmod0909-web/internalApi') {
const status = getOtaStatus(baseStaticPath);
const currentVersion = status.currentVersion;

try {
let tagName = '';
let latestVersion = '';
let releaseName = '';
let releaseNotes = '';
let publishedAt: string | null = null;
let assetName: string | null = null;
let assetUrl: string | null = null;
let assetSize = 0;
let hasAsset = false;
let themeManifestUrl: string | null = null;

```
// 1. Try standard GitHub REST API
try {
  const url = `[https://api.github.com/repos/$](https://api.github.com/repos/$){repo}/releases/latest`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'InternalAPI-OTA/1.0',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (res.ok) {
    const release = (await res.json()) as any;
    tagName = release.tag_name || '';
    latestVersion = tagName.replace(/^v/, '');
    const assets = release.assets || [];
    const uiBundleAsset = assets.find(
      (a: any) => a.name === 'ui-bundle.tar.gz' || a.name === 'ui-bundle.zip'
    );
    if (uiBundleAsset) {
      hasAsset = true;
      assetName = uiBundleAsset.name;
      assetUrl = uiBundleAsset.browser_download_url;
      assetSize = uiBundleAsset.size;
    }
    const themeAsset = assets.find(
      (a: any) => a.name === 'themes.json' || a.name === 'ota-themes.json'
    );
    if (themeAsset) {
      themeManifestUrl = themeAsset.browser_download_url;
    }
    releaseName = release.name || tagName;
    releaseNotes = release.body || '';
    publishedAt = release.published_at || null;
  }
} catch (_) {}

// 2. If REST API was rate-limited (403) or failed, fallback to zero-rate-limit GitHub redirect
if (!latestVersion) {
  try {
    const redirectRes = await fetch(`[https://github.com/$](https://github.com/$){repo}/releases/latest`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'InternalAPI-OTA/1.0' },
    });
    const location = redirectRes.headers.get('location') || '';
    const tagMatch = location.match(/\/releases\/tag\/([^/?#]+)/);
    if (tagMatch && tagMatch[1]) {
      tagName = tagMatch[1];
      latestVersion = tagName.replace(/^v/, '');
      assetName = 'ui-bundle.tar.gz';
      assetUrl = `[https://github.com/$](https://github.com/$){repo}/releases/download/${tagName}/ui-bundle.tar.gz`;
      hasAsset = true;
      releaseName = tagName;
      releaseNotes = `OTA Hot Update release ${tagName}`;
    }
  } catch (_) {}
}

if (!latestVersion) {
  return {
    hasUpdate: false,
    currentVersion,
    isOtaActive: status.isOtaActive,
    themePackVersion: status.themePackVersion,
    themeCount: status.themeCount,
    message: 'Could not resolve latest release from GitHub',
  };
}

const isNewer = compareVersions(latestVersion, currentVersion) > 0;

return {
  hasUpdate: isNewer && hasAsset,
  currentVersion,
  latestVersion,
  isOtaActive: status.isOtaActive,
  releaseName: releaseName || tagName,
  releaseNotes: releaseNotes || '',
  publishedAt: publishedAt || new Date().toISOString(),
  assetName,
  assetUrl,
  assetSize,
  themeManifestUrl,
  themePackVersion: status.themePackVersion,
  themeCount: status.themeCount,
};

```

} catch (err: any) {
return {
hasUpdate: false,
currentVersion,
isOtaActive: status.isOtaActive,
themePackVersion: status.themePackVersion,
themeCount: status.themeCount,
message: err.message || 'Failed to check for updates',
};
}
}

/

* Downloads the lightweight UI bundle and extracts it to the OTA user directory.
* If the bundle includes an `ota-themes.json` or `themes.json` file, automatically installs it too.
*/
export async function applyOtaUpdate(assetUrl: string, latestVersion: string) {
const otaDir = getOtaDistPath();
const tempDir = os.tmpdir();
const isZip = assetUrl.endsWith('.zip');
const tempFile = path.join(tempDir, `internalapi-ui-${Date.now()}.${isZip ? 'zip' : 'tar.gz'}`);

// 1. Download asset buffer
const res = await fetch(assetUrl, {
headers: {
'User-Agent': 'InternalAPI-OTA/1.0',
},
});

if (!res.ok) {
throw new Error(`Failed to download UI bundle: HTTP ${res.status}`);
}

const arrayBuffer = await res.arrayBuffer();
fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

// 2. Prepare destination directory
if (!fs.existsSync(otaDir)) {
fs.mkdirSync(otaDir, { recursive: true });
}

// 3. Extract using native tar (universal across Windows 10/11, macOS, and Linux)
try {
if (isZip) {
if (process.platform === 'win32') {
cp.execSync(`tar -xf "${tempFile}" -C "${otaDir}"`);
} else {
cp.execSync(`unzip -o "${tempFile}" -d "${otaDir}"`);
}
} else {
cp.execSync(`tar -xzf "${tempFile}" -C "${otaDir}"`);
}
} catch (err: any) {
throw new Error(`Failed to extract update package: ${err.message}`);
} finally {
try {
fs.unlinkSync(tempFile);
} catch (_) {}
}

// 4. Verify index.html exists, or un-nest if archived with a wrapper directory
if (!fs.existsSync(path.join(otaDir, 'index.html'))) {
const subdirs = fs.readdirSync(otaDir).filter((f) => {
try {
return fs.statSync(path.join(otaDir, f)).isDirectory();
} catch {
return false;
}
});

```
for (const sub of subdirs) {
  const nestedIndex = path.join(otaDir, sub, 'index.html');
  if (fs.existsSync(nestedIndex)) {
    const files = fs.readdirSync(path.join(otaDir, sub));
    for (const file of files) {
      const src = path.join(otaDir, sub, file);
      const dest = path.join(otaDir, file);
      if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
      fs.renameSync(src, dest);
    }
    break;
  }
}

```

}

if (!fs.existsSync(path.join(otaDir, 'index.html'))) {
throw new Error('Update bundle corrupted: index.html not found after extraction');
}

// 4b. If the UI bundle ships bundled OTA themes (ota-themes.json or themes.json), activate them automatically
for (const candidateName of ['ota-themes.json', 'themes.json']) {
const bundledThemeFile = path.join(otaDir, candidateName);
if (fs.existsSync(bundledThemeFile)) {
try {
const parsed = JSON.parse(fs.readFileSync(bundledThemeFile, 'utf8'));
if (parsed && Array.isArray(parsed.themes) && parsed.themes.length > 0) {
applyOtaThemePack({
version: parsed.version || latestVersion,
source: `ui-bundle:${latestVersion}`,
themes: parsed.themes,
});
}
} catch (_) {}
break;
}
}

// 5. Save version metadata
fs.writeFileSync(
path.join(otaDir, 'version.json'),
JSON.stringify({ version: latestVersion, installedAt: new Date().toISOString() }, null, 2),
'utf8'
);

return {
success: true,
version: latestVersion,
path: otaDir,
};
}

/

* Reverts to the bundled version that came with the desktop app installer.
*/
export function revertOtaUpdate() {
const otaDir = getOtaDistPath();
if (fs.existsSync(otaDir)) {
fs.rmSync(otaDir, { recursive: true, force: true });
}
return { success: true };
}