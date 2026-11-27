## Purpose

Defines the verifiable server-side export behavior for stroke nodes, including pen looks and eraser-split pieces, across both canvas backends, and the recorded cost limits for large stroke counts.

## ADDED Requirements

### Requirement: Strokes export with visible ink on both backends
Server-side export of a room containing stroke nodes SHALL produce an image with non-background pixels for each stroke, on both the skia and node-canvas backends. Split stroke pieces SHALL export as ordinary stroke nodes.

#### Scenario: Stroke fixtures render on skia
- **WHEN** each stroke fixture is exported with the skia backend
- **THEN** the resulting image contains ink and the check passes

#### Scenario: Stroke fixtures render on node-canvas
- **WHEN** each stroke fixture is exported with the node-canvas backend
- **THEN** the resulting image contains ink and the check passes

#### Scenario: Missing ink fails the check
- **WHEN** a stroke exports with no ink
- **THEN** the check reports that fixture and exits non-zero

#### Scenario: Split pieces export
- **WHEN** a room holds pieces of one erased stroke
- **THEN** exporting those nodes succeeds and the image contains ink

### Requirement: Render output is retained for comparison
The stroke check SHALL write one PNG per fixture and backend to a `temp/` subdirectory so outputs can be diffed across SDK versions.

#### Scenario: Output dumped
- **WHEN** the check runs for a backend
- **THEN** PNGs for every fixture exist under that backend's output directory

### Requirement: Pen looks render consistently across backends
Once the SDK provides pen looks, strokes using multiply compositing, flat ends, tapers and seeded variance SHALL render equivalently on skia and node-canvas, and variance SHALL be deterministic for a given stroke id.

#### Scenario: Multiply parity
- **WHEN** a multiply stroke overlaps another node on both backends
- **THEN** the overlap pixels match within a documented tolerance

#### Scenario: Deterministic variance
- **WHEN** the same stroke is rendered twice, or on both backends
- **THEN** the width profile is identical within tolerance

### Requirement: Stroke export cost is measured and thresholded
The project SHALL measure room state size and PNG, PDF and presentation export time for about 5,000 stroke nodes, before and after simulated erasing, and SHALL record the results and thresholds in documentation.

#### Scenario: Measurement recorded
- **WHEN** the cost has been measured
- **THEN** the documentation reports state size and export times for both the intact and split rooms

#### Scenario: Thresholds recorded
- **WHEN** the measurement has been made
- **THEN** the documentation lists measured values and the thresholds derived from them
