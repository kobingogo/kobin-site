import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDod,
  assertFakeCompleteSuite,
  buildHandoff,
  COMPLIANT_CASE,
  DOD_DELIVERABLE_IDS,
  FAKE_COMPLETE_CASES,
} from "./dod-gate";

describe("assertDod — ungated fake-complete", () => {
  it("allows mark-complete even when evidence/standard/boundary/ids fail", () => {
    for (const c of FAKE_COMPLETE_CASES) {
      const built = c.build();
      const result = assertDod({ ...built, gateOn: false });
      assert.equal(
        result.canMarkComplete,
        true,
        `${c.id} should allow fake-complete when gate OFF`,
      );
      assert.equal(
        result.ok,
        false,
        `${c.id} should still be objectively failing`,
      );
      assert.ok(result.failures.length > 0, `${c.id} should report WHY`);
    }
  });
});

describe("assertDod — gated blocks", () => {
  it("blocks every defined fake-complete case (pass=0, blockRate=100%)", () => {
    const suite = assertFakeCompleteSuite(true);
    assert.equal(suite.passCount, 0);
    assert.equal(suite.blockCount, FAKE_COMPLETE_CASES.length);
    assert.equal(suite.blockRate, 1);
    for (const r of suite.results) {
      assert.equal(r.ok, false, `${r.caseId} must be blocked`);
      assert.ok(r.failureCodes.length > 0);
    }
  });

  it("case-missing-evidence hits missing-evidence", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-missing-evidence",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.ok(
      result.failures.some((f) => f.code === "missing-evidence"),
    );
    assert.equal(result.canMarkComplete, false);
  });

  it("case-no-standard hits no-standard-green", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-no-standard",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.ok(
      result.failures.some((f) => f.code === "no-standard-green"),
    );
  });

  it("case-boundary-unrun hits boundary-unrun", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-boundary-unrun",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.ok(result.failures.some((f) => f.code === "boundary-unrun"));
  });

  it("case-checklist-mismatch hits checklist-mismatch", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-checklist-mismatch",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.ok(
      result.failures.some((f) => f.code === "checklist-mismatch"),
    );
  });

  it("case-partial-complete is NOT ok and blocks mark-complete", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-partial-complete",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.equal(result.ok, false);
    assert.equal(result.canMarkComplete, false);
    assert.ok(
      result.failures.some((f) => f.code === "partial-complete"),
      "must hit partial-complete",
    );
  });

  it("case-tool-failure hits tool-failure", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-tool-failure",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.equal(result.ok, false);
    assert.equal(result.canMarkComplete, false);
    assert.ok(result.failures.some((f) => f.code === "tool-failure"));
  });

  it("case-timeout hits timeout", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-timeout",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.equal(result.ok, false);
    assert.equal(result.canMarkComplete, false);
    assert.ok(result.failures.some((f) => f.code === "timeout"));
  });

  it("case-empty-output hits empty-output", () => {
    const built = FAKE_COMPLETE_CASES.find(
      (c) => c.id === "case-empty-output",
    )!.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.equal(result.ok, false);
    assert.equal(result.canMarkComplete, false);
    assert.ok(result.failures.some((f) => f.code === "empty-output"));
  });

  it("compliant case passes when gate ON", () => {
    const built = COMPLIANT_CASE.build();
    const result = assertDod({ ...built, gateOn: true });
    assert.equal(result.ok, true);
    assert.equal(result.canMarkComplete, true);
    assert.equal(result.failures.length, 0);
    assert.equal(result.blockRate, 0);
    assert.equal(result.checklistAligned, true);
  });
});

describe("deliverable ID registry", () => {
  it("exposes stable handoff IDs", () => {
    assert.deepEqual([...DOD_DELIVERABLE_IDS], [
      "DOD-GATE-01-repro-baseline",
      "DOD-GATE-02-assert-script",
      "DOD-GATE-03-false-complete-zero",
      "DOD-GATE-04-block-rate-100",
      "DOD-GATE-05-id-registry",
    ]);
  });

  it("buildHandoff exports Eval JSON shape", () => {
    const built = COMPLIANT_CASE.build();
    const state = { ...built, gateOn: true };
    const result = assertDod(state);
    const handoff = buildHandoff(state, result);
    assert.equal(handoff.brand, "KobinFlow");
    assert.equal(handoff.demo, "agent-dod-gate");
    assert.equal(handoff.ok, true);
    assert.deepEqual([...handoff.deliverableIds], [...DOD_DELIVERABLE_IDS]);
  });
});

describe("expanded fake-complete case ids", () => {
  it("includes partial / tool-failure / timeout / empty-output", () => {
    const ids = new Set(FAKE_COMPLETE_CASES.map((c) => c.id));
    for (const id of [
      "case-partial-complete",
      "case-tool-failure",
      "case-timeout",
      "case-empty-output",
    ]) {
      assert.ok(ids.has(id), `missing ${id}`);
    }
  });
});
