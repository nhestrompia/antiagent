# Persistent pointer device ID source review

Researched 2026-10-14 against W3C and Chromium main. Installed-browser field values require live verification.

The W3C Pointer Events draft describes `persistentDeviceId` as a session-scoped device identifier. Zero means the generating device could not be identified. Hardware identification may arrive after pointerdown, so physical input can start with zero and acquire a valid value later. The specification does not define this field as an attestation of human action. It also includes the field in `PointerEventInit`; script-created events remain a separate trust question. [W3C draft](https://w3c.github.io/pointerevents/#dom-pointerevent-persistentdeviceid)

## Chromium's mapping

`PointerEventFactory::Create` assigns the field using `GetBlinkDeviceId`. That function handles mouse input before reading the incoming hardware identifier: it assigns a cached counter value for every `kMouse` event. Factory initialization starts the counter at one. Thus native mouse gets a nonzero value even without a hardware ID, and a debugger-created mouse event reaching this path gets the same treatment. For other pointer types, incoming device ID `-1` produces zero; identified devices receive mapped counter values. This mapping authenticates neither the hardware nor the person. [Pointer event factory](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/events/pointer_event_factory.cc)

The internal `WebPointerProperties.device_id` defaults to `-1`; its comment describes unique pen IDs on supported devices. [Internal pointer properties](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/public/common/input/web_pointer_properties.h)

Chromium's CDP mouse constructor creates a `WebMouseEvent`, sets the requested pointer type and pen properties, and forwards it through input routing. The inspected constructor does not assign `device_id`. Inference: ordinary CDP mouse still receives a nonzero browser-mapped ID because of the factory's mouse branch; CDP pen with its default invalid ID maps to zero. A missing protocol parameter therefore does not establish a distinguishing provenance field. [CDP input handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc)

Native UI mouse/pen conversion copies `event.source_device_id()` into the WebMouseEvent. Android motion-event conversion similarly copies a source device ID into each touch point. Availability and meaning depend on the hardware and platform; the shared property default and factory mapping retain the unknown-ID case. A rule that rejects all zero values can reject valid physical pen/touch events. [Native UI conversion](https://raw.githubusercontent.com/chromium/chromium/main/ui/events/blink/web_input_event.cc), [Motion-event conversion](https://raw.githubusercontent.com/chromium/chromium/main/ui/events/blink/blink_event_util.cc)

## Decision

This field cannot supply a general npm-only agent-proof gate: debugger mouse can obtain nonzero IDs from browser mapping, while physical devices can have zero. Requiring a nonzero pen identifier would restrict supported hardware and still would not establish human provenance across arbitrary input injection routes. Test mouse, pen, and touch separately, with Runtime absent, and record the installed browser version. Do not promote the field into a security requirement merely because it is read-only on a delivered event.
