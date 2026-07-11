/**
 * Sub-Store sing-box 脚本：节点注入 + 过滤
 *
 * 参考自 https://github.com/Sheldontao/Scripts/tree/main/sub-store-template/1.12or13
 * 适配用户自定义配置，做如下改动：
 *   1. 不创建地区分组（hk-auto / tw-auto 等），直接全部注入到策略组
 *   2. 过滤掉机场订阅信息节点（网址 / 网站 / 订阅 / 流量 / 到期 等关键词）
 *   3. 节点注入到策略组（selector）中的优先级排在原有手动选项之后，不修改任何策略组名字或已有结构
 *
 * 用法：在 Sub-Store 的 sing-box 订阅中，选择"脚本操作" → 添加此文件
 *   $arguments.type 传入 "subscription" 或 "collection"
 *   $arguments.name 传入订阅名称
 */

const { type, name } = $arguments;

// 兜底节点：当 urltest 组没有任何可用节点时使用，避免配置报错
const compatibleOutbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible = false;

// 解析底模配置（$files[0] 由 Sub-Store 绑定的模板内容）
const config = JSON.parse($files[0]);

// 通过 Sub-Store API 生成代理节点列表（plateform: sing-box）
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// ─── 过滤机场信息节点 ───────────────────────────────────
// 匹配常见的关键词，这些节点不是真正可用的代理，而是机场提供的"信息/订阅状态"节点
const infoKeywords = /网址|网站|获取|订阅|流量|到期|余量|续费|过期|重置|套餐|官网|面板|剩余|更新|expire|traffic|reset|plan|manual/gi;
proxies = proxies.filter((p) => !infoKeywords.test(p.tag));

// 获取过滤后所有代理节点的 tag 列表
const proxyTags = proxies.map((p) => p.tag);

// ─── 不应注入代理节点的功能性策略组 ────────────────────
// 例如 adblock（用于控制广告走 reject 还是 direct），这些组不需要单独的代理节点选项
const skipTags = new Set(["adblock"]);

// 遍历所有 outbound，进行注入
config.outbounds.forEach((outbound) => {
  // selector 类型的策略组：在原有手动选项后面追加所有代理节点
  if (
    outbound.type === "selector" &&
    Array.isArray(outbound.outbounds) &&
    !skipTags.has(outbound.tag)
  ) {
    // 只在原 outbounds 后面 push，不修改原有选项和顺序
    outbound.outbounds.push(...proxyTags);
  }

  // auto-select（urltest 类型）：注入全部过滤后的代理节点用于自动测速
  if (
    outbound.type === "urltest" &&
    outbound.tag === "auto-select"
  ) {
    outbound.outbounds.push(...proxyTags);
  }
});

// ─── 兜底处理 ────────────────────────────────────────────
// 如果 auto-select 组没有任何节点（例如订阅为空），补充一个兜底 direct 节点
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
