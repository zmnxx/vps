const { type, name } = $arguments;

// 检查入参。如果是 "1" 或 "col"，表示来自 collection，否则视为 subscription
const isCollection = /^1$|col/i.test(type);

// 产生节点列表，Sub-Store 内置函数 produceArtifact，目标平台为 sing-box，返回对象数组
let proxies = await produceArtifact({
  name,
  type: isCollection ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 读取首位文件作为模板配置，转换为 JS 对象
let config = JSON.parse($files[0]);

// sing-box 1.14+ 分离了 outbounds 和 endpoints。
// 我们在此处做分类处理：
// 如果节点类型是 "wireguard" 或 "tailscale"，它们在 sing-box 1.14+ 属于 "endpoints"；
// 其他普通的节点（如 ss, vmess, vless, trojan, hysteria2 等）作为 "outbounds"。
let nodeOutbounds = [];
let nodeEndpoints = [];

proxies.forEach(p => {
  if (p.type === "wireguard" || p.type === "tailscale") {
    nodeEndpoints.push(p);
  } else {
    nodeOutbounds.push(p);
  }
});

// 1. 将常规节点追加到 outbounds 中
if (!config.outbounds) {
  config.outbounds = [];
}
config.outbounds.push(...nodeOutbounds);

// 2. 将 WireGuard/Tailscale 节点追加到 endpoints 中
if (nodeEndpoints.length > 0) {
  if (!config.endpoints) {
    config.endpoints = [];
  }
  config.endpoints.push(...nodeEndpoints);
}

// 辅助函数：根据正则匹配节点 tag
function getTags(proxiesList, regex) {
  return (regex ? proxiesList.filter(p => regex.test(p.tag)) : proxiesList).map(p => p.tag);
}

// 定义过滤排除的关键字正则
const excludeReg = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*/i;

// 动态填充策略组中的节点 tag
config.outbounds.forEach(outbound => {
  if (outbound.tag === "Proxy") {
    // Proxy 策略组：填充所有常规节点标签
    outbound.outbounds.push(...getTags(nodeOutbounds));
  } else if (outbound.tag === "自动选择") {
    // 自动选择 urltest：填充所有常规节点标签
    outbound.outbounds.push(...getTags(nodeOutbounds));
  } else if (outbound.tag === "香港 urltest") {
    outbound.outbounds.push(
      ...getTags(
        nodeOutbounds,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(hk|hong.*kong)\b|港|香港|🇭🇰)/i
      )
    );
  } else if (outbound.tag === "台湾 urltest") {
    outbound.outbounds.push(
      ...getTags(
        nodeOutbounds,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(tw|taiwan)\b|🇹🇼|台|台湾)/i
      )
    );
  } else if (outbound.tag === "日本 urltest") {
    outbound.outbounds.push(
      ...getTags(
        nodeOutbounds,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(jp|japan)\b|日本|日|🇯🇵)/i
      )
    );
  } else if (outbound.tag === "新加坡 urltest") {
    outbound.outbounds.push(
      ...getTags(
        nodeOutbounds,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(sg|singapore)\b|🇸🇬|新加坡|新)/i
      )
    );
  } else if (outbound.tag === "美国 urltest") {
    outbound.outbounds.push(
      ...getTags(
        nodeOutbounds,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(us|united.*states)\b|美|美国|🇺🇸)/i
      )
    );
  }
});

// 如果某个 urltest 或 selector 中没有任何节点，塞入一个 COMPATIBLE 节点，防止报错
const compatibleOutbound = {
  tag: "COMPATIBLE",
  type: "direct"
};
let hasCompatible = false;

config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!hasCompatible) {
      config.outbounds.push(compatibleOutbound);
      hasCompatible = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
  }
});

// 最终输出转换后的 JSON 配置
$content = JSON.stringify(config, null, 2);
