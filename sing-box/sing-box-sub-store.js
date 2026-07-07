/**
 * Sub-Store sing-box 1.14.0 配置生成脚本
 *
 * 使用方法：
 * 1. 在 Sub-Store 中新建/编辑一个「订阅」或「组合订阅」
 * 2. 展开「同步」设置：
 *    - 「远程脚本」填入本脚本的 raw 链接
 *    - 「远程配置/文件」填入 sing-box.json 模板的 raw 链接
 *      （脚本通过 $files[0] 读取模板内容）
 * 3. 同步时目标平台选择 sing-box，下载即可获得完整配置
 *
 * 策略组说明（标签已中文）：
 *   代理      - 手动选择（所有节点 + 自动选择 + 直连）
 *   自动选择  - 自动测速（所有有效节点）
 *   谷歌      - 谷歌分流（默认走代理）
 *   电报      - 电报分流（默认走代理）
 *   国内      - 国内分流（默认直连）
 *   兜底      - 兜底分流（默认走代理）
 *
 * 所有节点信息出现在「代理」选择器中，
 * 其他分组默认引用「代理」（国内除外，默认直连）。
 *
 * === 手机/电脑通用 ===
 * 本配置无需修改即可在手机端和电脑端使用。
 * 唯一差异：电脑端如不想用 TUN 全局代理，可删除 inbounds 中的 tun 入站，
 *          仅保留 mixed 入站设置系统代理。
 */

const { type, name } = $arguments;

// 兜底兼容出站：当某分组无匹配节点时，用直连兜底，避免空 outbounds 数组导致启动报错
const compatible_outbound = {
  tag: "兼容兜底",
  type: "direct",
};
let compatible;

// 读取模板 JSON（$files[0] 即 sing-box.json 模板内容）
let config = JSON.parse($files[0]);

// 调用 Sub-Store 生成 sing-box 格式节点
// produceType: "internal" 表示生成的节点直接用于内部填充
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 将订阅节点追加到 outbounds 末尾
config.outbounds.push(...proxies);

// 获取所有节点的 tag 列表（可按正则筛选）
function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag
  );
}

// 过滤掉信息类节点（订阅信息、过期提示等无实际代理用途的节点）
const validProxies = proxies.filter(
  (p) =>
    !/(网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|官网|主页)/i.test(
      p.tag
    )
);

// 遍历模板中的 outbounds，按 tag 名称填充对应节点
config.outbounds.map((i) => {
  // 自动选择（urltest）：填充所有有效节点
  if (i.tag === "自动选择") {
    i.outbounds.push(...getTags(validProxies));
  }

  // 代理（selector）：填充所有有效节点 + 自动选择 + 直连（后两个已在模板中）
  if (i.tag === "代理") {
    i.outbounds.push(...getTags(validProxies));
  }

  // ================================================================
  // 以下为按地区自动测速分组的示例代码（已注释，如需要请取消注释）
  // 同时需要在 sing-box.json 模板的 outbounds 中添加对应的 urltest 组
  // ================================================================

  // 香港节点自动测速
  // if (i.tag === "香港自动") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:hk|hong.*kong)\b|港|香港|🇭🇰)/i
  //     )
  //   );
  // }
  // 台湾节点自动测速
  // if (i.tag === "台湾自动") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:tw|taiwan)\b|🇹🇼|台|台湾)/i
  //     )
  //   );
  // }
  // 日本节点自动测速
  // if (i.tag === "日本自动") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:jp|japan)\b|日本|🇯🇵)/i
  //     )
  //   );
  // }
  // 新加坡节点自动测速
  // if (i.tag === "新加坡自动") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:sg|singapore)\b|🇸🇬|新加坡)/i
  //     )
  //   );
  // }
  // 美国节点自动测速
  // if (i.tag === "美国自动") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:us|united.*states)\b|美|美国|🇺🇸)/i
  //     )
  //   );
  // }
});

// 兜底处理：某个 urltest 或 selector 的 outbounds 为空时，
// 用「兼容兜底」直连兜底，避免 sing-box 因空 outbounds 数组在启动时报错
config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 输出最终配置
$content = JSON.stringify(config, null, 2);
