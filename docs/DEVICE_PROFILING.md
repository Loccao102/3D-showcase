# Device Profiling Protocol

## Goal

The showcase now exposes an in-page diagnostics harness so real Android, iOS, tablet and desktop sessions can produce comparable evidence without adding a telemetry backend.

The harness is intentionally local-first: measurements stay in the browser until the tester presses **Copy diagnostics JSON**.

## Captured evidence

The exported JSON includes:

- manifest ID, slug, asset stage and engine version,
- viewport width/height and device pixel ratio,
- browser-provided device-memory and hardware-concurrency hints when available,
- Save-Data and Network Information hints when the browser exposes them,
- user agent and reduced-motion preference,
- WebGL version, vendor/renderer string and selected renderer capability limits,
- base render policy and any adaptive quality suggestion,
- latest active-frame sample: average frame time, p95 frame time, FPS, sample count and quality tier,
- asset loading/ready/error events, URL and measured duration,
- first paint / first contentful paint / DOMContentLoaded / load event timings when available,
- active camera/hotspot and the generic binding set at capture time.

Not every browser exposes every hint. Missing values are valid evidence and must not be manufactured.

## Real-device test protocol

Run at least the following matrix before declaring the automotive vertical production-ready:

1. mid-range Android Chrome,
2. iPhone Safari,
3. tablet portrait,
4. tablet landscape,
5. desktop/laptop integrated GPU,
6. stronger desktop discrete GPU when available.

For each device/browser combination:

1. Record the exact device model, OS version and browser version outside the JSON if the browser does not expose them reliably.
2. Start with a cold page load after clearing the site cache, then capture one cold-load diagnostics snapshot.
3. Reload normally and capture a warm-load snapshot separately.
4. Orbit/zoom the vehicle continuously long enough to produce at least one 45-active-frame telemetry sample.
5. Open all three guided hotspots.
6. Switch Touring -> Sport -> Touring to exercise whole-asset replacement.
7. Switch the Motion option to **Signature pulse** long enough to obtain another frame sample, then return to Static.
8. Exercise at least two body finishes and both lighting states.
9. If adaptive quality downgrades, record the before/after quality tier from the snapshot.
10. Copy the diagnostics JSON and store it with the device/run identifier.

Perform three comparable runs when investigating a performance regression. Prefer the median result rather than selecting the best run.

## Interpretation

The runtime currently requests one quality step down after a sustained sample whose average frame time is at least 24 ms or whose p95 is at least 34 ms. A downgrade is a protective behavior, not a failed test by itself.

Look for:

- cold asset readiness duration,
- warm asset readiness duration,
- sustained orbit FPS and p95,
- whether the selected LOD matches the intended viewport tier,
- whether adaptive degradation occurs repeatedly,
- obvious interaction stalls during trim replacement or animation,
- browser/GPU combinations that behave materially worse than the rest of the matrix.

## Emulator boundary

Responsive browser emulation is useful for layout and LOD-routing smoke tests, but it does **not** close a device-performance gate. It does not reproduce the target phone/tablet GPU, browser graphics stack, memory pressure, thermal behavior or real network path.

Only measurements captured on representative physical devices should be checked off as Android/iOS/tablet performance evidence.

## Privacy boundary

The diagnostics harness does not upload data and has no analytics endpoint. The user/tester explicitly copies JSON to the clipboard. The snapshot may contain a user-agent string and GPU/renderer information, so treat exported files as engineering diagnostics and do not attach unrelated personal information.
