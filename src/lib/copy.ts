/**
 * Homepage COPY — swap here for 素材官 revisions.
 * Source: /workspace/素材库/案例/2026-09-10-kobin-site-首页COPY.md (v1.1)
 * Do not invent MAU / pass-rate metrics. 「检查通过≠可交付」only on DoD card.
 */
export const COPY = {
  heroEyebrow: "KobinFlow · jin kobin",
  heroTitle: "做能验收的 agent，不只更吵的对话。",
  heroSub:
    "KobinFlow · jin kobin。AI agent、eval 与人机双写——开口派工，独立验收。",
  aboutLabel: "About",
  about:
    "浙大计算机，互联网十年。现在用 KobinFlow 把 agent 和人机协作压成能上手、能验收的东西。绿勾不等于交付：我关心谁能用、怎么验、失败了怎么办。不追工具热搜；能进作品集的，才上站。",
  worksLabel: "Works · wave1",
  worksIntro:
    "四个已过独立验收的小 demo：假完成闸门、材质球墙、3D 转盘、机械臂。都能点，失败态也露出来。",
  contactLabel: "Contact",
  contact:
    "想聊合作或验收标准 → X @KobinFlow（邮箱位留给你之后填）。",
  contactXHref: "https://x.com/KobinFlow",
  contactXHandle: "@KobinFlow",
  scrollHint: "scroll → camera scrub",
  degradeReducedMotion:
    "已检测 prefers-reduced-motion：关闭 3D 画布，保留静态渐变背景。",
  degradeNoWebGL:
    "当前环境无 WebGL：使用静态降级背景，下方文案与作品卡片仍可浏览。",
  evalBadge: "Eval 通过",
  openDemo: "打开 demo",
  footer: "KobinFlow / jin kobin",
  /** Homepage Works card one-liners (keyed by demo slug) */
  demoCards: {
    "agent-dod-gate":
      "检查通过 ≠ 可交付：点开看「全绿却交不出」怎么被闸住。",
    "material-spheres":
      "一张图变成一墙可转材质球——AIGC 贴到 3D 上长什么样。",
    "product-turntable":
      "产品图转成可拖的 3D 转盘，展览感，不靠假指标说话。",
    "robot-arm":
      "轻量机械臂仿真：看约束与失败态，不演科幻宣传片。",
  } as Record<string, string>,
} as const;

export type CopyKey = keyof typeof COPY;
