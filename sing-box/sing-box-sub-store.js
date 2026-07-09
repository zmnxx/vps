/**
 * Sub-Store sing-box 模板脚本 (v1.14.0-alpha.41)
 *
 * 优化自: https://cdn.jsdelivr.net/gh/Sheldontao/Scripts@refs/heads/main/sub-store-template/1.12or13/sing-box.js
 *
 * 主要改进:
 * 1. 不分组, 全部节点注入到 "Proxy" (selector) 和 "自动选择" (urltest)
 * 2. 关键字过滤: 剔除机场订阅中的信息节点(剩余流量/套餐到期/官网地址等)
 * 3. 空策略组兜底: 自动填充 COMPATIBLE 直连出站, 避免 selector/urltest 无节点导致启动失败
 * 4. 兼容 sing-box 1.14.0-alpha.41 配置规范
 *
 * Sub-Store 用法:
 *   - 订阅类型: sing-box
 *   - 模板文件: 上传 sing-box-template.json 作为 $files[0]
 *   - 节点注入脚本: 本文件
 *   - arguments: name=你的订阅名&type=sing-box
 */

const { type, name } = $arguments;

// 兜底直连出站: 当策略组为空时自动填充, 防止启动报错
const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

// ============================================================
// 关键字过滤: 匹配以下关键词的节点将被剔除
// 覆盖范围:
//   - 流量信息: 流量/剩余/已用/余量/GB/TB/MB/KB
//   - 到期提醒: 到期/过期/续费/重置/expire/expir
//   - 官网信息: 官网/网址/官址/域名/网址/获取/订阅/说明/群
//   - 套餐信息: 套餐/会员/购买/机场/plan/account/subscription
//   - 日期格式: 2024-01-01 等纯日期节点
//   - 其他杂项: 检测/测试/实验/解锁/remain/reset/traffic
// ============================================================
const FILTER_REGEX = /(?:流量|剩余|到期|余量|续费|过期|重置|官网|网址|官址|获取|订阅|说明|套餐|会员|购买|机场|群|域名|解锁|检测|测试|实验|已用|时间|通知|公告|提醒|更新|频道|教程|博客|expire|expir|traffic|remain|reset|account|plan|balance|bandwidth|subscription|notify|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d+\s*(?:GB|TB|MB|KB|gb|tb|mb|kb))/i;

// 备用精确过滤名单: 节点名完全匹配以下字符串的将被剔除
const EXACT_BLOCKLIST = [
  "网址",
  "官网",
  "流量",
  "到期",
  "续费",
  "套餐",
  "订阅",
  "说明",
];

let compatible;
let config = JSON.parse($files[0]);

// 通过 Sub-Store API 获取节点列表
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// ============================================================
// 节点过滤: 剔除信息节点, 只保留真实代理节点
// ============================================================
proxies = proxies.filter((p) => {
  const tag = p.tag || "";
  // 排除空标签节点
  if (!tag.trim()) return false;
  // 排除包含信息关键词的节点
  if (FILTER_REGEX.test(tag)) return false;
  // 排除精确匹配黑名单的节点
  if (EXACT_BLOCKLIST.some((kw) => tag === kw)) return false;
  // 排除纯数字节点名(一些机场用纯数字做信息节点)
  if (/^\d+$/.test(tag.trim())) return false;
  return true;
});

// ============================================================
// 节点注入: 全部注入到 Proxy(selector) 和 自动选择(urltest)
// ============================================================
const proxyTags = proxies.map((p) => p.tag);

config.outbounds.push(...proxies);

config.outbounds.map((i) => {
  if (["Proxy"].includes(i.tag)) {
    // Proxy selector: "自动选择" 放在最前面, 然后是所有真实节点 + 直连
    i.outbounds = ["自动选择", ...proxyTags, "直连"];
  }
  if (["自动选择"].includes(i.tag)) {
    // urltest: 注入所有真实节点进行延迟测试
    i.outbounds.push(...proxyTags);
  }
});

// ============================================================
// 空策略组兜底: 检测所有 selector/urltest, 若 outbounds 为空则填充 COMPATIBLE
// ============================================================
config.outbounds.forEach((outbound) => {
  if (
    (outbound.type === "selector" || outbound.type === "urltest") &&
    Array.isArray(outbound.outbounds) &&
    outbound.outbounds.length === 0
  ) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// ============================================================
// Proxy selector 默认指向 "自动选择"
// 自动选择 urltest 会自动测速选择最优节点
// ============================================================
config.outbounds.forEach((outbound) => {
  if (
    outbound.tag === "Proxy" &&
    outbound.outbounds &&
    outbound.outbounds.includes("自动选择")
  ) {
    outbound.default = "自动选择";
  }
});

$content = JSON.stringify(config, null, 2);
