/**
 * Sub-Store sing-box 1.14.0 配置生成脚本
 *
 * 使用方法：
 * 1. 在 Sub-Store 中新建一个「订阅」或「组合订阅」
 * 2. 点击「同步」-> 展开 -> 「远程脚本」填入本脚本的 raw 链接
 *    （或直接在「脚本操作」中选择「远程」并粘贴脚本链接）
 *    也可将本脚本粘贴到「本地」脚本编辑器中
 * 3. 本脚本需要配合 sing-box.json 模板一起使用：
 *    在 Sub-Store 订阅设置中，将 sing-box.json 模板文件作为「远程配置」/「文件」引入
 *    或将模板内容与本脚本一起放在可以 $files[0] 访问的位置
 *
 * 策略组说明：
 *   Proxy    - 手动选择（所有节点 + 自动选择 + 直连）
 *   Auto     - 自动测速（所有节点）
 *   Google   - 谷歌分流（默认走 Proxy）
 *   Telegram - 电报分流（默认走 Proxy）
 *   Domestic - 国内分流（默认直连）
 *   Final    - 兜底分流（默认走 Proxy）
 *
 * 所有节点信息会出现在 Proxy 选择器中，其他分组默认引用 Proxy（国内除外）
 */

const { type, name } = $arguments;

// 兜底兼容出站：当某正则分组无匹配节点时，用直连兜底，避免空 outbounds 数组导致启动报错
const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};
let compatible;

// 读取模板 JSON（$files[0] 即 sing-box.json 模板内容）
let config = JSON.parse($files[0]);

// 调用 Sub-Store 生成 sing-box 格式节点
// produceType: "internal" 表示生成的节点不会带 tag 前缀，直接用于内部填充
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 将订阅节点追加到 outbounds 末尾
config.outbounds.push(...proxies);

// 获取所有节点的 tag 列表（用于填充分组）
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
  // Auto 自动测速组：填充所有有效节点
  if (i.tag === "Auto") {
    i.outbounds.push(...getTags(validProxies));
  }

  // Proxy 手动选择组：填充所有有效节点 + Auto + DIRECT（DIRECT 已在模板中）
  if (i.tag === "Proxy") {
    i.outbounds.push(...getTags(validProxies));
  }

  // 以下分组可选性地按地区正则填充加速组（留空则仅引用上层选择器）
  // 如需按地区自动测速，可取消注释并在模板中添加对应 urltest 组

  // 港港节点自动测速
  // if (i.tag === "HK-Auto") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:hk|hong.*kong)\b|港|香港|🇭🇰)/i
  //     )
  //   );
  // }
  // 台湾节点自动测速
  // if (i.tag === "TW-Auto") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:tw|taiwan)\b|🇹🇼|台|台湾)/i
  //     )
  //   );
  // }
  // 日本节点自动测速
  // if (i.tag === "JP-Auto") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:jp|japan)\b|日本|🇯🇵)/i
  //     )
  //   );
  // }
  // 新加坡节点自动测速
  // if (i.tag === "SG-Auto") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:sg|singapore)\b|🇸🇬|新加坡)/i
  //     )
  //   );
  // }
  // 美国节点自动测速
  // if (i.tag === "US-Auto") {
  //   i.outbounds.push(
  //     ...getTags(validProxies,
  //       /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(?:\b(?:us|united.*states)\b|美|美国|🇺🇸)/i
  //     )
  //   );
  // }
});

// 兜底处理：某个 urltest 或 selector 的 outbounds 为空时，用 COMPATIBLE 直连兜底
// 避免 sing-box 因空 outbounds 数组在启动时报错
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
