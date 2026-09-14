#!/usr/bin/env bash
# Отправка дизайн-комментариев спринта 7 в issues.
# Использование: GITHUB_TOKEN=... ./post-comments.sh   (или export GITHUB_TOKEN заранее)
set -euo pipefail
cd "$(dirname "$0")"
: "${GITHUB_TOKEN:?Нужен GITHUB_TOKEN с правом repo (POST issues/comments)}"
for n in 49 50 52 51 54; do
  echo -n "issue #$n ... "
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/anton-barabanov/civ/issues/$n/comments" \
    --data-binary "@issue-$n.md")
  echo "$code"
  [ "$code" = "201" ] || { echo "ОШИБКА на #$n (ожидался 201)"; exit 1; }
done
echo "Готово: #49 → #50 → #52 → #51 → #54"
