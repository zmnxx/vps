/**
 * Sub-Store sing-box 模板脚本 (v1.14.0-alpha.41)
 *
 * 优化自: https://cdn.jsdelivr.net/gh/Sheldontao/Scripts@refs/heads/main/sub-store-template/1.12or13/sing-box.js
 *
 * 主要改进:
 * 1. 不分组, 全部节点注入到 Proxy(selector) 和 自动选择(urltest)
 * 2. 关键字过滤: 剔除机场订阅中的信息节点
 * 3. 空策略组兜底: 自动填充 COMPATIBLE 直连出站
 * 4. 兼容 sing-box 1.14.0-alpha.41 配置规范
 *
 * Sub-Store 用法:
 *   - 订阅类型: sing-box
 *   - 模板文件: 上传 sing-box-template.json
 *   - 节点注入脚本: 本文件
 *   - arguments: name=你的订阅名&type=sing-box
 */

const { type, name } = $arguments;

const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

var compatible;
var config = JSON.parse($files[0]);

var nodes = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// ============================================================
// 节点过滤: 剔除信息节点, 只保留真实代理节点
// ============================================================
nodes = nodes.filter(function (p) {
  var tag = p.tag || "";
  if (!tag.trim()) return false;
  if (/^(?:流量|剩余|到期|余量|续费|过期|重置|官网|网址|官址|获取|订阅|说明|套餐|会员|购买|机场|群|域名|解锁|检测|测试|实验|已用|时间|通知|公告|提醒|更新|频道|教程|博客|expire|expir|traffic|remain|reset|account|plan|balance|bandwidth|subscription|notify)/i.test(tag)) return false;
  if (/\d{4}[-]\d{1,2}[-]\d{1,2}/.test(tag)) return false;
  if (/\d+\s*(?:GB|TB|MB|KB|gb|tb|mb|kb)/.test(tag)) return false;
  if (/^\d+$/.test(tag.trim())) return false;
  return true;
});

// ============================================================
// 节点注入: 全部注入到 Proxy(selector) 和 自动选择(urltest)
// ============================================================
var proxyTags = nodes.map(function (p) {
  return p.tag;
});

config.outbounds.push.apply(config.outbounds, nodes);

config.outbounds.map(function (i) {
  if (i.tag === "Proxy") {
    i.outbounds = ["自动选择"].concat(proxyTags).concat(["直连"]);
  }
  if (i.tag === "自动选择") {
    i.outbounds.push.apply(i.outbounds, proxyTags);
  }
});

// ============================================================
// 空策略组兜底
// ============================================================
config.outbounds.forEach(function (outbound) {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// ============================================================
// Proxy selector 默认指向 自动选择
// ============================================================
config.outbounds.forEach(function (outbound) {
  if (outbound.tag === "Proxy" && outbound.outbounds && outbound.outbounds.indexOf("自动选择") !== -1) {
    outbound.default = "自动选择";
  }
});

$content = JSON.stringify(config, null, 2);
