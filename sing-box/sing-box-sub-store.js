/**
 * Sub-Store sing-box 节点注入脚本
 * 配合 config.json 模板使用 (v1.14.0-alpha.41)
 *
 * 在 Sub-Store 中创建一个订阅 (subscription/collection)，
 * 启用「自定义」脚本并引用本文件。
 * 传入参数 type (subscription/collection) 和 name (订阅名)。
 */

const { type, name } = $arguments;

// === 兜底直连出站（空策略组兜底专用）===
const compatibleOutbound = { tag: "COMPATIBLE", type: "direct" };
let compatible = false;
let config = JSON.parse($files[0]);

// === 获取节点列表 ===
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// === 节点列表校验 ===
// 若 produceArtifact 失败或返回空，直接输出原模板并中止
if (!Array.isArray(proxies) || proxies.length === 0) {
  console.log("produceArtifact 未返回任何节点或调用失败，输出原模板");
  $content = JSON.stringify(config, null, 2);
  return;
}

// === 过滤流量/到期/测试类杂项节点 ===
const FILTER_REGEX = /Traffic|Expire|Remaining|流量|到期|剩余|官网|网址|网站|demo|test|^[\d.\s\-:]+$|GHz/i;
proxies = proxies.filter(p => !FILTER_REGEX.test(p.tag));

// 全过滤后回退为原始节点列表
if (proxies.length === 0) {
  proxies = await produceArtifact({
    name,
    type: /^1$|col/i.test(type) ? "collection" : "subscription",
    platform: "sing-box",
    produceType: "internal",
  });
}

// === 清理 tag ===
function cleanTag(tag) {
  // 去除 [xx] 格式前缀（如 [香港] 香港 → 香港）
  tag = tag.replace(/^\[[^\]]*\]\s*/u, "");
  // 去连续空格
  tag = tag.replace(/\s+/g, " ").trim();
  // 多个国旗 emoji 只保留最后一个
  const flagPattern = /([\u{1F1E6}-\u{1F1FF}]{2})/gu;
  const flags = tag.match(flagPattern);
  if (flags && flags.length > 1) {
    const lastFlag = flags[flags.length - 1];
    let idx = tag.lastIndexOf(lastFlag);
    tag = tag.slice(0, idx) + lastFlag + tag.slice(idx + 2);
    tag = tag.replace(/\s+/g, " ").trim();
  }
  return tag;
}

proxies.forEach(p => { p.tag = cleanTag(p.tag); });

// === tag 去重（同名的加序号后缀）===
const seenTags = new Map();
proxies.forEach(p => {
  const baseTag = p.tag;
  if (seenTags.has(baseTag)) {
    const count = seenTags.get(baseTag);
    p.tag = `${baseTag} ${count}`;
    seenTags.set(baseTag, count + 1);
  } else {
    seenTags.set(baseTag, 1);
  }
});

// === 注入节点到 outbounds 尾部 ===
config.outbounds.push(...proxies);
const proxyTags = proxies.map(p => p.tag);

// === 重建策略组 ===
config.outbounds.forEach(outbound => {
  // Proxy 组：节点列表 + "自动选择"；默认指向 "自动选择"
  if (outbound.tag === "Proxy") {
    outbound.outbounds = [...proxyTags, "自动选择"];
    outbound.default = "自动选择";
    return;
  }
  // 自动选择 urltest 组：仅节点列表
  if (outbound.tag === "自动选择") {
    outbound.outbounds = [...proxyTags];
    return;
  }
  // 谷歌/微软/兜底等 selector 组：节点列表 + Proxy + 自动选择
  if (outbound.type === "selector" && outbound.tag !== "Proxy") {
    outbound.outbounds = [...proxyTags, "Proxy", "自动选择"];
    // 默认先选 "自动选择"，让 urltest 全局测速后择优
    outbound.default = "自动选择";
  }
});

// === 空策略组兜底 COMPATIBLE ===
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatibleOutbound);
      compatible = true;
    }
    outbound.outbounds.push(compatibleOutbound.tag);
    outbound.default = compatibleOutbound.tag;
  }
});

console.log(`注入完成：${proxies.length} 个节点`);

$content = JSON.stringify(config, null, 2);
