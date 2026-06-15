export function pageVirusMotherCellBootstrap(initialConfig, pageWindow) {
  'use strict';

  const win = pageWindow || globalThis;
  const doc = win.document;
  const config = normalizeConfig(initialConfig);
  const loaderStatus = win.__blobioVirusMotherCellLoaderStatus || {};
  loaderStatus.bootstrapEntered = true;
  loaderStatus.bootstrapHost = win.location?.hostname || '';
  loaderStatus.bootstrapEnabled = config.enabled;
  win.__blobioVirusMotherCellLoaderStatus = loaderStatus;

  if (!config.enabled || win.location?.hostname !== 'custom.client.blobgame.io') {
    loaderStatus.bootstrapResult = 'skipped';
    return false;
  }

  const INSTALL_KEY = '__blobioVirusMotherCellInstalled';
  if (win[INSTALL_KEY]) {
    return true;
  }
  win[INSTALL_KEY] = true;

  const CACHE_SCRIPT_RE = /\/html\/[a-f0-9]{32}\.cache\.js(?:[?#].*)?$/i;
  const GLOW_MASK_RE = /(?:^|\/)(?:assets\/)?skins\/system\/_glow_mask\.png(?:[?#].*)?$/i;
  const RENDER_LOOP_RE = /var b,c,d,e,f,g,h;for\(e=0;e<\(([$A-Za-z_][$\w]*)\(\),([$A-Za-z_][$\w]*)\)\.d\.a\.length;e\+\+\)\{/;
  const RENDER_CELL_RE = /g=[$A-Za-z_][$\w]*\([$A-Za-z_][$\w]*\.d,e\);if\(!a\.c\|\|!g\|\|!g\.K\|\|!g\.c\)\{continue\}[$A-Za-z_][$\w]*\(g\);/;
  const VIRUS_BRANCH_RE = /case 4:case 3:if\(g\.q\)\{if\(g\.P\)\{h=g\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,g\.K\);([$A-Za-z_][$\w]*)\(a\.c,h,g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}\}else\{\1\(\);\2\(a\.c,g\.K\);\3\(a\.c,(a\.[$A-Za-z_][$\w]*),g\.R-g\.M,g\.S-g\.M,g\.N,g\.N\)\}break;/;
  const FALLBACK_RENDER_RE = /function ([$A-Za-z_][$\w]*)\(a,b\)\{var c;if\(b\.q\)\{c=b\.P;([$A-Za-z_][$\w]*)\(\);([$A-Za-z_][$\w]*)\(a\.c,b\.K\);([$A-Za-z_][$\w]*)\(a\.c,c,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else if\(b\.P\)\{\3\(a\.c,b\.K\);\4\(a\.c,b\.P,b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}else\{b\.K\.a=0\.75;\3\(a\.c,b\.K\);\4\(a\.c,([$A-Za-z_][$\w]*),b\.R-b\.M,b\.S-b\.M,b\.N,b\.N\)\}\}/;
  const ROTATED_DRAW_RE = /function ([$A-Za-z_][$\w]*)\(a,b,c,d,e,f,g,h,i,j,k\)\{var [^;]+;if\(!a\.j\)throw [^;]+;[$A-Za-z_][$\w]*=a\.C;[$A-Za-z_][$\w]*=b\.v;[^{}]*?=c\+e;[^{}]*?=d\+f;[^{}]*?=-e;[^{}]*?=-f;/;

  const settings = {
    maskId: config.maskId,
    maskUrl: config.maskUrl,
    rotate: config.maskId === 'rotate' && config.rotate,
    color: config.color,
    alpha: config.alpha,
    r: parseInt(config.color.slice(1, 3), 16) / 255,
    g: parseInt(config.color.slice(3, 5), 16) / 255,
    b: parseInt(config.color.slice(5, 7), 16) / 255,
  };
  win.__blobVirusGlowSettings = settings;

  const state = win.__blobVirusGlowState || {
    callbackCalls: 0,
    version: config.version || '',
    glowMaskAssetHits: 0,
    glowMaskTextureUploads: 0,
    customMaskReady: false,
    customMaskErrors: 0,
    rotationDraws: 0,
    rotationStateChecks: 0,
    rotationHighDetailDraws: 0,
    rotationFallbackDraws: 0,
    rotationTextureDraws: 0,
    rotationGlowTextureDraws: 0,
    highDetailGlowDraws: 0,
    fallbackGlowDraws: 0,
    nonRotatedHighDetailDraws: 0,
    nonRotatedFallbackDraws: 0,
    rotateChecks: 0,
    rotateMaskActive: settings.rotate,
    lastRotateMaskId: settings.maskId,
    glowTextureDraws: 0,
    frame: 0,
    viruses: [],
    cellTypes: {},
    fallbackVirusHits: 0,
    highDetailVirusHits: 0,
    skippedVirusTextureDraws: 0,
    textureVirusHits: 0,
    virusTextureDraws: 0,
    patchedChunks: 0,
    seenCacheScripts: 0,
    wrappedCallback: false,
    errors: [],
    lastPatchResult: null,
    lastPatchRotateSelected: false,
    rotatedDrawName: null,
    lastUpdate: 0,
  };
  state.version = config.version || state.version;
  state.cellTypes ||= {};
  state.rotateMaskActive = settings.rotate;
  state.lastRotateMaskId = settings.maskId;
  win.__blobVirusGlowState = state;
  state.patchBundle = patchBundle;
  loaderStatus.bootstrapResult = 'installing';

  let customGlowMaskImage = null;
  let customGlowMaskUrl = '';

  preloadCustomGlowMask();
  installGlowMaskTexturePatch();
  installGlowMaskAssetPatch();
  installRotationHelpers();
  installDebugSnapshot();

  const NodeCtor = win.Node;
  if (!NodeCtor?.prototype) {
    return false;
  }

  const nativeAppendChild = NodeCtor.prototype.appendChild;
  const nativeInsertBefore = NodeCtor.prototype.insertBefore;

  function normalizeConfig(value) {
    const color = typeof value?.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color)
      ? value.color.toLowerCase()
      : '#ff0000';
    const rawAlpha = Number(value?.alpha);
    return {
      enabled: Boolean(value?.enabled),
      maskId: ['halo', 'rotate', 'ring'].includes(value?.maskId) ? value.maskId : 'halo',
      maskUrl: String(value?.maskUrl || ''),
      color,
      alpha: Number.isFinite(rawAlpha) ? Math.max(0, Math.min(1, rawAlpha)) : 0.85,
      rotate: Boolean(value?.rotate),
      version: String(value?.version || ''),
    };
  }

  function preloadCustomGlowMask() {
    getCustomGlowMaskImage();
  }

  function getCustomGlowMaskImage() {
    if (customGlowMaskImage && customGlowMaskUrl === settings.maskUrl) {
      return customGlowMaskImage;
    }

    const ImageCtor = win.Image || win.HTMLImageElement;
    if (typeof ImageCtor !== 'function' || !settings.maskUrl) {
      return null;
    }

    const image = new ImageCtor();
    if (!settings.maskUrl.startsWith('data:') && !settings.maskUrl.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    customGlowMaskImage = image;
    customGlowMaskUrl = settings.maskUrl;
    state.customMaskReady = false;
    image.onload = () => {
      state.customMaskReady = true;
    };
    image.onerror = () => {
      state.customMaskErrors = (state.customMaskErrors + 1) || 1;
    };
    image.src = settings.maskUrl;

    if (image.complete || image.naturalWidth > 0 || image.width > 0) {
      state.customMaskReady = true;
    }
    return image;
  }

  function installGlowMaskTexturePatch() {
    patchWebGLTextureUpload(win.WebGLRenderingContext);
    patchWebGLTextureUpload(win.WebGL2RenderingContext);
  }

  function patchWebGLTextureUpload(ContextCtor) {
    if (!ContextCtor?.prototype || ContextCtor.prototype.__blobVirusGlowTexImagePatched) {
      return;
    }
    const nativeTexImage2D = ContextCtor.prototype.texImage2D;
    if (typeof nativeTexImage2D !== 'function') {
      return;
    }

    ContextCtor.prototype.texImage2D = function patchedTexImage2D(...args) {
      const sourceIndex = findTextureSourceIndex(args);
      if (sourceIndex !== -1 && isGlowMaskSource(args[sourceIndex])) {
        const replacement = getCustomGlowMaskImage();
        if (replacement) {
          state.glowMaskTextureUploads = (state.glowMaskTextureUploads + 1) || 1;
          state.lastGlowMaskUploadSource = getTextureSourceUrl(args[sourceIndex]);
          args[sourceIndex] = replacement;
        }
      }
      return nativeTexImage2D.apply(this, args);
    };
    ContextCtor.prototype.__blobVirusGlowTexImagePatched = true;
  }

  function findTextureSourceIndex(args) {
    for (let index = args.length - 1; index >= 0; index -= 1) {
      if (isTextureSource(args[index])) {
        return index;
      }
    }
    return -1;
  }

  function isTextureSource(value) {
    return Boolean(value && typeof value === 'object'
      && ('src' in value || 'currentSrc' in value || 'tagName' in value || 'naturalWidth' in value));
  }

  function isGlowMaskSource(source) {
    return GLOW_MASK_RE.test(getTextureSourceUrl(source));
  }

  function getTextureSourceUrl(source) {
    if (!source) {
      return '';
    }
    return String(source.currentSrc || source.src || source.getAttribute?.('src') || '');
  }

  function installGlowMaskAssetPatch() {
    const ImageCtor = win.HTMLImageElement;
    if (!ImageCtor?.prototype) {
      return;
    }

    const imageProto = ImageCtor.prototype;
    const srcDescriptor = findPropertyDescriptor(imageProto, 'src');
    if (srcDescriptor?.set && !imageProto.__blobVirusGlowSrcPatched) {
      Object.defineProperty(imageProto, 'src', {
        get: srcDescriptor.get,
        set(value) {
          const nextValue = rewriteGlowMaskUrl(value);
          if (nextValue !== value && !nextValue.startsWith('data:') && !nextValue.startsWith('blob:')) {
            this.crossOrigin = 'anonymous';
          }
          return srcDescriptor.set.call(this, nextValue);
        },
        configurable: true,
        enumerable: srcDescriptor.enumerable,
      });
      imageProto.__blobVirusGlowSrcPatched = true;
    }

    const ElementCtor = win.Element;
    if (!ElementCtor?.prototype || ElementCtor.prototype.__blobVirusGlowSetAttributePatched) {
      return;
    }
    const nativeSetAttribute = ElementCtor.prototype.setAttribute;
    ElementCtor.prototype.setAttribute = function patchedSetAttribute(name, value) {
      const isImage = this instanceof ImageCtor || String(this.tagName).toUpperCase() === 'IMG';
      if (String(name).toLowerCase() === 'src' && isImage) {
        const nextValue = rewriteGlowMaskUrl(value);
        if (nextValue !== value && !nextValue.startsWith('data:') && !nextValue.startsWith('blob:')) {
          this.crossOrigin = 'anonymous';
        }
        return nativeSetAttribute.call(this, name, nextValue);
      }
      return nativeSetAttribute.call(this, name, value);
    };
    ElementCtor.prototype.__blobVirusGlowSetAttributePatched = true;
  }

  function rewriteGlowMaskUrl(value) {
    if (typeof value !== 'string' || !GLOW_MASK_RE.test(value)) {
      return value;
    }
    state.glowMaskAssetHits = (state.glowMaskAssetHits + 1) || 1;
    return settings.maskUrl;
  }

  function findPropertyDescriptor(proto, property) {
    let current = proto;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, property);
      if (descriptor) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current);
    }
    return null;
  }

  function installRotationHelpers() {
    const rotations = new Map();
    win.__blobVirusGlowShouldRotate = function shouldRotate() {
      state.rotateChecks = (state.rotateChecks + 1) || 1;
      return settings.rotate;
    };
    win.__blobVirusGlowGetRotation = function getRotation(id, x, y) {
      const hasId = id !== null && id !== undefined && id !== '';
      const key = hasId ? String(id) : `${Math.round(Number(x) || 0)}:${Math.round(Number(y) || 0)}`;
      if (rotations.has(key)) {
        return rotations.get(key);
      }
      let hash = 2166136261;
      for (let index = 0; index < key.length; index += 1) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      const rotation = Math.abs(hash % 360);
      rotations.set(key, rotation);
      return rotation;
    };
    win.__blobVirusGlowGetDrawRotation = function getDrawRotation(id, x, y, sourceName) {
      const source = sourceName === 'fallback' ? 'fallback' : 'high-detail';
      state.rotationStateChecks = (state.rotationStateChecks + 1) || 1;
      if (!settings.rotate) {
        state.lastRotationSkippedSource = source;
        return 0;
      }
      const rotation = win.__blobVirusGlowGetRotation(id, x, y);
      state.rotationDraws = (state.rotationDraws + 1) || 1;
      if (source === 'fallback') {
        state.rotationFallbackDraws = (state.rotationFallbackDraws + 1) || 1;
      } else {
        state.rotationHighDetailDraws = (state.rotationHighDetailDraws + 1) || 1;
      }
      state.lastRotation = rotation;
      state.lastRotationSource = source;
      state.lastRotationMaskId = settings.maskId;
      return rotation;
    };
  }

  function installDebugSnapshot() {
    win.__blobVirusGlowDebug = function debugSnapshot() {
      return {
        version: state.version,
        enabled: true,
        maskId: settings.maskId,
        shouldRotate: settings.rotate,
        loaderStatus: { ...loaderStatus },
        callbackCalls: state.callbackCalls,
        patchedChunks: state.patchedChunks,
        seenCacheScripts: state.seenCacheScripts,
        wrappedCallback: state.wrappedCallback,
        lastPatchResult: state.lastPatchResult,
        lastPatchRotateSelected: state.lastPatchRotateSelected,
        rotatedDrawName: state.rotatedDrawName,
        customMaskReady: state.customMaskReady,
        customMaskErrors: state.customMaskErrors,
        glowMaskAssetHits: state.glowMaskAssetHits,
        glowMaskTextureUploads: state.glowMaskTextureUploads,
        highDetailVirusHits: state.highDetailVirusHits,
        highDetailGlowDraws: state.highDetailGlowDraws,
        rotationHighDetailDraws: state.rotationHighDetailDraws,
        fallbackVirusHits: state.fallbackVirusHits,
        fallbackGlowDraws: state.fallbackGlowDraws,
        rotationFallbackDraws: state.rotationFallbackDraws,
        textureVirusHits: state.textureVirusHits,
        glowTextureDraws: state.glowTextureDraws,
        rotationGlowTextureDraws: state.rotationGlowTextureDraws,
        rotationDraws: state.rotationDraws,
        rotationStateChecks: state.rotationStateChecks,
        rotateChecks: state.rotateChecks,
        rotateMaskActive: state.rotateMaskActive,
        lastGlowDrawSource: state.lastGlowDrawSource,
        lastRotationSource: state.lastRotationSource,
        lastRotationSkippedSource: state.lastRotationSkippedSource,
        lastRotation: state.lastRotation,
        lastHighDetailCell: state.lastHighDetailCell,
        lastFallbackCell: state.lastFallbackCell,
        lastGlowTextureCell: state.lastGlowTextureCell,
        errors: [...state.errors],
      };
    };
  }

  function patchBundle(source) {
    let code = source;
    const branchMatch = code.match(VIRUS_BRANCH_RE);
    const drawRegionName = branchMatch ? branchMatch[3] : null;
    const rotatedDrawName = rememberRotatedDrawFunction(code) || state.rotatedDrawName;
    const glowTexture = findGlowTextureFromAsset(code) || 'a.n';
    const virusTexture = branchMatch ? branchMatch[4] : 'a.A';
    let renderLoopPatched = false;
    let renderCellPatched = false;
    let virusBranchPatched = false;
    let fallbackRenderPatched = false;
    let textureDrawPatched = false;

    if (RENDER_LOOP_RE.test(code)) {
      code = code.replace(RENDER_LOOP_RE, (match) => match.replace(
        ';for(',
        `;if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.frame=($wnd.__blobVirusGlowState.frame+1)||1;$wnd.__blobVirusGlowState.viruses.length=0;$wnd.__blobVirusGlowState.currentCell=null;$wnd.__blobVirusGlowState.virusTexture=${virusTexture};$wnd.__blobVirusGlowState.glowTexture=${glowTexture};}for(`,
      ));
      renderLoopPatched = true;
    }

    if (RENDER_CELL_RE.test(code)) {
      code = code.replace(RENDER_CELL_RE, (match) => match
        + 'h=$wnd.__blobVirusGlowState;'
        + 'if(h){h.currentCell=g;h.cellTypes||(h.cellTypes={});h.cellTypes[g.c.M]=(h.cellTypes[g.c.M]+1)||1}');
      renderCellPatched = true;
    }

    if (VIRUS_BRANCH_RE.test(code)) {
      code = code.replace(VIRUS_BRANCH_RE, (match, initDrawState, setColor, drawRegion, branchVirusTexture, offset, fullCode) => {
        const branchGlowTexture = findGlowTextureFromAsset(fullCode) || findGlowTexture(fullCode, offset + match.length, drawRegion);
        const drawGlow = buildGlowDrawCall(rotatedDrawName, drawRegion, 'g', 'a.c', branchGlowTexture, 'high-detail');
        return 'case 4:case 3:'
          + 'h=$wnd.__blobVirusGlowState;'
          + 'if(h){h.viruses.push({id:g.n,x:g.R,y:g.S,r:g.M,size:g.N,mode:1,type:g.c.M});h.highDetailVirusHits=(h.highDetailVirusHits+1)||1;h.lastUpdate=(new Date).getTime()}'
          + 'h=$wnd.__blobVirusGlowSettings;f=g.K.d;d=g.K.c;b=g.K.b;c=g.K.a;'
          + 'g.K.d=h&&h.r!=null?h.r:1;g.K.c=h&&h.g!=null?h.g:0;g.K.b=h&&h.b!=null?h.b:0;g.K.a=h&&h.alpha!=null?h.alpha:0.85;'
          + `${initDrawState}();${setColor}(a.c,g.K);${drawGlow};`
          + 'g.K.d=f;g.K.c=d;g.K.b=b;g.K.a=c;break;';
      });
      virusBranchPatched = true;
    }

    if (FALLBACK_RENDER_RE.test(code)) {
      code = code.replace(FALLBACK_RENDER_RE, (match, fallbackName, initDrawState, setColor, drawRegion, defaultTexture, offset, fullCode) => {
        const fallbackGlowTexture = findGlowTextureFromAsset(fullCode) || 'a.n';
        const drawGlow = buildGlowDrawCall(rotatedDrawName, drawRegion, 'b', 'a.c', fallbackGlowTexture, 'fallback');
        return `function ${fallbackName}(a,b){var c,d,e,f,g;if(b.c&&(b.c.M==4||b.c.M==3)){`
          + 'c=$wnd.__blobVirusGlowState;'
          + 'if(c){c.viruses.push({id:b.n,x:b.R,y:b.S,r:b.M,size:b.N,mode:0,type:b.c.M});c.fallbackVirusHits=(c.fallbackVirusHits+1)||1;c.lastUpdate=(new Date).getTime()}'
          + 'c=$wnd.__blobVirusGlowSettings;d=b.K.d;e=b.K.c;f=b.K.b;g=b.K.a;'
          + 'b.K.d=c&&c.r!=null?c.r:1;b.K.c=c&&c.g!=null?c.g:0;b.K.b=c&&c.b!=null?c.b:0;b.K.a=c&&c.alpha!=null?c.alpha:0.85;'
          + `${initDrawState}();${setColor}(a.c,b.K);${drawGlow};`
          + 'b.K.d=d;b.K.c=e;b.K.b=f;b.K.a=g;return}'
          + `if(b.q){c=b.P;${initDrawState}();${setColor}(a.c,b.K);${drawRegion}(a.c,c,b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else if(b.P){${setColor}(a.c,b.K);${drawRegion}(a.c,b.P,b.R-b.M,b.S-b.M,b.N,b.N)}`
          + `else{b.K.a=0.75;${setColor}(a.c,b.K);${drawRegion}(a.c,${defaultTexture},b.R-b.M,b.S-b.M,b.N,b.N)}}`;
      });
      fallbackRenderPatched = true;
    }

    if (drawRegionName) {
      const patchedDrawRegion = patchDrawRegionFunction(code, drawRegionName, rotatedDrawName);
      code = patchedDrawRegion.code;
      textureDrawPatched = patchedDrawRegion.changed;
    }

    const result = {
      code,
      changed: renderLoopPatched || renderCellPatched || virusBranchPatched || fallbackRenderPatched || textureDrawPatched,
      renderLoopPatched,
      renderCellPatched,
      virusBranchPatched,
      fallbackRenderPatched,
      textureDrawPatched,
      rotatedDrawPatched: Boolean(rotatedDrawName),
    };
    state.lastPatchResult = { ...result, code: undefined };
    return result;
  }

  function buildGlowDrawCall(rotatedDrawName, drawRegion, cellName, batchName, textureName, sourceName) {
    const normalDraw = `${drawRegion}(${batchName},${textureName},${cellName}.R-${cellName}.M*2,${cellName}.S-${cellName}.M*2,${cellName}.N*2,${cellName}.N*2)`;
    const isFallback = sourceName === 'fallback';
    const drawCounter = isFallback ? 'fallbackGlowDraws' : 'highDetailGlowDraws';
    const nonRotatedCounter = isFallback ? 'nonRotatedFallbackDraws' : 'nonRotatedHighDetailDraws';
    const lastCell = isFallback ? 'lastFallbackCell' : 'lastHighDetailCell';
    const markDraw = `if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.${drawCounter}=($wnd.__blobVirusGlowState.${drawCounter}+1)||1;$wnd.__blobVirusGlowState.lastGlowDrawSource='${sourceName}';$wnd.__blobVirusGlowState.${lastCell}={id:${cellName}.n,x:${cellName}.R,y:${cellName}.S,r:${cellName}.M,size:${cellName}.N,type:${cellName}.c?${cellName}.c.M:null,hasName:!!${cellName}.B,u:!!${cellName}.u,rflag:!!${cellName}.r,t:!!${cellName}.t,q:!!${cellName}.q}}`;
    if (!rotatedDrawName) {
      return `${markDraw}if($wnd.__blobVirusGlowState){$wnd.__blobVirusGlowState.${nonRotatedCounter}=($wnd.__blobVirusGlowState.${nonRotatedCounter}+1)||1}${normalDraw}`;
    }
    return `${markDraw}${rotatedDrawName}(${batchName},${textureName},${cellName}.R-${cellName}.M*2,${cellName}.S-${cellName}.M*2,${cellName}.N,${cellName}.N,${cellName}.N*2,${cellName}.N*2,1,1,$wnd.__blobVirusGlowGetDrawRotation?$wnd.__blobVirusGlowGetDrawRotation(${cellName}.n,${cellName}.R,${cellName}.S,'${sourceName}'):0)`;
  }

  function patchDrawRegionFunction(code, drawRegionName, rotatedDrawName) {
    const escapedName = escapeRegExp(drawRegionName);
    const drawFunction = new RegExp(`function ${escapedName}\\(a,b,c,d,e,f\\)\\{var g,h,i,j,k,l,m,n,o,p;`);
    if (!drawFunction.test(code)) {
      return { code, changed: false };
    }

    return {
      code: code.replace(drawFunction, (match) => match
        + 'g=$wnd.__blobVirusGlowState;'
        + (rotatedDrawName
          ? `if(g&&g.glowTexture&&b&&(b===g.glowTexture||b.v===g.glowTexture.v&&b.w===g.glowTexture.w&&b.C===g.glowTexture.C&&b.A===g.glowTexture.A&&b.B===g.glowTexture.B)){h=g.currentCell;g.glowTextureDraws=(g.glowTextureDraws+1)||1;if(h&&h.c&&(h.c.M==4||h.c.M==3||h.c.M==10)&&!h.B&&!h.u&&!h.r&&$wnd.__blobVirusGlowShouldRotate&&$wnd.__blobVirusGlowShouldRotate()){i=$wnd.__blobVirusGlowGetRotation(h.n,h.R,h.S);g.rotationDraws=(g.rotationDraws+1)||1;g.rotationGlowTextureDraws=(g.rotationGlowTextureDraws+1)||1;g.lastRotation=i;${rotatedDrawName}(a,b,c,d,e/2,f/2,e,f,1,1,i);return}}`
          : '')
        + 'if(g&&g.virusTexture&&(b===g.virusTexture||b.v===g.virusTexture.v&&b.w===g.virusTexture.w&&b.C===g.virusTexture.C&&b.A===g.virusTexture.A&&b.B===g.virusTexture.B)){'
        + 'h=g.currentCell;g.virusTextureDraws=(g.virusTextureDraws+1)||1;'
        + 'if(h&&g.glowTexture&&h.c&&(h.c.M==4||h.c.M==3)&&!h.B&&!h.u&&!h.r){'
        + 'g.viruses.push({id:h.n,x:h.R,y:h.S,r:h.M,size:h.N,mode:2,type:h.c.M});g.textureVirusHits=(g.textureVirusHits+1)||1;g.lastUpdate=(new Date).getTime();'
        + (rotatedDrawName
          ? `if($wnd.__blobVirusGlowShouldRotate&&$wnd.__blobVirusGlowShouldRotate()){i=$wnd.__blobVirusGlowGetRotation(h.n,h.R,h.S);g.rotationDraws=(g.rotationDraws+1)||1;g.rotationTextureDraws=(g.rotationTextureDraws+1)||1;g.lastRotation=i;${rotatedDrawName}(a,g.glowTexture,c-e/2,d-f/2,e,f,e*2,f*2,1,1,i);return}`
          : '')
        + 'b=g.glowTexture;c-=e/2;d-=f/2;e*=2;f*=2}else{g.skippedVirusTextureDraws=(g.skippedVirusTextureDraws+1)||1}}}'),
      changed: true,
    };
  }

  function findGlowTextureFromAsset(code) {
    const match = code.match(/[$A-Za-z_][$\w]*\.([$A-Za-z_][$\w]*)=[$A-Za-z_][$\w]*\([^;]*'_glow_mask'\)/);
    return match ? `a.${match[1]}` : null;
  }

  function findGlowTexture(code, startIndex, drawRegion) {
    const nextCase = code.slice(startIndex, startIndex + 700);
    const escapedDrawRegion = escapeRegExp(drawRegion);
    const glowCall = new RegExp(`${escapedDrawRegion}\\(a\\.c,(a\\.[$A-Za-z_][$\\w]*),g\\.R-g\\.M\\*2,g\\.S-g\\.M\\*2,g\\.N\\*2,g\\.N\\*2\\)`);
    return nextCase.match(glowCall)?.[1] || 'a.n';
  }

  function findRotatedDrawFunction(code) {
    return code.match(ROTATED_DRAW_RE)?.[1] || null;
  }

  function rememberRotatedDrawFunction(source) {
    if (typeof source !== 'string') {
      return null;
    }
    const name = findRotatedDrawFunction(source);
    if (name) {
      state.rotatedDrawName = name;
    }
    return name;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function shouldPatchScript(node) {
    return Boolean(node
      && node.tagName === 'SCRIPT'
      && node.src
      && !node.dataset.blobVirusGlowPatched
      && CACHE_SCRIPT_RE.test(node.src));
  }

  function rememberError(error) {
    const message = error?.message || String(error);
    state.errors.push(message);
    state.errors = state.errors.slice(-5);
    win.console?.warn?.('[Blobio Virus | Mother-cell]', message);
  }

  function patchDownloadedChunk(chunk) {
    if (typeof chunk !== 'string') {
      return chunk;
    }
    const patched = patchBundle(chunk);
    if (patched.changed) {
      state.patchedChunks += 1;
      return patched.code;
    }
    return chunk;
  }

  function patchDownloadedChunks(chunks) {
    if (Array.isArray(chunks)) {
      chunks.forEach(rememberRotatedDrawFunction);
      return chunks.map(patchDownloadedChunk);
    }
    return patchDownloadedChunk(chunks);
  }

  function installGwtCallbackPatch() {
    const html = win.html;
    if (!html || html.__blobVirusGlowWrapped || typeof html.onScriptDownloaded !== 'function') {
      return false;
    }
    const originalOnScriptDownloaded = html.onScriptDownloaded;
    html.onScriptDownloaded = function blobVirusGlowOnScriptDownloaded(chunks) {
      state.callbackCalls += 1;
      let patchedChunks = chunks;
      try {
        patchedChunks = patchDownloadedChunks(chunks);
      } catch (error) {
        rememberError(error);
      }
      return originalOnScriptDownloaded.call(this, patchedChunks);
    };
    html.__blobVirusGlowWrapped = true;
    state.wrappedCallback = true;
    return true;
  }

  NodeCtor.prototype.appendChild = function patchedAppendChild(node) {
    if (shouldPatchScript(node)) {
      state.seenCacheScripts += 1;
      installGwtCallbackPatch();
    }
    return nativeAppendChild.call(this, node);
  };

  NodeCtor.prototype.insertBefore = function patchedInsertBefore(node, beforeNode) {
    if (shouldPatchScript(node)) {
      state.seenCacheScripts += 1;
      installGwtCallbackPatch();
    }
    return nativeInsertBefore.call(this, node, beforeNode);
  };

  const callbackPatchTimer = win.setInterval(() => {
    if (installGwtCallbackPatch()) {
      win.clearInterval(callbackPatchTimer);
    }
  }, 10);
  win.setTimeout(() => win.clearInterval(callbackPatchTimer), 30000);
  loaderStatus.bootstrapResult = 'installed';
  loaderStatus.installed = true;
  return true;
}
