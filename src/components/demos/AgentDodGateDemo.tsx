"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  assertDod,
  assertFakeCompleteSuite,
  buildHandoff,
  COMPLIANT_CASE,
  DOD_DELIVERABLE_IDS,
  DEFAULT_DOD_ITEMS,
  FAKE_COMPLETE_CASES,
  type DodItem,
  type DodRunStatus,
  type DodState,
  type EvalHandoff,
} from "@/lib/dod-gate";
import { DOD_FALSE_COMPLETE_CRITERIA } from "@/lib/demos";

type PresetId = string;

const PRESETS = [...FAKE_COMPLETE_CASES, COMPLIANT_CASE];

type UiFailureKind = "none" | "load" | "empty" | "permission" | "timeout";

const UI_FAILURE_OPTIONS: { id: UiFailureKind; label: string; tip: string }[] = [
  { id: "none", label: "正常", tip: "" },
  {
    id: "load",
    label: "加载失败",
    tip: "清单数据加载失败。请检查网络后点「重试」；离线时可继续用本地预设验收闸门逻辑。",
  },
  {
    id: "empty",
    label: "空状态",
    tip: "当前无 DoD 清单项。请选择预设用例加载，或确认权限/数据源未被清空。",
  },
  {
    id: "permission",
    label: "权限不足",
    tip: "无权写入「标记完成」状态（演示）。导出 JSON / 只读断言仍可用。",
  },
  {
    id: "timeout",
    label: "请求超时",
    tip: "同步断言结果超时。可点「重试」；弱网下建议先跑 npm run test:dod 本地断言。",
  },
];

const RUN_STATUS_OPTIONS: { id: DodRunStatus; label: string }[] = [
  { id: "ok", label: "ok" },
  { id: "tool-failure", label: "工具失败" },
  { id: "timeout", label: "超时" },
  { id: "empty-output", label: "空输出" },
];

function applyPreset(presetId: PresetId, gateOn: boolean): DodState {
  const preset = PRESETS.find((p) => p.id === presetId) ?? FAKE_COMPLETE_CASES[0];
  const built = preset.build();
  return { ...built, gateOn };
}

export function AgentDodGateDemo() {
  const [gateOn, setGateOn] = useState(false);
  const [presetId, setPresetId] = useState<PresetId>(FAKE_COMPLETE_CASES[0].id);
  const [items, setItems] = useState<DodItem[]>(() =>
    applyPreset(FAKE_COMPLETE_CASES[0].id, false).items,
  );
  const [claimedIds, setClaimedIds] = useState<string[]>(() =>
    applyPreset(FAKE_COMPLETE_CASES[0].id, false).claimedDeliverableIds,
  );
  const [completeMsg, setCompleteMsg] = useState<string | null>(null);
  const [completeKind, setCompleteKind] = useState<"ok" | "blocked" | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [suiteNote, setSuiteNote] = useState<string | null>(null);
  const [uiFailure, setUiFailure] = useState<UiFailureKind>("none");
  const [online, setOnline] = useState(true);
  const [slowNetTip, setSlowNetTip] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    // 弱网可读提示：首屏短暂展示，不挡操作
    const t = window.setTimeout(() => setSlowNetTip(true), 0);
    const t2 = window.setTimeout(() => setSlowNetTip(false), 8000);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);

  const state: DodState = useMemo(
    () => ({ gateOn, items, claimedDeliverableIds: claimedIds }),
    [gateOn, items, claimedIds],
  );

  const result = useMemo(() => assertDod(state), [state]);

  const loadPreset = useCallback(
    (id: PresetId, nextGate = gateOn) => {
      const next = applyPreset(id, nextGate);
      setPresetId(id);
      setItems(next.items);
      setClaimedIds(next.claimedDeliverableIds);
      setCompleteMsg(null);
      setCompleteKind(null);
      setCopied(false);
    },
    [gateOn],
  );

  const toggleGate = (on: boolean) => {
    setGateOn(on);
    setCompleteMsg(null);
    setCompleteKind(null);
  };

  const updateItem = (id: string, patch: Partial<DodItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
    setCompleteMsg(null);
    setCompleteKind(null);
  };

  const toggleClaimed = (id: string) => {
    setClaimedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setCompleteMsg(null);
    setCompleteKind(null);
  };

  const onMarkComplete = () => {
    if (uiFailure === "permission") {
      setCompleteKind("blocked");
      setCompleteMsg("权限不足：无法写入标记完成（失败态演示）。");
      return;
    }
    if (uiFailure === "timeout") {
      setCompleteKind("blocked");
      setCompleteMsg("请求超时：标记完成未确认（失败态演示）。可重试或切回「正常」。");
      return;
    }
    const r = assertDod(state);
    if (!state.gateOn) {
      setCompleteKind("ok");
      setCompleteMsg(
        "无闸门：已「标记完成」——假完成放行（检查看起来绿，但可交付性未核验）。",
      );
      return;
    }
    if (!r.canMarkComplete) {
      setCompleteKind("blocked");
      setCompleteMsg(
        `有闸门：拦截「标记完成」。命中 ${r.failures.length} 条假完成口径（blockRate=${r.blockRate * 100}%）。`,
      );
      return;
    }
    setCompleteKind("ok");
    setCompleteMsg("有闸门：证据 / 标准 / 边界 / 清单均对齐，允许标记完成。");
  };

  const handoff: EvalHandoff = useMemo(
    () => buildHandoff(state, result),
    [state, result],
  );

  const exportJson = async () => {
    const text = JSON.stringify(handoff, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select via prompt-less download
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kobinflow-dod-handoff.json";
      a.click();
      URL.revokeObjectURL(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const runSuiteInUi = () => {
    const suite = assertFakeCompleteSuite(true);
    setSuiteNote(
      `脚本同款套件（有闸门）：假完成通过=${suite.passCount}，拦截=${suite.blockCount}/${FAKE_COMPLETE_CASES.length}，blockRate=${(suite.blockRate * 100).toFixed(0)}%`,
    );
  };

  const failureByItem = useMemo(() => {
    const map = new Map<string, typeof result.failures>();
    for (const f of result.failures) {
      if (!f.itemId) continue;
      const list = map.get(f.itemId) ?? [];
      list.push(f);
      map.set(f.itemId, list);
    }
    return map;
  }, [result]);

  const globalFailures = result.failures.filter((f) => !f.itemId);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-400/80">
        Demo · 可验收 · KobinFlow
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        Agent 假完成 DoD 闸门
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Agent DoD Gate</p>
      <p className="mt-4 text-base leading-relaxed text-zinc-300 sm:text-lg">
        检查通过 ≠ 可交付。缺证据 / 无标准就绿 / 边界未跑 / 清单对不上 / 部分完成 / 工具失败·超时·空输出 → 假完成。
      </p>

      {/* Mobile / offline degrade */}
      <aside
        className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100"
        data-testid="mobile-net-tip"
      >
        <p className="font-mono text-xs text-amber-300/90">移动端 / 弱网提示</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-100/90 sm:text-sm">
          <li>
            · 网络：{online ? "在线" : "离线"} —{" "}
            {online
              ? "弱网时可先读本页清单与失败原因；脚本断言不依赖浏览器。"
              : "离线可读：闸门逻辑在本地运行，预设用例与「标记完成」仍可点。"}
          </li>
          {(slowNetTip || !online) && (
            <li>· 慢网：深色底不白屏；触控按钮 ≥44px，单列可滚动。</li>
          )}
          <li>· 小屏：下方控件均为 min-h-11，拇指可点。</li>
        </ul>
      </aside>

      {/* Failure states demo */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-cyan-300">失败态演示</h2>
        <p className="mt-2 text-xs text-zinc-500">
          加载失败 / 空状态 / 权限 / 超时 — 可读、可切换，不白屏。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {UI_FAILURE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`ui-failure-${opt.id}`}
              onClick={() => {
                setUiFailure(opt.id);
                setCompleteMsg(null);
                setCompleteKind(null);
              }}
              className={`min-h-11 rounded-xl px-2 py-2 text-xs font-medium transition sm:text-sm ${
                uiFailure === opt.id
                  ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40"
                  : "bg-black/40 text-zinc-400 ring-1 ring-white/10 hover:bg-white/5"
              }`}
              aria-pressed={uiFailure === opt.id}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {uiFailure !== "none" && (
          <div
            role="alert"
            data-testid="ui-failure-banner"
            className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
          >
            <p className="font-medium">{UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.label}</p>
            <p className="mt-1 text-xs text-rose-200/90 sm:text-sm">
              {UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.tip}
            </p>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-lg bg-rose-500/30 px-4 text-sm text-rose-50 ring-1 ring-rose-400/40"
              onClick={() => setUiFailure("none")}
            >
              重试 / 恢复正常
            </button>
          </div>
        )}
      </section>

      {/* Mode toggle */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-cyan-300">模式</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            data-testid="gate-off"
            onClick={() => toggleGate(false)}
            className={`min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              !gateOn
                ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50"
                : "bg-black/40 text-zinc-400 ring-1 ring-white/10 hover:bg-white/5"
            }`}
            aria-pressed={!gateOn}
          >
            无闸门
            <span className="mt-1 block text-xs font-normal opacity-80">
              假完成可复现
            </span>
          </button>
          <button
            type="button"
            data-testid="gate-on"
            onClick={() => toggleGate(true)}
            className={`min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              gateOn
                ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50"
                : "bg-black/40 text-zinc-400 ring-1 ring-white/10 hover:bg-white/5"
            }`}
            aria-pressed={gateOn}
          >
            有闸门
            <span className="mt-1 block text-xs font-normal opacity-80">
              脚本可断言拦截
            </span>
          </button>
        </div>

        <label className="mt-5 block">
          <span className="font-mono text-xs text-zinc-400">预设用例</span>
          <select
            data-testid="preset-select"
            className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100"
            value={presetId}
            onChange={(e) => loadPreset(e.target.value)}
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          {PRESETS.find((p) => p.id === presetId)?.description}
        </p>
      </section>

      {/* Criteria legend */}
      <section className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-rose-300">
          假完成口径（命中任一 → 不绿）
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {DOD_FALSE_COMPLETE_CRITERIA.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-rose-500/15 bg-black/30 px-3 py-2"
            >
              <p className="text-sm font-medium text-zinc-100">
                <span className="font-mono text-[10px] text-rose-300/80">
                  {c.id}
                </span>{" "}
                · {c.label}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{c.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Checklist */}
      <section className="mt-6 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="font-mono text-sm text-cyan-300">DoD 清单</h2>
          <p className="text-xs text-zinc-500">
            客观 {result.ok ? "通过" : "未过"} · 可点完成{" "}
            {result.canMarkComplete ? "是" : "否"}
          </p>
        </div>

        {(uiFailure === "load" || uiFailure === "empty") && (
          <div
            data-testid="checklist-empty-or-load"
            className="rounded-2xl border border-dashed border-white/15 bg-black/40 px-4 py-8 text-center text-sm text-zinc-400"
          >
            {uiFailure === "load"
              ? "加载失败：清单暂不可用（演示）。点上方「重试 / 恢复正常」。"
              : "空状态：暂无清单项（演示）。选择预设或恢复正常。"}
          </div>
        )}

        {uiFailure !== "load" && uiFailure !== "empty" && items.map((item) => {
          const itemFails = failureByItem.get(item.id) ?? [];
          const looksGreen = item.markedDone;
          return (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 ${
                itemFails.length > 0 && gateOn
                  ? "border-rose-500/40 bg-rose-950/25"
                  : looksGreen
                    ? "border-emerald-500/25 bg-emerald-950/15"
                    : "border-white/10 bg-zinc-900/50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-zinc-500">{item.id}</p>
                  <h3 className="text-sm font-medium text-zinc-100 sm:text-base">
                    {item.label}
                  </h3>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-cyan-400"
                    checked={item.markedDone}
                    onChange={(e) =>
                      updateItem(item.id, { markedDone: e.target.checked })
                    }
                  />
                  <span className={looksGreen ? "text-emerald-300" : "text-zinc-400"}>
                    标绿
                  </span>
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-zinc-400">
                  验收标准
                  <input
                    type="text"
                    value={item.standard}
                    onChange={(e) =>
                      updateItem(item.id, { standard: e.target.value })
                    }
                    placeholder="空 = 无标准就绿风险"
                    className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                  />
                </label>
                <label className="block text-xs text-zinc-400">
                  证据（URL / 文件 / 备注）
                  <input
                    type="text"
                    value={item.evidence}
                    onChange={(e) =>
                      updateItem(item.id, { evidence: e.target.value })
                    }
                    placeholder="空 = 缺证据"
                    className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                  />
                </label>
              </div>

              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="size-4 accent-cyan-400"
                  checked={item.boundaryRun}
                  onChange={(e) =>
                    updateItem(item.id, { boundaryRun: e.target.checked })
                  }
                />
                边界 / 失败路径已跑
                {item.requiresBoundary ? (
                  <span className="text-xs text-amber-400/80">（必填）</span>
                ) : (
                  <span className="text-xs text-zinc-600">（本项可选）</span>
                )}
              </label>

              <label className="mt-3 block text-xs text-zinc-400">
                运行结果 runStatus
                <select
                  className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100"
                  value={item.runStatus ?? "ok"}
                  onChange={(e) =>
                    updateItem(item.id, {
                      runStatus: e.target.value as DodRunStatus,
                    })
                  }
                >
                  {RUN_STATUS_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {itemFails.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
                  {itemFails.map((f, i) => (
                    <li key={`${f.code}-${i}`}>
                      <span className="font-mono text-rose-300">{f.code}</span>
                      {" — "}
                      {f.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      {/* Deliverable IDs */}
      <section className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-cyan-300">
          Deliverable ID（handoff）
        </h2>
        <p className="mt-2 text-xs text-zinc-400">
          勾选声称已交付的 ID。与 registry 不完全一致 →{" "}
          <span className="text-rose-300">checklist-mismatch</span>
        </p>
        <ul className="mt-4 space-y-2">
          {DOD_DELIVERABLE_IDS.map((id) => {
            const checked = claimedIds.includes(id);
            return (
              <li key={id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 sm:text-sm">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-cyan-400"
                    checked={checked}
                    onChange={() => toggleClaimed(id)}
                  />
                  <span className={checked ? "text-cyan-200" : "text-zinc-500"}>
                    {id}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {claimedIds.some((id) => !(DOD_DELIVERABLE_IDS as readonly string[]).includes(id)) && (
          <p className="mt-3 break-all font-mono text-xs text-amber-300">
            额外 claimed：{claimedIds.filter((id) => !(DOD_DELIVERABLE_IDS as readonly string[]).includes(id)).join(", ")}
          </p>
        )}
        {globalFailures.map((f, i) => (
          <p
            key={`g-${i}`}
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
          >
            <span className="font-mono text-rose-300">{f.code}</span> — {f.message}
          </p>
        ))}
      </section>

      {/* Actions */}
      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-testid="mark-complete"
          onClick={onMarkComplete}
          className="min-h-11 flex-1 rounded-xl bg-cyan-500/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          标记完成
        </button>
        <button
          type="button"
          data-testid="export-json"
          onClick={exportJson}
          className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/5"
        >
          {copied ? "已复制 JSON" : "导出 Eval JSON"}
        </button>
        <button
          type="button"
          onClick={runSuiteInUi}
          className="min-h-11 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200 transition hover:bg-emerald-950/50"
        >
          跑假完成套件断言
        </button>
      </section>

      {completeMsg && (
        <div
          role="status"
          data-testid="complete-status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            completeKind === "blocked"
              ? "border-rose-500/40 bg-rose-950/40 text-rose-100"
              : "border-emerald-500/40 bg-emerald-950/30 text-emerald-100"
          }`}
        >
          {completeMsg}
          {completeKind === "blocked" && result.failures.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-200/90">
              {result.failures.map((f, i) => (
                <li key={i}>
                  [{f.code}] {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {suiteNote && (
        <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 font-mono text-xs text-emerald-200">
          {suiteNote}
        </p>
      )}

      {/* Live assert panel */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-zinc-400">实时断言 / 失败可见</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-900/80 px-3 py-2">
            <dt className="text-xs text-zinc-500">gateOn</dt>
            <dd className="font-mono text-zinc-100">{String(gateOn)}</dd>
          </div>
          <div className="rounded-lg bg-zinc-900/80 px-3 py-2">
            <dt className="text-xs text-zinc-500">ok</dt>
            <dd className="font-mono text-zinc-100">{String(result.ok)}</dd>
          </div>
          <div className="rounded-lg bg-zinc-900/80 px-3 py-2">
            <dt className="text-xs text-zinc-500">canMarkComplete</dt>
            <dd className="font-mono text-zinc-100">
              {String(result.canMarkComplete)}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-900/80 px-3 py-2">
            <dt className="text-xs text-zinc-500">blockRate</dt>
            <dd className="font-mono text-zinc-100">
              {(result.blockRate * 100).toFixed(0)}%
            </dd>
          </div>
        </dl>
        {result.failures.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-300/90">无失败项</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs text-rose-200 sm:text-sm">
            {result.failures.map((f, i) => (
              <li
                key={i}
                className="rounded-md border border-rose-500/20 bg-rose-950/30 px-3 py-2"
              >
                <span className="font-mono text-rose-300">{f.code}</span>
                {f.itemId ? (
                  <span className="text-zinc-500"> · {f.itemId}</span>
                ) : null}
                <br />
                {f.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 sm:p-6">
        <h2 className="font-mono text-sm text-zinc-400">脚本断言（无浏览器）</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 sm:text-xs">
{`npm run test:dod
# 或
npx tsx --test src/lib/dod-gate.test.ts`}
        </pre>
        <p className="mt-2 text-xs text-zinc-500">
          断言：假完成套件通过率 = 0，block rate = 100%；合规用例可过闸。
        </p>
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        移动端单列 · 触控 ≥44px · 离线/弱网可读提示 · 失败态可演示 · 深色底防白屏 · 无付费 API
      </p>

      <p className="mt-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm text-cyan-400 underline-offset-4 hover:underline"
        >
          ← 返回 Home
        </Link>
      </p>
    </main>
  );
}

/** Reset helper for tests / Story — default fake-complete baseline */
export function createBaselineUngatedState(): DodState {
  return {
    gateOn: false,
    items: DEFAULT_DOD_ITEMS.map((i) => ({ ...i })),
    claimedDeliverableIds: [...DOD_DELIVERABLE_IDS],
  };
}
