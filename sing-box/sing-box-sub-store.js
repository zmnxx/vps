const { type, name } = $arguments;
let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

const validTypes = new Set([
  "ss",
  "shadowsocks",
  "ssr",
  "vmess",
  "vless",
  "trojan",
  "hysteria",
  "hysteria2",
  "tuic",
  "wireguard",
  "anytls",
  "http",
  "socks",
  "socks5"
]);
const infoPattern = /网站|网址|官网|获取|订阅|流量|到期|余量|续费|过期|重置|剩余|套餐|Expire|Traffic|Used|Total|Reset|客服|群组|频道|公告|提示|更新|客户端/i;

function getTag(outbound) {
  return outbound && typeof outbound.tag === "string" ? outbound.tag.trim() : "";
}

function getTags(list, regex) {
  return list
    .map(getTag)
    .filter(Boolean)
    .filter((tag) => !regex || regex.test(tag));
}

function uniqueStrings(list) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    if (typeof item !== "string" || !item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function normalizeType(t) {
  return String(t || "").toLowerCase();
}

function isValidProxy(outbound) {
  const tag = getTag(outbound);
  const outboundType = normalizeType(outbound && outbound.type);
  if (!tag || infoPattern.test(tag)) return false;
  if (!validTypes.has(outboundType)) return false;
  return true;
}

const dedup = new Set();
const cleanedProxies = [];
for (const proxy of Array.isArray(proxies) ? proxies : []) {
  const tag = getTag(proxy);
  if (!isValidProxy(proxy) || dedup.has(tag)) continue;
  dedup.add(tag);
  cleanedProxies.push(proxy);
}

let proxyTags = getTags(cleanedProxies);

if (proxyTags.length === 0) {
  const compatible = { type: "direct", tag: "COMPATIBLE" };
  cleanedProxies.push(compatible);
  proxyTags = ["COMPATIBLE"];
}

function replacePlaceholder(outbound) {
  if (!outbound || !Array.isArray(outbound.outbounds)) return;
  const next = [];
  for (const item of outbound.outbounds) {
    if (item === "<all_proxy_nodes>") {
      next.push(...proxyTags);
    } else {
      next.push(item);
    }
  }
  outbound.outbounds = uniqueStrings(next);
}

function normalizeOutbounds(outbounds, fixedHead, fixedTail) {
  const result = [];
  const seen = new Set();
  const items = [...(fixedHead || []), ...(Array.isArray(outbounds) ? outbounds : []), ...(fixedTail || [])];
  for (const item of items) {
    if (typeof item !== "string" || !item || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function findOutbound(tag) {
  return config.outbounds.find((outbound) => outbound && outbound.tag === tag);
}

if (!Array.isArray(config.outbounds)) config.outbounds = [];

for (const outbound of config.outbounds) {
  replacePlaceholder(outbound);
}

const total = findOutbound("代理总出口");
if (total) {
  total.outbounds = normalizeOutbounds(total.outbounds, ["自动选择"], ["直连"]);
  proxyTags.forEach((tag) => {
    if (!total.outbounds.includes(tag)) {
      total.outbounds.push(tag);
    }
  });
  if (!total.default) total.default = "自动选择";
}

const auto = findOutbound("自动选择");
if (auto) {
  auto.outbounds = normalizeOutbounds(auto.outbounds, [], []);
  proxyTags.forEach((tag) => {
    if (!auto.outbounds.includes(tag)) {
      auto.outbounds.push(tag);
    }
  });
}

if (proxyTags.length === 1 && proxyTags[0] === "COMPATIBLE") {
  for (const tag of ["自动选择", "代理总出口"]) {
    const outbound = findOutbound(tag);
    if (outbound && Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
      outbound.outbounds = ["COMPATIBLE"];
    }
  }
}

const existingTags = new Set(config.outbounds.map(getTag).filter(Boolean));
const appendProxies = cleanedProxies.filter((proxy) => !existingTags.has(getTag(proxy)));
config.outbounds.push(...appendProxies);

$content = JSON.stringify(config, null, 2);
