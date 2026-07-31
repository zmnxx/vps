#!/usr/bin/env bash
# Reality SNI 候选测速脚本（三次取均值 + 排序输出）
# 用法：bash sni.sh

set -euo pipefail

# 检查依赖
for cmd in curl openssl python3; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ 缺少 $cmd，请先安装: apt install -y $cmd"
    exit 1
  fi
done

DOMAINS=(
  "portal.citygrainla.com"
  "www.yahoo.com"
  "news.yahoo.com"
  "www.bing.com"
  "dl.google.com"
  "www.apple.com"
  "itunes.apple.com"
  "www.samsung.com"
  "www.xilinx.com"
  "www.aws.com"
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
  printf "测试 %-30s " "$d"
  sum_app=0
  sum_con=0
  ok=0
  last_code=""
  last_alpn="h?"

  for ((i=1; i<=ROUNDS; i++)); do
    result=$(curl -s -o /dev/null -m 6 --connect-timeout 3 --max-time 6 \
      -w "%{time_appconnect}|%{time_connect}|%{http_code}" \
      "https://$d" 2>/dev/null || true)

    app=$(echo "$result" | cut -d'|' -f1)
    con=$(echo "$result" | cut -d'|' -f2)
    code=$(echo "$result" | cut -d'|' -f3)

    if [ -n "$app" ] && [ "$app" != "0" ] && [ "$app" != "0.000" ]; then
      sum_app=$(python3 -c "print($sum_app + float($app))" 2>/dev/null)
      sum_con=$(python3 -c "print($sum_con + float($con))" 2>/dev/null)
      ok=$((ok + 1))
      last_code="$code"
    fi
  done

  alpn=$(echo | openssl s_client -connect "$d:443" -servername "$d" -alpn h2 2>/dev/null || true)
  if echo "$alpn" | grep -qi "h2"; then
    last_alpn="h2"
  elif echo "$alpn" | grep -qi "http/1.1"; then
    last_alpn="h1"
  fi

  if [ "$ok" -gt 0 ]; then
    avg_app=$(python3 -c "print(int(($sum_app / $ok) * 1000))" 2>/dev/null || echo "9999")
    avg_con=$(python3 -c "print(int(($sum_con / $ok) * 1000))" 2>/dev/null || echo "9999")
    echo "$avg_app|$avg_con|$d|$last_code|$last_alpn" >> "$results_dir/scores.txt"
    echo "✅ 成功 (${ok}/${ROUNDS})"
  else
    echo "9999|9999|$d|超时|$last_alpn" >> "$results_dir/scores.txt"
    echo "❌ 超时"
  fi
done

echo ""
echo "================== 排序结果 =================="
printf "%-4s %-30s %-8s %-8s %-6s %-6s\n" "排名" "域名" "握手ms" "连接ms" "状态" "ALPN"
printf "%-4s %-30s %-8s %-8s %-6s %-6s\n" "----" "------------------------------" "-------" "-------" "-----" "-----"

sort -t'|' -n "$results_dir/scores.txt" | awk -F'|' '{
  rank++
  printf "%-4d %-30s %-8s %-8s %-6s %-6s\n", rank, $3, $1"ms", $2"ms", $4, $5
}'

echo ""
echo "=============================================="
echo " 💡 推荐取前 3 名中稳定的做 SNI"
echo "=============================================="