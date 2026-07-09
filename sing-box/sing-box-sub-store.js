/**
 * Sub-Store 节点清洗 + 注入脚本（sing-box 模板）
 *
 * 粘贴位置：
 *   Sub-Store → 订阅 → 编辑 → 「节点操作」/「Script」/「脚本操作」
 *   选择类型为「节点过滤脚本」（Node Filter），
 *   将本文件内容粘贴进去保存即可。
 *
 * 工作原理：
 *   Sub-Store 调用导出函数 operator(proxies)，proxies 为解析后的节点数组。
 *   本脚本：
 *     1) 过滤机场返回的「信息节点」（过期、流量、套餐、续费等）。
 *     2) 清洗节点名（去 emoji、多余空白、广告前缀）。
 *     3) 给每个节点补齐 sing-box 必填 type 字段，丢弃非法节点。
 *     4) 返回清洗后的节点数组，由 Sub-Store 注入到模板的 outbounds 占位区。
 *
 *   若你使用「sing-box 模板」功能，Sub-Store 会把返回的节点标签数组
 *   自动写入 selector / urltest 的 outbounds 字段，无需手动拼接。
 */

// 关键字过滤名单：命中任一关键字的节点视为信息条目，丢弃
const DIRTY_KEYWORDS = [
  '过期', '剩余', '到期', '流量', '套餐', '官网', '网址',
  '续费', '订阅', '购买', '刷新', '群', '官网', '公告',
  'GB', '包年', '包月', '限时', '优惠', '测试', '官网地址'
];

// sing-box 合法 outbound type
const VALID_TYPES = [
  'shadowsocks', 'vmess', 'trojan', 'hysteria', 'hysteria2',
  'tuic', 'wireguard', 'ssh', 'shadowtls', 'vless', 'anytls',
  'direct', 'block'
];

// Sub-Store（mihomo/Clash）类型 → sing-box 类型映射
const TYPE_MAP = {
  ss: 'shadowsocks',
  shadowsocks: 'shadowsocks',
  vmess: 'vmess',
  trojan: 'trojan',
  hysteria: 'hysteria',
  hysteria2: 'hysteria2',
  tuic: 'tuic',
  wireguard: 'wireguard',
  ssh: 'ssh',
  shadowtls: 'shadowtls',
  vless: 'vless',
  anytls: 'anytls'
};

/**
 * 清洗节点名：去除 emoji、控制字符、多余空白与常见广告前缀
 */
function cleanName(name) {
  if (!name || typeof name !== 'string') return '未命名节点';
  // 去 emoji 与各类符号
  let cleaned = name
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '')
    .replace(/[\u0000-\u001F\u007F]/g, '') // 控制字符
    .replace(/\s+/g, ' ')
    .trim();
  // 去常见广告前缀，如 "【官网】"、"® 广告 |"
  cleaned = cleaned.replace(/^[【\[（(]? *(官网|广告|促销|最新|高速|推荐|Premium|PRO) *[】\]）)|]?\s*/i, '');
  return cleaned || '未命名节点';
}

/**
 * 判断是否为信息节点（需丢弃）
 */
function isInfoNode(name) {
  if (!name) return true;
  const lower = name.toLowerCase();
  return DIRTY_KEYWORDS.some(kw => name.includes(kw) || lower.includes(kw.toLowerCase()));
}

/**
 * 补齐单个节点的必填字段，返回合法节点对象或 null（非法则丢弃）
 */
function normalizeNode(node) {
  if (!node || typeof node !== 'object') return null;
  // Sub-Store 节点字段可能为 mihomo 风格，需适配
  let type = (node.type || node.network || '').toLowerCase();
  type = TYPE_MAP[type] || type;
  if (!VALID_TYPES.includes(type)) return null; // 非法类型丢弃

  const name = cleanName(node.name || node.tag || node.remarks);

  // 映射为 sing-box 出站结构（按 type 复制 server 字段）
  const sb = Object.assign({}, node);
  sb.type = type;
  sb.tag = name;
  // sing-box 用 tag 作为节点名，删除冗余字段
  delete sb.name;
  delete sb.remarks;
  return sb;
}

/**
 * Sub-Store 入口：operator(proxies)
 * proxies: Sub-Store 解析后的节点数组（mihomo/Clash 格式对象）
 * 返回：清洗后的节点数组
 */
// eslint-disable-next-line no-unused-vars
function operator(proxies) {
  const cleaned = (proxies || [])
    .filter(p => p && !isInfoNode(p.name || p.tag || p.remarks))
    .map(normalizeNode)
    .filter(Boolean); // 丢弃非法节点

  if (cleaned.length === 0) {
    // 兜底：全部被过滤时返回原数组，避免配置空指针
    return proxies || [];
  }
  return cleaned;
}

// 导出（Sub-Store 同时支持 CommonJS 与全局函数）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { operator, cleanName, isInfoNode, normalizeNode };
}
if (typeof globalThis !== 'undefined') {
  globalThis.operator = operator;
}
