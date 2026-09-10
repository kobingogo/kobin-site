/**
 * Agent 假完成 DoD 闸门 — 纯函数核心（无付费 API、无浏览器依赖）
 * Boss 叙事：检查通过 ≠ 可交付
 * Eval 口径：缺证据 / 无标准就绿 / 边界未跑 / 清单对不上 / 部分完成 / 工具失败·超时·空输出 = 假完成
 */

export const DOD_FALSE_COMPLETE_CODES = [
  "missing-evidence",
  "no-standard-green",
  "boundary-unrun",
  "checklist-mismatch",
  "partial-complete",
  "tool-failure",
  "timeout",
  "empty-output",
] as const;

export type DodFailureCode = (typeof DOD_FALSE_COMPLETE_CODES)[number];

/** 稳定交付物 ID（handoff / Eval 对齐） */
export const DOD_DELIVERABLE_IDS = [
  "DOD-GATE-01-repro-baseline",
  "DOD-GATE-02-assert-script",
  "DOD-GATE-03-false-complete-zero",
  "DOD-GATE-04-block-rate-100",
  "DOD-GATE-05-id-registry",
] as const;

export type DodDeliverableId = (typeof DOD_DELIVERABLE_IDS)[number];

export type DodRunStatus =
  | "ok"
  | "tool-failure"
  | "timeout"
  | "empty-output";

export type DodItem = {
  id: string;
  label: string;
  /** 验收标准文案；空串 = 无标准 */
  standard: string;
  /** 证据：URL / 文件路径 / 备注 */
  evidence: string;
  /** 用户是否标绿 */
  markedDone: boolean;
  /** 边界 / 失败路径是否已跑 */
  boundaryRun: boolean;
  requiresEvidence: boolean;
  requiresStandard: boolean;
  requiresBoundary: boolean;
  /**
   * Agent/工具最近一次运行结果。
   * 标绿但非 ok → 对应假完成口径（tool-failure / timeout / empty-output）
   */
  runStatus: DodRunStatus;
};

export type DodState = {
  /** 闸门是否开启 */
  gateOn: boolean;
  items: DodItem[];
  /** 声称已交付的 ID 列表 */
  claimedDeliverableIds: string[];
};

export type DodFailure = {
  code: DodFailureCode;
  itemId?: string;
  message: string;
};

export type DodAssertResult = {
  ok: boolean;
  /** 闸门关闭时始终 true（演示假完成可放行） */
  canMarkComplete: boolean;
  failures: DodFailure[];
  /** 通过的清单项数（gated 语义） */
  passedItemCount: number;
  totalItemCount: number;
  /** 对假完成用例集的拦截率（0–1）；单次断言时：有失败=1 / 全过=0 */
  blockRate: number;
  deliverableIds: readonly string[];
  claimedDeliverableIds: string[];
  checklistAligned: boolean;
};

export const DEFAULT_DOD_ITEMS: DodItem[] = [
  {
    id: "item-repro",
    label: "无闸门假完成基线可复现",
    standard: "对照基线：标绿但无证据时仍可点「标记完成」",
    evidence: "",
    markedDone: true,
    boundaryRun: false,
    requiresEvidence: true,
    requiresStandard: true,
    requiresBoundary: true,
    runStatus: "ok",
  },
  {
    id: "item-assert",
    label: "闸门断言脚本可跑",
    standard: "node --test 覆盖四类假完成，block rate = 100%",
    evidence: "",
    markedDone: true,
    boundaryRun: false,
    requiresEvidence: true,
    requiresStandard: true,
    requiresBoundary: true,
    runStatus: "ok",
  },
  {
    id: "item-zero-pass",
    label: "假完成通过率 = 0",
    standard: "",
    evidence: "logs/fake-green.txt",
    markedDone: true,
    boundaryRun: false,
    requiresEvidence: true,
    requiresStandard: true,
    requiresBoundary: false,
    runStatus: "ok",
  },
  {
    id: "item-block-rate",
    label: "拦截率 block rate = 100%",
    standard: "定义用例全集均被拦截",
    evidence: "",
    markedDone: true,
    boundaryRun: true,
    requiresEvidence: true,
    requiresStandard: true,
    requiresBoundary: true,
    runStatus: "ok",
  },
  {
    id: "item-id-registry",
    label: "Deliverable ID 列表对齐",
    standard: "claimed ⊆ registry 且 registry 全覆盖",
    evidence: "src/lib/dod-gate.ts#DOD_DELIVERABLE_IDS",
    markedDone: true,
    boundaryRun: true,
    requiresEvidence: true,
    requiresStandard: true,
    requiresBoundary: false,
    runStatus: "ok",
  },
];

function trim(s: string): string {
  return s.trim();
}

function hasEvidence(item: DodItem): boolean {
  return trim(item.evidence).length > 0;
}

function hasStandard(item: DodItem): boolean {
  return trim(item.standard).length > 0;
}

function checklistAligned(
  claimed: string[],
  registry: readonly string[],
): boolean {
  if (claimed.length !== registry.length) return false;
  const set = new Set(claimed.map(trim).filter(Boolean));
  if (set.size !== registry.length) return false;
  return registry.every((id) => set.has(id));
}

/**
 * 纯函数闸门：根据 state 断言是否允许「标记完成」。
 * - gateOff：canMarkComplete 恒 true（假完成可复现），failures 仍计算供对照
 * - gateOn：任一假完成口径命中 → ok=false，canMarkComplete=false
 */
export function assertDod(
  state: DodState,
  registry: readonly string[] = DOD_DELIVERABLE_IDS,
): DodAssertResult {
  const failures: DodFailure[] = [];

  const incomplete = state.items.filter((i) => !i.markedDone);
  if (incomplete.length > 0) {
    failures.push({
      code: "partial-complete",
      message: `部分完成不可交付：仍有 ${incomplete.length} 项未标绿（${incomplete.map((i) => i.id).join(", ")}）`,
    });
  }

  for (const item of state.items) {
    if (!item.markedDone) continue;

    if (item.requiresEvidence && !hasEvidence(item)) {
      failures.push({
        code: "missing-evidence",
        itemId: item.id,
        message: `「${item.label}」标绿但缺证据（URL / 文件 / 备注）`,
      });
    }

    if (item.requiresStandard && !hasStandard(item)) {
      failures.push({
        code: "no-standard-green",
        itemId: item.id,
        message: `「${item.label}」无验收标准却标绿`,
      });
    }

    if (item.requiresBoundary && !item.boundaryRun) {
      failures.push({
        code: "boundary-unrun",
        itemId: item.id,
        message: `「${item.label}」边界 / 失败路径未跑`,
      });
    }

    const status = item.runStatus ?? "ok";
    if (status === "tool-failure") {
      failures.push({
        code: "tool-failure",
        itemId: item.id,
        message: `「${item.label}」工具调用失败仍标绿`,
      });
    } else if (status === "timeout") {
      failures.push({
        code: "timeout",
        itemId: item.id,
        message: `「${item.label}」运行超时仍标绿`,
      });
    } else if (status === "empty-output") {
      failures.push({
        code: "empty-output",
        itemId: item.id,
        message: `「${item.label}」输出为空仍标绿`,
      });
    }
  }

  const aligned = checklistAligned(state.claimedDeliverableIds, registry);
  if (!aligned) {
    failures.push({
      code: "checklist-mismatch",
      message: `清单对不上：claimed=[${state.claimedDeliverableIds.join(", ")}] vs registry=[${registry.join(", ")}]`,
    });
  }

  const gatedOk = failures.length === 0;
  const markedCount = state.items.filter((i) => i.markedDone).length;

  return {
    ok: gatedOk,
    canMarkComplete: state.gateOn ? gatedOk : true,
    failures,
    passedItemCount: gatedOk ? markedCount : 0,
    totalItemCount: state.items.length,
    blockRate: gatedOk ? 0 : 1,
    deliverableIds: registry,
    claimedDeliverableIds: [...state.claimedDeliverableIds],
    checklistAligned: aligned,
  };
}

export type FakeCompleteCase = {
  id: string;
  label: string;
  description: string;
  /** 构造假完成 state（gateOn 由调用方决定） */
  build: () => Omit<DodState, "gateOn">;
};

function cloneItems(items: DodItem[]): DodItem[] {
  return items.map((i) => ({ ...i }));
}

/** 假完成用例（原四类 + 部分完成/工具失败/超时/空输出）+ 合规模板 */
export const FAKE_COMPLETE_CASES: FakeCompleteCase[] = [
  {
    id: "case-missing-evidence",
    label: "假完成 · 缺证据",
    description: "全部标绿，但关键项 evidence 为空",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i) => ({
        ...i,
        markedDone: true,
        evidence: "",
        standard: i.standard || "临时标准占位",
        boundaryRun: true,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-no-standard",
    label: "假完成 · 无标准就绿",
    description: "标绿且有证据，但 standard 为空",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i) => ({
        ...i,
        markedDone: true,
        evidence: `evidence://${i.id}`,
        standard: "",
        boundaryRun: true,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-boundary-unrun",
    label: "假完成 · 边界未跑",
    description: "主路径看起来绿，requiresBoundary 项未跑边界",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i) => ({
        ...i,
        markedDone: true,
        evidence: `evidence://${i.id}`,
        standard: i.standard || `标准·${i.id}`,
        boundaryRun: false,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-checklist-mismatch",
    label: "假完成 · 清单对不上",
    description: "项都合规，但 claimed IDs 与 registry 不一致",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i) => ({
        ...i,
        markedDone: true,
        evidence: `evidence://${i.id}`,
        standard: i.standard || `标准·${i.id}`,
        boundaryRun: true,
      }));
      return {
        items,
        claimedDeliverableIds: ["DOD-GATE-01-repro-baseline", "FAKE-EXTRA-ID"],
      };
    },
  },
  {
    id: "case-all-four",
    label: "假完成 · 四连击",
    description: "同时命中缺证据 / 无标准 / 边界未跑 / 清单不对",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i, idx) => ({
        ...i,
        markedDone: true,
        evidence: idx === 0 ? "" : `evidence://${i.id}`,
        standard: idx === 2 ? "" : i.standard || `标准·${i.id}`,
        boundaryRun: idx % 2 === 0 ? false : true,
        runStatus: "ok" as DodRunStatus,
      }));
      return {
        items,
        claimedDeliverableIds: ["WRONG-ID"],
      };
    },
  },
  {
    id: "case-partial-complete",
    label: "假完成 · 部分完成",
    description: "部分项标绿、部分未完成 — 有闸门时不得放行",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i, idx) => ({
        ...i,
        markedDone: idx < 2,
        evidence: `evidence://${i.id}#sha256:demo`,
        standard: i.standard || `验收标准·${i.id}`,
        boundaryRun: true,
        runStatus: "ok" as DodRunStatus,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-tool-failure",
    label: "假完成 · 工具失败",
    description: "清单标绿但工具调用失败（runStatus=tool-failure）",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i, idx) => ({
        ...i,
        markedDone: true,
        evidence: `evidence://${i.id}`,
        standard: i.standard || `标准·${i.id}`,
        boundaryRun: true,
        runStatus: (idx === 0 ? "tool-failure" : "ok") as DodRunStatus,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-timeout",
    label: "假完成 · 超时",
    description: "运行超时仍标绿（runStatus=timeout）",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i, idx) => ({
        ...i,
        markedDone: true,
        evidence: `evidence://${i.id}`,
        standard: i.standard || `标准·${i.id}`,
        boundaryRun: true,
        runStatus: (idx === 1 ? "timeout" : "ok") as DodRunStatus,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
  {
    id: "case-empty-output",
    label: "假完成 · 空输出",
    description: "输出为空仍标绿（runStatus=empty-output）",
    build: () => {
      const items = cloneItems(DEFAULT_DOD_ITEMS).map((i, idx) => ({
        ...i,
        markedDone: true,
        evidence: idx === 0 ? "(empty)" : `evidence://${i.id}`,
        standard: i.standard || `标准·${i.id}`,
        boundaryRun: true,
        runStatus: (idx === 0 ? "empty-output" : "ok") as DodRunStatus,
      }));
      return {
        items,
        claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
      };
    },
  },
];

export const COMPLIANT_CASE: FakeCompleteCase = {
  id: "case-compliant",
  label: "合规交付",
  description: "证据 / 标准 / 边界 / ID 清单全部对齐 → 闸门应放行",
  build: () => {
    const items = cloneItems(DEFAULT_DOD_ITEMS).map((i) => ({
      ...i,
      markedDone: true,
      evidence: `evidence://${i.id}#sha256:demo`,
      standard: i.standard || `验收标准·${i.id}`,
      boundaryRun: true,
      runStatus: "ok" as DodRunStatus,
    }));
    return {
      items,
      claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
    };
  },
};

export type EvalHandoff = {
  brand: "KobinFlow";
  demo: "agent-dod-gate";
  gateOn: boolean;
  ok: boolean;
  canMarkComplete: boolean;
  blockRate: number;
  falseCompletePassCount: number;
  failures: DodFailure[];
  deliverableIds: readonly string[];
  claimedDeliverableIds: string[];
  checklistAligned: boolean;
  exportedAt: string;
};

export function buildHandoff(
  state: DodState,
  result: DodAssertResult,
): EvalHandoff {
  return {
    brand: "KobinFlow",
    demo: "agent-dod-gate",
    gateOn: state.gateOn,
    ok: result.ok,
    canMarkComplete: result.canMarkComplete,
    blockRate: result.blockRate,
    falseCompletePassCount: result.ok ? 1 : 0,
    failures: result.failures,
    deliverableIds: result.deliverableIds,
    claimedDeliverableIds: result.claimedDeliverableIds,
    checklistAligned: result.checklistAligned,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * 对定义的假完成用例集跑闸门：期望全部拦截，通过率 0，block rate 100%。
 */
export function assertFakeCompleteSuite(gateOn = true): {
  passCount: number;
  blockCount: number;
  blockRate: number;
  results: { caseId: string; ok: boolean; failureCodes: DodFailureCode[] }[];
} {
  const results = FAKE_COMPLETE_CASES.map((c) => {
    const built = c.build();
    const result = assertDod({ ...built, gateOn });
    return {
      caseId: c.id,
      ok: result.ok,
      failureCodes: [
        ...new Set(result.failures.map((f) => f.code)),
      ] as DodFailureCode[],
    };
  });
  const passCount = results.filter((r) => r.ok).length;
  const blockCount = results.length - passCount;
  return {
    passCount,
    blockCount,
    blockRate: results.length === 0 ? 0 : blockCount / results.length,
    results,
  };
}
