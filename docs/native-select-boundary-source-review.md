# Native select popup boundary source review

Researched 2026-10-14 against Chromium main. This examines macOS external select popups, not every browser or customized select UI. Installed-browser capture and completion tests remain necessary.

## Separate native presentation

Blink serializes current select item text into menu-item labels when opening an external popup. macOS browser code forwards those items to its Cocoa bridge. Selection returns an item index through the popup client; Blink applies it through `SelectOptionByPopup`. [External popup implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/external_popup_menu.cc), [macOS browser popup helper](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/renderer_host/popup_menu_helper_mac.mm)

The Cocoa runner creates an `NSMenu` with `NSMenuItem` titles copied from the supplied labels, then presents it through `NSPopUpButtonCell`. This is native AppKit presentation rather than ordinary page DOM rendering. The implementation also keeps titles for type-ahead selection. [Native menu runner](https://raw.githubusercontent.com/chromium/chromium/main/content/app_shim_remote_cocoa/web_menu_runner_mac.mm)

`Page.captureScreenshot` captures through the page's RenderWidgetHost snapshot path. Inference: the default surface screenshot need not include a separately presented AppKit menu. This is an implementation boundary to test, not a capture-protection contract. The command also supports a distinct view/window mode for trusted clients, so a result for the default mode must not be generalized to all capture paths. [CDP screenshot implementation](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/page_handler.cc)

## Clearing labels is not a stable cached-menu contract

Option child changes call `DidChangeTextContent`, which notifies the owning select through `OptionElementChildrenChanged`. Label-attribute changes also notify the select. Clearing text while leaving a `label` attribute can leave the displayed label intact and DOM-readable. [Option implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/html_option_element.cc)

The external popup responds to DOM or selection updates by posting an update task. Its update calls `ShowInternal`, which resets the client and rebuilds menu information from current DOM. The browser helper hides the popup on client disconnection. Inference: a copied native label can exist briefly, but the source does not promise that it stays visible after author mutation. Mutation can replace or close that popup. [External popup implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/external_popup_menu.cc), [macOS browser popup helper](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/renderer_host/popup_menu_helper_mac.mm)

The Cocoa bridge queues replacement menus while a native nested event loop remains active, then displays only the latest pending menu. It explicitly permits application tasks during the native loop, so native tracking does not freeze every browser task and preserve an immutable label snapshot. It cancels native menus in headless windows. [Cocoa bridge](https://raw.githubusercontent.com/chromium/chromium/main/content/app_shim_remote_cocoa/render_widget_host_ns_view_bridge.mm)

## Input and remaining attack paths

CDP keyboard/mouse handlers forward events through RenderWidgetHost input paths. The reviewed handler is not an AppKit menu event injector. Inference: an open native menu may fail to respond to those particular injected events, while page-focused keyboard selection can still be a separate path worth testing. No reviewed source makes the native picker a human-input attestation. [CDP input implementation](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/input_handler.cc)

The experiment must distinguish three questions: whether default CDP capture omits the popup, whether a human can still see and select labels after clearing, and whether an agent can finish through DOM inspection or keyboard selection without the popup. Option labels are initially DOM data before serialization. Native screen capture and OS input remain separate threats. A native picker success against one CDP route therefore does not establish an npm-only agent-proof application.

## Closed-select type-ahead follow-up

The first live trial did not acquire a visible native popup. That is an unvalidated control, not evidence of protection. Arrow keydown results also do not test printable-character type-ahead.

Chromium's `TypeAhead::ShouldHandleKeyboardEvent` requires printable `keypress` without Ctrl/Alt/Meta. Its matcher reads current option text and searches by prefix. [Type-ahead implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/forms/type_ahead.cc)

`HTMLSelectElement::DefaultEventHandler` invokes type-ahead after the select-type handler. `OptionAtIndex` returns an enabled option's `DisplayLabel`; a match calls `SelectOption` with the input/change dispatch flag for the ordinary select path. It does not require the native popup to be open. Concrete attack candidate: focus a closed select, restore a chosen blank option's label to a unique printable prefix such as `z`, then inject CDP `type: "char"` with `text` and `unmodifiedText` set to `z`. This should be tested for actual trusted input/change and application completion; source-path reachability alone is not a completed bypass. [Select implementation](https://raw.githubusercontent.com/chromium/chromium/refs/heads/main/third_party/blink/renderer/core/html/forms/html_select_element.cc)

## Blank-label keyboard follow-up

The reviewed select-type revision returns before ordinary closed-select Arrow/PageUp/PageDown/Home/End selection on macOS when spatial navigation is off. Alt+Arrow and F4 request popup opening; Space/Return keypress can do likewise. Shift/Ctrl/Alt/Meta are rejected in the remaining ordinary selection handler. Those controls do not establish a source-backed blank-label bypass. Other platforms reach position-based selection without needing labels. `DidBlur` can dispatch changed selection, but `DidSelectOption` also updates the remembered selection even when no events are requested, so IDL property selection followed by blur is not established as an attack. [Pinned select-type source](https://chromium.googlesource.com/chromium/src/+/cd669ef9c5ed4ac818eb34b1dc59962bc2be947d/third_party/blink/renderer/core/html/forms/select_type.cc)

No wheel-selection branch was found in that handler. This is not a whole-browser proof. Native OS menu input, accessibility actions, alternate platform behavior, and mutation timing remain separate tests. A label/structure MutationObserver can reject the demonstrated restoration attack, but cannot alone authenticate all selection sources.
