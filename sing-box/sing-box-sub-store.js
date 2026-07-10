/**
 * Sub-Store sing-box 节点注入脚本
 *
 * 功能：
 *   1. 从机场订阅中提取节点（proxies），过滤掉机场信息节点（含"网址/订阅/流量/到期"等关键词）
 *   2. 将所有有效节点追加到 config.outbounds 末尾
 *   3. 将节点标签注入到现有策略组（selector 类型）中，
 *      插入位置在可手动选择的已有条目（direct / proxy / 各 selector 的 default 等）之后
 *   4. 同时将节点注入到 auto-select（urltest）组中
 *   5. 对 outbounds 为空的组添加 COMPATIBLE 兜底
 *
 * 用法：在 Sub-Store 中作为 sing-box 的「脚本操作」使用，
 *      配合上传的 config-modified.json 作为模板文件。
 */

const { type, name } = $arguments;

// 兜底出站：当某个组的 outbounds 仍为空时填充，避免 sing-box 报错
const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

// ── 过滤机场信息节点的正则 ──
// 匹配含以下关键词的节点 tag，这些通常是机场插入的订阅信息而非真实代理节点
const INFO_FILTER_REGEX =
  /网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|官网|购买|套餐|客服|公告|通知|群|频道|TG|微信|机场|删除|禁用|节点|更新|倒计时|公园|剩余|unlimited|expire|traffic|reset|web/i;

/**
 * 从节点列表中过滤掉信息节点，返回有效代理节点
 */
function filterProxies(proxies) {
  return proxies.filter((p) => {
    // 节点类型为 selector/urltest 等非实际代理类型的也排除
    if (
      p.type === "selector" ||
      p.type === "urltest" ||
      p.type === "direct" ||
      p.type === "block" ||
      p.type === "reject" ||
      p.type === "compatible"
    ) {
      return false;
    }
    // 排除信息节点
    if (INFO_FILTER_REGEX.test(p.tag || "")) {
      return false;
    }
    return true;
  });
}

/**
 * 获取所有有效节点的 tag 列表
 */
function getTags(proxies) {
  return proxies.map((p) => p.tag);
}

// ── 主逻辑 ──

let compatible;
let config = JSON.parse($files[0]);

// 通过 Sub-Store 的 produceArtifact 获取订阅中的节点
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 过滤掉机场信息节点
proxies = filterProxies(proxies);
const proxyTags = getTags(proxies);

// 将所有有效节点追加到 outbounds 末尾
config.outbounds.push(...proxies);

// ── 注入节点到策略组 ──
// 遍历所有 outbound，将节点注入到 selector 和 urltest 类型的组中
// 注入位置：在可手动选择的已有条目之后
//
//   规则：
//   - selector 组：在已有 outbounds（direct / proxy / auto-select 等手动选项）之后追加所有节点
//   - urltest 组（如 auto-select）：在已有 outbounds 之后追加所有节点
//   - 对于 proxy（主选择器）组，手动选项是 ["direct", "auto-select"]，节点追加在其后
//   - 不添加地区分组，直接全部注入

// 需要排除不注入节点的组（这些组本身不是用来选择实际节点的）
const EXCLUDED_TAGS = new Set([
  "direct",
  "reject",
  "COMPATIBLE",
]);

// 需要排除的节点 tag 集合（避免把 selector/urltest 组自身作为节点注入到其他组）
const configTagSet = new Set(
  config.outbounds
    .filter(
      (o) =>
        o.type === "selector" ||
        o.type === "urltest" ||
        o.type === "direct" ||
        o.type === "block" ||
        o.type === "dns",
    )
    .map((o) => o.tag),
);

// 只注入实际的代理节点 tag（排除 config 中已有的组 tag）
const injectableTags = proxyTags.filter((t) => !configTagSet.has(t));

config.outbounds.forEach((outbound) => {
  // 只处理 selector 和 urltest 类型
  if (outbound.type !== "selector" && outbound.type !== "urltest") {
    return;
  }

  // 排除特定组
  if (EXCLUDED_TAGS.has(outbound.tag)) {
    return;
  }

  // 确保有 outbounds 数组
  if (!Array.isArray(outbound.outbounds)) {
    outbound.outbounds = [];
  }

  // 将所有可注入的节点 tag 追加到现有 outbounds 之后
  // （手动选择的选项如 direct / proxy / auto-select 已在前面，节点插在它们后面）
  outbound.outbounds.push(...injectableTags);
});

// ── 兜底处理：对 outbounds 仍为空的组添加 COMPATIBLE ──
config.outbounds.forEach((outbound) => {
  if (
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

// 输出最终配置
$content = JSON.stringify(config, null, 2);
