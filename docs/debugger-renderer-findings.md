# Renderer cache hardening and debugger attack

Date: 2026-10-14. Chrome 155.0.8059.40; Playwright 1.64.0.

## Baseline attack

Ordinary global lookup returned undefined for both layout state and the unmasked frame cache. The client then enabled Debugger, paused in a live renderer call frame, and evaluated those module bindings there.

It exported a full readable image and recovered the current correct slot for each decision. After resuming, it reproduced the pointer movement and hover sequence and sent trusted CDP mouse input. It completed 3/3 sessions in three clicks each. It did not change application state, disable a listener, or replace application code.

## Hardening

The renderer no longer keeps an unmasked offscreen image. It clips text before drawing, so hidden columns never enter a reusable full-text canvas. Animation frames repaint only the visible fragments and optional noise.

After that change, the same cache lookup found no bitmap in all nine paused decision frames. This removes a concrete pixel-export path. It does not make module bindings inaccessible to a debugger.

The adapted debugger client still recovered correct slots and completed 3/3 sessions. The screenshot-only median client also completed 3/3 headless sessions against the revised renderer. Cache removal therefore does not meet the requested prevention goal.

## Scope

This is a real application-use bypass, not a fabricated completion flag. All actions pass through the original guarded input handler. The client reads the final diagnostic outcome after its three actions.

Pausing a live call frame supplies access that ordinary global evaluation lacks. Moving a value out of `window` does not revoke that debugger capability. [Protocol and implementation review](debugger-renderer-boundary.md).

A separate source review examined worklets. It found debugger infrastructure and API limits that prevent paint worklets from serving as the proposed durable action validator. No worklet runtime test or protection claim exists. [Worklet review](worklet-renderer-research.md).

## Reproduce

With Vite running:

```sh
REVISION=hardened node scripts/benchmark-debugger-renderer.mjs
NOISE=1 STRATEGY=frame-median node scripts/benchmark-temporal-defense.mjs
```

The baseline runner mode targets the prior cache implementation. Its result file preserves that earlier run.

[Baseline](debugger-renderer-baseline-results.json), [hardened debugger results](debugger-renderer-hardened-results.json), [hardened screenshot results](temporal-noise-frame-median-headless-results.json).
