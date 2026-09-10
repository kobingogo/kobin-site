/**
 * Product turntable — sample catalog + proxy/recon helpers.
 * No paid APIs. Image→3D recon is TODO (paid); default path is proxy mesh + product texture.
 */

export type ProductShape = "cylinder" | "box" | "roundedBox";

export type ProductSample = {
  id: string;
  label: string;
  labelEn: string;
  /** Product photo / wrap texture driving the turntable */
  texturePath: string;
  /** Preferred proxy shape when showing the sample */
  shape: ProductShape;
  /** Dimensions hint for mesh (width, height, depth) or (radius, height) for cylinder */
  size: [number, number, number];
  metalness: number;
  roughness: number;
  pitch: string;
};

export type RenderMode = "sample" | "proxy";

export type UiFailureKind = "none" | "load" | "empty" | "nowebgl";

export const PROXY_FALLBACK_TEXTURE =
  "/demos/product-turntable/proxy-fallback.png";

/** Max reel length (seconds) for in-page MediaRecorder export */
export const REEL_SECONDS = 15;

/** Formal portfolio reel committed under public/ (≤20s) */
export const REEL_ASSET_PATH = "/demos/product-turntable/reel.webm";

/** Time-to-interactive budget: mount → controls/canvas ready (ms) */
export const TTI_BUDGET_MS = 3000;

export const PRODUCT_SAMPLES: ProductSample[] = [
  {
    id: "bottle",
    label: "青釉水瓶",
    labelEn: "Cyan Bottle",
    texturePath: "/demos/product-turntable/bottle.png",
    shape: "cylinder",
    size: [0.55, 1.55, 0.55],
    metalness: 0.08,
    roughness: 0.35,
    pitch: "圆柱代理 + 瓶身贴图环绕；拖拽环视。",
  },
  {
    id: "speaker",
    label: "桌面音箱",
    labelEn: "Desk Speaker",
    texturePath: "/demos/product-turntable/speaker.png",
    shape: "roundedBox",
    size: [1.1, 1.1, 0.55],
    metalness: 0.25,
    roughness: 0.55,
    pitch: "圆角盒代理 + 网罩贴图；适合电商环视。",
  },
  {
    id: "mug",
    label: "陶制马克杯",
    labelEn: "Ceramic Mug",
    texturePath: "/demos/product-turntable/mug.png",
    shape: "cylinder",
    size: [0.5, 0.85, 0.5],
    metalness: 0.02,
    roughness: 0.62,
    pitch: "矮圆柱 + 釉面贴图；recon 失败时可切代理盒。",
  },
];

export function getProductSample(id: string): ProductSample | undefined {
  return PRODUCT_SAMPLES.find((p) => p.id === id);
}

export function resolveTexturePath(
  sample: ProductSample,
  mode: RenderMode,
): string {
  if (mode === "proxy") return PROXY_FALLBACK_TEXTURE;
  return sample.texturePath;
}

export function resolveShape(
  sample: ProductSample,
  mode: RenderMode,
): ProductShape {
  // Unrecognizable / unsafe recon → always box proxy + fallback texture
  if (mode === "proxy") return "box";
  return sample.shape;
}

export function resolveMeshSize(
  sample: ProductSample,
  mode: RenderMode,
): [number, number, number] {
  if (mode === "proxy") return [1, 1, 1];
  return sample.size;
}

/**
 * Heuristic: mark recon as unusable → force proxy path.
 * Used by UI when "识别失败 / 白屏风险" is demonstrated or detected.
 */
export function shouldUseProxyFallback(opts: {
  reconLooksUnrecognizable?: boolean;
  whiteScreenRisk?: boolean;
  forceProxy?: boolean;
  textureLoadFailed?: boolean;
}): boolean {
  return !!(
    opts.forceProxy ||
    opts.reconLooksUnrecognizable ||
    opts.whiteScreenRisk ||
    opts.textureLoadFailed
  );
}

export type TtiHint = {
  /** ms from mount / product switch to interactive (controls ready) */
  ms: number | null;
  label: string;
};

export function formatTti(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function buildReelGuidance(): string[] {
  return [
    `正式作品集 reel：${REEL_ASSET_PATH}（本地生成 ≤20s 转盘短片，无付费 API）。`,
    `页内「录制约 ${REEL_SECONDS}s」：捕获 Canvas 画面为 WebM（需浏览器支持 MediaRecorder）。`,
    "或用系统录屏：打开转盘 → 开自动旋转 → 录 10–15s 拖拽环视 → 导出为 reel。",
    "移动端：双指勿缩放页面；单指拖拽环视；触控目标 ≥44px。",
    "无付费 API；默认代理模 + 产品贴图，不硬推不可用 recon。",
  ];
}

export const UI_FAILURE_OPTIONS: {
  id: UiFailureKind;
  label: string;
  tip: string;
}[] = [
  { id: "none", label: "正常", tip: "" },
  {
    id: "load",
    label: "加载失败",
    tip: "产品贴图或场景加载失败。请切换样例，或启用「代理模 + 贴图兜底」。",
  },
  {
    id: "empty",
    label: "空状态",
    tip: "未选择产品样例。请从三个样例中选一个，或启用代理模兜底。",
  },
  {
    id: "nowebgl",
    label: "无 WebGL",
    tip: "当前环境无法创建 WebGL 上下文。下方保留可读验收说明与产品清单，不白屏。",
  },
];
