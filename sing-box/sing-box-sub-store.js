/**
 * Sub-Store 节点注入脚本 — sing-box v1.14.0-alpha.41 专用
 *
 * 功能：
 * 1. 从机场订阅提取所有节点
 * 2. 关键字过滤：排除包含"网站/网址/获取/订阅/流量/到期/余量/续费/过期/重置"等无效节点
 * 3. 清理节点 tag 中的杂七杂八信息（emoji 重复前缀、多余空格、广告信息等）
 * 4. 将所有节点注入到「Proxy」和「自动选择」策略组
 *
 * 使用方式：
 * 在 Sub-Store 中创建 sing-box 类型模板，将此脚本作为"脚本"操作，
 * 然后配置一个订阅集合（collection）或单个订阅（subscription）。
 */

const { type, name } = $arguments;

// 兜底出站：当某策略组为空时填充
const compatibleOutbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible = false;
let config = JSON.parse($files[0]);

// 获取订阅节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// ── 关键字过滤：去除机场订阅中的杂七杂八信息 ──
const FILTER_REGEX =
  /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|剩余|套餐|官网|购买|注册|免费|测试|test|traffic|expire|expiry|buy|shop|store|剩余流量|使用量)).*/i;

proxies = proxies.filter((p) => FILTER_REGEX.test(p.tag));

// ── 清理节点 tag：去重前缀、清理信息 ──
function cleanTag(tag) {
  let cleaned = tag
    // 去掉常见机场前缀（如 [xxx], 【xxx】）
    .replace(/^[\[【]\s*[^\]】]+[\】\]]\s*/g, "")
    // 去掉重复的 emoji 国家前缀（如 🇭🇰🇭🇰 → 🇭🇰）
    .replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*\1+/u, "$1")
    // 去掉多余空格
    .replace(/\s{2,}/g, " ")
    // 去掉首尾空格
    .trim();

  // 如果清理后为空，保留原始 tag
  return cleaned || tag;
}

proxies.forEach((p) => {
  p.tag = cleanTag(p.tag);
});

// ── 注入到配置文件 ──
config.outbounds.push(...proxies);

// 收集所有节点 tag
const proxyTags = proxies.map((p) => p.tag);

// ── 填充策略组：清空后全部用节点重建，注入后兜底节点不再需要 ──
config.outbounds.forEach((outbound) => {
  if (outbound.tag === "Proxy" && Array.isArray(outbound.outbounds)) {
    // 清空兜底节点，填入所有真实节点 + 自动选择
    outbound.outbounds = [...proxyTags, "自动选择"];
    outbound.default = "自动选择";
  }
  if (outbound.tag === "自动选择" && Array.isArray(outbound.outbounds)) {
    // 清空兜底节点，填入所有真实节点
    outbound.outbounds = [...proxyTags];
  }
});

// ── 为空的策略组填充兜底出站 ──
config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatibleOutbound);
      compatible = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
  }
});

// ── 输出最终配置 ──
$content = JSON.stringify(config, null, 2);
