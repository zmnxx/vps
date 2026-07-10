// ==SubStore==
// name=sing-box 节点注入 (SFA 1.14 / 策略组)
// description=将订阅节点注入 sing-box 策略组：Proxy / 自动选择 / 国内服务 / 谷歌服务 / 微软服务 / 兜底策略，支持 Clash API
// ==/SubStore==

const { type, name } = $arguments;

const compatibleOutbound = { tag: "COMPATIBLE", type: "direct" };
let compatible = false;
let config = JSON.parse($files[0]);

// 1. 拉取当前订阅/集合内的 sing-box 节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 2. 过滤杂七杂八节点（广告、官网、流量提示、过期/套餐信息等非可用节点）
const JUNK_REGEX =
  /(?:官网|剩余|流量|套餐|订阅|重置|到期|过期|活动|客服|个人订阅|自定义|节点列表|频道|群组|公告|更新|请关注|导入|自助|后台|充值|活动)/i;
proxies = proxies.filter((p) => !JUNK_REGEX.test(p.tag || ""));

// 3. 清理 tag：去 [xx]/【xx】 前缀、去 emoji 旗帜前缀、去多余空格
function cleanTag(tag) {
  return tag
    .replace(/^[\[【][^\]】]*[\]】]\s*/g, "")
    .replace(/^(🇺🇸|🇨🇳|🇭🇰|🇯🇵|🇰🇷|🇹🇼|🇸🇬|🇲🇴|🇬🇧|🇩🇪|🇫🇷|🇷🇺|🇦🇺|🇨🇦|🇮🇳|🇧🇷)\s*/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
proxies.forEach((p) => {
  if (p.tag) p.tag = cleanTag(p.tag);
});
// 去重（清理后可能重名）
const seen = new Set();
proxies = proxies.filter((p) => {
  if (!p.tag || seen.has(p.tag)) return false;
  seen.add(p.tag);
  return true;
});

// 4. 注入节点
config.outbounds.push(...proxies);
const proxyTags = proxies.map((p) => p.tag);

// 5. 重建策略组
config.outbounds.forEach((outbound) => {
  if (outbound.tag === "Proxy") {
    outbound.outbounds = [...proxyTags, "自动选择"];
    outbound.default = "自动选择";
  }
  if (outbound.tag === "自动选择") {
    outbound.outbounds = [...proxyTags];
  }
});

// 6. 空策略组兜底 COMPATIBLE direct
config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatibleOutbound);
      compatible = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
  }
});

$content = JSON.stringify(config, null, 2);
