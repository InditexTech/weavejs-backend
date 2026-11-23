# image-input-validation Specification

## Purpose

Client-supplied image payloads are validated before any job, task or image record is created, so malformed input is rejected with a client error and never affects process availability or leaves partial records.

## Requirements

### Requirement: Image payloads are validated before job creation
For the image operations negate, grayscale, flip, remove-background and image upload, the system SHALL decode the supplied image and confirm it is a readable image with positive width and height before creating a job, task or image record.

#### Scenario: Undecodable image
- **WHEN** a member submits an image operation whose `dataBase64` is not a decodable image
- **THEN** the response is 400 with a JSON error body, no job is enqueued, and no task or image row is created

#### Scenario: Empty image data
- **WHEN** a member submits an image operation whose `dataBase64` decodes to zero bytes
- **THEN** the response is 400 and nothing is persisted

#### Scenario: Valid image
- **WHEN** a member submits an image operation with a decodable image
- **THEN** the job is created as before and the response is 200 with a `jobId`

### Requirement: Remove-background payload shape is validated
The v2 remove-background endpoint SHALL validate the request body shape (`image.dataBase64`, `image.contentType`, optional `image.replaceImage`) and the base64 size limit applied by the v1 image endpoints, and SHALL respond 400 when it is invalid.

#### Scenario: Missing image object
- **WHEN** the request body has no `image` object
- **THEN** the response is 400 with a JSON error and the process keeps serving requests

#### Scenario: Oversized payload
- **WHEN** `image.dataBase64` exceeds the configured maximum length
- **THEN** the response is 400

### Requirement: Unexpected job-start failures return JSON errors
If starting an image job fails for any other reason, the endpoint SHALL respond 500 with a JSON error body rather than leaving the request unanswered or rejecting.

#### Scenario: Job queue failure
- **WHEN** enqueuing the job throws
- **THEN** the response is 500 with a JSON error and the process stays up

### Requirement: Malformed payloads never terminate the process
A malformed or hostile image payload SHALL NOT terminate the server process, including payloads that reach a job handler after job creation.

#### Scenario: Job-side image failure
- **WHEN** image processing inside a job fails for a given payload
- **THEN** the job and its task are marked failed and the failure is broadcast to the room, and the process stays up
