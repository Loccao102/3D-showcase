import type { ShowcaseSelectionSnapshot } from "./types";

export type ShowcaseInboundAction =
  | { type: "SHOWCASE_SELECT_OPTION"; groupId: string; optionId: string }
  | { type: "SHOWCASE_SET_CAMERA_PRESET"; presetId: string }
  | { type: "SHOWCASE_SET_ATMOSPHERE"; atmosphere: "studio" | "night" }
  | { type: "SHOWCASE_TRIGGER_TECHNICAL"; active: boolean }
  | { type: "SHOWCASE_REQUEST_SNAPSHOT" };

export type ShowcaseOutboundEvent =
  | { type: "SHOWCASE_READY"; manifestId: string; slug: string }
  | { type: "SHOWCASE_SELECTION_CHANGED"; snapshot: ShowcaseSelectionSnapshot }
  | { type: "SHOWCASE_HOTSPOT_CLICKED"; hotspotId: string; label?: string }
  | { type: "SHOWCASE_ERROR"; message: string };

export interface ShowcaseEmbedClient {
  selectOption: (groupId: string, optionId: string) => void;
  setCameraPreset: (presetId: string) => void;
  setAtmosphere: (atmosphere: "studio" | "night") => void;
  toggleTechnical: (active: boolean) => void;
  requestSnapshot: () => void;
  onSnapshot: (callback: (snapshot: ShowcaseSelectionSnapshot) => void) => () => void;
  onReady: (callback: (info: { manifestId: string; slug: string }) => void) => () => void;
  onHotspot: (callback: (hotspotId: string) => void) => () => void;
  destroy: () => void;
}

export function createShowcaseEmbedClient(
  target: HTMLIFrameElement | Window,
  targetOrigin = "*",
): ShowcaseEmbedClient {
  const getWindow = (): Window | null => {
    if ("contentWindow" in target) {
      return target.contentWindow;
    }
    return target;
  };

  const postAction = (action: ShowcaseInboundAction) => {
    const win = getWindow();
    if (win) {
      win.postMessage(action, targetOrigin);
    }
  };

  const snapshotListeners = new Set<(snapshot: ShowcaseSelectionSnapshot) => void>();
  const readyListeners = new Set<(info: { manifestId: string; slug: string }) => void>();
  const hotspotListeners = new Set<(hotspotId: string) => void>();

  const handleMessage = (event: MessageEvent) => {
    const data = event.data as ShowcaseOutboundEvent | undefined;
    if (!data || typeof data !== "object" || !("type" in data)) return;

    switch (data.type) {
      case "SHOWCASE_READY":
        readyListeners.forEach((listener) => listener({ manifestId: data.manifestId, slug: data.slug }));
        break;
      case "SHOWCASE_SELECTION_CHANGED":
        snapshotListeners.forEach((listener) => listener(data.snapshot));
        break;
      case "SHOWCASE_HOTSPOT_CLICKED":
        hotspotListeners.forEach((listener) => listener(data.hotspotId));
        break;
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("message", handleMessage);
  }

  return {
    selectOption: (groupId, optionId) =>
      postAction({ type: "SHOWCASE_SELECT_OPTION", groupId, optionId }),
    setCameraPreset: (presetId) =>
      postAction({ type: "SHOWCASE_SET_CAMERA_PRESET", presetId }),
    setAtmosphere: (atmosphere) =>
      postAction({ type: "SHOWCASE_SET_ATMOSPHERE", atmosphere }),
    toggleTechnical: (active) =>
      postAction({ type: "SHOWCASE_TRIGGER_TECHNICAL", active }),
    requestSnapshot: () =>
      postAction({ type: "SHOWCASE_REQUEST_SNAPSHOT" }),
    onSnapshot: (callback) => {
      snapshotListeners.add(callback);
      return () => snapshotListeners.delete(callback);
    },
    onReady: (callback) => {
      readyListeners.add(callback);
      return () => readyListeners.delete(callback);
    },
    onHotspot: (callback) => {
      hotspotListeners.add(callback);
      return () => hotspotListeners.delete(callback);
    },
    destroy: () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("message", handleMessage);
      }
      snapshotListeners.clear();
      readyListeners.clear();
      hotspotListeners.clear();
    },
  };
}
