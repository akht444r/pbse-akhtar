#!/usr/bin/env bash
# Step 9 of the lab. Run this in a SECOND terminal, while `npm run mock` is
# running in the first one. It saves its replies into ./evidence/.

# ====================================================================
#  CHANGE THESE THREE LINES FOR YOUR OWN SYSTEM, then edit body.json.
#  Nothing below this block needs touching.
# ====================================================================
LIST_PATH="/things"                     # your collection GET
LIST_QUERY="status=active&limit=5"      # its filter
CREATE_PATH="/things"                   # your POST that must not happen twice
# ====================================================================

# The request body lives in body.json, not inside this script. Quoting JSON
# inside a shell command is a reliable way to lose twenty minutes, and it
# breaks differently on every shell.

set -u
BASE="${BASE:-http://127.0.0.1:4010}"
OUT="${OUT:-./evidence}"
mkdir -p "$OUT"

if ! curl -s -o /dev/null --max-time 3 "$BASE$LIST_PATH"; then
  echo "Cannot reach $BASE$LIST_PATH"
  echo "Is the mock running? In another terminal:  npm run mock"
  exit 1
fi

echo "=== 1. A list, with a filter ========================================"
curl -is --max-time 15 "$BASE$LIST_PATH?$LIST_QUERY" | tee "$OUT/1-list.txt"
echo

echo "=== 2. The dangerous operation, WITH a ticket number ================"
if command -v uuidgen > /dev/null 2>&1; then KEY=$(uuidgen); else
  KEY="0f7c1b9e-3d21-4a6f-9c05-8e2b7d41a9f0"; fi
curl -is --max-time 15 -X POST "$BASE$CREATE_PATH" \
  -H "Idempotency-Key: $KEY" \
  -H 'Content-Type: application/json' \
  -d @body.json | tee "$OUT/2-create.txt"
echo

echo "=== 3. The same request again, with the SAME ticket number =========="
echo "    Expect: 201 again, and a second thing created."
echo "    That is correct for a mock. It has no memory of ticket numbers."
echo "    The mock proves your CONTRACT, not your BEHAVIOUR. Making the"
echo "    second call replay the first is what you build in Meeting 3."
curl -is --max-time 15 -X POST "$BASE$CREATE_PATH" \
  -H "Idempotency-Key: $KEY" \
  -H 'Content-Type: application/json' \
  -d @body.json | head -1
echo

echo "=== 4. The same request with NO ticket number - the one that matters "
curl -is --max-time 15 -X POST "$BASE$CREATE_PATH" \
  -H 'Content-Type: application/json' \
  -d @body.json | tee "$OUT/3-create-no-key.txt"
echo
echo "--------------------------------------------------------------------"
echo "Call 4 should be 422, and the sl-violations header should mention"
echo "'idempotency-key'. If it does, your written interface just refused a"
echo "request that no code you have written enforces. Screenshot it."
echo "That is your evidence for L2."
