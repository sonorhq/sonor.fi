#!/bin/sh
# Prints the release check counts from the sonor_release_checks Analytics Engine dataset.
# Needs CLOUDFLARE_ACCOUNT_ID and a CLOUDFLARE_API_TOKEN with Account Analytics: Read.
set -eu

DATASET=sonor_release_checks
json=0
dry_run=0
command=""
arg=""

usage() {
  cat >&2 <<'EOF'
usage: stats.sh [--json] [--dry-run] <command> [argument]

  daily [days]        checks per day
  os [days]           checks and unique users per operating system
  versions [days]     checks and unique users per version
  platforms [days]    checks and unique users per platform
  users [YYYY-MM]     unique users and checks in one month (UTC, default: this month)

days defaults to 30. --json prints the raw API response, --dry-run prints the SQL and makes no call.
EOF
  exit 2
}

die() {
  echo "stats.sh: $1" >&2
  exit 1
}

for a in "$@"; do
  case "$a" in
    --json) json=1 ;;
    --dry-run) dry_run=1 ;;
    -h | --help | -*) usage ;;
    *)
      if [ -z "$command" ]; then
        command=$a
      elif [ -z "$arg" ]; then
        arg=$a
      else
        usage
      fi
      ;;
  esac
done
[ -n "$command" ] || usage

# Analytics Engine stamps each point with its write time, so the window is on `timestamp`.
window_days() {
  days=${arg:-30}
  case "$days" in
    '' | *[!0-9]*) die "days must be a whole number" ;;
  esac
  [ "$days" -gt 0 ] || die "days must be at least 1"
  window="timestamp > NOW() - INTERVAL '$days' DAY"
}

# Salted hashes change every UTC month, so a user is only countable inside one month.
month_window() {
  month=${arg:-$(date -u +%Y-%m)}
  case "$month" in
    2[0-9][0-9][0-9]-0[1-9] | 2[0-9][0-9][0-9]-1[0-2]) ;;
    *) die "month must look like YYYY-MM" ;;
  esac
  year=${month%-*}
  mon=${month#*-}
  mon=${mon#0}
  if [ "$mon" -eq 12 ]; then
    next_year=$((year + 1))
    next_mon=1
  else
    next_year=$year
    next_mon=$((mon + 1))
  fi
  start=$(printf '%s-%02d-01 00:00:00' "$year" "$mon")
  end=$(printf '%s-%02d-01 00:00:00' "$next_year" "$next_mon")
  window="timestamp >= toDateTime('$start') AND timestamp < toDateTime('$end')"
}

# Checks are summed with _sample_interval so sampled points still count correctly.
grouped() {
  printf 'SELECT %s AS %s, sum(_sample_interval) AS checks, count(DISTINCT index1) AS users FROM %s WHERE %s GROUP BY %s ORDER BY checks DESC LIMIT 100' \
    "$1" "$2" "$DATASET" "$window" "$2"
}

case "$command" in
  daily)
    window_days
    sql="SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, sum(_sample_interval) AS checks FROM $DATASET WHERE $window GROUP BY day ORDER BY day DESC"
    ;;
  os)
    window_days
    sql=$(grouped blob3 os)
    ;;
  versions)
    window_days
    sql=$(grouped blob1 version)
    ;;
  platforms)
    window_days
    sql=$(grouped blob5 platform)
    ;;
  users)
    month_window
    sql="SELECT count(DISTINCT index1) AS users, sum(_sample_interval) AS checks FROM $DATASET WHERE $window"
    ;;
  *) usage ;;
esac

if [ "$dry_run" -eq 1 ]; then
  printf '%s\n' "$sql"
  exit 0
fi

[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || die "CLOUDFLARE_ACCOUNT_ID is not set"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "CLOUDFLARE_API_TOKEN is not set"
command -v curl >/dev/null 2>&1 || die "curl is needed"
if [ "$json" -eq 0 ]; then
  command -v jq >/dev/null 2>&1 || die "jq is needed for the table (or use --json)"
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

# The token goes to curl through a config read from stdin, so it never appears in the process list or the output.
status=$(printf 'header = "Authorization: Bearer %s"\n' "$CLOUDFLARE_API_TOKEN" |
  curl -sS -K - -o "$tmp" -w '%{http_code}' --data "$sql" \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql") ||
  die "the request failed"

case "$status" in
  2??) ;;
  *)
    echo "stats.sh: the API answered HTTP $status" >&2
    if command -v jq >/dev/null 2>&1; then
      jq -r '.errors[]?.message // empty' "$tmp" >&2 2>/dev/null || true
    fi
    exit 1
    ;;
esac

if [ "$json" -eq 1 ]; then
  cat "$tmp"
  exit 0
fi

tab=$(printf '\t')
table=$(jq -r '([.meta[].name] | @tsv), (.data[] as $r | [.meta[].name | $r[.]] | @tsv)' "$tmp")
if command -v column >/dev/null 2>&1; then
  printf '%s\n' "$table" | column -t -s "$tab"
else
  printf '%s\n' "$table"
fi
