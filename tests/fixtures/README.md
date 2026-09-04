# Trace-benchmark fixtures

Real-scan fixtures (`<name>/photo.png` + `truth.json` + `underlay.json`) are
**git-ignored** — they are people's actual floor plans. Keep them local.
See `tests/trace-bench.js` for the format and `__bench.runFixture('<name>')`.
The synthetic benchmark (`__bench.runAll()`) needs no fixtures.
