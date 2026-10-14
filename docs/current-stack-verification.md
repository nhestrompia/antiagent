# Current-stack acceptance check

Run `npm run verify:current-stack` to challenge all current opt-in layers with the adaptive ordinary-clock screenshot/input client. This is a strict acceptance check, not a normal benchmark. It requires every session to record an explicit block.

The new run recorded one complete session and two OCR failures. See [the results](current-stack-verification-results.json). One completion rejects the prevention claim. The other attempts remain inconclusive. No OCR or protocol failure counts as an explicit block.

The verifier now checks completed tasks before it checks incomplete attempts. It can assess saved evidence without opening Chrome:

```sh
node scripts/benchmark-bare-cdp.mjs --verify-results docs/current-stack-verification-results.json --require-blocking
```

That command exits nonzero with `Agent-proof acceptance failed: a session completed the task`. The same check passes on `clock-guard-virtual-results.json`, where all three sessions record blocks. That pass applies only to those recorded virtual-time attempts. It does not establish general prevention.

The prior [ordinary-clock results](clock-guard-lean-results.json) also contain three completions. The fresh run confirms the route still survives. The package remains an experiment without a prevention guarantee.

JavaScript syntax and diff checks passed. This milestone changes benchmark verification and package commands. It does not change application behavior.
