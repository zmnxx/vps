#!/usr/bin/env bash
# Reality SNI 候选测速脚本（三次取均值 + 排序输出）
# 用法：bash sni.sh

set -euo pipefail

DOMAINS=(
  "portal.citygrainla.com"
  "www.yahoo.com"
  "news.yahoo.com"
  "www.bing.com"
  "dl.google.com"
  "www.apple.com"
  "itunes.apple.com"
  "www.samsung.com"
)

ROUNDS=3

echo "=============================================="
echo " Reality SNI 测速（${ROUNDS}次取均值）"
echo " 域名数: ${#DOMAINS[@]}"
echo "=============================================="
echo ""

results_dir=$(mktemp -d)
trap "rm -rf $results_dir" EXIT

for d in "${DOMAINS[@]}"; do
  sum_app=0
  sum_con=0
  ok=0
  last_code=""
  last_alpn=""
  all_alpn=""

  for ((i=1; i<=ROUNDS; i++)); do
    result=$(curl -s -o /dev/null -m 6 --connect-timeout 3 --max-time 6 \
      -w "%{time_appconnect}|%{time_connect}|%{http_code}" \
      "https://$d" 2>/dev/null)

    app=$(echo "$result" | cut -d'|' -f1)
    con=$(echo "$result" | cut -d'|' -f2)
    code=$(echo "$result" | cut -d'|' -f3)

    if [ -n "$app" ] && [ "$app" != "0" ]; then
      sum_app=$(python3 -c "print($sum_app + float($app))" 2>/dev/null)
      sum_con=$(python3 -c "print($sum_con + float($con))" 2>/dev/null)
      ok=$((ok + 1))
      last_code="$code"
    fi
  done

  # ALPN 只测一次
  alpn=$(echo | openssl s_client -connect "$d:443" -servername "$d" -alpn h2 2>/dev/null | grep -i "ALPN\|alpn" | head -1)
  if echo "$alpn" | grep -qi "h2"; then
    last_alpn="h2"
  elif echo "$alpn" | grep -qi "http/1.1"; then
    last_alpn="h1"
  else
    last_alpn="?"
  fi

  if [ "$ok" -gt 0 ]; then
    avg_app=$(python3 -c "print(int(($sum_app / $ok) * 1000))" 2>/dev/null)
    avg_con=$(python3 -c "print(int(($sum_con / $ok) * 1000))" 2>/dev/null)
    echo "$avg_app|$avg_con|$d|$last_code|$last_alpn" >> "$results_dir/scores.txt"
  else
    echo "9999|9999|$d|超时|$last_alpn" >> "$results_dir/scores.txt"
  fi
done

echo "================== 排序结果 =================="
printf "%-4s %-30s %-8s %-8s %-6s %-8s\n" "排名" "域名" "握手ms" "连接ms" "状态" "ALPN"
printf "%-4s %-30s %-8s %-8s %-6s %-8s\n" "----" "------------------------------" "-------" "-------" "-----" "----"

sort -t'|' -n "$results_dir/scores.txt" | awk -F'|' '{
  rank++
  printf "%-4d %-30s %-8s %-8s %-6s %-8s\n", rank, $3, $1"ms", $2"ms", $4, $5
}'

echo ""
echo "=============================================="
echo " 推荐取排名靠前的域名做 SNI"
echo " 注意：请确认该域名在你的客户端所在地也可直连"
echo "=============================================="