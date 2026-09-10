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
      "拦住「看起来做完了」的假完成：缺证据、无标准就绿、边界未跑、清单对不上、部分完成、工具失败/超时/空输出 → 一律不通过。",
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
    status: "可验收",
    order: 2,
    acceptance: [
      "1 张参考图 → ≥4 颗材质球（Canvas 采样主色 + 程序化 metalness/roughness 变体）+ 灯光切换（Studio / Rim / Warm）",
      "图糊 / 生成失败 → 降级为 curated 精选手调静态球墙亦可验收",
      "失败态：加载失败时卸载 Canvas；空状态 / 无 WebGL 可读，移动端无白屏",
      "贴图包可导出；仓库含 homepage-ready 预览与 texture-pack",
      "共享：移动端无白屏；后续 ≤20s reel",
    ],
    paidApiNotes: ["图像 / 材质生成 API 为付费 TODO（README 标注，本脚手架不接 key）"],
  },
  {
    slug: "product-turntable",
    href: "/demos/product-turntable",
    title: "产品图 3D 转盘",
    titleEn: "Product Turntable",
    pitch:
      "三张产品图驱动代理模转盘；拖拽 / 触控环视；认不出或白屏风险切代理模 + 贴图兜底；约 15s 录制或明确录制指引。",
    status: "可验收",
    order: 3,
    acceptance: [
      "3 张产品图驱动转盘，支持 drag orbit（桌面拖拽）",
      "移动端可拖（触控 OrbitControls）",
      "默认无付费 API；默认代理模 + 产品贴图路径",
      "认不出原物 / 白屏风险 → 可切代理模 + 贴图兜底（不硬推坏 recon）",
      "约 15s 录制导出（Canvas MediaRecorder）或明确系统录屏指引；正式 ≤20s reel.webm 已入库",
      "失败态：加载失败 / 空状态 / 无 WebGL 可读，移动端无白屏",
      "实测 TTI（挂载→控件/画布可交互）<3s，页内展示；CI：npm run test:e2e:turntable",
    ],
    paidApiNotes: [
      "图生 3D / 重建服务为付费 TODO（README 标注，本脚手架不接 key；默认代理模）",
    ],
  },
  {
    slug: "robot-arm",
    href: "/demos/robot-arm",
    title: "自然语言机械臂仿真",
    titleEn: "Robot Arm NL Sim",
    pitch:
      "中文指令规则映射驱动 3–4 DOF 机械臂抓取/放置；失败可读；桌面 ≥30fps；脚本演示罐头序列；默认无付费 LLM。",
    status: "可验收",
    order: 4,
    acceptance: [
      "10 条固定中文指令规则映射；脚本/评分路径抓取·放置成功 ≥7",
      "失败状态可读（原因 + 下一步）；未知指令明确提示",
      "桌面 ≥30fps（页内 FPS）；不稳定或 <30 时走脚本演示 + LLM API 付费 TODO（不接 key）",
      "失败态：加载失败 / 空状态 / 无 WebGL 可读，移动端无白屏（Canvas 卸载）",
      "单元测试覆盖 command→action；e2e smoke；npm run build 通过",
      "共享：移动端无白屏；后续 ≤20s reel",
    ],
    paidApiNotes: [
      "自然语言理解 / 开放域 LLM API 为付费 TODO（README 标注，本脚手架不接 key；默认规则映射）",
    ],
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
  {
    id: "partial-complete",
    label: "部分完成",
    desc: "清单未全部标绿却声称可交付 — 有闸门时必须拦截。",
  },
  {
    id: "tool-failure",
    label: "工具失败",
    desc: "工具调用失败却仍标绿。",
  },
  {
    id: "timeout",
    label: "超时",
    desc: "运行超时却仍标绿。",
  },
  {
    id: "empty-output",
    label: "空输出",
    desc: "输出为空却仍标绿。",
  },
] as const;

/** 稳定 deliverable ID — 与 src/lib/dod-gate.ts 对齐 */
export { DOD_DELIVERABLE_IDS } from "./dod-gate";
