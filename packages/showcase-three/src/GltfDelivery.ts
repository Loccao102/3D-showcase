import type { AssetDelivery, AssetSource } from "@showcase/core";
import type { WebGLRenderer } from "three";
import { KTX2Loader } from "three-stdlib";

interface ResolvedDelivery {
  meshopt: boolean;
  draco: boolean | string;
  ktx2TranscoderPath?: string | undefined;
}

interface Ktx2CapableLoader {
  setKTX2Loader(loader: KTX2Loader): unknown;
}

const ktx2Loaders = new WeakMap<WebGLRenderer, Map<string, KTX2Loader>>();

function legacyDelivery(asset: AssetSource): AssetDelivery | undefined {
  const raw = asset.metadata?.delivery;
  if (!raw || typeof raw !== "object") return undefined;

  const candidate = raw as Record<string, unknown>;
  return {
    ...(typeof candidate.meshopt === "boolean"
      ? { meshopt: candidate.meshopt }
      : {}),
    ...(typeof candidate.draco === "boolean" || typeof candidate.draco === "string"
      ? { draco: candidate.draco }
      : {}),
    ...(typeof candidate.ktx2TranscoderPath === "string"
      ? { ktx2TranscoderPath: candidate.ktx2TranscoderPath }
      : {}),
  };
}

function resolveDelivery(asset: AssetSource): ResolvedDelivery {
  const delivery = asset.delivery ?? legacyDelivery(asset);
  const dracoValue = delivery?.draco;

  return {
    meshopt: delivery?.meshopt !== false,
    draco:
      typeof dracoValue === "string"
        ? dracoValue
        : dracoValue === true,
    ...(delivery?.ktx2TranscoderPath
      ? { ktx2TranscoderPath: delivery.ktx2TranscoderPath }
      : {}),
  };
}

function getKtx2Loader(renderer: WebGLRenderer, transcoderPath: string) {
  let loadersForRenderer = ktx2Loaders.get(renderer);
  if (!loadersForRenderer) {
    loadersForRenderer = new Map<string, KTX2Loader>();
    ktx2Loaders.set(renderer, loadersForRenderer);
  }

  const existing = loadersForRenderer.get(transcoderPath);
  if (existing) return existing;

  const loader = new KTX2Loader()
    .setTranscoderPath(transcoderPath)
    .detectSupport(renderer);
  loadersForRenderer.set(transcoderPath, loader);
  return loader;
}

export function resolveGltfDelivery(asset: AssetSource, renderer: WebGLRenderer) {
  const delivery = resolveDelivery(asset);

  const extendLoader = delivery.ktx2TranscoderPath
    ? (loader: Ktx2CapableLoader) => {
        loader.setKTX2Loader(
          getKtx2Loader(renderer, delivery.ktx2TranscoderPath as string),
        );
      }
    : undefined;

  return {
    useDraco: delivery.draco,
    useMeshopt: delivery.meshopt,
    extendLoader,
  };
}
