# kobin-site 3D 能力迭代设计（电影感一镜到底）

日期：2026-09-10
状态：已与用户逐节确认定稿

## 1. 背景与问题

kobin-site 当前 3D 效果差的根因（对照三个参考站调研结论）：

- 全部为程序化几何体（线框二十面体、盒子机械臂、圆柱代理产品），无 GLTF 资产管线；
- 无后处理（Bloom/DoF 被 README 明确排除在 wave1 范围外）；
- 无共享 3D 基建：每个 Canvas 重复光照/加载/降级样板，无统一质感库；
- 形态是"带 3D 插件的普通网页"，而三个参考站（sen-3d-resume、itomdev.com、thibault-introvigne.com）共同形态是"一个连续的沉浸体验"。

### 参考站要点

| 参考 | 核心手法 | 借鉴 |
|---|---|---|
| sen-3d-resume（本地 `~/workspace/sen-3d-resume`） | 单一持久 Canvas + 滚动刷帧 Blender 烘焙相机（CameraAction GLB）+ dwell 驻留重映射 + DoF 自动对焦 + 鼠标视差 + 胶片颗粒 + 暖冷双色光 | **主路线**，机制全盘移植 |
| itomdev.com | 可行走手绘走廊 + GLSL 显影 + 陀螺仪 | 不采用（与暗色科技调性冲突） |
| thibault-introvigne.com | 星球世界 + 音效 + Enter 门禁 | 不采用（仅叙事参考） |

### 已确认的四个决策

1. **范围**：首页 + 4 个 demo 都要（含共享基建层）。
2. **美学**：电影感一镜到底 — sen 的机制 + 暗色科技世界观"素材官 Agent 世界"。
3. **管线**：Blender GLB 管线（相机轨道在 Blender 里调，导出带 CameraAction 的 GLB）。
4. **性能门禁**：首页以新门禁（加载屏/LCP/scene-ready/FPS）替换 TTI<3s；demo 页维持原门禁不变。

### 执行策略（方案 B：分层推进）

- **W1 基建层**：共享 3D 组件库，立刻接到现有 hero 场景 — 零新资产，光/后处理/运镜先跳档。
- **W2 首页 GLB 世界**：Blender 资产（与 W1 开发并行）+ GLB 合同 + 运行时集成。
- **W3 demo 收编**：接入基建 + 选择性 GLB。

每个 wave 独立可交付（commit + reel + e2e 证据），随时停在任一 wave 都是完整可用状态。

## 2. 总体架构与叙事

**叙事：《素材官 Agent 世界》一镜到底。** 首页保持现有内容结构（Hero → About → Works → Contact，素材官 COPY v1.1 原样保留），视觉载体改为 sen 式单一持久 Canvas 固定在滚动 HTML 之下，滚动驱动相机在一个连续 3D 世界中飞行：

| 内容段 | 3D 站点（Blender 场景） | 相机行为 |
|---|---|---|
| Hero 启程 | 悬浮"素材工厂"全景（抽象几何 + 发光核心） | 缓慢推近 + 鼠标视差 |
| About 世界观 | 工厂内部：数据流粒子、机械细节 | 驻留环绕（dwell） |
| Works×4 | 4 个对接舱，每舱悬浮对应 demo 主题物（机械臂/转台/材质球/闸门） | 每舱驻留，舱间快速转场 |
| Contact 终点 | 拉远回望全景，画面渐暗 | 定格收尾 |

**三层代码架构：**

```
src/components/three/          ← W1 新建：共享 3D 基建层（无业务语义）
src/components/home/           ← W2 改造：首页体验层（叙事装配）
src/components/demos/*         ← W3 升级：各 demo 消费同一套基建
```

原则：基建层不知道"素材官"是什么 — 只提供相机时间线、光、后处理、守卫；叙事全部在 Blender 资产与首页装配层，demo 与未来页面复用同一套质感。

## 3. W1 — 共享 3D 基建层

新增依赖仅 1 个：`@react-three/postprocessing@^3.1.1`（peer `postprocessing`；已验证 peer 范围 R3F≥9.7 / React 19 / three≥0.156，与现有栈完全匹配）。

| 组件 | 职责 | 关键接口 |
|---|---|---|
| `PostFX` | 声明式后处理链：DoF 自动对焦 + Bloom（mipmapBlur，threshold≈0.82）+ SMAA + 暗角。`multisampling:0`，SMAA 替代 MSAA | `<PostFX tier dof={{focusRef}} />`；tier=low 整链关闭；创建失败（老设备）静默降级无后处理，不白屏 |
| `LightRig` | 光照预设：`studio` 三点光 / `rim` 暖主(#ffd9c6)冷辅(#9fc6ff)（sen 同款）/ `tech` cyan 主光（品牌色）；可选自托管 HDR（≤2MB） | `<LightRig preset env="/env/StudioSmall.hdr" intensity={0.9} />` |
| `CameraTimeline` | 滚动刷帧引擎：DOM 锚点 → 连续索引 → dwell 驻留重映射 → 阻尼平滑 → 写相机位姿。纯数学拆到 `src/lib/three/timeline.ts`（node:test 可测） | `keys`（代码 JSON 或 GLB 相机轨道；每个 key 携带该站焦点世界坐标，供 W1 无 GLB 时驱动 DoF）+ `anchors`（DOM `data-point`）+ `parallax` / `pullback` |
| `LoadingVeil` | 加载屏：useProgress 单调峰值进度环，100%→驻留→淡出卸载 | `<LoadingVeil label="加载素材世界" />` |
| `GrainOverlay` | 胶片颗粒：独立 1fps demand Canvas + multiply 混合 | 直接挂载 |
| `QualityGuard` | 通用化 robot-arm 降级守卫：high/balanced/low 三档，持续 <30fps 自动降档，暴露 `data-tier`/`data-fps-source` | 包在 Canvas 内 |
| `useGlbScene` + 资产注册表 | `src/lib/three/assets.ts`：资产 id → url/体积预算/压缩格式(Draco\|meshopt)/许可记录；preload 封装 | 供 W2/W3 消费 |

**W1 落地动作**：hero 接入 LightRig(`tech`) + PostFX + GrainOverlay + QualityGuard；现有手写 scrubCamera 路径重构为 CameraTimeline 的 JSON keyframes。demo 此阶段不动。

## 4. W2 — GLB 合同与首页集成

### GLB 合同（`public/assets/home-world.glb`）

单文件包含 4 类内容，全部共用 24fps 时间线：

1. **场景网格**："素材工厂"世界（暗色 slate 底 + cyan 自发光点缀）。材质命名 `mat-*`。
2. **`CameraAction` 相机剪辑**：唯一烘焙相机轨道，Hero 起点 → Contact 终点。帧数 = 50 帧/站 × 站数（hero/about/works×4/contact = 7 站 = 350 帧 ≈ 14.6s 轨道）。
3. **`focus-*` 空物体**：每站一个（`focus-hero`、`focus-about`、`focus-works-1`…、`focus-contact`），运行时作 DoF 对焦目标 + 视差旋转中心；可选 userData 携带 `bokehScale` / `focusRange`。
4. **装饰动画剪辑（可选）**：舱门开合、粒子脉冲等，随滚动同步播放。

### 配套保障

- `scripts/validate-glb.mjs`：校验相机剪辑存在/fps/帧数、focus 命名齐全、贴图全内嵌、体积预算（Draco 压缩后 ≤8MB 硬上限）；违规退出非零，进 CI。
- `scripts/make-starter-world.mjs`：用 three.js GLTFExporter 在 Node 生成合同合法的占位世界 GLB（几何简单、结构完整）— 未装 Blender 也能先跑通全管线，之后在 Blender 替换正式资产。交付 Blender 资产时 validate 脚本即验收单。

**W2 验收定义**：正式 Blender 资产（非 starter 占位）通过 validate-glb + 首页 5 条门禁全绿。starter GLB 仅作管线验证的中间产物，不算 W2 交付；Blender 资产未就绪时 W2 保持进行中（可停在 W1 的完整可用状态）。

### 首页运行时（HomeScene 替换现有 HeroScene）

- 保留：单一持久 Canvas 固定于滚动 HTML 之下、`next/dynamic` + ssr:false、素材官 COPY 全部 HTML 段落（加 `data-point` 锚点 + 可读性纱罩：滚动驱动 0→0.4 压暗）。
- 移植 sen 核心逻辑并适配 R3F 9：滚动→帧号（锚点实测 + dwell 重映射 + damp）→ `action.time = frame/24`；相机世界矩阵分解到默认相机（避免 DoF CoC 缓存问题）；DoF 焦点 = 相邻 focus 锚点插值；桌面鼠标绕焦点视差，移动端 ×1.2 拉远 + 关视差。
- reduced-motion / WebGL 失败：Blender 渲染静态海报 `public/assets/home-poster.webp` + 纯 HTML。

### 首页性能门禁（Playwright，替换 TTI<3s）

1. LoadingVeil 可见 < 1.5s；
2. 场景就绪（`data-scene-ready`）< 8s；
3. 脚本化滚动期间 FPS ≥ 30（chromium desktop）；
4. dwell 证据：滚到站点停稳后相机速度归零（`data-cam-speed`，600ms 内）；
5. 首页 reel = Blender 渲染相机飞行视频（720p ≤12s），与其他 demo reel 同等提交。

## 5. W3 — demo 升级

| Demo | 改动 |
|---|---|
| 全部 Canvas demo | 接 `QualityGuard` + `LightRig`（按语义选 preset）；失败语义/`data-testid` 沿用不动 |
| robot-arm | GLB 机械臂模型（CC0 库筛选，许可入注册表；无合适资产则程序化几何 + 新光照后处理兜底）。NL 交互逻辑不动 |
| product-turntable | 真实 GLB 产品模型（PBR 金属度/粗糙度 + HDR 环境反射）。**保 TTI<3s 策略**：代理几何先上屏（TTI 计时点不变），GLB 后台流式加载完成后热替换 |
| material-spheres | 3 套光预设收敛进共享 LightRig；HDR 从 CDN preset 改自托管；新增玻璃透射材质演示 |
| agent-dod-gate | 纯 DOM，不动 |

资产来源统一走注册表：CC0 库（实施时用 oss-picker 技能核验许可）或 Blender 自制，每条记录 url/体积/许可。

## 6. 降级与无障碍（全站统一）

- 三档 tier：high（dpr≤2 + 全后处理）/ balanced（dpr≤1.5，DoF 关）/ low（dpr 1，无阴影无后处理）；持续 <30fps 自动降档，不自动升档。
- 首页：移动端保留 GLB 场景（相机拉远 + 关视差）；reduced-motion / WebGL 失败 → 静态海报 + 纯 HTML。
- demo 页：现有移动端/失败策略不变（README 已定义）。

## 7. 测试策略

- 单元（node:test，`npm test`）：`src/lib/three/timeline.ts` 纯数学（dwell 重映射、关键帧插值、锚点→帧映射）、资产注册表预算逻辑。
- 资产门禁：`validate-glb.mjs` 进 CI；reel 存在性/体积检查沿用现有模式。
- Playwright：现有 4 个 demo spec **一行不改照跑**（回归约束）；新增首页 spec（第 4 节 5 条门禁）。
- 每 wave 结束用浏览器实测 golden path + 截图对照；README 补"3D 资产合同与 Blender 工作流"章节。

## 8. 不做的事（YAGNI）

- 不做音效（thibault 路线未选）。
- 不做可探索世界/行走走廊（itomdev 路线未选）。
- 不做物理引擎（rapier 等）— 无需求。
- 不改素材官 COPY 与内容结构。
- agent-dod-gate 不动。
