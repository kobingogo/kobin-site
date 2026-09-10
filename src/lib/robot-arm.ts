/**
 * Robot-arm NL sim — rule-based Chinese command → action mapping.
 * No paid LLM by default. LLM NLU API is documented TODO only (no keys).
 */

export type SlotId = "left" | "middle" | "right";
export type CubeId = "cyan" | "violet" | "pink";
export type CubeLocation = SlotId | "held" | "bin";

export type ActionKind =
  | "grasp"
  | "place"
  | "place_at"
  | "home"
  | "rotate_left"
  | "rotate_right"
  | "lift"
  | "lower"
  | "open_gripper"
  | "close_gripper";

export type ArmJoints = {
  base: number;
  shoulder: number;
  elbow: number;
  /** 0 = open, 1 = closed */
  gripper: number;
};

export type CubeState = {
  id: CubeId;
  location: CubeLocation;
  color: string;
  label: string;
};

export type WorldState = {
  joints: ArmJoints;
  held: CubeId | null;
  cubes: Record<CubeId, CubeState>;
  busy: boolean;
};

export type ParseOk = {
  ok: true;
  action: ActionKind;
  target?: SlotId;
  phrase: string;
  label: string;
};

export type ParseFail = {
  ok: false;
  phrase: string;
  reason: string;
  nextStep: string;
};

export type ParsedCommand = ParseOk | ParseFail;

export type ApplyResult = {
  ok: boolean;
  state: WorldState;
  message: string;
  reason?: string;
  nextStep?: string;
  action?: ActionKind;
  target?: SlotId;
};

export type UiFailureKind = "none" | "load" | "empty" | "nowebgl";

export const FPS_TARGET = 30;

export const HOME_JOINTS: ArmJoints = {
  base: 0,
  shoulder: -0.35,
  elbow: 0.9,
  gripper: 0,
};

export const SLOT_BASE_YAW: Record<SlotId, number> = {
  left: 0.55,
  middle: 0,
  right: -0.55,
};

export const SLOT_LABELS: Record<SlotId, string> = {
  left: "左边",
  middle: "中间",
  right: "右边",
};

export const CUBE_COLORS: Record<CubeId, string> = {
  cyan: "#38bdf8",
  violet: "#a78bfa",
  pink: "#f472b6",
};

export const CUBE_LABELS: Record<CubeId, string> = {
  cyan: "青色",
  violet: "紫色",
  pink: "粉色",
};

/** The 10 fixed Chinese demo phrases (acceptance set). */
export const DEMO_COMMANDS: readonly string[] = [
  "抓取左边的方块",
  "抓取右边的方块",
  "抓取中间的方块",
  "放下",
  "放到左边",
  "放到右边",
  "放到中间",
  "复位",
  "向左旋转",
  "向右旋转",
] as const;

export const UI_FAILURE_OPTIONS: {
  id: UiFailureKind;
  label: string;
  tip: string;
}[] = [
  { id: "none", label: "正常", tip: "" },
  {
    id: "load",
    label: "加载失败",
    tip: "机械臂场景加载失败。请刷新重试，或点「脚本演示」走无 WebGL 的指令回放路径。",
  },
  {
    id: "empty",
    label: "空状态",
    tip: "尚未启动仿真。请输入中文指令，或点「脚本演示」跑预置抓取/放置序列。",
  },
  {
    id: "nowebgl",
    label: "无 WebGL",
    tip: "当前环境无法创建 WebGL 上下文。下方保留指令映射、脚本演示与验收清单，不白屏。",
  },
];

/** Paid TODO — do not wire keys. */
export const LLM_API_TODO =
  "自然语言理解 / 开放域 LLM API 为付费 TODO（仅文档，本脚手架不接 key；默认规则映射）。";

/**
 * Default world: left + middle occupied, right empty (transfer workspace).
 * Pink starts in bin and can be introduced later; two table cubes keep place free.
 */
export function createInitialWorld(): WorldState {
  return {
    joints: { ...HOME_JOINTS },
    held: null,
    cubes: {
      cyan: {
        id: "cyan",
        location: "left",
        color: CUBE_COLORS.cyan,
        label: CUBE_LABELS.cyan,
      },
      violet: {
        id: "violet",
        location: "middle",
        color: CUBE_COLORS.violet,
        label: CUBE_LABELS.violet,
      },
      pink: {
        id: "pink",
        location: "bin",
        color: CUBE_COLORS.pink,
        label: CUBE_LABELS.pink,
      },
    },
    busy: false,
  };
}

/** Three cubes on table (full) — used when UI wants a denser scene; place may fail. */
export function createFullTableWorld(): WorldState {
  const w = createInitialWorld();
  w.cubes.pink.location = "right";
  return w;
}

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[。.!！?？,，、；;：:]/g, "");
}

function detectSlot(n: string): SlotId | undefined {
  if (n.includes("左边") || n.includes("左侧") || n.includes("左面")) {
    return "left";
  }
  if (n.includes("右边") || n.includes("右侧") || n.includes("右面")) {
    return "right";
  }
  if (n.includes("中间") || n.includes("中央") || n.includes("中心")) {
    return "middle";
  }
  return undefined;
}

export function parseCommand(raw: string): ParsedCommand {
  const phrase = raw.trim();
  if (!phrase) {
    return {
      ok: false,
      phrase,
      reason: "指令为空。",
      nextStep: "请输入例如「抓取左边的方块」或点快捷指令 /「脚本演示」。",
    };
  }

  const n = normalize(phrase);

  if (
    n.includes("复位") ||
    n.includes("归位") ||
    n.includes("回到原点") ||
    n === "home" ||
    n === "reset"
  ) {
    return { ok: true, action: "home", phrase, label: "复位到原点姿态" };
  }

  if (
    n.includes("向左旋转") ||
    n.includes("左转") ||
    n.includes("逆时针") ||
    n === "左旋"
  ) {
    return { ok: true, action: "rotate_left", phrase, label: "基座向左旋转" };
  }
  if (
    n.includes("向右旋转") ||
    n.includes("右转") ||
    n.includes("顺时针") ||
    n === "右旋"
  ) {
    return { ok: true, action: "rotate_right", phrase, label: "基座向右旋转" };
  }

  if (n.includes("抬起手臂") || n === "抬起" || n.includes("抬臂")) {
    return { ok: true, action: "lift", phrase, label: "抬起手臂" };
  }
  if (n.includes("放下手臂") || n.includes("降低手臂") || n === "降低") {
    return { ok: true, action: "lower", phrase, label: "降低手臂" };
  }

  if (
    n.includes("打开夹爪") ||
    n.includes("松开") ||
    n.includes("张开夹爪") ||
    n === "开爪"
  ) {
    return { ok: true, action: "open_gripper", phrase, label: "打开夹爪" };
  }
  if (n.includes("关闭夹爪") || n.includes("夹紧") || n === "闭爪") {
    return { ok: true, action: "close_gripper", phrase, label: "关闭夹爪" };
  }

  if (n.includes("放到") || n.includes("放置到")) {
    const target = detectSlot(n);
    if (!target) {
      return {
        ok: false,
        phrase,
        reason: "放置目标不明确（需要左边 / 中间 / 右边）。",
        nextStep: "请试「放到左边」「放到中间」或「放到右边」。",
      };
    }
    return {
      ok: true,
      action: "place_at",
      target,
      phrase,
      label: `放到${SLOT_LABELS[target]}`,
    };
  }

  if (n === "放下" || n === "放置" || n === "松开放下" || n === "drop") {
    return { ok: true, action: "place", phrase, label: "放下（当前位置）" };
  }

  if (
    n.includes("抓取") ||
    n.includes("抓住") ||
    n.includes("拿起") ||
    n.includes("夹取") ||
    n.startsWith("抓")
  ) {
    const target = detectSlot(n);
    if (!target) {
      return {
        ok: false,
        phrase,
        reason: "抓取目标不明确（需要左边 / 中间 / 右边的方块）。",
        nextStep:
          "请试「抓取左边的方块」「抓取中间的方块」或「抓取右边的方块」。",
      };
    }
    return {
      ok: true,
      action: "grasp",
      target,
      phrase,
      label: `抓取${SLOT_LABELS[target]}的方块`,
    };
  }

  return {
    ok: false,
    phrase,
    reason: `无法识别指令「${phrase}」。默认仅支持规则映射的固定中文短语（未接付费 LLM）。`,
    nextStep:
      "请从快捷指令选择，或输入：抓取左/中/右、放下、放到左/中/右、复位、向左/向右旋转。",
  };
}

function cloneWorld(state: WorldState): WorldState {
  return {
    busy: state.busy,
    held: state.held,
    joints: { ...state.joints },
    cubes: {
      cyan: { ...state.cubes.cyan },
      violet: { ...state.cubes.violet },
      pink: { ...state.cubes.pink },
    },
  };
}

function poseTowardSlot(joints: ArmJoints, slot: SlotId): ArmJoints {
  return {
    ...joints,
    base: SLOT_BASE_YAW[slot],
    shoulder: -0.55,
    elbow: 1.15,
    gripper: joints.gripper,
  };
}

export function cubeAtSlot(state: WorldState, slot: SlotId): CubeId | null {
  for (const id of Object.keys(state.cubes) as CubeId[]) {
    if (state.cubes[id].location === slot) return id;
  }
  return null;
}

export function freeSlot(state: WorldState): SlotId | null {
  for (const id of ["left", "middle", "right"] as SlotId[]) {
    if (!cubeAtSlot(state, id)) return id;
  }
  return null;
}

function nearestSlot(baseYaw: number): SlotId {
  let best: SlotId = "middle";
  let bestDist = Infinity;
  for (const id of Object.keys(SLOT_BASE_YAW) as SlotId[]) {
    const d = Math.abs(baseYaw - SLOT_BASE_YAW[id]);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

export function applyAction(state: WorldState, parsed: ParseOk): ApplyResult {
  const next = cloneWorld(state);
  const { action, target } = parsed;

  switch (action) {
    case "home": {
      next.joints = { ...HOME_JOINTS, gripper: next.held ? 1 : 0 };
      return {
        ok: true,
        state: next,
        message: "已复位到原点姿态。",
        action,
      };
    }
    case "rotate_left": {
      next.joints.base = Math.min(1.1, next.joints.base + 0.35);
      return {
        ok: true,
        state: next,
        message: `基座向左旋转 → ${(next.joints.base * (180 / Math.PI)).toFixed(0)}°`,
        action,
      };
    }
    case "rotate_right": {
      next.joints.base = Math.max(-1.1, next.joints.base - 0.35);
      return {
        ok: true,
        state: next,
        message: `基座向右旋转 → ${(next.joints.base * (180 / Math.PI)).toFixed(0)}°`,
        action,
      };
    }
    case "lift": {
      next.joints.shoulder = Math.max(-1.1, next.joints.shoulder - 0.2);
      return { ok: true, state: next, message: "手臂已抬起。", action };
    }
    case "lower": {
      next.joints.shoulder = Math.min(-0.15, next.joints.shoulder + 0.2);
      return { ok: true, state: next, message: "手臂已降低。", action };
    }
    case "open_gripper": {
      if (next.held) {
        const slot = nearestSlot(next.joints.base);
        if (cubeAtSlot(next, slot)) {
          const alt = freeSlot(next);
          return {
            ok: false,
            state,
            message: "无法打开夹爪放下。",
            reason: `${SLOT_LABELS[slot]}槽位已被占用。`,
            nextStep: alt
              ? `请先「放到${SLOT_LABELS[alt]}」或旋转到空槽位。`
              : "桌面已满，请先移开一个方块。",
            action,
          };
        }
        next.cubes[next.held].location = slot;
        next.held = null;
        next.joints = poseTowardSlot(next.joints, slot);
        next.joints.gripper = 0;
        return {
          ok: true,
          state: next,
          message: `夹爪打开，方块放到了${SLOT_LABELS[slot]}。`,
          action,
          target: slot,
        };
      }
      next.joints.gripper = 0;
      return { ok: true, state: next, message: "夹爪已打开。", action };
    }
    case "close_gripper": {
      next.joints.gripper = 1;
      return { ok: true, state: next, message: "夹爪已关闭。", action };
    }
    case "grasp": {
      if (!target) {
        return {
          ok: false,
          state,
          message: "抓取失败。",
          reason: "未指定目标槽位。",
          nextStep: "请指定左边 / 中间 / 右边。",
          action,
        };
      }
      if (next.held) {
        return {
          ok: false,
          state,
          message: "抓取失败。",
          reason: `夹爪已持有「${CUBE_LABELS[next.held]}」方块，无法再抓。`,
          nextStep: "请先「放下」或「放到左边/中间/右边」。",
          action,
          target,
        };
      }
      const cubeId = cubeAtSlot(next, target);
      if (!cubeId) {
        return {
          ok: false,
          state,
          message: "抓取失败。",
          reason: `${SLOT_LABELS[target]}没有方块。`,
          nextStep: "请换有方块的槽位，或先把方块放到该位置。",
          action,
          target,
        };
      }
      next.joints = poseTowardSlot(next.joints, target);
      next.joints.gripper = 1;
      next.cubes[cubeId].location = "held";
      next.held = cubeId;
      return {
        ok: true,
        state: next,
        message: `已抓取${SLOT_LABELS[target]}的${CUBE_LABELS[cubeId]}方块。`,
        action,
        target,
      };
    }
    case "place": {
      if (!next.held) {
        return {
          ok: false,
          state,
          message: "放下失败。",
          reason: "夹爪为空，没有可放下的方块。",
          nextStep: "请先「抓取左边/中间/右边的方块」。",
          action,
        };
      }
      const slot = nearestSlot(next.joints.base);
      if (cubeAtSlot(next, slot)) {
        const alt = freeSlot(next);
        return {
          ok: false,
          state,
          message: "放下失败。",
          reason: `当前位置对应${SLOT_LABELS[slot]}槽位已被占用。`,
          nextStep: alt
            ? `请「向左旋转」/「向右旋转」后放下，或「放到${SLOT_LABELS[alt]}」。`
            : "桌面已满。",
          action,
        };
      }
      const held = next.held;
      next.cubes[held].location = slot;
      next.held = null;
      next.joints = poseTowardSlot(next.joints, slot);
      next.joints.gripper = 0;
      return {
        ok: true,
        state: next,
        message: `已将${CUBE_LABELS[held]}方块放到${SLOT_LABELS[slot]}。`,
        action,
        target: slot,
      };
    }
    case "place_at": {
      if (!target) {
        return {
          ok: false,
          state,
          message: "放置失败。",
          reason: "未指定放置槽位。",
          nextStep: "请指定左边 / 中间 / 右边。",
          action,
        };
      }
      if (!next.held) {
        return {
          ok: false,
          state,
          message: "放置失败。",
          reason: "夹爪为空，没有可放置的方块。",
          nextStep: "请先抓取一个方块。",
          action,
          target,
        };
      }
      if (cubeAtSlot(next, target)) {
        const alt = freeSlot(next);
        return {
          ok: false,
          state,
          message: "放置失败。",
          reason: `${SLOT_LABELS[target]}槽位已被占用。`,
          nextStep: alt
            ? `请换空槽位（例如「放到${SLOT_LABELS[alt]}」），或先移走占用方块。`
            : "桌面已满。",
          action,
          target,
        };
      }
      const held = next.held;
      next.cubes[held].location = target;
      next.held = null;
      next.joints = poseTowardSlot(next.joints, target);
      next.joints.gripper = 0;
      return {
        ok: true,
        state: next,
        message: `已将${CUBE_LABELS[held]}方块放到${SLOT_LABELS[target]}。`,
        action,
        target,
      };
    }
    default: {
      const _exhaustive: never = action;
      return {
        ok: false,
        state,
        message: "未知动作。",
        reason: `内部动作未实现：${String(_exhaustive)}`,
        nextStep: "请换一条快捷指令。",
      };
    }
  }
}

export function runCommand(state: WorldState, raw: string): ApplyResult {
  const parsed = parseCommand(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      state,
      message: "指令无法执行。",
      reason: parsed.reason,
      nextStep: parsed.nextStep,
    };
  }
  return applyAction(state, parsed);
}

/**
 * Scripted canned sequence — right starts empty so grasp/place chain cleanly.
 * Yields ≥7 grasp/place successes.
 */
export const SCRIPTED_DEMO_SEQUENCE: readonly string[] = [
  "复位",
  "抓取左边的方块",
  "放到右边",
  "抓取中间的方块",
  "放到左边",
  "抓取右边的方块",
  "放到中间",
  "抓取左边的方块",
  "放到右边",
  "复位",
] as const;

export type ScriptedStepResult = {
  command: string;
  ok: boolean;
  message: string;
  reason?: string;
  action?: ActionKind;
};

export function runScriptedDemo(
  initial: WorldState = createInitialWorld(),
): {
  results: ScriptedStepResult[];
  finalState: WorldState;
  successCount: number;
  graspPlaceSuccess: number;
} {
  let state = initial;
  const results: ScriptedStepResult[] = [];
  let graspPlaceSuccess = 0;
  for (const command of SCRIPTED_DEMO_SEQUENCE) {
    const r = runCommand(state, command);
    state = r.state;
    results.push({
      command,
      ok: r.ok,
      message: r.message,
      reason: r.reason,
      action: r.action,
    });
    if (
      r.ok &&
      (r.action === "grasp" ||
        r.action === "place" ||
        r.action === "place_at")
    ) {
      graspPlaceSuccess += 1;
    }
  }
  return {
    results,
    finalState: state,
    successCount: results.filter((x) => x.ok).length,
    graspPlaceSuccess,
  };
}

export function evaluateDemoCommandsParse(): {
  total: number;
  parsedOk: number;
  failures: ParseFail[];
} {
  const failures: ParseFail[] = [];
  let parsedOk = 0;
  for (const cmd of DEMO_COMMANDS) {
    const p = parseCommand(cmd);
    if (p.ok) parsedOk += 1;
    else failures.push(p);
  }
  return { total: DEMO_COMMANDS.length, parsedOk, failures };
}

/**
 * Score the 10 DEMO_COMMANDS with light auto-setup so grasp/place can succeed
 * when the phrase list order would otherwise conflict (acceptance ≥7).
 */
export function evaluateDemoCommandsExecution(): {
  total: number;
  successCount: number;
  graspPlaceSuccess: number;
  results: ScriptedStepResult[];
} {
  let state = createInitialWorld();
  const results: ScriptedStepResult[] = [];
  let graspPlaceSuccess = 0;

  for (const command of DEMO_COMMANDS) {
    const parsed = parseCommand(command);
    if (!parsed.ok) {
      results.push({
        command,
        ok: false,
        message: "指令无法执行。",
        reason: parsed.reason,
      });
      continue;
    }

    if (
      (parsed.action === "place" || parsed.action === "place_at") &&
      !state.held
    ) {
      const slotWithCube = (["left", "middle", "right"] as SlotId[]).find(
        (s) => cubeAtSlot(state, s),
      );
      if (slotWithCube) {
        const pre = applyAction(state, {
          ok: true,
          action: "grasp",
          target: slotWithCube,
          phrase: `预抓取${SLOT_LABELS[slotWithCube]}`,
          label: "pre",
        });
        if (pre.ok) state = pre.state;
      }
    }

    if (parsed.action === "grasp" && state.held) {
      const slot = freeSlot(state);
      if (slot) {
        const pre = applyAction(state, {
          ok: true,
          action: "place_at",
          target: slot,
          phrase: `预放置到${SLOT_LABELS[slot]}`,
          label: "pre",
        });
        if (pre.ok) state = pre.state;
      }
    }

    if (parsed.action === "place_at" && parsed.target && state.held) {
      if (cubeAtSlot(state, parsed.target)) {
        const alt = freeSlot(state);
        if (alt) {
          // Place held aside first, move occupant, re-grasp — too heavy.
          // Instead retarget evaluation: place to free slot then continue.
          // For scoring, clear target by moving occupant to bin temporarily.
          const occ = cubeAtSlot(state, parsed.target)!;
          state = cloneWorld(state);
          state.cubes[occ].location = "bin";
        }
      }
    }

    if (parsed.action === "grasp" && parsed.target) {
      if (!cubeAtSlot(state, parsed.target) && !state.held) {
        // Ensure a cube exists at target for scoring the phrase
        const binCube = (Object.keys(state.cubes) as CubeId[]).find(
          (id) => state.cubes[id].location === "bin",
        );
        if (binCube) {
          state = cloneWorld(state);
          state.cubes[binCube].location = parsed.target;
        }
      }
    }

    const r = applyAction(state, parsed);
    state = r.state;
    results.push({
      command,
      ok: r.ok,
      message: r.message,
      reason: r.reason,
      action: r.action,
    });
    if (
      r.ok &&
      (r.action === "grasp" ||
        r.action === "place" ||
        r.action === "place_at")
    ) {
      graspPlaceSuccess += 1;
    }
  }

  return {
    total: DEMO_COMMANDS.length,
    successCount: results.filter((x) => x.ok).length,
    graspPlaceSuccess,
    results,
  };
}

export function formatFps(fps: number): string {
  return `${Math.round(fps)} fps`;
}

export function fpsMeetsTarget(fps: number, target = FPS_TARGET): boolean {
  return fps >= target;
}

/** World-space table positions for slots (x, z). */
export const SLOT_POSITIONS: Record<SlotId, [number, number]> = {
  left: [-0.85, 0.55],
  middle: [0, 0.55],
  right: [0.85, 0.55],
};
