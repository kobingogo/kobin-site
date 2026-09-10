"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { RobotArmCanvasDynamic } from "./RobotArmCanvasDynamic";
import {
  DEMO_COMMANDS,
  FPS_TARGET,
  LLM_API_TODO,
  SCRIPTED_DEMO_SEQUENCE,
  UI_FAILURE_OPTIONS,
  createInitialWorld,
  evaluateDemoCommandsExecution,
  formatFps,
  fpsMeetsTarget,
  runCommand,
  runScriptedDemo,
  type ApplyResult,
  type UiFailureKind,
  type WorldState,
} from "@/lib/robot-arm";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "robot-arm")!;

function useWebGLSupport() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

type LogEntry = {
  id: number;
  command: string;
  ok: boolean;
  message: string;
  reason?: string;
  nextStep?: string;
};

export function RobotArmDemo() {
  const reduceMotion = useReducedMotion();
  const webglOk = useWebGLSupport();

  const [world, setWorld] = useState<WorldState>(() => createInitialWorld());
  const [input, setInput] = useState("");
  const [uiFailure, setUiFailure] = useState<UiFailureKind>("none");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [fps, setFps] = useState<number | null>(null);
  const [scriptedRunning, setScriptedRunning] = useState(false);
  const [scriptedNote, setScriptedNote] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ApplyResult | null>(null);
  const logId = useRef(0);
  const scriptCancel = useRef(false);

  const score = evaluateDemoCommandsExecution();

  const effectiveWebgl =
    webglOk && uiFailure !== "nowebgl" && !reduceMotion;
  const showEmpty = uiFailure === "empty";
  const showLoadFail = uiFailure === "load";
  const canvasBlocked =
    !effectiveWebgl || showEmpty || showLoadFail;

  const failureTip =
    UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.tip ?? "";

  const pushLog = useCallback((entry: Omit<LogEntry, "id">) => {
    logId.current += 1;
    setLog((prev) => [{ id: logId.current, ...entry }, ...prev].slice(0, 24));
  }, []);

  const applyResult = useCallback(
    (command: string, result: ApplyResult) => {
      setWorld(result.state);
      setLastResult(result);
      pushLog({
        command,
        ok: result.ok,
        message: result.message,
        reason: result.reason,
        nextStep: result.nextStep,
      });
    },
    [pushLog],
  );

  const submitCommand = useCallback(
    (raw: string) => {
      const phrase = raw.trim();
      if (!phrase) {
        const empty = runCommand(world, "");
        applyResult("(空)", empty);
        return;
      }
      if (uiFailure === "empty" || uiFailure === "load") setUiFailure("none");
      const result = runCommand(world, phrase);
      applyResult(phrase, result);
      setInput("");
    },
    [world, applyResult, uiFailure],
  );

  const resetWorld = () => {
    scriptCancel.current = true;
    setScriptedRunning(false);
    setWorld(createInitialWorld());
    setLastResult(null);
    setScriptedNote(null);
    pushLog({
      command: "（重置场景）",
      ok: true,
      message: "场景已重置：左/中有方块，右边空槽可放置。",
    });
  };

  const runScripted = async () => {
    if (scriptedRunning) return;
    scriptCancel.current = false;
    setScriptedRunning(true);
    setScriptedNote(null);
    if (uiFailure === "empty" || uiFailure === "load") setUiFailure("none");

    // Prefer live step-through on canvas; also prove pure scripted score
    const proof = runScriptedDemo(createInitialWorld());
    setScriptedNote(
      `脚本映射验收：成功 ${proof.successCount}/10，抓取/放置成功 ${proof.graspPlaceSuccess}（门槛 ≥7）。`,
    );

    let state = createInitialWorld();
    setWorld(state);

    for (const command of SCRIPTED_DEMO_SEQUENCE) {
      if (scriptCancel.current) break;
      const result = runCommand(state, command);
      state = result.state;
      applyResult(command, result);
      setWorld(state);
      await new Promise((r) => setTimeout(r, 550));
    }
    setScriptedRunning(false);
  };

  const lowFps =
    fps !== null && !fpsMeetsTarget(fps) && effectiveWebgl && !canvasBlocked;

  return (
    <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-400/80">
        Demo · 状态「{demo.status}」· 实现顺序 #{demo.order}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        {demo.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{demo.titleEn}</p>
      <p className="mt-6 text-lg leading-relaxed text-zinc-300">{demo.pitch}</p>

      <p
        className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100/90"
        data-testid="robot-mobile-tip"
      >
        移动端 / 弱网：深色底防白屏；无 WebGL 或{" "}
        <code className="text-xs">prefers-reduced-motion</code>{" "}
        时卸载 Canvas，保留指令映射与脚本演示。触控目标 ≥44px。
      </p>

      {/* Stats row */}
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-xs text-zinc-400">
        <span
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"
          data-testid="robot-fps"
          data-fps={fps != null ? Math.round(fps) : undefined}
        >
          FPS：{fps != null ? formatFps(fps) : "—"}（目标 ≥{FPS_TARGET}）
        </span>
        <span
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2"
          data-testid="robot-score"
        >
          规则映射评分：抓取/放置 {score.graspPlaceSuccess}/{score.total} · 总成功{" "}
          {score.successCount}/{score.total}
        </span>
        {lowFps && (
          <span
            className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-amber-200"
            data-testid="robot-low-fps-hint"
          >
            FPS &lt; {FPS_TARGET}：请用「脚本演示」验收；开放域 LLM 为付费 TODO（不接
            key）。
          </span>
        )}
      </div>

      {/* Failure banner */}
      {uiFailure !== "none" && (
        <div
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
          data-testid="robot-failure-banner"
          role="status"
        >
          <strong className="font-mono text-amber-300">
            {UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.label}
          </strong>
          <p className="mt-1 text-amber-100/90">{failureTip}</p>
        </div>
      )}

      {!lastResult?.ok && lastResult?.reason && (
        <div
          className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
          data-testid="robot-command-failure"
          role="alert"
        >
          <p className="font-medium">{lastResult.message}</p>
          <p className="mt-1">原因：{lastResult.reason}</p>
          {lastResult.nextStep && (
            <p className="mt-1 text-rose-100/80">下一步：{lastResult.nextStep}</p>
          )}
        </div>
      )}

      {lastResult?.ok && (
        <div
          className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100"
          data-testid="robot-command-success"
        >
          {lastResult.message}
        </div>
      )}

      {/* Canvas / fallback */}
      <div className="relative mt-6">
        {canvasBlocked ? (
          <div
            className="flex h-[min(62vh,520px)] min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950 p-6 text-center"
            data-testid="robot-arm-fallback"
          >
            <p className="font-mono text-sm text-zinc-400">
              {showLoadFail
                ? "Canvas 已卸载（加载失败演示）"
                : showEmpty
                  ? "空状态 — 尚未启动仿真"
                  : reduceMotion
                    ? "已尊重 prefers-reduced-motion，未挂载 WebGL"
                    : "无 WebGL — 保留可读验收与脚本演示"}
            </p>
            <p className="max-w-md text-sm text-zinc-500">
              下方快捷指令与「脚本演示」仍可跑规则映射（无需付费 LLM）。
            </p>
          </div>
        ) : (
          <RobotArmCanvasDynamic
            world={world}
            onInteractive={() => {}}
            onFps={setFps}
          />
        )}
      </div>

      {/* Controls */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
        <h2 className="font-mono text-sm text-cyan-300">中文指令</h2>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            submitCommand(input);
          }}
        >
          <input
            data-testid="robot-command-input"
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-zinc-100 outline-none ring-cyan-500/40 placeholder:text-zinc-600 focus:ring-2"
            placeholder="例如：抓取左边的方块"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={scriptedRunning}
          />
          <button
            type="submit"
            data-testid="robot-command-submit"
            className="min-h-11 rounded-xl bg-cyan-500 px-5 text-sm font-medium text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            disabled={scriptedRunning}
          >
            执行
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              type="button"
              data-testid={`robot-chip-${cmd}`}
              className="min-h-11 rounded-full border border-cyan-500/25 bg-cyan-950/40 px-3 text-xs text-cyan-100 hover:border-cyan-400/50 disabled:opacity-50"
              disabled={scriptedRunning}
              onClick={() => submitCommand(cmd)}
            >
              {cmd}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="robot-scripted-demo"
            className="min-h-11 rounded-xl border border-violet-400/40 bg-violet-950/50 px-4 text-sm text-violet-100 hover:bg-violet-900/60 disabled:opacity-50"
            disabled={scriptedRunning}
            onClick={() => void runScripted()}
          >
            {scriptedRunning ? "脚本演示运行中…" : "脚本演示（罐头序列）"}
          </button>
          <button
            type="button"
            data-testid="robot-reset"
            className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-4 text-sm text-zinc-200 hover:bg-black/60"
            onClick={resetWorld}
          >
            重置场景
          </button>
        </div>

        {scriptedNote && (
          <p
            className="mt-3 font-mono text-xs text-violet-200/90"
            data-testid="robot-scripted-note"
          >
            {scriptedNote}
          </p>
        )}
      </section>

      {/* Log */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
        <h2 className="font-mono text-sm text-zinc-400">执行日志</h2>
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto text-sm" data-testid="robot-log">
          {log.length === 0 && (
            <li className="text-zinc-600">尚无指令 — 点快捷芯片或脚本演示。</li>
          )}
          {log.map((e) => (
            <li
              key={e.id}
              className={
                e.ok
                  ? "rounded-lg border border-emerald-500/15 bg-emerald-950/20 px-3 py-2 text-emerald-100/90"
                  : "rounded-lg border border-rose-500/20 bg-rose-950/25 px-3 py-2 text-rose-100/90"
              }
            >
              <span className="font-mono text-xs text-zinc-500">{e.command}</span>
              <p>{e.message}</p>
              {e.reason && <p className="text-xs opacity-90">原因：{e.reason}</p>}
              {e.nextStep && (
                <p className="text-xs opacity-80">下一步：{e.nextStep}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Failure state switches */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
        <h2 className="font-mono text-sm text-zinc-400">失败态演示</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {UI_FAILURE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`ui-failure-${opt.id}`}
              aria-pressed={uiFailure === opt.id}
              className={`min-h-11 rounded-full px-3 text-xs ${
                uiFailure === opt.id
                  ? "border border-amber-400/50 bg-amber-950/50 text-amber-100"
                  : "border border-white/10 bg-black/40 text-zinc-300"
              }`}
              onClick={() => setUiFailure(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h2 className="font-mono text-sm text-cyan-300">Hard acceptance</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.acceptance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
        <h2 className="font-mono text-sm text-amber-300">Paid API / TODO</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.paidApiNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>{LLM_API_TODO}</li>
        </ul>
      </section>

      <p className="mt-10">
        <Link
          href="/"
          className="text-sm text-cyan-400 underline-offset-4 hover:underline"
        >
          ← 返回 Home
        </Link>
      </p>
    </main>
  );
}
