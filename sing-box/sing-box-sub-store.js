/**
 * Sub-Store sing-box 1.14.0 配置生成脚本
 *
 * 使用方法（Sub-Store 后台 → 组合订阅 / 单订阅 → 文件 → 添加文件：
 *   1. 把 sing-box.json 作为「文件」（label: 模板）上传到自建 Sub-Store。
 *   2. 给该文件挂上此 js 作为「脚本操作 (Script Operator)」类型为 "操作"。
 *   3. 在订阅/订阅链接里加参数 ?target=sing-box&name=订阅名即可生成。
 *
 * 由 Sub-Store 注入的上下文：
 *   $arguments      来自订阅链接参数（target / name 等）
 *   $files[0]       上面挂的 sing-box.json 模板内容（字符串）
 *   $options        其他可选项（keepUnsupported / includeUnsupportedProxy 等）
 *   produceArtifact Sub-Store 内置函数，用于从订阅链接生成节点 outbounds 数组
 *
 * 1.14 写法说明：
 *   - produceType: 'internal'   返回 outbounds 数组（含 wireguard/tailscale 在 endpoints 数组中）
 *   - 不需要写一堆解析代码；Sub-Store 的 sing-box.js producer 已经按 1.14 原生格式生成 outbounds，
 *     每个节点的 tag 字段就是它的名称。
 */

const { type, name } = $arguments;

// Document Outbound 类型判断方法：1.14 的 wireguard / tailscale 节点会落在 endpoints 数组中。
// produceType: 'internal' 时 Sub-Store 直接返回数组（旧版可能仅返回 outbounds 部分）。我们对两种返回值都做适配。
let proxiesArr = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
});

// 适配 Sub-Store 多版本返回值：
//   旧版: { outbounds: [...], endpoints: [...] } |  新版: 直接 [...] 数组
let outboundsList = [];
let endpointsList = [];
if (Array.isArray(proxiesArr)) {
  outboundsList = proxiesArr.filter(
    (p) => !['wireguard', 'tailscale'].includes(p.type),
  );
  endpointsList = proxiesArr.filter((p) =>
    ['wireguard', 'tailscale'].includes(p.type),
  );
} else if (proxiesArr && Array.isArray(proxiesArr.outbounds)) {
  outboundsList = proxiesArr.outbounds;
  endpointsList = proxiesArr.endpoints || [];
} else {
  // 兜底：用户脚本里 proxies 是为了兼容老 API 的环境
  // 一般不会进入这里
  outboundsList = [];
}

const compatible_outbound = { tag: '兜底直连', type: 'direct' };
let compatible = false;

let config = JSON.parse($files[0]);

// 注入节点 outbounds + endpoints
if (outboundsList.length > 0) {
  config.outbounds.push(...outboundsList);
}
if (endpointsList.length > 0) {
  if (!Array.isArray(config.endpoints)) config.endpoints = [];
  config.endpoints.push(...endpointsList);
}

// 全部节点 tag
const allTags = outboundsList.map((p) => p.tag).concat(endpointsList.map((p) => p.tag));

// 用正则按地区把节点分配进对应分组
const regionRegex = (keyword) =>
  new RegExp(
    `^(?!.*\\b(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置)\\b).*${keyword}`,
    'i',
  );

const regionTagMap = {
  香港:
    /(?:^|\b)(?:hk|hong\s*kong)\b|港|香港|🇭🇰/i,
  台湾:
    /(?:^|\b)(?:tw|taiwan)\b|🇹🇼|台|台湾/i,
  日本:
    /(?:^|\b)(?:jp|japan)\b|日本|日|🇯🇵/i,
  新加坡:
    /(?:^|\b)(?:sg|singapore)\b|🇸🇬|新加坡/i,
  美国:
    /(?:^|\b)(?:us|united\s*states)\b|美|美国|🇺🇸/i,
  韩国:
    /(?:^|\b)(?:kr|korea)\b|韩|韩国|🇰🇷/i,
};

// 按地区生成的 tags：用于在「自动选择」与「Proxy」之间添加子 urltest 分组。
// 如果你只想要自动选择里平铺所有节点而无地区子组，请把 SUBURLTEST 设为 false。
const SUBURLTEST = true;

let regionSubGroups = [];

if (SUBURLTEST) {
  // 在 config.outbounds 中插入地区子 urltest 组，顺序固定：香港 台湾 日本 新加坡 美国 韩国
  for (const region of ['香港', '台湾', '日本', '新加坡', '美国', '韩国']) {
    const tags = getTagsByRegex(outboundsList, regionTagMap[region]);
    if (tags.length === 0) continue;
    const groupTag = `自动-${region}`;
    config.outbounds.push({
      type: 'urltest',
      tag: groupTag,
      outbounds: tags,
      url: 'https://www.gstatic.com/generate_204',
      interval: '3m',
      tolerance: 50,
      idle_timeout: '30m',
      interrupt_exist_connections: true,
    });
    regionSubGroups.push(groupTag);
  }
}

// 把节点与子分组注入到 Proxy / 自动选择 / 谷歌 / 兜底
config.outbounds.forEach((i) => {
  if (!Array.isArray(i.outbounds)) return;

  // Proxy 组：把所有节点 + 子地区分组 塞进去
  if (i.tag === 'Proxy') {
    i.outbounds = [...regionSubGroups, ...allTags];
    if (regionSubGroups.length > 0) {
      i.default = regionSubGroups[0];
    } else if (allTags.length > 0) {
      i.default = allTags[0];
    }
  }

  // 自动选择组：只放物理节点，做整体自动测速
  if (i.tag === '自动选择') {
    i.outbounds = allTags;
  }

  // 谷歌 / 兜底组：默认 Proxy，并把所有节点放进选项供手动切换
  if (i.tag === '谷歌' || i.tag === '兜底') {
    i.outbounds = ['Proxy', '自动选择', ...regionSubGroups, ...allTags, '直连'];
    i.default = 'Proxy';
  }
});

// 空分组兜底：组里没有任何 outbounds 时塞一个直接直连，避免启动报错
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

$content = JSON.stringify(config, null, 2);

/**
 * 工具函数：按正则筛选节点 tags
 * 不传 regex 时返回全部节点 tags
 */
function getTagsByRegex(proxies, regex) {
  return (regex
    ? proxies.filter((p) => regex.test(p.tag))
    : proxies
  ).map((p) => p.tag);
}
