# Hidden observer and heap access

The native-select fixture now supports `?harden=on&hide=on`. It removes the observer's prototype and freezes the observer after registration. The binding remains private to the module. This closes the known `Runtime.queryObjects(MutationObserver.prototype)` lookup: three clients found zero observers and their label restoration was blocked.

A paused-frame lookup of `observer` failed in three trials with `ReferenceError`. The current callback does not retain that unused binding. These unsuccessful attack attempts are recorded in `native-select-hidden-pilot-results.json`; they do not prove prevention against all debugger clients.

The first heap lookup assumed an object named `MutationObserver`. It found no candidates in three trials (`native-select-heap-name-pilot-results.json`). A broader object-only scan also failed. The complete snapshot showed the wrapper as a **native** node named `MutationObserver`. Including that node enabled a working attack.

The final client collects `HeapProfiler.addHeapSnapshotChunk`, parses the node metadata, gets remote objects with `HeapProfiler.getObjectByHeapObjectId`, and tests the native disconnect method on each candidate. A failed native brand check is ignored. One actual observer is disconnected per trial. The client then restores the previously cached public option label, dispatches a printable character, and clicks Confirm. The fixture's existing correct-value comparison and trusted-event checks remain in use. No accepted count or trusted-event state is fabricated.

The heap client completed 3/3 fresh sessions. The prototype client against the hidden guard was blocked 3/3. The full regression matrix is in `native-select-results.json`. The strict prevention check must continue to fail while any client completes an action.

The [Chrome DevTools HeapProfiler protocol](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/) documents snapshot chunks and conversion from heap IDs to remote objects. Removing a JavaScript prototype does not remove the browser's privileged heap representation. This is evidence against using private frozen page objects as an automation enforcement boundary.

This is a fixture experiment, not a package default. Human operation of the native popup and accessibility behavior remain unvalidated. The application is not agent-proof.
