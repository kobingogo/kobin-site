import type { DemoMeta } from "./demos";

export type TourMode = "guided" | "direct" | "free";
export type ExperiencePhase =
  | "exterior"
  | "approach"
  | "airlock"
  | "welcome"
  | "map"
  | "station"
  | "comms";

export type StationId =
  | "about"
  | "agent-dod-gate"
  | "material-spheres"
  | "product-turntable"
  | "robot-arm"
  | "contact";

export type Station = {
  id: StationId;
  index: string;
  title: string;
  titleEn: string;
  description: string;
  href?: string;
  acceptance: string[];
};

const WORK_STATIONS: StationId[] = [
  "agent-dod-gate",
  "material-spheres",
  "product-turntable",
  "robot-arm",
];

export function buildStations(demos: DemoMeta[]): Station[] {
  return [
    {
      id: "about",
      index: "01",
      title: "关于 Kobin",
      titleEn: "ORIGIN ARCHIVE",
      description:
        "从 Agent 产品、Eval 与人机协作出发，把想法压成能上手、能验收的真实作品。",
      acceptance: ["十年互联网实践", "AI Agent / Eval / HCI", "失败路径优先于漂亮绿勾"],
    },
    ...demos.map((demo, index) => ({
      id: demo.slug as StationId,
      index: String(index + 2).padStart(2, "0"),
      title: demo.title,
      titleEn: demo.titleEn.toUpperCase(),
      description: demo.pitch,
      href: demo.href,
      acceptance: demo.acceptance.slice(0, 3),
    })),
    {
      id: "contact",
      index: "06",
      title: "通讯台",
      titleEn: "COMMUNICATION ARRAY",
      description: "向 KobinFlow 发出合作、Agent 产品或验收标准相关的通讯请求。",
      acceptance: ["公开联系方式", "外部链接明确标识", "主流程可随时返回"],
    },
  ];
}

export type ExperienceState = {
  phase: ExperiencePhase;
  requestedDestination: StationId | null;
  currentStation: StationId | null;
  mode: TourMode | null;
  visited: StationId[];
  entryCount: number;
};

export const INITIAL_EXPERIENCE_STATE: ExperienceState = {
  phase: "exterior",
  requestedDestination: null,
  currentStation: null,
  mode: null,
  visited: [],
  entryCount: 0,
};

export type ExperienceAction =
  | { type: "enter"; destination?: StationId | null }
  | { type: "approach-complete" }
  | { type: "airlock-complete" }
  | { type: "choose-mode"; mode: TourMode }
  | { type: "open-map" }
  | { type: "visit"; station: StationId }
  | { type: "next" }
  | { type: "return-exterior" };

function appendVisited(visited: StationId[], station: StationId): StationId[] {
  return visited.includes(station) ? visited : [...visited, station];
}

function stationPhase(station: StationId): ExperiencePhase {
  return station === "contact" ? "comms" : "station";
}

export function destinationForExteriorView(
  view: "about" | "works" | "contact",
): StationId {
  if (view === "works") return WORK_STATIONS[0];
  return view;
}

export function nextStationId(current: StationId | null): StationId {
  const route: StationId[] = ["about", ...WORK_STATIONS, "contact"];
  const index = current ? route.indexOf(current) : -1;
  return route[(index + 1 + route.length) % route.length];
}

export function experienceReducer(
  state: ExperienceState,
  action: ExperienceAction,
): ExperienceState {
  switch (action.type) {
    case "enter":
      return {
        ...state,
        phase: "approach",
        requestedDestination: action.destination ?? null,
        currentStation: null,
        mode: action.destination ? "direct" : null,
        entryCount: state.entryCount + 1,
      };
    case "approach-complete":
      return state.phase === "approach" ? { ...state, phase: "airlock" } : state;
    case "airlock-complete": {
      if (state.phase !== "airlock") return state;
      const station = state.requestedDestination;
      if (!station) return { ...state, phase: "welcome" };
      return {
        ...state,
        phase: stationPhase(station),
        currentStation: station,
        visited: appendVisited(state.visited, station),
      };
    }
    case "choose-mode": {
      if (action.mode === "guided") {
        const station: StationId = "about";
        return {
          ...state,
          phase: "station",
          mode: action.mode,
          currentStation: station,
          visited: appendVisited(state.visited, station),
        };
      }
      if (action.mode === "direct") {
        const station = WORK_STATIONS[0];
        return {
          ...state,
          phase: "station",
          mode: action.mode,
          currentStation: station,
          visited: appendVisited(state.visited, station),
        };
      }
      return { ...state, phase: "map", mode: action.mode };
    }
    case "open-map":
      return { ...state, phase: "map" };
    case "visit":
      return {
        ...state,
        phase: stationPhase(action.station),
        currentStation: action.station,
        visited: appendVisited(state.visited, action.station),
      };
    case "next": {
      const station = nextStationId(state.currentStation);
      return {
        ...state,
        phase: stationPhase(station),
        currentStation: station,
        visited: appendVisited(state.visited, station),
      };
    }
    case "return-exterior":
      return {
        ...INITIAL_EXPERIENCE_STATE,
        visited: state.visited,
        entryCount: state.entryCount,
      };
  }
}

