export type DemoMeta = {
  slug: string;
  href: string;
  title: string;
  titleEn: string;
  pitch: string;
  status: "脚手架" | "可验收";
  order: number;
  acceptance: string[];
  paidApiNotes: string[];
};

export const DEMOS: DemoMeta[] = [
  {
    slug: "agent-dod-gate",
    href: "/demos/agent-dod-gate",
    title: "Agent 假完成 DoD 闸门",
    titleEn: "Agent DoD Gate",
    pitch:
      "拦住「看起来做完了」的假完成：缺证据、无标准就绿、边界未跑、清单对不上 → 一律不通过。",
    status: "可验收",
    order: 1,
    acceptance: [
      "无闸门时：假完成可复现（对照基线）",
      "有闸门时：假完成可用脚本断言拦截",
      "假完成 → 通过率 = 0",
      "拦截率（block rate）= 100%",
      "可枚举 deliverable ID 列表，并对齐验收口径",
    ],
    paidApiNotes: ["无付费 API；闸门逻辑本地/脚本可跑"],
  },
  {
    slug: "material-spheres",
    href: "/demos/material-spheres",
    title: "图生材质球墙",
    titleEn: "Material Spheres",
    pitch: "一张参考图 → 多颗材质球 + 灯光切换，展示 PBR 预览墙。",
    status: "脚手架",
    order: 2,
    acceptance: [
      "1 张参考图 → ≥4 颗材质球 + 灯光切换",
      "图糊 / 生成失败 → 降级为 curated 静态球墙亦可验收",
      "共享：移动端无白屏；后续 ≤20s reel",
    ],
    paidApiNotes: ["图像 / 材质生成 API 为付费 TODO（README 标注，本脚手架不接 key）"],
  },
  {
    slug: "product-turntable",
    href: "/demos/product-turntable",
    title: "产品图 3D 转盘",
    titleEn: "Product Turntable",
    pitch: "三套样例可拖拽环视；手机可玩；识别失败走 proxy + 贴图兜底。",
    status: "脚手架",
    order: 3,
    acceptance: [
      "3 个样例支持 drag orbit",
      "移动端可用",
      "不可识别 / 重建失败 → proxy mesh + texture fallback",
      "共享：移动端无白屏；后续 ≤20s reel",
    ],
    paidApiNotes: ["若接图生 3D / 重建服务则为付费 TODO"],
  },
  {
    slug: "robot-arm",
    href: "/demos/robot-arm",
    title: "自然语言机械臂仿真",
    titleEn: "Robot Arm NL Sim",
    pitch: "中文指令驱动机械臂；失败可读；桌面 ≥30fps，否则脚本演示 + LLM TODO。",
    status: "脚手架",
    order: 4,
    acceptance: [
      "10 条中文指令 ≥7 条成功",
      "失败状态可读（原因 + 下一步）",
      "桌面 ≥30fps；否则脚本化 demo + LLM API TODO",
      "共享：移动端无白屏；后续 ≤20s reel",
    ],
    paidApiNotes: ["自然语言理解 / LLM API 为付费 TODO"],
  },
];

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  ...DEMOS.map((d) => ({ href: d.href, label: d.titleEn })),
];

/** DoD 假完成口径 — 缺证据就不绿（展示用；断言逻辑见 dod-gate.ts） */
export const DOD_FALSE_COMPLETE_CRITERIA = [
  {
    id: "missing-evidence",
    label: "缺证据",
    desc: "声称完成但无日志 / 截图 / 产物哈希 / 测试输出等可核验证据。",
  },
  {
    id: "no-standard-green",
    label: "无标准就绿",
    desc: "验收标准未写清或未对齐，却直接标通过。",
  },
  {
    id: "boundary-unrun",
    label: "边界未跑",
    desc: "主路径通过，边界 / 失败路径 / 降级路径未执行。",
  },
  {
    id: "checklist-mismatch",
    label: "清单对不上",
    desc: "deliverable ID 与实际交付物、README、CI 断言不一致。",
  },
] as const;

/** 稳定 deliverable ID — 与 src/lib/dod-gate.ts 对齐 */
export { DOD_DELIVERABLE_IDS } from "./dod-gate";
