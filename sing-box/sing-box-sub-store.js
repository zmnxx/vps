const { type, name } = $arguments;

const 排除节点关键词 = /网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|官网|客户|客服|套餐|剩余|失效|回国|校园|游戏|直连|公益|测试|test|traffic|expire|official|renew/i;
const 兼容出站 = {
  tag: "COMPATIBLE",
  type: "direct",
};

let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

proxies = proxies.filter((proxy) => proxy && proxy.tag && !排除节点关键词.test(proxy.tag));

const proxyTags = proxies.map((proxy) => proxy.tag);

for (const outbound of config.outbounds) {
  if (outbound.tag === "Proxy") {
    outbound.outbounds = ["自动选择", ...proxyTags, "直连"];
    outbound.default = "自动选择";
  }
  if (outbound.tag === "自动选择") {
    outbound.outbounds = proxyTags.length ? proxyTags : [兼容出站.tag];
  }
}

if (!proxyTags.length && !config.outbounds.some((outbound) => outbound.tag === 兼容出站.tag)) {
  config.outbounds.push(兼容出站);
}

config.outbounds.push(...proxies);

$content = JSON.stringify(config, null, 2);
