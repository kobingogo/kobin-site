import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_COMMANDS,
  SCRIPTED_DEMO_SEQUENCE,
  applyAction,
  createInitialWorld,
  evaluateDemoCommandsExecution,
  evaluateDemoCommandsParse,
  fpsMeetsTarget,
  parseCommand,
  runCommand,
  runScriptedDemo,
} from "./robot-arm";

describe("robot-arm parseCommand", () => {
  it("maps all 10 DEMO_COMMANDS", () => {
    const { total, parsedOk, failures } = evaluateDemoCommandsParse();
    assert.equal(total, 10);
    assert.equal(parsedOk, 10, `failures: ${JSON.stringify(failures)}`);
  });

  it("parses grasp left/middle/right", () => {
    const a = parseCommand("抓取左边的方块");
    assert.equal(a.ok, true);
    if (a.ok) {
      assert.equal(a.action, "grasp");
      assert.equal(a.target, "left");
    }
    const b = parseCommand("抓取中间的方块");
    assert.ok(b.ok && b.action === "grasp" && b.target === "middle");
    const c = parseCommand("抓取右边的方块");
    assert.ok(c.ok && c.action === "grasp" && c.target === "right");
  });

  it("parses place / place_at / home / rotate", () => {
    assert.ok(parseCommand("放下").ok);
    const pl = parseCommand("放到左边");
    assert.ok(pl.ok && pl.action === "place_at" && pl.target === "left");
    assert.ok(parseCommand("复位").ok);
    assert.ok(parseCommand("向左旋转").ok);
    assert.ok(parseCommand("向右旋转").ok);
  });

  it("returns readable failure for empty / unknown / ambiguous", () => {
    const empty = parseCommand("   ");
    assert.equal(empty.ok, false);
    if (!empty.ok) {
      assert.match(empty.reason, /空/);
      assert.ok(empty.nextStep.length > 0);
    }

    const unknown = parseCommand("请帮我泡杯咖啡");
    assert.equal(unknown.ok, false);
    if (!unknown.ok) {
      assert.match(unknown.reason, /无法识别|付费 LLM/);
      assert.ok(unknown.nextStep.length > 0);
    }

    const amb = parseCommand("抓取方块");
    assert.equal(amb.ok, false);
    if (!amb.ok) {
      assert.match(amb.reason, /不明确/);
      assert.match(amb.nextStep, /左边|中间|右边/);
    }
  });
});

describe("robot-arm applyAction / runCommand", () => {
  it("grasps then places successfully into empty right", () => {
    let state = createInitialWorld();
    const g = runCommand(state, "抓取左边的方块");
    assert.equal(g.ok, true);
    state = g.state;
    assert.equal(state.held, "cyan");
    assert.equal(state.cubes.cyan.location, "held");

    const p = runCommand(state, "放到右边");
    assert.equal(p.ok, true, p.reason);
    state = p.state;
    assert.equal(state.held, null);
    assert.equal(state.cubes.cyan.location, "right");
  });

  it("fails grasp when already holding with readable nextStep", () => {
    let state = createInitialWorld();
    state = runCommand(state, "抓取左边的方块").state;
    const r = runCommand(state, "抓取中间的方块");
    assert.equal(r.ok, false);
    assert.ok(r.reason && /持有/.test(r.reason));
    assert.ok(r.nextStep && /放下|放到/.test(r.nextStep));
  });

  it("fails place when empty", () => {
    const r = runCommand(createInitialWorld(), "放下");
    assert.equal(r.ok, false);
    assert.ok(r.reason && /为空/.test(r.reason));
  });

  it("fails place_at when slot occupied", () => {
    let state = createInitialWorld();
    state = runCommand(state, "抓取中间的方块").state;
    const r = runCommand(state, "放到左边");
    assert.equal(r.ok, false);
    assert.ok(r.reason && /占用/.test(r.reason));
  });

  it("home / rotate mutate joints", () => {
    let state = createInitialWorld();
    state = runCommand(state, "向左旋转").state;
    assert.ok(state.joints.base > 0);
    state = runCommand(state, "向右旋转").state;
    state = runCommand(state, "复位").state;
    assert.equal(state.joints.base, 0);
  });
});

describe("robot-arm scripted / acceptance scoring", () => {
  it("scripted demo: all steps ok and ≥7 grasp/place", () => {
    const { results, successCount, graspPlaceSuccess } = runScriptedDemo();
    assert.equal(SCRIPTED_DEMO_SEQUENCE.length, 10);
    assert.equal(successCount, 10, JSON.stringify(results, null, 2));
    assert.ok(
      graspPlaceSuccess >= 7,
      `graspPlaceSuccess=${graspPlaceSuccess} results=${JSON.stringify(results)}`,
    );
  });

  it("DEMO_COMMANDS execution score ≥7 grasp/place and ≥7 overall success", () => {
    const { total, successCount, graspPlaceSuccess, results } =
      evaluateDemoCommandsExecution();
    assert.equal(total, 10);
    assert.ok(
      successCount >= 7,
      `successCount=${successCount} ${JSON.stringify(results)}`,
    );
    assert.ok(
      graspPlaceSuccess >= 7,
      `graspPlaceSuccess=${graspPlaceSuccess} ${JSON.stringify(results)}`,
    );
  });

  it("fps helper", () => {
    assert.equal(fpsMeetsTarget(30), true);
    assert.equal(fpsMeetsTarget(29), false);
  });

  it("applyAction home keeps held gripper closed", () => {
    let state = createInitialWorld();
    const g = applyAction(state, {
      ok: true,
      action: "grasp",
      target: "left",
      phrase: "抓取左边的方块",
      label: "g",
    });
    assert.ok(g.ok);
    state = g.state;
    const h = applyAction(state, {
      ok: true,
      action: "home",
      phrase: "复位",
      label: "h",
    });
    assert.ok(h.ok);
    assert.equal(h.state.held, "cyan");
    assert.equal(h.state.joints.gripper, 1);
  });
});

describe("robot-arm DEMO_COMMANDS list", () => {
  it("exposes exactly 10 Chinese phrases", () => {
    assert.equal(DEMO_COMMANDS.length, 10);
    for (const c of DEMO_COMMANDS) {
      assert.ok(/[\u4e00-\u9fff]/.test(c), c);
    }
  });
});
