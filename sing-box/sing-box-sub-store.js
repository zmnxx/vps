const { type = "subscription", name } = $arguments;

const 兼容出站 = {
  tag: "兼容",
  type: "direct",
};

let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

config.outbounds.push(...proxies);
const proxyTags = proxies.map((p) => p.tag);

for (const outbound of config.outbounds) {
  if (outbound.tag === "Proxy" && Array.isArray(outbound.outbounds)) {
    outbound.outbounds.push(...proxyTags);
  }
  if (outbound.tag === "自动选择" && Array.isArray(outbound.outbounds)) {
    outbound.outbounds.push(...proxyTags);
  }
}

for (const outbound of config.outbounds) {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!config.outbounds.some((o) => o.tag === 兼容出站.tag)) {
      config.outbounds.push(兼容出站);
    }
    outbound.outbounds.push(兼容出站.tag);
  }
}

$content = JSON.stringify(config, null, 2);
