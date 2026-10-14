# Inline guard and focus input

The native-select fixture adds `?harden=on&hide=on&inline=on`. Its change and confirm handlers compare the current select markup with the saved cleared markup. This check runs inside the existing action handlers, independently of the mutation observer.

The heap client still disconnected one observer in each fresh session. Label restoration was then detected by the inline check and the action was blocked in 3/3 trials. This closes the measured observer-disconnect path without relying on observer secrecy.

An adaptive client focused the select through `DOM.focus`, dispatched printable `h` through `Input.dispatchKeyEvent`, and clicked Confirm through browser input. It completed 3/3 trials with a trusted change and click. It did not restore labels, disconnect guards, read private expected values, or modify acceptance state. The popup and label-clearing path was never entered.

The full matrix retains both attacks. The focus path is also a normal keyboard interaction. Preventing it by requiring pointer-only popup operation would change the application's supported human interactions and would require separate usability and accessibility evidence. It would not establish an unforgeable human origin for browser input.

This milestone is a fixture experiment. It is not agent-proof and must not be advertised as one. The inline guard blocks one known tampering path; it does not identify who controls the browser.
