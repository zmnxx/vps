const { type, name } = $arguments;

const compatible_outbound = {
  tag: "兼容兜底",
  type: "direct",
};

let compatible = false;
let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 把订阅节点写入 sing-box 出站列表
config.outbounds.push(...proxies);

const proxyTags = getTags(proxies);

// 简约分组：手动选择 = 自动选择 + 全部节点；自动选择 = 全部节点测速
for (const outbound of config.outbounds) {
  if (outbound.tag === "手动选择") {
    outbound.outbounds.push(...proxyTags);
  }
  if (outbound.tag === "自动选择") {
    outbound.outbounds.push(...proxyTags);
  }
}

// 防止订阅为空或规则筛选为空导致配置不可用
for (const outbound of config.outbounds) {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
}

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map((p) => p.tag);
}
