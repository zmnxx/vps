const allowTypes = new Set([
  "ss",
  "ssr",
  "vmess",
  "vless",
  "trojan",
  "hysteria2",
  "tuic",
  "wireguard",
  "anytls"
]);

const badNamePattern = /Traffic|Expire|官网|流量|到期|订阅|剩余|重置|套餐|直连|Direct|国内|CN/i;

const seen = new Set();

const nodes = proxies.filter((proxy) => {
  if (!proxy || !proxy.type || !proxy.name) return false;
  if (!allowTypes.has(proxy.type)) return false;
  if (badNamePattern.test(proxy.name)) return false;
  if (seen.has(proxy.name)) return false;
  seen.add(proxy.name);
  return true;
});

const nodeTags = nodes.map((node) => node.name);

function replaceAllProxyNodes(config) {
  for (const outbound of config.outbounds) {
    if (outbound.tag === "代理总出口") {
      outbound.outbounds = outbound.outbounds.flatMap((tag) => {
        return tag === "<all_proxy_nodes>" ? nodeTags : [tag];
      });
    }

    if (outbound.tag === "自动选择") {
      outbound.outbounds = nodeTags;
    }
  }

  config.outbounds.push(...nodes);
  return config;
}