# KobinFlow · kobin-site

jin kobin 个人站脚手架：**Next.js 15 App Router + TypeScript + Tailwind CSS + R3F/drei + framer-motion**。

深色技术审美。无付费 API、无密钥。**Agent 假完成 DoD 闸门**、**图生材质球墙**、**产品图 3D 转盘**与**自然语言机械臂仿真**已可验收。真实 GLB 角色 / Bloom / DOF / 线上 AI 集成均 **out of scope**。

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
      agent-dod-gate/          # DoD 闸门（真实交互 · 可验收）
      material-spheres/        # 图生材质球墙（真实交互 · 可验收）
      product-turntable/       # 产品图 3D 转盘（真实交互 · 可验收）
      robot-arm/               # 自然语言机械臂仿真（真实交互 · 可验收）
  components/
    layout/Header.tsx          # Home + 4 demos，active state
    home/
      HeroCanvasDynamic.tsx    # dynamic import ssr:false
      HeroCanvas.tsx           # 全屏固定 R3F Canvas
      HeroScene.tsx            # 粒子/低多边形；camera scrub 注释 bake 接入点
      HomeExperience.tsx       # 滚动层 About / Works / Contact + 降级
    demos/
      DemoStub.tsx             # 统一 stub：标题/pitch/验收/付费 TODO
      AgentDodGateDemo.tsx     # DoD 闸门交互（无/有闸门）
      MaterialSpheresDemo.tsx  # 材质球墙：上传/样例 + 灯光 + curated 兜底
      MaterialSpheresCanvas*.tsx
      ProductTurntableDemo.tsx # 转盘：3 产品图 + 代理兜底 + 约 15s 录制
      ProductTurntableCanvas*.tsx
      RobotArmDemo.tsx         # 机械臂：中文指令 + 脚本演示 + FPS
      RobotArmCanvas*.tsx
  lib/
    demos.ts                   # 路由元数据、验收口径
    dod-gate.ts                # assertDod 纯函数 + 假完成用例
    dod-gate.test.ts           # node --test 脚本断言
    material-spheres.ts        # 采样 / PBR 变体 / 灯光预设 / curated
    material-spheres.test.ts
    product-turntable.ts       # 样例目录 / proxy 启发式 / reel 指引
    product-turntable.test.ts
    robot-arm.ts               # 中文规则映射 / 世界状态 / 脚本序列
    robot-arm.test.ts
  public/demos/material-spheres/
    sample-ref.png
    homepage-ready.png
    texture-pack/          # materials.json + swatches/*.png
  public/demos/product-turntable/
    bottle.png / speaker.png / mug.png
    proxy-fallback.png
    reel.webm                 # ≤20s formal portfolio reel
  public/demos/robot-arm/
    reel.webm                 # ≤20s formal portfolio reel
  e2e/
    dod-gate.spec.ts
    material-spheres.spec.ts
    product-turntable.spec.ts
    robot-arm.spec.ts
```

## 实现顺序（填实时）

**3 → 4 → 1 → 2**（产品路径编号）：

1. `/demos/agent-dod-gate` — Agent 假完成 DoD 闸门  
2. `/demos/material-spheres` — 图生材质球墙  
3. `/demos/product-turntable` — 产品图 3D 转盘  
4. `/demos/robot-arm` — 自然语言机械臂仿真  

验收推进顺序（hard acceptance）：**DoD → material-spheres → turntable → robot-arm**。

## Hard acceptance

### DoD（agent-dod-gate）· 可验收

- 无闸门：假完成可复现  
- 有闸门：假完成可用脚本断言拦截  
- 假完成 → 通过率 = 0  
- block rate = 100%  
- 可枚举 deliverable IDs（见页面 / `DOD_DELIVERABLE_IDS`）  
- 假完成口径：缺证据 / 无标准就绿 / 边界未跑 / 清单对不上  
- 失败原因 UI 可见；移动端单列可读、无白屏；无付费 API  

#### 怎么演示

1. 打开 <http://localhost:3000/demos/agent-dod-gate>
2. **无闸门**：选预设「假完成 · 缺证据」（或四连击）→ 清单看起来「标绿」但证据为空 → 点「标记完成」→ **放行**（假完成可复现）
3. **有闸门**：同一预设 → 点「标记完成」→ **拦截**，展示 `missing-evidence` 等 WHY；点「跑假完成套件断言」可见通过=0 / blockRate=100%
4. 切到「合规交付」+ 有闸门 → 可真正标记完成；「导出 Eval JSON」拿到 deliverable IDs + pass/fail

#### 脚本断言（纯函数，无浏览器）

```bash
npm run test:dod
# 等价
npx tsx --test src/lib/dod-gate.test.ts
```

核心 API：`assertDod(state)`、`assertFakeCompleteSuite()`（见 `src/lib/dod-gate.ts`）。

#### 新增用例怎么复现（Eval blockers）

1. **部分完成**（必须拦截）：有闸门 → 预设「假完成 · 部分完成」→「标记完成」→ 命中 `partial-complete`，`ok=false` / `canMarkComplete=false`
2. **工具失败 / 超时 / 空输出**：有闸门 → 对应预设 → 拦截；或在清单项改 `runStatus`
3. **失败态 UI**：页内「失败态演示」切 加载失败 / 空状态 / 权限不足 / 请求超时
4. **移动端弱网**：页顶「移动端 / 弱网提示」；离线时 `navigator.onLine=false` 文案切换；控件 `min-h-11`

#### Playwright smoke（可选）

```bash
npm i -D @playwright/test
npx playwright install chromium
npm run build && npm run start   # 另开终端亦可；config 可自启
npm run test:e2e:dod
```

覆盖：有闸门 + partial-complete → 标记完成被拦截；导出 JSON 按钮可点；失败态超时横幅可见。

### material-spheres · 可验收

- 1 参考图（上传或捆绑样例）→ Canvas 采样主色 → ≥4 程序化 PBR 材质球（metalness / roughness / 色相变体）
- 灯光切换：Studio / Rim / Warm（key / fill / rim / env intensity），拉开材质差异
- 图糊 / 加载失败 → **精选手调静态墙**（Chrome / Gold / Ceramic / Rubber…）仍可验收
- 失败态：加载失败 / 空状态 / 无 WebGL（及 prefers-reduced-motion）可读，移动端无白屏；**`uiFailure=load` 时卸载 Canvas**（仅 fallback overlay）
- Growth：仓库贴图包 + 首页预览；页内「导出贴图包」下载当前球墙 JSON + 色板 PNG zip
- **TODO（付费）**：图像 / 材质生成 API（仅文档，不接 key）

#### 正式资产（Growth #3）

| 资产 | 路径 |
|------|------|
| 首页预览图 | [`public/demos/material-spheres/homepage-ready.png`](public/demos/material-spheres/homepage-ready.png) |
| 贴图包（JSON + swatches） | [`public/demos/material-spheres/texture-pack/`](public/demos/material-spheres/texture-pack/) |
| 样例参考图 | [`public/demos/material-spheres/sample-ref.png`](public/demos/material-spheres/sample-ref.png) |

再生：`node scripts/generate-material-assets.mjs`

#### 怎么演示

1. 打开 <http://localhost:3000/demos/material-spheres>
2. 默认加载捆绑样例图并生成 ≥4 球；或点「上传参考图」
3. 切换 **Studio / Rim / Warm** 观察金属 vs 非金属差异
4. 点「精选手调静态墙」验收 curated 兜底路径
5. 「失败态演示」切 **加载失败** → 横幅 + fallback，**Canvas 不出现**；空状态 / 无 WebGL 同理可读
6. 点「导出贴图包」下载 zip；或打开仓库贴图包 / homepage-ready 链接

#### 脚本断言（纯函数）

```bash
npm run test:materials
# 或一并
npm test
```

#### Playwright smoke（可选）

```bash
npx playwright install chromium
npm run build && npm run test:e2e:materials
```

覆盖：灯光切换、精选手调、`uiFailure=load` 隐藏 Canvas。

### product-turntable · 可验收

- **3 张产品图**（bottle / speaker / mug）驱动转盘贴图；桌面 **drag orbit** 可拖转（Playwright 鼠标拖拽断言方位角变化）
- **移动端可拖**：OrbitControls 单指旋转、双指缩放距离；深色底防白屏；触控 ≥44px（Playwright pointer/touch 拖拽断言）
- **默认无付费**：不接图生 3D key；默认 **代理模 + 产品贴图**
- **认不出原物 / 白屏风险** → 页内「代理模 + 贴图兜底」或「模拟认不出」强制盒体 + `proxy-fallback.png`（不硬推坏 recon）
- **约 15s 录制/导出**：Canvas `MediaRecorder` → WebM；不支持时页内有明确系统录屏指引
- **正式 ≤20s reel**：[`public/demos/product-turntable/reel.webm`](public/demos/product-turntable/reel.webm)（12s，本地 ffmpeg 从产品贴图生成）
- 失败态：加载失败 / 空状态 / 无 WebGL（及 prefers-reduced-motion）可读；`uiFailure=load` 时卸载 Canvas
- **TTI &lt;3s**：页内展示实测「挂载 → 控件/画布可交互」毫秒数（`data-tti-ms`）；**禁止假数**；CI 用 Playwright 断言 &lt;3000ms

#### 正式资产

| 资产 | 路径 |
|------|------|
| 水瓶贴图 | [`public/demos/product-turntable/bottle.png`](public/demos/product-turntable/bottle.png) |
| 音箱贴图 | [`public/demos/product-turntable/speaker.png`](public/demos/product-turntable/speaker.png) |
| 马克杯贴图 | [`public/demos/product-turntable/mug.png`](public/demos/product-turntable/mug.png) |
| 代理兜底贴图 | [`public/demos/product-turntable/proxy-fallback.png`](public/demos/product-turntable/proxy-fallback.png) |
| **正式 reel（≤20s）** | [`public/demos/product-turntable/reel.webm`](public/demos/product-turntable/reel.webm) |

再生贴图：`node scripts/generate-product-turntable-assets.mjs`  
再生 reel：`node scripts/generate-product-turntable-reel.mjs`

#### 怎么演示

1. 打开 <http://localhost:3000/demos/product-turntable>
2. 切换三个产品样例；在画布上拖拽（手机单指）环视；可关/开「自动旋转」
3. 点「代理模 + 贴图兜底」或「模拟认不出 / 白屏风险」→ 盒体 + fallback 贴图
4. 查看页顶 **TTI**（实测 ms，预算 &lt;3s）；页内预览正式 `reel.webm`；或点「录制约 15s 并导出」
5. 「失败态演示」切 **加载失败** → 横幅 + fallback，**Canvas 不出现**

#### 脚本断言

```bash
npm run test:turntable
# 或一并
npm test
```

#### Playwright / CI 证明（TTI + drag + touch）

```bash
npx playwright install chromium
npm run build && npm run test:e2e:turntable
```

覆盖：样例切换、代理兜底、坏 recon 模拟、`uiFailure=load` 隐藏 Canvas、**正式 reel 入库**、**实测 TTI &lt;3000ms**、**桌面 mouse drag 旋转**、**touch/pointer drag 旋转**。  
**CI 证明命令即：`npm run test:e2e:turntable`。**

### robot-arm · 可验收

- **10 条固定中文指令**规则映射（抓取左/中/右、放下、放到左/中/右、复位、向左/向右旋转）；**脚本/评分路径抓取·放置成功 ≥7**
- 失败可读：原因 + 下一步（空指令 / 未知 / 槽位空或占用 / 夹爪已持有）
- **桌面硬门槛 ≥30fps**：页内 **rAF 实测 FPS**（`data-fps` / `data-fps-source="raf"`）；默认 **均衡**画质（关 ContactShadows / 降段数 / dpr≤1）；&lt;30 时 **自动/手动进一步降级** + **脚本演示** + **LLM API 付费 TODO（不接 key）**
- **正式 ≤20s reel**：[`public/demos/robot-arm/reel.webm`](public/demos/robot-arm/reel.webm)（12s，本地 SVG+ffmpeg，无付费 API）；页内可播放 / 可链接（`reel-asset-video` / `reel-asset-link`）
- 失败态：加载失败 / 空状态 / 无 WebGL（及 prefers-reduced-motion）可读；`uiFailure=load` 时**卸载 Canvas**
- 单元测试：`npm run test:robot`；e2e：`npm run test:e2e:robot`（reel 入库 + **FPS≥30**）
- 默认**无付费 API**；开放域自然语言 / LLM 仅文档 TODO

#### 正式资产

| 资产 | 路径 |
|------|------|
| **正式 reel（≤20s）** | [`public/demos/robot-arm/reel.webm`](public/demos/robot-arm/reel.webm) |

再生 reel：`node scripts/generate-robot-arm-reel.mjs`

#### 怎么演示（10 条指令）

1. 打开 <http://localhost:3000/demos/robot-arm>
2. 点快捷芯片依次试：**抓取左边的方块** → **放到右边** → **抓取中间的方块** → **放到左边** …（或直接点「脚本演示」）
3. 十条固定短语：

| # | 指令 |
|---|------|
| 1 | 抓取左边的方块 |
| 2 | 抓取右边的方块 |
| 3 | 抓取中间的方块 |
| 4 | 放下 |
| 5 | 放到左边 |
| 6 | 放到右边 |
| 7 | 放到中间 |
| 8 | 复位 |
| 9 | 向左旋转 |
| 10 | 向右旋转 |

4. 输入未知句（如「请帮我泡杯咖啡」）→ 失败横幅含**原因 + 下一步**
5. 「失败态演示」切 **加载失败** → 横幅 + fallback，**Canvas 不出现**
6. 观察页顶 **FPS**（rAF 实测，硬门槛 ≥30）与画质档；页内预览正式 `reel.webm`

#### 脚本断言（纯函数）

```bash
npm run test:robot
# 或一并
npm test
```

核心：`parseCommand` / `applyAction` / `runScriptedDemo` / `evaluateDemoCommandsExecution` / `QUALITY_PROFILES`（见 `src/lib/robot-arm.ts`）。

#### Playwright / CI 证明（reel + FPS≥30）

```bash
npx playwright install chromium
npm run build && npm run test:e2e:robot
```

覆盖：正式 reel 入库与页内可播放/可链接、快捷指令成功、未知指令失败可读、脚本演示评分注记、`uiFailure=load` 隐藏 Canvas、**实测 rAF FPS ≥30**（默认均衡画质）。  
**CI 证明命令即：`npm run test:e2e:robot`。**

### Shared

- product-turntable / robot-arm 正式 ≤20s reel 均已入库（`reel.webm`）  
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
- **agent-dod-gate**：加载失败 / 空状态 / 权限 / 超时可切换演示；离线/弱网可读提示；触控 ≥44px  
- **material-spheres**：加载失败 / 空状态 / 无 WebGL 可切换演示；curated 静态墙兜底；触控 ≥44px  
- **product-turntable**：加载失败 / 空状态 / 无 WebGL 可切换演示；代理模 + 贴图兜底；约 15s 录制或系统录屏指引；触控拖转 ≥44px  
- **robot-arm**：加载失败 / 空状态 / 无 WebGL 可切换演示；脚本演示罐头序列；触控 ≥44px  


## Brand

**KobinFlow / jin kobin** — UI 文案可用中文。

## License

Private / personal — 见仓库可见性设置。
