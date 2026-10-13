#!/usr/bin/env bash
# Test a Google Apps Script registration endpoint without touching .env.
#   ./check-endpoint.sh 'https://script.google.com/macros/s/XXXX/exec'
# No argument: tests whatever is currently in .env
URL="${1:-$(grep -h PUBLIC_REG_ENDPOINT .env 2>/dev/null | cut -d= -f2-)}"
[ -z "$URL" ] && { echo "usage: ./check-endpoint.sh '<exec-url>'"; exit 1; }

echo "testing ...${URL: -26}"
BODY=$(mktemp)
CODE=$(curl -s -L -m 25 -o "$BODY" -w '%{http_code}' -X POST \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"name":"Endpoint Check","email":"endpoint-check@example.com","phone":"","discipline":"Design","page":"/check"}' \
  "$URL")

if grep -q '"ok":true' "$BODY"; then
  echo "PASS  http=$CODE  the script answered. A row should now be in the sheet."
elif [ "$CODE" = "403" ]; then
  echo "FAIL  http=403  Google refused before reaching your script."
  echo "      'Who has access' is not Anyone on THIS deployment, or this URL"
  echo "      belongs to an older deployment than the one you just changed."
elif [ "$CODE" = "401" ]; then
  echo "FAIL  http=401  the deployment wants a signed-in Google user."
else
  echo "FAIL  http=$CODE"
  echo "      first bytes: $(head -c 120 "$BODY")"
fi
rm -f "$BODY"
