const { type, name } = $arguments;

const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible;
let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

config.outbounds.push(...proxies);

config.outbounds.map((i) => {
  // Proxy 和 自动选择: 所有节点
  if (["Proxy", "自动选择"].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }
});

// 对空的 outbound 自动创建 COMPATIBLE(direct) 防止报错
config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 清理 default 字段中引用了已不存在的 outbound 的残留
const allTags = new Set(config.outbounds.map((o) => o.tag));
config.outbounds.forEach((outbound) => {
  if (outbound.default && !allTags.has(outbound.default)) {
    delete outbound.default;
  }
});

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag,
  );
}