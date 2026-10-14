# Persistent device ID guard test

Date: 2026-10-14. Chrome 155.0.8059.40. This reopens input-provenance research with a field not covered by the earlier pointer tests.

## Candidate

`PointerEvent.persistentDeviceId` is browser-generated on trusted input and read-only on delivered events. The candidate guard requires a trusted pointer press with a nonzero device ID. The test fixture randomizes three choices, and only the correct choice counts as a completed action.

The raw CDP client reads the target through screenshot OCR. It uses no Runtime or Debugger command, changes no page API, and supplies no device-ID parameter. It tries mouse, pen, and touch in three fresh profiles each.

## Results

| CDP pointer type | Press trusted | Press device ID | Accepted target |
| --- | --- | --- | ---: |
| Mouse | true | 1 | 3/3 |
| Pen | true | 0 | 0/3 |
| Touch | true | 0 | 0/3 |

All nine expected-outcome assertions passed. Mouse move, press, and release each reported device ID 1. Mouse click reported device ID 0, even in the successful sessions. The [result record](persistent-device-results.json) contains every event and command inventory. Screenshots remain under `artifacts/persistent-device/`.

The nonzero-ID guard is bypassed by ordinary debugger mouse input. The field need not be a CDP argument for the browser to generate it later.

## Source and compatibility

The [primary-source review](persistent-device-id-source-review.md) traces Chromium's mouse special case. It assigns a cached nonzero ID without checking the incoming hardware identifier. Other pointer types with unknown device IDs map to zero. The W3C draft permits physical input to report zero when hardware identity is unavailable or arrives late.

Thus requiring a positive ID can reject valid pen/touch users while still accepting the tested agent. Requiring a positive ID on click is also unsupported by these measurements, and no physical-click baseline validates it. This experiment adds no device-ID requirement to the main application.

## Reproduce

With Vite and the existing OCR tool ready:

```sh
npm run benchmark:persistent-device
```

The fixture and guard require no deployment server or native component. Test infrastructure launches isolated Chrome profiles and reads offline OCR. The prevention goal remains unmet.
