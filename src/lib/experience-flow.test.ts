import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INITIAL_EXPERIENCE_STATE,
  destinationForExteriorView,
  experienceReducer,
  nextStationId,
} from "./experience-flow";

describe("experience main flow", () => {
  it("enters through approach and airlock before showing Xiao K", () => {
    const approach = experienceReducer(INITIAL_EXPERIENCE_STATE, { type: "enter" });
    assert.equal(approach.phase, "approach");
    const airlock = experienceReducer(approach, { type: "approach-complete" });
    assert.equal(airlock.phase, "airlock");
    const welcome = experienceReducer(airlock, { type: "airlock-complete" });
    assert.equal(welcome.phase, "welcome");
  });

  it("keeps a preselected destination through the airlock", () => {
    const approach = experienceReducer(INITIAL_EXPERIENCE_STATE, {
      type: "enter",
      destination: "robot-arm",
    });
    const airlock = experienceReducer(approach, { type: "approach-complete" });
    const station = experienceReducer(airlock, { type: "airlock-complete" });
    assert.equal(station.phase, "station");
    assert.equal(station.currentStation, "robot-arm");
    assert.deepEqual(station.visited, ["robot-arm"]);
  });

  it("supports guided, direct and free exploration choices", () => {
    const welcome = { ...INITIAL_EXPERIENCE_STATE, phase: "welcome" as const };
    assert.equal(experienceReducer(welcome, { type: "choose-mode", mode: "guided" }).currentStation, "about");
    assert.equal(experienceReducer(welcome, { type: "choose-mode", mode: "direct" }).currentStation, "agent-dod-gate");
    assert.equal(experienceReducer(welcome, { type: "choose-mode", mode: "free" }).phase, "map");
  });

  it("cycles through every station and ends at communications", () => {
    assert.equal(nextStationId("about"), "agent-dod-gate");
    assert.equal(nextStationId("robot-arm"), "contact");
    assert.equal(nextStationId("contact"), "about");
  });

  it("maps exterior navigation to interior destinations", () => {
    assert.equal(destinationForExteriorView("about"), "about");
    assert.equal(destinationForExteriorView("works"), "agent-dod-gate");
    assert.equal(destinationForExteriorView("contact"), "contact");
  });
});
