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

/**
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

/**
 * Returns the persistent path where OTA-delivered theme packs are cached.
 */
export function getOtaThemesFilePath(): string {
  const otaDist = getOtaDistPath();
  return path.join(path.dirname(otaDist), 'ota_themes_manifest.json');
}

/**
 * Default OTA-ready theme catalog (enhanced core themes + new curated themes).
 */
export function getDefaultOtaThemeManifest(): OtaThemeManifest {
  return {
    version: '1.2.0',
    updatedAt: '2026-11-23T00:00:00.000Z',
    source: 'bundled',
    themes: [
      {
        id: 'dark',
        name: 'Obsidian Carbon',
        description: 'Refined deep obsidian dark mode with crisp borders and warm amber-orange accents.',
        category: 'dark',
        version: '1.2.0',
        badge: 'Enhanced',
        colors: {
          bgBase: '#090b10',
          bgSurface: '#0f131a',
          bgElevated: '#161b26',
          bgHover: '#1d2433',
          borderSubtle: '#1e2636',
          borderStrong: '#2e3a52',
          textPrimary: '#f1f5f9',
          textSecondary: '#cbd5e1',
          textMuted: '#64748b',
          accent: '#f97316',
          accentHover: '#ea580c',
          accentSoft: 'rgba(249, 115, 22, 0.14)',
          accentText: '#fb923c',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
          scrollbarThumb: '#283244',
          scrollbarTrack: '#0b0e14',
        },
      },
      {
        id: 'midnight',
        name: 'Deep Midnight',
        description: 'Abyssal indigo-slate workspace tuned for late-night API debugging with electric sky highlights.',
        category: 'dark',
        version: '1.2.0',
        badge: 'Enhanced',
        colors: {
          bgBase: '#060914',
          bgSurface: '#0b1121',
          bgElevated: '#121b33',
          bgHover: '#192545',
          borderSubtle: '#1c294a',
          borderStrong: '#2b3e6e',
          textPrimary: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#6b7fa8',
          accent: '#38bdf8',
          accentHover: '#0284c7',
          accentSoft: 'rgba(56, 189, 248, 0.15)',
          accentText: '#7dd3fc',
          success: '#34d399',
          warning: '#fbbf24',
          danger: '#fb7185',
          scrollbarThumb: '#23345c',
          scrollbarTrack: '#080c1a',
        },
      },
      {
        id: 'light',
        name: 'Daylight Studio',
        description: 'High-contrast alabaster and pure white surfaces with sharp slate typography.',
        category: 'light',
        version: '1.2.0',
        badge: 'Enhanced',
        colors: {
          bgBase: '#f1f5f9',
          bgSurface: '#ffffff',
          bgElevated: '#f8fafc',
          bgHover: '#e2e8f0',
          borderSubtle: '#e2e8f0',
          borderStrong: '#cbd5e1',
          textPrimary: '#0f172a',
          textSecondary: '#334155',
          textMuted: '#64748b',
          accent: '#ea580c',
          accentHover: '#c2410c',
          accentSoft: 'rgba(234, 88, 12, 0.12)',
          accentText: '#c2410c',
          success: '#059669',
          warning: '#d97706',
          danger: '#e11d48',
          scrollbarThumb: '#cbd5e1',
          scrollbarTrack: '#f1f5f9',
        },
      },
      {
        id: 'nord',
        name: 'Arctic Nord',
        description: 'Cool Scandinavian polar slate palette with calming frost cyan accents.',
        category: 'dark',
        version: '1.2.0',
        badge: 'New',
        colors: {
          bgBase: '#242933',
          bgSurface: '#2e3440',
          bgElevated: '#3b4252',
          bgHover: '#434c5e',
          borderSubtle: '#434c5e',
          borderStrong: '#4c566a',
          textPrimary: '#eceff4',
          textSecondary: '#d8dee9',
          textMuted: '#81a1c1',
          accent: '#88c0d0',
          accentHover: '#81a1c1',
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
        name: 'Dracula Pro',
        description: 'Rich velvet charcoal surfaces paired with vivid violet and magenta highlights.',
        category: 'dark',
        version: '1.2.0',
        badge: 'New',
        colors: {
          bgBase: '#181922',
          bgSurface: '#21222c',
          bgElevated: '#282a36',
          bgHover: '#343746',
          borderSubtle: '#36394a',
          borderStrong: '#4c5069',
          textPrimary: '#f8f8f2',
          textSecondary: '#d6d8e8',
          textMuted: '#7e86a8',
          accent: '#bd93f9',
          accentHover: '#a875f5',
          accentSoft: 'rgba(189, 147, 249, 0.16)',
          accentText: '#d6bcfa',
          success: '#50fa7b',
          warning: '#f1fa8c',
          danger: '#ff5555',
          scrollbarThumb: '#44475a',
          scrollbarTrack: '#181922',
        },
      },
      {
        id: 'emerald',
        name: 'Emerald Matrix',
        description: 'Deep forest-obsidian console aesthetic with crisp mint-emerald telemetry accents.',
        category: 'dark',
        version: '1.2.0',
        badge: 'New',
        colors: {
          bgBase: '#060d0b',
          bgSurface: '#0b1613',
          bgElevated: '#11221d',
          bgHover: '#172e27',
          borderSubtle: '#19332b',
          borderStrong: '#244a3f',
          textPrimary: '#ecfdf5',
          textSecondary: '#a7f3d0',
          textMuted: '#5e8c7d',
          accent: '#10b981',
          accentHover: '#059669',
          accentSoft: 'rgba(16, 185, 129, 0.15)',
          accentText: '#34d399',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#f43f5e',
          scrollbarThumb: '#1f4036',
          scrollbarTrack: '#060d0b',
        },
      },
      {
        id: 'cyberpunk',
        name: 'Neon Synth',
        description: 'High-energy ultraviolet night theme with electric rose-magenta accents.',
        category: 'dark',
        version: '1.2.0',
        badge: 'New',
        colors: {
          bgBase: '#0b0716',
          bgSurface: '#130d24',
          bgElevated: '#1c1433',
          bgHover: '#261b45',
          borderSubtle: '#2c1f52',
          borderStrong: '#432f7a',
          textPrimary: '#fdf2f8',
          textSecondary: '#e9d5ff',
          textMuted: '#8b74b8',
          accent: '#f43f5e',
          accentHover: '#e11d48',
          accentSoft: 'rgba(244, 63, 94, 0.16)',
          accentText: '#fb7185',
          success: '#2dd4bf',
          warning: '#facc15',
          danger: '#f43f5e',
          scrollbarThumb: '#382766',
          scrollbarTrack: '#0b0716',
        },
      },
      {
        id: 'solarized',
        name: 'Solarized Dusk',
        description: 'Precision-engineered warm teal-slate palette designed to eliminate eye fatigue.',
        category: 'dark',
        version: '1.2.0',
        badge: 'New',
        colors: {
          bgBase: '#00212b',
          bgSurface: '#002b36',
          bgElevated: '#073642',
          bgHover: '#0d4452',
          borderSubtle: '#0e4959',
          borderStrong: '#1a6175',
          textPrimary: '#fdf6e3',
          textSecondary: '#93a1a1',
          textMuted: '#657b83',
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

/**
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
      accentSoft: c.accentSoft || 'rgba(249, 115, 22, 0.15)',
      accentText: c.accentText || c.accent,
      success: c.success || '#10b981',
      warning: c.warning || '#f59e0b',
      danger: c.danger || '#f43f5e',
      scrollbarThumb: c.scrollbarThumb || c.borderStrong || c.borderSubtle,
      scrollbarTrack: c.scrollbarTrack || c.bgBase,
    },
  };
}

/**
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

/**
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

/**
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
      const apiRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
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

    // 2. Fallback to direct release download URL & raw main branch theme manifest
    candidateUrls.push(
      `https://github.com/${repo}/releases/latest/download/themes.json`,
      `https://raw.githubusercontent.com/${repo}/main/ota-themes.json`
    );
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

/**
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

/**
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

/**
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

/**
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

/**
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

    // 1. Try standard GitHub REST API
    try {
      const url = `https://api.github.com/repos/${repo}/releases/latest`;
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
        const redirectRes = await fetch(`https://github.com/${repo}/releases/latest`, {
          redirect: 'manual',
          headers: { 'User-Agent': 'InternalAPI-OTA/1.0' },
        });
        const location = redirectRes.headers.get('location') || '';
        const tagMatch = location.match(/\/releases\/tag\/([^/?#]+)/);
        if (tagMatch && tagMatch[1]) {
          tagName = tagMatch[1];
          latestVersion = tagName.replace(/^v/, '');
          assetName = 'ui-bundle.tar.gz';
          assetUrl = `https://github.com/${repo}/releases/download/${tagName}/ui-bundle.tar.gz`;
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

/**
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

/**
 * Reverts to the bundled version that came with the desktop app installer.
 */
export function revertOtaUpdate() {
  const otaDir = getOtaDistPath();
  if (fs.existsSync(otaDir)) {
    fs.rmSync(otaDir, { recursive: true, force: true });
  }
  return { success: true };
}