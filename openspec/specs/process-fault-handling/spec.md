# process-fault-handling Specification

## Purpose

Faults that escape request handling are logged consistently, and the process only keeps running when its state can still be trusted.

## Requirements

### Requirement: Unhandled rejections are logged and tolerated
The system SHALL register an `unhandledRejection` handler at startup that logs the reason at error level and SHALL NOT terminate the process.

#### Scenario: Stray rejected promise
- **WHEN** a promise rejects with no handler attached
- **THEN** an error log entry with the reason is written and the process continues serving requests

### Requirement: Uncaught exceptions are logged and terminate the process
The system SHALL register an `uncaughtException` handler at startup that logs the error at error level, allows pending log output to flush, and exits with a non-zero status so a supervisor can restart it.

#### Scenario: Uncaught exception
- **WHEN** an exception propagates to the top of the event loop
- **THEN** it is logged and the process exits with a non-zero code
