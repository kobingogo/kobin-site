# KobinFlow · kobin-site

jin kobin 个人站脚手架：**Next.js 15 App Router + TypeScript + Tailwind CSS + R3F/drei + framer-motion**。

深色技术审美。无付费 API、无密钥。真实 GLB 角色 / Bloom / DOF / 线上 AI 集成均 **out of scope**（本仓库仅脚手架）。

## 快速运行

```bash
npm install
npm run dev
```

本地预览：<http://localhost:3000>

```bash
npm run build   # 推送前必须通过
npm start       # 生产预览
```

### Vercel

1. Import GitHub 仓库 `kobingogo/kobin-site`
2. Framework Preset: Next.js（默认即可）
3. Build Command: `npm run build` · Output: Next 默认
4. **不要**添加任何付费 API 环境变量（本脚手架无 key）
5. Deploy → 绑定自定义域名（可选）

## 目录结构

```
src/
  app/
    layout.tsx                 # Header + dark base；failure/mobile 说明注释
    page.tsx                   # Home
    demos/
      agent-dod-gate/          # DoD 闸门（含 deliverable ID + 假完成口径）
      material-spheres/
      product-turntable/
      robot-arm/
  components/
    layout/Header.tsx          # Home + 4 demos，active state
    home/
      HeroCanvasDynamic.tsx    # dynamic import ssr:false
      HeroCanvas.tsx           # 全屏固定 R3F Canvas
      HeroScene.tsx            # 粒子/低多边形；camera scrub 注释 bake 接入点
      HomeExperience.tsx       # 滚动层 About / Works / Contact + 降级
    demos/DemoStub.tsx         # 统一 stub：标题/pitch/验收/付费 TODO
  lib/demos.ts                 # 路由元数据、验收口径、DoD ID
```

## 实现顺序（填实时）

**3 → 4 → 1 → 2**（产品路径编号）：

1. `/demos/agent-dod-gate` — Agent 假完成 DoD 闸门  
2. `/demos/material-spheres` — 图生材质球墙  
3. `/demos/product-turntable` — 产品图 3D 转盘  
4. `/demos/robot-arm` — 自然语言机械臂仿真  

验收推进顺序（hard acceptance）：**DoD → material-spheres → turntable → robot-arm**。

## Hard acceptance

### DoD（agent-dod-gate）

- 无闸门：假完成可复现  
- 有闸门：假完成可用脚本断言拦截  
- 假完成 → 通过率 = 0  
- block rate = 100%  
- 可枚举 deliverable IDs（见页面预留列表）  
- 假完成口径：缺证据 / 无标准就绿 / 边界未跑 / 清单对不上  

### material-spheres

- 1 参考图 → ≥4 材质球 + 灯光切换  
- 图糊 / 失败 → curated 静态球墙可验收  
- **TODO（付费）**：图像 / 材质生成 API  

### product-turntable

- 3 样例 drag orbit；移动端可用  
- 不可识别 → proxy + texture fallback  

### robot-arm

- 10 条中文指令 ≥7 成功；失败可读  
- 桌面 ≥30fps；否则脚本 demo + **LLM API TODO（付费）**  

### Shared

- 后续 ≤20s reel  
- **移动端无白屏**（layout 深色底 + WebGL / reduced-motion 降级）

## Paid API TODOs（仅文档，不接 key）

| Demo | TODO |
|------|------|
| material-spheres | 图生材质 / 图像 API |
| product-turntable | 可选图生 3D / 重建服务 |
| robot-arm | 自然语言 / LLM API |
| agent-dod-gate | 无付费依赖 |

## Failure states & mobile

- JS / WebGL 失败：静态渐变 + 文案可读，不白屏  
- `prefers-reduced-motion`：关闭 R3F，保留 HTML 层  
- 窄屏：导航横滑；demo 单列；触控目标预留  

## Brand

**KobinFlow / jin kobin** — UI 文案可用中文。

## License

Private / personal — 见仓库可见性设置。
