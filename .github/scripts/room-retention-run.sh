#!/usr/bin/env bash
# Starts a room retention run on the deployed backend, waits for it to finish
# and prints its summary. Exits non-zero if the run could not be started, did
# not finish in time, was lost, or reported failures.
#
# Configuration comes from the environment, nothing is interpolated into the
# script text:
#   APP_HOST, HUB_NAME, RETENTION_TRIGGER_TOKEN           (required)
#   RETENTION_DRY_RUN                                     (only "false" deletes)
#   RETENTION_PROTECTED_ROOMS, RETENTION_PROTECTED_USER_IDS
#   RETENTION_MAX_ROOMS_TO_DELETE, RETENTION_MAX_BLOBS_TO_DELETE,
#   RETENTION_MAX_BLOBS_PERCENT, RETENTION_BLOB_GRACE_HOURS
#   RETENTION_BASE_PATH (default /weavebff/api/v3)
#   RETENTION_POLL_INTERVAL_SECONDS (default 20)
#   RETENTION_POLL_TIMEOUT_MINUTES (default 180)

set -euo pipefail

: "${APP_HOST:?APP_HOST must be set}"
: "${HUB_NAME:?HUB_NAME must be set}"
: "${RETENTION_TRIGGER_TOKEN:?RETENTION_TRIGGER_TOKEN must be set}"

base_path="${RETENTION_BASE_PATH:-/weavebff/api/v3}"
interval="${RETENTION_POLL_INTERVAL_SECONDS:-20}"
timeout_minutes="${RETENTION_POLL_TIMEOUT_MINUTES:-180}"
url="${APP_HOST%/}${base_path}/${HUB_NAME}/retention/runs"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

# The token goes through a config file, not the command line, so it never shows
# in a process list. It has to be a real file: some curl builds cannot read a
# config from a pipe, such as process substitution.
curl_config_file="$work_dir/curl.conf"
(umask 077 && printf 'header = "x-retention-token: %s"\n' "$RETENTION_TRIGGER_TOKEN" >"$curl_config_file")

request() {
  # request METHOD URL [DATA]; prints the HTTP status, body goes to $work_dir/body
  local method="$1" target="$2" data="${3:-}"
  local args=(--silent --show-error --max-time 60 --output "$work_dir/body"
    --write-out '%{http_code}' --request "$method" --config "$curl_config_file")
  if [ -n "$data" ]; then
    args+=(--header 'content-type: application/json' --data "$data")
  fi
  curl "${args[@]}" "$target"
}

body="$(jq -n \
  --arg dry "${RETENTION_DRY_RUN:-}" \
  --arg rooms "${RETENTION_PROTECTED_ROOMS:-}" \
  --arg users "${RETENTION_PROTECTED_USER_IDS:-}" \
  --arg maxRooms "${RETENTION_MAX_ROOMS_TO_DELETE:-}" \
  --arg maxBlobs "${RETENTION_MAX_BLOBS_TO_DELETE:-}" \
  --arg maxPercent "${RETENTION_MAX_BLOBS_PERCENT:-}" \
  --arg grace "${RETENTION_BLOB_GRACE_HOURS:-}" '
  # Entries are trimmed, and quotes, brackets and braces around them are dropped,
  # so a value pasted as "" or ["a","b"] never becomes a bogus entry.
  def list: [split("[,;\n]"; null)[]
    | gsub("^[\\s\"'"'"'`\\[\\]{}]+|[\\s\"'"'"'`\\[\\]{}]+$"; "")
    | select(length > 0)];
  def number($key; $value): if $value == "" then {} else {($key): ($value | tonumber)} end;
  {dryRun: (($dry | ascii_downcase | gsub("\\s"; "")) != "false"),
   protectedRooms: ($rooms | list),
   protectedUserIds: ($users | list)}
  + number("maxRoomsToDelete"; $maxRooms)
  + number("maxBlobsToDelete"; $maxBlobs)
  + number("maxBlobsPercent"; $maxPercent)
  + number("blobGraceHours"; $grace)')"

dry_run="$(jq -r '.dryRun' <<<"$body")"
echo "Starting a room retention run (dry-run=${dry_run}, protected rooms=$(jq '.protectedRooms | length' <<<"$body"), protected user ids=$(jq '.protectedUserIds | length' <<<"$body"))"

status="$(request POST "$url" "$body")" || { echo "::error::could not reach the backend"; exit 1; }

case "$status" in
  202) ;;
  401) echo "::error::the backend rejected the retention token (401)"; exit 1 ;;
  404) echo "::error::the retention endpoint is not available (404): is RETENTION_TRIGGER_TOKEN set on the backend?"; exit 1 ;;
  409) echo "::error::a retention run is already in progress on the backend (409)"; exit 1 ;;
  400) echo "::error::the backend rejected the configuration (400): $(jq -c '.errors // .message' "$work_dir/body")"; exit 1 ;;
  *) echo "::error::unexpected answer starting the run (HTTP $status)"; exit 1 ;;
esac

run_id="$(jq -r '.runId' "$work_dir/body")"
echo "Run ${run_id} started, waiting for it to finish"

summary() {
  jq -r '
    .run as $r |
    "state: \($r.state), failed: \($r.failed), dry-run: \($r.dryRun)",
    (if $r.error then "error: \($r.error)" else empty end),
    (if $r.rooms then
      "rooms: total=\($r.rooms.totalRooms) older and unprotected=\($r.rooms.candidateRooms) protected by room=\($r.rooms.protectedByRoom) protected by owner=\($r.rooms.protectedByOwner) to delete=\($r.rooms.roomsToDelete | length) deleted=\($r.rooms.rooms.deleted | length) failed=\($r.rooms.rooms.failed | length)",
      "protected user ids=\($r.rooms.owners.protectedUserIds) without a user=\($r.rooms.owners.protectedUserIdsWithoutUser)",
      ($r.rooms.roomsToDelete[:50] | map("  room \(.)") | .[]),
      (if ($r.rooms.roomsToDelete | length) > 50 then "  ... and \(($r.rooms.roomsToDelete | length) - 50) more" else empty end),
      ($r.rooms.rooms.failed[:20] | map("  failed room \(.roomId): \(.message)") | .[])
    else empty end),
    (if $r.blobs then
      "blobs: total=\($r.blobs.total) orphans=\($r.blobs.orphans) deleted=\($r.blobs.deleted) failed=\($r.blobs.failedCount)",
      ($r.blobs.perContainer | to_entries | map(. as $e | "  \($e.key): total=\($e.value.total) orphans=\($e.value.orphans)" + ((($r.blobs.samples // {})[$e.key] // []) | map("\n      e.g. \(.)") | join(""))) | .[]),
      (if ($r.blobs.missingContainers | length) > 0 then "containers not found: \($r.blobs.missingContainers | join(", "))" else empty end),
      ($r.blobs.failedSample | map("  failed blob \(.container)/\(.name): \(.message)") | .[])
    else empty end)
  ' "$work_dir/body"
}

deadline=$(( $(date +%s) + timeout_minutes * 60 ))
errors_in_a_row=0

while :; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "::error::the run did not finish within ${timeout_minutes} minutes"
    exit 1
  fi

  sleep "$interval"

  if ! status="$(request GET "${url}/${run_id}")"; then
    errors_in_a_row=$((errors_in_a_row + 1))
    echo "could not read the run (attempt ${errors_in_a_row})"
    if [ "$errors_in_a_row" -ge 10 ]; then
      echo "::error::the backend could not be reached while waiting for the run"
      exit 1
    fi
    continue
  fi

  case "$status" in
    200) errors_in_a_row=0 ;;
    404)
      echo "::error::the run was lost (404), the backend probably restarted while it was running"
      exit 1
      ;;
    5*)
      errors_in_a_row=$((errors_in_a_row + 1))
      echo "the backend answered HTTP ${status} (attempt ${errors_in_a_row})"
      if [ "$errors_in_a_row" -ge 10 ]; then
        echo "::error::the backend kept failing while waiting for the run"
        exit 1
      fi
      continue
      ;;
    *) echo "::error::unexpected answer reading the run (HTTP $status)"; exit 1 ;;
  esac

  state="$(jq -r '.run.state' "$work_dir/body")"
  echo "state: ${state}"

  case "$state" in
    completed | failed)
      echo
      summary
      if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
        {
          echo "### Room retention"
          echo
          echo '```'
          summary
          echo '```'
        } >>"$GITHUB_STEP_SUMMARY"
      fi
      if [ "$(jq -r '.run.failed' "$work_dir/body")" = "true" ]; then
        echo "::error::the retention run reported failures"
        exit 1
      fi
      echo "Retention run finished"
      exit 0
      ;;
  esac
done
