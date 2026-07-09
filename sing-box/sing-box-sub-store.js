{
  "log": {
    "level": "info",
    "timestamp": true
  },
  "dns": {
    "servers": [
      {
        "type": "udp",
        "tag": "阿里DNS",
        "server": "223.5.5.5",
        "server_port": 53,
        "detour": "直连"
      },
      {
        "type": "udp",
        "tag": "腾讯DNS",
        "server": "119.29.29.29",
        "server_port": 53,
        "detour": "直连"
      },
      {
        "type": "https",
        "tag": "谷歌DNS",
        "server": "dns.google",
        "server_port": 443,
        "domain_resolver": "阿里DNS",
        "detour": "Proxy"
      },
      {
        "type": "https",
        "tag": "CloudflareDNS",
        "server": "cloudflare-dns.com",
        "server_port": 443,
        "domain_resolver": "阿里DNS",
        "detour": "Proxy"
      },
      {
        "type": "fakeip",
        "tag": "FakeIP",
        "inet4_range": "198.18.0.0/15",
        "inet6_range": "fc00::/18"
      }
    ],
    "rules": [
      {
        "clash_mode": "direct",
        "action": "route",
        "server": "阿里DNS"
      },
      {
        "clash_mode": "global",
        "action": "route",
        "server": "谷歌DNS"
      },
      {
        "rule_set": "广告拦截",
        "action": "reject",
        "method": "default"
      },
      {
        "rule_set": [
          "中国域名"
        ],
        "action": "route",
        "server": "阿里DNS"
      },
      {
        "rule_set": [
          "谷歌域名"
        ],
        "action": "route",
        "server": "谷歌DNS"
      },
      {
        "rule_set": [
          "微软域名"
        ],
        "action": "route",
        "server": "谷歌DNS"
      },
      {
        "rule_set": [
          "国外域名"
        ],
        "action": "route",
        "server": "谷歌DNS"
      },
      {
        "query_type": [
          "A",
          "AAAA"
        ],
        "action": "route",
        "server": "FakeIP"
      }
    ],
    "final": "谷歌DNS",
    "strategy": "prefer_ipv4",
    "optimistic": true,
    "timeout": "10s",
    "reverse_mapping": true
  },
  "inbounds": [
    {
      "type": "tun",
      "tag": "tun-in",
      "address": [
        "172.18.0.1/30",
        "fdfe:dcba:9876::1/126"
      ],
      "mtu": 9000,
      "dns_mode": "hijack",
      "auto_route": true,
      "strict_route": true,
      "stack": "system",
      "endpoint_independent_nat": true,
      "udp_timeout": "5m"
    },
    {
      "type": "mixed",
      "tag": "mixed-in",
      "listen": "127.0.0.1",
      "listen_port": 7890,
      "set_system_proxy": false
    }
  ],
  "outbounds": [
    {
      "type": "selector",
      "tag": "Proxy",
      "outbounds": [
        "自动选择"
      ],
      "default": "自动选择",
      "interrupt_exist_connections": true
    },
    {
      "type": "urltest",
      "tag": "自动选择",
      "outbounds": [],
      "url": "https://www.gstatic.com/generate_204",
      "interval": "3m",
      "tolerance": 50,
      "idle_timeout": "30m",
      "interrupt_exist_connections": true
    },
    {
      "type": "selector",
      "tag": "广告拦截",
      "outbounds": [
        "拒绝",
        "直连"
      ],
      "default": "拒绝",
      "interrupt_exist_connections": true
    },
    {
      "type": "selector",
      "tag": "国内直连",
      "outbounds": [
        "直连"
      ],
      "default": "直连",
      "interrupt_exist_connections": true
    },
    {
      "type": "selector",
      "tag": "微软服务",
      "outbounds": [
        "Proxy",
        "直连"
      ],
      "default": "Proxy",
      "interrupt_exist_connections": true
    },
    {
      "type": "selector",
      "tag": "谷歌服务",
      "outbounds": [
        "Proxy"
      ],
      "default": "Proxy",
      "interrupt_exist_connections": true
    },
    {
      "type": "selector",
      "tag": "兜底策略",
      "outbounds": [
        "Proxy",
        "直连"
      ],
      "default": "Proxy",
      "interrupt_exist_connections": true
    },
    {
      "type": "direct",
      "tag": "直连"
    },
    {
      "type": "block",
      "tag": "拒绝"
    }
  ],
  "route": {
    "rules": [
      {
        "action": "sniff"
      },
      {
        "protocol": "dns",
        "action": "hijack-dns"
      },
      {
        "clash_mode": "direct",
        "action": "route",
        "outbound": "直连"
      },
      {
        "clash_mode": "global",
        "action": "route",
        "outbound": "Proxy"
      },
      {
        "rule_set": "广告拦截",
        "action": "route",
        "outbound": "广告拦截"
      },
      {
        "rule_set": "私有网络",
        "action": "route",
        "outbound": "直连"
      },
      {
        "rule_set": [
          "中国IP",
          "中国域名"
        ],
        "action": "route",
        "outbound": "国内直连"
      },
      {
        "rule_set": "微软域名",
        "action": "route",
        "outbound": "微软服务"
      },
      {
        "rule_set": [
          "谷歌域名",
          "谷歌IP"
        ],
        "action": "route",
        "outbound": "谷歌服务"
      },
      {
        "rule_set": "国外域名",
        "action": "route",
        "outbound": "Proxy"
      },
      {
        "ip_is_private": true,
        "action": "route",
        "outbound": "直连"
      }
    ],
    "rule_set": [
      {
        "type": "remote",
        "tag": "中国IP",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-cn.srs",
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "中国域名",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-cn.srs",
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "谷歌域名",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-google.srs",
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "谷歌IP",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/you-oops-dev/ipranges-singbox@main/google/google.srs",
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "微软域名",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-microsoft@cn.srs",
        "update_interval": "1d"
      },
      {
        "type": "remote",
        "tag": "国外域名",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-geolocation-!cn.srs",
        "update_interval": "1d"
      },
      {
        "type": "inline",
        "tag": "私有网络",
        "rules": [
          {
            "ip_cidr": [
              "10.0.0.0/8",
              "172.16.0.0/12",
              "192.168.0.0/16",
              "100.64.0.0/10",
              "127.0.0.0/8",
              "169.254.0.0/16",
              "224.0.0.0/4",
              "fc00::/7",
              "fe80::/10",
              "::1/128"
            ]
          }
        ]
      },
      {
        "type": "remote",
        "tag": "广告拦截",
        "format": "binary",
        "url": "https://cdn.jsdelivr.net/gh/Cats-Team/AdRules@main/adrules-singbox.srs",
        "update_interval": "1d"
      }
    ],
    "final": "兜底策略",
    "auto_detect_interface": true,
    "find_process": false,
    "default_domain_resolver": "阿里DNS"
  },
  "experimental": {
    "cache_file": {
      "enabled": true,
      "path": "cache.db",
      "cache_id": "sing-box-profile",
      "store_fakeip": true,
      "store_dns": true
    },
    "clash_api": {
      "external_controller": "127.0.0.1:9090",
      "external_ui": "ui",
      "external_ui_download_url": "https://github.com/Zephyruso/zashboard/releases/latest/download/dist.zip",
      "external_ui_download_detour": "直连",
      "default_mode": "rule",
      "access_control_allow_origin": [
        "*"
      ],
      "access_control_allow_private_network": true
    }
  }
}
