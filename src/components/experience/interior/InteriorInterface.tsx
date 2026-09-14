"use client";

import { useEffect } from "react";
import { COPY } from "@/lib/copy";
import type {
  ExperienceAction,
  ExperienceState,
  Station,
  StationId,
  TourMode,
} from "@/lib/experience-flow";

const PHASE_LABELS: Record<ExperienceState["phase"], string> = {
  exterior: "ORBIT",
  approach: "APPROACH",
  airlock: "AIRLOCK",
  welcome: "ARRIVAL",
  map: "NAVIGATION",
  station: "LAB STATION",
  comms: "COMMS",
};

function ProgressRail({ phase }: { phase: ExperienceState["phase"] }) {
  const stages = ["外景", "气闸", "大厅", "站点"];
  const index = phase === "approach" ? 0 : phase === "airlock" ? 1 : phase === "welcome" ? 2 : 3;
  return (
    <ol className="interior-progress" aria-label="参观进度">
      {stages.map((stage, itemIndex) => (
        <li key={stage} data-active={itemIndex <= index ? "true" : "false"}>
          <span>{String(itemIndex + 1).padStart(2, "0")}</span>
          {stage}
        </li>
      ))}
    </ol>
  );
}

function TourChoice({ onChoose }: { onChoose: (mode: TourMode) => void }) {
  return (
    <div className="interior-choice-grid" role="group" aria-label="选择参观方式">
      <button type="button" data-testid="tour-guided" onClick={() => onChoose("guided")}>
        <span>01 / RECOMMENDED</span>
        <strong>带我逛逛</strong>
        <small>从关于 Kobin 开始，按推荐顺序走完六个站点。</small>
      </button>
      <button type="button" data-testid="tour-direct" onClick={() => onChoose("direct")}>
        <span>02 / WORKS</span>
        <strong>直接看作品</strong>
        <small>跳过介绍，从 Agent DoD 闸门开始查看项目。</small>
      </button>
      <button type="button" data-testid="tour-free" onClick={() => onChoose("free")}>
        <span>03 / FREE ROAM</span>
        <strong>自己看看</strong>
        <small>打开实验室地图，自由选择任意站点。</small>
      </button>
    </div>
  );
}

function LabMap({
  stations,
  visited,
  onVisit,
}: {
  stations: Station[];
  visited: StationId[];
  onVisit: (station: StationId) => void;
}) {
  return (
    <div className="lab-map" data-testid="lab-map">
      <div className="lab-map__track" aria-hidden />
      {stations.map((station) => (
        <button
          key={station.id}
          type="button"
          data-testid={`map-station-${station.id}`}
          data-visited={visited.includes(station.id) ? "true" : "false"}
          onClick={() => onVisit(station.id)}
        >
          <span>{station.index}</span>
          <strong>{station.title}</strong>
          <small>{station.titleEn}</small>
        </button>
      ))}
    </div>
  );
}

export function InteriorInterface({
  state,
  stations,
  dispatch,
}: {
  state: ExperienceState;
  stations: Station[];
  dispatch: (action: ExperienceAction) => void;
}) {
  const station = stations.find((item) => item.id === state.currentStation) ?? null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (state.phase === "approach" || state.phase === "airlock") return;
      if (state.phase === "map" || state.phase === "welcome") dispatch({ type: "return-exterior" });
      else dispatch({ type: "open-map" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.phase]);

  return (
    <div
      className="interior-interface"
      data-testid="interior-interface"
      data-phase={state.phase}
      aria-live="polite"
    >
      <header className="interior-header">
        <div>
          <span className="interior-header__pulse" aria-hidden />
          KOBINFLOW / INTERNAL DECK
        </div>
        <span>{PHASE_LABELS[state.phase]}</span>
      </header>

      <ProgressRail phase={state.phase} />

      {state.phase === "approach" ? (
        <section className="transit-copy" data-testid="approach-transition">
          <p>DOCKING VECTOR · 07-A</p>
          <h1>正在接近空间站</h1>
          <span>自动对准接口，预计 2 秒抵达气闸。</span>
        </section>
      ) : null}

      {state.phase === "airlock" ? (
        <section className="transit-copy" data-testid="airlock-transition">
          <p>PRESSURE EQUALIZATION</p>
          <h1>气闸循环进行中</h1>
          <span>舱门解锁后，小 K 会在主实验室迎接你。</span>
          <div className="airlock-meter" aria-label="气闸正在增压"><span /></div>
        </section>
      ) : null}

      {state.phase === "welcome" ? (
        <section className="interior-panel interior-panel--welcome" data-testid="guide-welcome">
          <p className="interior-kicker">GUIDANCE UNIT / K-01</p>
          <h1>你好，我是小 K。</h1>
          <p className="interior-lead">
            欢迎进入 Kobin 的轨道实验室。我可以按推荐路线带你参观，也可以直接把导航权交给你。
          </p>
          <TourChoice onChoose={(mode) => dispatch({ type: "choose-mode", mode })} />
        </section>
      ) : null}

      {state.phase === "map" ? (
        <section className="interior-panel interior-panel--map">
          <p className="interior-kicker">LAB DIRECTORY / 06 NODES</p>
          <h1>选择任意目的地</h1>
          <p className="interior-lead">已访问站点会留下信号记录；你可以随时重新进入。</p>
          <LabMap stations={stations} visited={state.visited} onVisit={(id) => dispatch({ type: "visit", station: id })} />
        </section>
      ) : null}

      {state.phase === "station" && station ? (
        <section className="interior-panel interior-panel--station" data-testid="station-detail">
          <p className="interior-kicker">STATION {station.index} / {station.titleEn}</p>
          <h1>{station.title}</h1>
          <p className="interior-lead">{station.description}</p>
          <ul className="station-signals">
            {station.acceptance.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="interior-actions">
            {station.href ? (
              <a href={station.href} target="_blank" rel="noreferrer" data-testid="open-station-demo">
                启动完整互动实验 ↗
              </a>
            ) : null}
            <button type="button" onClick={() => dispatch({ type: "next" })} data-testid="next-station">下一站 →</button>
            <button type="button" onClick={() => dispatch({ type: "open-map" })}>实验室地图</button>
          </div>
        </section>
      ) : null}

      {state.phase === "comms" ? (
        <section className="interior-panel interior-panel--comms" data-testid="comms-station">
          <p className="interior-kicker">STATION 06 / COMMUNICATION ARRAY</p>
          <h1>通讯链路已建立</h1>
          <p className="interior-lead">想聊合作、Agent 产品或验收标准，可以向 KobinFlow 发出一条信号。</p>
          <div className="comms-wave" aria-hidden><span /><span /><span /><span /></div>
          <div className="interior-actions">
            <a href={COPY.contactXHref} target="_blank" rel="noreferrer" data-testid="contact-kobin">
              X {COPY.contactXHandle} · TRANSMIT ↗
            </a>
            <button type="button" onClick={() => dispatch({ type: "next" })}>重新开始导览</button>
            <button type="button" onClick={() => dispatch({ type: "open-map" })}>实验室地图</button>
          </div>
        </section>
      ) : null}

      {state.phase !== "approach" && state.phase !== "airlock" ? (
        <button
          type="button"
          className="return-orbit"
          data-testid="return-exterior"
          onClick={() => dispatch({ type: "return-exterior" })}
        >
          ← 返回太空总览
        </button>
      ) : null}
    </div>
  );
}

