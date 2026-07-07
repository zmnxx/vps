const { type, name } = $arguments;

const compatibleOutbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let config = JSON.parse($files[0]);
let compatibleAdded = false;

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

const proxyTags = getTags(proxies);

// 所有真实节点统一追加到 outbounds；Sub-Store 负责把订阅转换成 sing-box 出站。
config.outbounds.push(...proxies);

for (const outbound of config.outbounds) {
  if (!Array.isArray(outbound.outbounds)) continue;

  // Proxy：全部节点显示在这里，并把“自动选择”放在第一项便于手动切换。
  if (outbound.tag === "Proxy") {
    outbound.outbounds = unique(["自动选择", ...proxyTags]);
  }

  // 自动选择：只放真实节点，不嵌套选择器。
  if (outbound.tag === "自动选择") {
    outbound.outbounds = proxyTags.slice();
  }

  // 其他分组默认选择 Proxy；国内默认 direct 已在模板中设置。
  if (["谷歌", "兜底"].includes(outbound.tag)) {
    outbound.outbounds = unique(["Proxy", "自动选择", "direct", ...proxyTags]);
    outbound.default = "Proxy";
  }
}

// 若订阅为空，给 urltest/selector 填入兼容出站，避免 sing-box 因空 outbounds 报错。
for (const outbound of config.outbounds) {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatibleAdded) {
      config.outbounds.push(compatibleOutbound);
      compatibleAdded = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
  }
}

$content = JSON.stringify(config, null, 2);

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map((p) => p.tag);
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}
