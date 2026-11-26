# Spec Delta

## Purpose

Rooms and their data are removed from the database and from storage once they are older than seven days, unless a room, or a user who owns it, is explicitly protected. The job runs unattended and is built so that a wrong input cannot silently delete everything.

## ADDED Requirements

### Requirement: Rooms expire seven days after creation
The system SHALL hard-delete every room whose `createdAt` is more than 7 days before the time of the run, regardless of the room's `status` (active or archived), unless the room is protected.

#### Scenario: Old room is deleted
- **WHEN** a run finds an unprotected room created 8 days ago
- **THEN** the room and its data are deleted

#### Scenario: Recent room is kept
- **WHEN** a run finds an unprotected room created 6 days ago
- **THEN** the room and its data are not touched

#### Scenario: Archived room follows the same rule
- **WHEN** a run finds an unprotected room with status archived created 8 days ago
- **THEN** the room and its data are deleted

#### Scenario: Activity does not extend the lifetime
- **WHEN** a room created 8 days ago was updated an hour ago
- **THEN** the room is still deleted

### Requirement: Rooms can be protected by room identifier
The system SHALL NOT delete a room whose `roomId` is on the protected rooms list, nor any data belonging to it, regardless of its age.

#### Scenario: Protected room is kept
- **WHEN** a run finds a room created 30 days ago whose `roomId` is on the protected rooms list
- **THEN** the room, its pages, memberships, tasks and blobs are not touched

#### Scenario: Protection is evaluated at every run
- **WHEN** a `roomId` is removed from the protected rooms list and the room is older than 7 days
- **THEN** the next run deletes the room

### Requirement: Rooms can be protected by owner
The system SHALL NOT delete a room if at least one user with the `owner` role in that room has a user ID on the protected users list. User IDs SHALL be matched exactly. Users with the `user` role SHALL NOT protect a room.

#### Scenario: Room owned by a protected user is kept
- **WHEN** a run finds an old room whose owner's user ID is on the protected users list
- **THEN** the room and its data are not touched

#### Scenario: Any protected owner is enough
- **WHEN** an old room has two owners and only one of them is on the protected users list
- **THEN** the room is kept

#### Scenario: Membership does not protect
- **WHEN** a protected user is only a `user` member of an old room owned by someone unprotected
- **THEN** the room is deleted

#### Scenario: Protected ID matching no user is reported
- **WHEN** a protected user ID matches no user
- **THEN** the run reports how many protected IDs matched no user, and no room is protected because of it

#### Scenario: Owner account no longer exists
- **WHEN** the owner of an old room is on the protected users list but their account was deleted
- **THEN** the room is still kept, because the owner membership carries the user ID

### Requirement: Room deletion is all-or-nothing in the database
The system SHALL delete a room, its pages, memberships, access codes, tasks, images, videos, templates, threads and answers, AI chats and messages, and connections in a single database transaction. If any statement fails, none of the room's rows SHALL be deleted.

#### Scenario: Complete deletion
- **WHEN** an eligible room is deleted
- **THEN** no row referencing its `roomId` remains in any table

#### Scenario: Failure leaves the room intact
- **WHEN** one deletion statement for a room fails
- **THEN** the transaction is rolled back, the room's rows remain, and the room is retried at the next run

#### Scenario: One failure does not stop the run
- **WHEN** deleting one room fails
- **THEN** the remaining eligible rooms are still processed and the run is reported as failed

### Requirement: Orphaned blobs are removed from storage
After the database phase, the system SHALL delete blobs, in every storage container the application writes to, whose owner no longer exists in the database. The owner of a blob SHALL be the room, page or presentation mode identified by its name. A blob SHALL be kept if its owner exists, if its name is on the protected rooms list, or if it was created less than the grace period ago.

#### Scenario: Blobs of a deleted room are removed
- **WHEN** a room has been deleted from the database
- **THEN** its room state blobs, images, videos, generated images, exports, thumbnails, template images and standalone images are removed in the same or a following run

#### Scenario: Blobs of an existing room are kept
- **WHEN** a blob's owner room or page exists in the database
- **THEN** the blob is not deleted

#### Scenario: Presentation images follow their task
- **WHEN** a presentation image's presentation mode identifier has no remaining presentation task
- **THEN** the image is deleted, and when its task still exists it is kept

#### Scenario: Recent blob is kept
- **WHEN** a blob with no owner in the database was created within the grace period
- **THEN** the blob is not deleted

#### Scenario: Protected legacy room blobs are kept
- **WHEN** a blob has no database owner but its room name is on the protected rooms list
- **THEN** the blob is not deleted

#### Scenario: Blobs with no database owner are deleted
- **WHEN** a legacy blob has no database owner, is not protected, and is older than the grace period
- **THEN** the blob is deleted

#### Scenario: Interrupted run is repaired by the next
- **WHEN** a run committed the database deletion but failed before deleting some blobs
- **THEN** the next run deletes the remaining blobs

### Requirement: Protected data is never touched
The system SHALL NOT delete any database row or blob belonging to a protected room, to a room owned by a protected user, or to any page of such a room, in any phase of a run.

#### Scenario: Protected room's pages and blobs survive
- **WHEN** a protected room has pages and blobs in several containers
- **THEN** after a run all pages and blobs still exist

### Requirement: Runs are safe by default
The system SHALL support a dry-run mode that reports which rooms and blobs would be deleted and deletes nothing. The system SHALL abort without deleting anything if the database cannot be read, if it contains no rooms, or if the number of rooms or blobs to delete exceeds a configured limit.

#### Scenario: Dry run
- **WHEN** a run is started in dry-run mode
- **THEN** the candidate rooms and blobs are reported and no row or blob is deleted

#### Scenario: Database unavailable
- **WHEN** the room list cannot be read
- **THEN** the run fails and deletes nothing

#### Scenario: Empty database
- **WHEN** the database contains no rooms
- **THEN** the run aborts and deletes no blob

#### Scenario: Threshold exceeded
- **WHEN** the rooms or blobs to delete exceed the configured limit
- **THEN** the run aborts before deleting anything and reports the counts

### Requirement: Runs are scheduled, serialized and observable
The system SHALL run the retention job automatically every 4 hours and on manual request, for each target environment. At most one run SHALL execute at a time. A failed scheduled run SHALL raise an alert. Logs SHALL report counts and identifiers of rooms and blobs and SHALL NOT contain user emails.

#### Scenario: Scheduled run
- **WHEN** 4 hours have passed since the last scheduled run
- **THEN** a run starts for each target environment

#### Scenario: Overlapping runs
- **WHEN** a run is still in progress when another is due
- **THEN** the second run waits and the first is not cancelled

#### Scenario: Failed scheduled run
- **WHEN** a scheduled run fails
- **THEN** an alert is raised

#### Scenario: Emails stay out of logs
- **WHEN** a run reports protected users
- **THEN** it reports counts of protected and unmatched user IDs, and no email address appears in the output

### Requirement: Protection lists are configuration, not code
The system SHALL read the protected rooms and the protected users from environment configuration of the workflow, so that they can be changed without a code change, and SHALL NOT store user emails in the repository or in workflow configuration.

#### Scenario: List changed without a deploy
- **WHEN** a room is added to the protected rooms variable
- **THEN** the next run protects it with no code change

#### Scenario: No emails in the repository
- **WHEN** the repository and the workflow configuration are inspected
- **THEN** no user email is present

### Requirement: The legacy storage cleanup is retired
The system SHALL NOT include the previous blob-only cleanup job or its script once the retention job is in place.

#### Scenario: Single cleanup mechanism
- **WHEN** the repository is inspected after the change
- **THEN** `cleanup-storage/` and the `storage:cleanup` script no longer exist
