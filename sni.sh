#!/usr/bin/env bash
# Reality SNI 候选测速脚本
# 用法：在 VPS 上直接跑
#   bash sni_test.sh

set -euo pipefail

# ==================== 候选域名 ====================
# 选入标准：有资料出处 + 无 CloudFlare CDN + 非 s2n-tls + 无已知问题
DOMAINS=(
  "portal.citygrainla.com"   # 瓦工严选
  "www.yahoo.com"            # Xray 官方示例
  "news.yahoo.com"           # Xray 官方示例
  "www.bing.com"             # 社区推荐，替代 microsoft.com
  "dl.google.com"            # #6356 推荐，文档提及握手加密加分
  "www.apple.com"            # #6356/#4829 实测可用
  "itunes.apple.com"         # #4829 实测可用
  "www.samsung.com"          # #4829 实测可用
)

echo "============================================="
echo " Reality SNI 测速"
echo " 域名数: ${#DOMAINS[@]}"
echo " 测试项: TLS握手延迟 + HTTP状态码 + ALPN"
echo "============================================="
echo ""

printf "%-35s %-8s %-8s %-8s %-8s\n" "域名" "握手ms" "连接ms" "状态码" "ALPN"
printf "%-35s %-8s %-8s %-8s %-8s\n" "----------------------------------" "-------" "-------" "-------" "----"

for d in "${DOMAINS[@]}"; do
  result=$(curl -s -o /dev/null -m 6 --connect-timeout 3 --max-time 6 \
    -w "%{time_appconnect}|%{time_connect}|%{http_code}|%{ssl_verify_result}" \
    "https://$d" 2>/dev/null || echo "|||超时|")
  
  app=$(echo "$result" | cut -d'|' -f1)
  con=$(echo "$result" | cut -d'|' -f2)
  code=$(echo "$result" | cut -d'|' -f3)
  
  # 检查 ALPN（h2 是否支持）
  alpn=$(echo | openssl s_client -connect "$d:443" -servername "$d" -alpn h2 2>/dev/null | grep -i "ALPN\|alpn" | head -1)
  if echo "$alpn" | grep -qi "h2"; then
    alpn_out="h2"
  elif echo "$alpn" | grep -qi "http/1.1"; then
    alpn_out="h1"
  else
    alpn_out="?"
  fi

  if [ "$code" = "超时" ]; then
    printf "%-35s %-8s %-8s %-8s %-8s\n" "$d" "超时" "超时" "—" "—"
  else
    app_ms=$(python3 -c "print(int(float($app)*1000))" 2>/dev/null || echo "?")
    con_ms=$(python3 -c "print(int(float($con)*1000))" 2>/dev/null || echo "?")
    printf "%-35s %-8s %-8s %-8s %-8s\n" "$d" "${app_ms}ms" "${con_ms}ms" "$code" "$alpn_out"
  fi
done

echo ""
echo "============================================="
echo " 说明:"
echo " - 握手延迟(TLS): 越低越好，影响建连速度"
echo " - 连接延迟(TCP): 越低越好，CDN节点越近"
echo " - 状态码: 200最好, 301/302也可, 4xx可接受"
echo " - ALPN = h2: 支持HTTP/2，Reality需要"
echo "============================================="