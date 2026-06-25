const JELLY_SHADER_MARKER = 'BlobioJellyPhysics';
const JELLY_SHADER_VANILLA_KEY = 'config-switch-jelly-physics';

const DEFAULT_JELLY_SHADER_RUNTIME_SETTINGS = Object.freeze({
  enabled: false,
  skinCells: true,
  noSkinCells: false,
});

export function pageJellyShaderBootstrap(initialSettings, pageWindow = globalThis) {
  const win = pageWindow;
  let settings = normalizeJellyShaderRuntimeSettings(initialSettings);

  if (win.location?.hostname !== 'custom.client.blobgame.io') {
    return false;
  }

  if (win.__blobioJellyShaderInstalled) {
    win.__blobioJellyShaderRefresh?.(settings);
    return true;
  }
  win.__blobioJellyShaderInstalled = true;

  const status = {
    version: initialSettings?.version || '',
    enabled: settings.enabled,
    shaderSourcesSeen: 0,
    shaderSourcesPatched: 0,
    skinShaderPatches: 0,
    noSkinShaderPatches: 0,
    hookInstalled: false,
    reloadNeeded: false,
  };
  win.__blobioJellyShaderStatus = status;
  win.__blobioJellyShaderRefresh = refresh;

  prepareVanillaJellyShaderPath();
  installShaderHook();
  retryShaderHook();
  return true;

  function refresh(nextSettings) {
    const previous = settings;
    settings = normalizeJellyShaderRuntimeSettings(nextSettings);
    status.enabled = settings.enabled;
    prepareVanillaJellyShaderPath();
    if (settings.enabled && status.shaderSourcesPatched > 0) {
      markVanillaJellyDisabled();
    }
    if (
      status.shaderSourcesSeen > 0
      && (
        previous.enabled !== settings.enabled
        || previous.skinCells !== settings.skinCells
        || previous.noSkinCells !== settings.noSkinCells
      )
    ) {
      status.reloadNeeded = true;
    }
  }

  function prepareVanillaJellyShaderPath() {
    if (!settings.enabled) {
      return;
    }

    try {
      win.localStorage?.setItem?.(JELLY_SHADER_VANILLA_KEY, 'true');
    } catch {}
  }

  function markVanillaJellyDisabled() {
    if (!settings.enabled) {
      return;
    }

    try {
      win.localStorage?.setItem?.(JELLY_SHADER_VANILLA_KEY, 'false');
    } catch {}

    const checkbox = win.document?.getElementById?.(JELLY_SHADER_VANILLA_KEY);
    if (checkbox) {
      checkbox.checked = false;
      checkbox.setAttribute?.('aria-checked', 'false');
    }
  }

  function installShaderHook() {
    const contexts = [win.WebGLRenderingContext, win.WebGL2RenderingContext];
    for (const Ctor of contexts) {
      if (!Ctor?.prototype || Ctor.prototype.__blobioJellyShaderHooked) {
        continue;
      }

      const nativeShaderSource = Ctor.prototype.shaderSource;
      if (typeof nativeShaderSource !== 'function') {
        continue;
      }

      Ctor.prototype.shaderSource = function blobioJellyShaderSource(shader, source) {
        status.shaderSourcesSeen += 1;
        const patched = patchShaderSource(source);
        if (patched.changed) {
          status.shaderSourcesPatched += 1;
          if (patched.skinPatched) {
            status.skinShaderPatches += 1;
          }
          if (patched.noSkinPatched) {
            status.noSkinShaderPatches += 1;
          }
          markVanillaJellyDisabled();
          return nativeShaderSource.call(this, shader, patched.source);
        }
        return nativeShaderSource.call(this, shader, source);
      };

      Ctor.prototype.__blobioJellyShaderHooked = true;
      status.hookInstalled = true;
    }
  }

  function retryShaderHook() {
    let attempts = 0;
    const timer = win.setInterval?.(() => {
      attempts += 1;
      installShaderHook();
      if (status.hookInstalled || attempts >= 40) {
        win.clearInterval?.(timer);
      }
    }, 100);
  }

  function patchShaderSource(source) {
    if (typeof source !== 'string' || !settings.enabled || (!settings.skinCells && !settings.noSkinCells)) {
      return { source, changed: false };
    }

    if (source.includes(JELLY_SHADER_MARKER) || !isCellShader(source)) {
      return { source, changed: false };
    }

    const centerPattern = /(const\s+vec2\s+CENTER_COORD\s*=\s*vec2\s*\(\s*0\.5\s*,\s*0\.5\s*\)\s*;)/;
    const scalePattern = /float\s+scale\s*=\s*v_scale\s*;\s*RADIUS\s*-=\s*scale\s*;/;
    if (!centerPattern.test(source)) {
      return { source, changed: false };
    }

    let patched = source.replace(centerPattern, `$1\n\n${buildJellyGlsl(settings.noSkinCells)}`);
    let skinPatched = false;
    let noSkinPatched = false;

    if (settings.skinCells && scalePattern.test(patched)) {
      patched = patched.replace(scalePattern, 'float scale = blobioJellyScale(v_scale, v_texCoords);\n    RADIUS -= scale;');
      skinPatched = true;
    }

    if (settings.noSkinCells && patched.includes('drawEmptyCell')) {
      const next = patchNoSkinCellShader(patched);
      noSkinPatched = next !== patched;
      patched = next;
    }

    return {
      source: patched,
      changed: patched !== source,
      skinPatched,
      noSkinPatched,
    };
  }

  function patchNoSkinCellShader(source) {
    const startPattern = /void\s+drawEmptyCell\s*\(\s*\)\s*\{\s*float\s+len\s*=\s*length\s*\(\s*CENTER_COORD\s*-\s*v_texCoords\s*\)\s*;/;
    if (!startPattern.test(source)) {
      return source;
    }

    return source
      .replace(
        startPattern,
        'void drawEmptyCell() {\n\n    float emptyRadius = blobioJellyEmptyRadius(v_scale, v_texCoords);\n    float len = length(CENTER_COORD - v_texCoords);',
      )
      .replace(/if\s*\(\s*len\s*<\s*0\.5\s*\)\s*\{/, 'if (len < emptyRadius) {')
      .replace(/if\s*\(\s*len\s*<\s*0\.5\s*\*\s*0\.954\s*\)\s*\{/, 'if (len < emptyRadius * 0.954) {');
  }

  function isCellShader(source) {
    return source.includes('varying float v_scale')
      && source.includes('uniform float u_time')
      && source.includes('CENTER_COORD')
      && /RADIUS\s*-=\s*scale\s*;/.test(source);
  }

  function buildJellyGlsl(includeNoSkinCells) {
    const lines = [
      `/* ${JELLY_SHADER_MARKER}. Uses existing u_time and v_scale uniforms only. */`,
      'float blobioJellyScale(float baseScale, vec2 uv) {',
      '    vec2 rel = uv - CENTER_COORD;',
      '    float dist = length(rel);',
      '    float edge = smoothstep(0.18, 0.50, dist);',
      '    float splitEnergy = clamp(baseScale * 5.0, 0.0, 1.0);',
      '    float wave = sin((rel.x - rel.y) * 18.0 + u_time * 5.4) * 0.010;',
      '    float ripple = sin((rel.x + rel.y) * 24.0 - u_time * 3.1 + baseScale * 28.0) * 0.005;',
      '    float wobble = (wave + ripple) * edge * (0.35 + splitEnergy * 0.65);',
      '    return max(0.0, baseScale * 0.86 + wobble);',
      '}',
    ];

    if (includeNoSkinCells) {
      lines.push(
        '',
        'float blobioJellyEmptyRadius(float baseScale, vec2 uv) {',
        '    return max(0.38, 0.50 - blobioJellyScale(baseScale, uv));',
        '}',
      );
    }

    return lines.join('\n');
  }
}

function normalizeJellyShaderRuntimeSettings(settings = {}) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    enabled: source.enabled === undefined ? DEFAULT_JELLY_SHADER_RUNTIME_SETTINGS.enabled : Boolean(source.enabled),
    skinCells: source.skinCells === undefined ? DEFAULT_JELLY_SHADER_RUNTIME_SETTINGS.skinCells : Boolean(source.skinCells),
    noSkinCells: source.noSkinCells === undefined ? DEFAULT_JELLY_SHADER_RUNTIME_SETTINGS.noSkinCells : Boolean(source.noSkinCells),
    version: source.version || '',
  };
}
