/**
 * Sub-Store sing-box 注入脚本
 * 适配中文策略组：只把节点注入到「手动选择」「自动选择」
 * 过滤机场信息节点；urltest 为空时补 COMPATIBLE
 *
 * 参数：
 *   $arguments.type = subscription 或 collection
 *   $arguments.name = 订阅/集合名称
 * 文件：
 *   $files[0] = 上面的 config.json 底模
 */

const { type, name } = $arguments;

const compatibleOutbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible = false;

if (!$files || !$files[0]) {
  throw new Error("未绑定底模文件：$files[0] 为空，请在脚本操作里绑定 config.json");
}

let config;
try {
  config = JSON.parse($files[0]);
} catch (e) {
  throw new Error("底模 JSON 解析失败（请确认是纯 JSON、无注释）：" + e.message);
}

if (!Array.isArray(config.outbounds)) {
  throw new Error("底模缺少 outbounds 数组");
}

if (!name) {
  throw new Error("缺少 $arguments.name（订阅/集合名称）");
}

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

if (!Array.isArray(proxies)) {
  throw new Error("produceArtifact 未返回数组，请检查订阅是否可用");
}

// 过滤机场信息节点
const infoKeywords =
  /网址|网站|获取|订阅|流量|到期|余量|续费|过期|重置|套餐|官网|面板|剩余|更新|expire|traffic|reset|plan|manual|通知|公告|说明|教程/i;

proxies = proxies.filter((p) => p && p.tag && !infoKeywords.test(p.tag));

// 去重 tag（防止依赖冲突）
const seen = new Set();
proxies = proxies.filter((p) => {
  if (seen.has(p.tag)) return false;
  seen.add(p.tag);
  return true;
});

// 避免与策略组/内置出口重名
const reserved = new Set(
  config.outbounds.map((o) => o.tag).filter(Boolean)
);
proxies = proxies.filter((p) => !reserved.has(p.tag));

// 节点本体写入 outbounds
config.outbounds.push(...proxies);
const proxyTags = proxies.map((p) => p.tag);

// 只注入这两个组（对齐 Clash use: 订阅）
const injectSelectorTags = new Set(["手动选择"]);
const injectUrltestTags = new Set(["自动选择"]);

config.outbounds.forEach((outbound) => {
  if (!outbound || !Array.isArray(outbound.outbounds)) return;

  if (outbound.type === "selector" && injectSelectorTags.has(outbound.tag)) {
    // 保留原有「自动选择 / DIRECT」，节点追加在后面
    const exist = new Set(outbound.outbounds);
    for (const t of proxyTags) {
      if (!exist.has(t)) outbound.outbounds.push(t);
    }
  }

  if (outbound.type === "urltest" && injectUrltestTags.has(outbound.tag)) {
    // 自动选择：用节点覆盖（不要把 DIRECT 放进测速）
    outbound.outbounds = [...proxyTags];
  }
});

// urltest 空组兜底
config.outbounds.forEach((outbound) => {
  if (
    outbound.type === "urltest" &&
    Array.isArray(outbound.outbounds) &&
    outbound.outbounds.length === 0
  ) {
    if (!compatible) {
      config.outbounds.push(compatibleOutbound);
      compatible = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
  }
});

$content = JSON.stringify(config, null, 2);
