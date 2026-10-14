# Native select popup, DOM guard, and heap-query bypass

Date: 2026-10-14. Chrome 155.0.8059.40 on macOS. This explores browser-owned popup rendering rather than another ordinary canvas flag.

## Candidate and guard

The fixture uses a native select with three randomized choices and a Confirm button. It accepts only the correct private value after a trusted change and trusted confirmation click. Optional label clearing removes DOM labels after the popup opens. Optional hardening latches a block if the select's markup changes after that internal clearing.

The [primary source review](native-select-boundary-source-review.md) traces macOS AppKit popup rendering and mutation updates. It also identifies the closed-select type-ahead path: printable keypress matches an option label and selects it through the browser's input/change dispatch path.

## Capture observation

The successful cleared-popup trials reported `:open` true while all DOM option labels were blank. Their CDP surface screenshots contained the page and diagnostics, but no popup option labels. This is consistent with a separate AppKit menu. It is not proof of protected output or proof that humans can read the cached menu after clearing. Native OS screenshots and a physical human baseline remain untested.

## Adapted clients

The simple character client focuses the select and sends `Input.dispatchKeyEvent` with type char and text h. It then confirms. It emits trusted change events and completes the task without using a native popup choice.

The cleared-label client reads the public option labels and values before popup opening. After clearing and closing the popup, it restores the target label through `DOM.setOuterHTML`, focuses the control, and sends the same character input. The app's original select and confirmation handlers accept the action. It does not write the acceptance counter or private expected value.

The DOM guard stops this restoration. A stronger client evaluates `MutationObserver.prototype`, calls `Runtime.queryObjects`, then invokes disconnect on the returned observer. The observer is not exported on window and its variable name is not used. Each tested case found and disconnected one observer. The client then restores the target label and completes the original guarded action with trusted change and click events.

The query client uses Runtime commands, but never sends Runtime.enable. The earlier Runtime-cost signal must not be generalized to all Runtime command usage. V8's reviewed queryObjects handler resolves the prototype, queries matching heap objects, and wraps the resulting array; it does not contain the enabled-state requirement shown by runScript. [V8 Runtime implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-runtime-agent-impl.cc), [protocol](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-queryObjects).

## Initial controls

The initial arrow-key clients failed to select any option. The first run also failed to establish an open popup. A corrected raw-key run delivered trusted keydown events to a focused control but still produced no selection. These are rejected attack sequences and incomplete popup controls, not protection successes. The source review explains macOS's special arrow-key behavior. The final clients use the distinct printable-keypress path.

Initial records remain in `native-select-pilot-results.json` and `native-select-keyboard-pilot-results.json`. They do not contribute to a claim of general task prevention.

## Assistant observation

This assistant used the T3 collaborative browser to click the select, close the popup with Escape, type h, and click Confirm. The actual page reported accepted 1, blocked false, and lastChangeTrusted true. The observation is saved separately. Two preview snapshots failed, so no collaborative screenshot or physical human baseline is claimed.

## Reproduce

With Vite and the existing offline OCR executable ready:

```sh
npm run benchmark:native-select
npm run verify:native-select
```

The test compares normal character input, cleared-label restoration, restoration under the DOM guard, observer-query adaptation, and synthetic selection. The strict command must fail when an agent completes an action. Passing expected-outcome assertions does not establish agent prevention.

The fixture is browser-only and adds no deployment server, native component, or verification step. It remains experimental. No native-select gate enters the canvas application or a published package from this evidence.

The final 15-case matrix completed all expected-outcome assertions. Normal character selection, cleared-label restoration, and heap-query adaptation each completed 3/3 actions. The DOM guard rejected the unadapted restoration in 3/3, and synthetic selection rejected 3/3. Strict acceptance then exited 1 because nine actions completed, including three against the combined DOM guard. [Final results](native-select-results.json), [assistant observation](native-select-assistant-observation.json). Build and syntax checks passed. The main application's prevention goal remains unmet.
