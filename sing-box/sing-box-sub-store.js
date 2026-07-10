/* =========================================================================
 *  Sub-Store 模板脚本  ·  sing-box v1.14.0-alpha.41
 *  -----------------------------------------------------------------------
 *  用途：作为 Sub-Store 的「自定义脚本」使用。
 *        - 模板文件 config-template.json 作为 $files[0]
 *        - 脚本拉取订阅节点（platform: "sing-box", produceType: "internal"）
 *        - 将过滤后的全部节点注入 Proxy / Auto-Proxy 两个策略组
 *        - 关键字黑名单 + 白名单（可选）双过滤，剔除机场里的杂七杂八信息
 *
 *  安装：Sub-Store → 编辑订阅/组合订阅 →
 *        「订阅」设置里挂自定义配置 / 单跳订阅 / 文件托管 config-template.json
 *        脚本路径指向本文件（sing-box-inject.js）
 *
 *  参考：
 *    - https://cdn.jsdelivr.net/gh/Sheldontao/Scripts@refs/heads/main/sub-store-template/1.12or13/sing-box.js
 *    - Sub-Store 官方 scripts/demo.js（produceArtifact / $files / $arguments 用法）
 *  ========================================================================= */

const { type, name } = $arguments;

// ---------------------------------------------------------------------------
// 1. 兜底直连节点（空节点列表 / 全被过滤时占位）
// ---------------------------------------------------------------------------
const compatible_outbound = { tag: "COMPATIBLE", type: "direct" };

// ---------------------------------------------------------------------------
// 2. 读取模板 + 拉取节点
// ---------------------------------------------------------------------------
let compatible = false;
let config = JSON.parse($files[0]);
let proxies = await produceArtifact({
  name,                                        // 订阅名
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",                        // 直接产出 sing-box 的 outbound 数组结构
  produceType: "internal",                      // 返回数组而非字符串
});

// ---------------------------------------------------------------------------
// 3. 关键字黑名单：剔除机场里常见的"垃圾节点"
//    匹配命中即过滤掉。中文 + 英文兼顾；emoji / 旗帜不过滤。
//    说明：包含 -> 推荐 / 官网 / 订阅 / 流量 / 套餐 / 到期 / 重置 / 公告 等
// ---------------------------------------------------------------------------
const BLOCK_KEYWORDS = [
  // 通用信息类：机场常塞的说明性"节点"
  "网址", "网站", "官网", "域名", "获取", "订阅", "流量", "套餐", "到期", "余量", "余流量",
  "续费", "过期", "重置", "公告", "刷新", "更新", "购买", "官址", "官网地址", "说明",
  "提示", "讨论", "客服", "群组", "电报", "剩余", "倍率", "官网：", "网址：",
  // 英文常见
  "expire", "traffic", "expire-date", "expireDate", "subscription", "traffic-expire",
  "remaining", "流量：", "到期：",
];

// ---------------------------------------------------------------------------
// 4. 可选关键字白名单（留空表示不强制白名单，全部黑名单外的节点都注入）
//    若填入，则只保留节点名命中任一关键字的节点（OR 语义）。
// ---------------------------------------------------------------------------
const ALLOW_KEYWORDS = [
  // "香港","HK","港","日本","JP","日","新加坡","SG","狮城","美国","US","韩","KR","台湾","TW","英","UK","德","DE"
];

// ---------------------------------------------------------------------------
// 5. 过滤逻辑：剔除垃圾节点
// ---------------------------------------------------------------------------
function filterProxies(list) {
  let r = list.filter((p) => {
    if (!p || !p.tag) return false;
    const t = String(p.tag);
    // 命中黑名单 -> 丢弃
    for (const k of BLOCK_KEYWORDS) {
      if (t.indexOf(k) !== -1) return false;
    }
    // 开启白名单时强制要求命中
    if (ALLOW_KEYWORDS && ALLOW_KEYWORDS.length) {
      let ok = false;
      for (const k of ALLOW_KEYWORDS) {
        if (t.indexOf(k) !== -1) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  });
  return r;
}

proxies = filterProxies(proxies);

// ---------------------------------------------------------------------------
// 6. 注入：把所有节点追加到 Proxy 和 Auto-Proxy
//    参照 Sheldontao 原脚本，但改为两策略组都注入（按需求）。
//    Proxy / Auto-Proxy 在模板里已存在占位 outbounds，这里 push 追加。
// ---------------------------------------------------------------------------
const validTags = proxies.map((p) => p.tag);

config.outbounds.push(...proxies);

config.outbounds.forEach((o) => {
  if (o.tag === "Proxy") {
    // Proxy 默认是 Auto-Proxy / Direct，追加所有真实节点
    o.outbounds.push(...validTags);
    // 让默认首选第一个真实节点（若存在），否则回退 Auto-Proxy
    if (validTags.length) o.default = validTags[0];
  }
  if (o.tag === "Auto-Proxy") {
    // Auto-Proxy 测速组，注入全部节点
    o.outbounds.push(...validTags);
  }
});

// ---------------------------------------------------------------------------
// 7. 空策略组兜底：若某策略组无任何可用节点，注入 COMPATIBLE 直连
// ---------------------------------------------------------------------------
config.outbounds.forEach((o) => {
  if (Array.isArray(o.outbounds) && o.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    o.outbounds.push(compatible_outbound.tag);
  }
});

// ---------------------------------------------------------------------------
// 8. 输出最终 JSON
// ---------------------------------------------------------------------------
$content = JSON.stringify(config, null, 2);
