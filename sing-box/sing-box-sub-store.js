/**
 * Sub-Store sing-box 1.14.0 配置生成脚本
 *
 * 使用方法：
 * 1. 在 Sub-Store 中编辑你的订阅或组合订阅
 * 2. 展开「同步」设置：
 *    - 「远程脚本」填入本脚本的 raw 链接
 *    - 「远程配置/文件」填入 sing-box.json 模板的 raw 链接
 * 3. 同步时目标平台选择 sing-box，下载即可获得完整配置
 *
 * 策略组（5 个）：
 *   代理      - 手动选择（所有有效节点 + 自动选择 + 直连）
 *   自动选择  - 自动测速（所有有效节点）
 *   国内      - 国内分流（默认直连）
 *   谷歌      - 谷歌分流（默认代理）
 *   兜底      - 兜底分流（默认代理，所有未匹配流量走这里）
 *
 * 分流逻辑：广告拦截 → 私有直连 → 谷歌走代理 → 国内直连 → 其余走兜底(代理)
 *
 * 手机/电脑通用，无需修改。
 */

const { type, name } = $arguments;

// 兜底兼容出站：当某分组无匹配节点时，用直连兜底
const compatible_outbound = {
  tag: "兼容兜底",
  type: "direct",
};
let compatible;

// 读取模板 JSON
let config = JSON.parse($files[0]);

// 生成 sing-box 格式节点
// produceType: "internal" 返回原始节点对象数组（不含 endpoints 分组）
// Sub-Store 的 sing-box producer 在 internal 模式下返回数组
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 将节点添加到 outbounds
config.outbounds.push(...proxies);

// 过滤信息类节点（网站、网址、流量、到期等）
const validProxies = proxies.filter(
  (p) =>
    !/(网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|官网|主页)/i.test(
      p.tag
    )
);

// 获取有效节点的 tag 列表
function getTags(proxyList, regex) {
  return (regex ? proxyList.filter((p) => regex.test(p.tag)) : proxyList).map(
    (p) => p.tag
  );
}

// 填充节点到对应分组
config.outbounds.forEach((outbound) => {
  // 自动选择：放入所有有效节点
  if (outbound.tag === "自动选择") {
    outbound.outbounds.push(...getTags(validProxies));
  }
  // 代理：放入所有有效节点（手动选择）
  if (outbound.tag === "代理") {
    outbound.outbounds.push(...getTags(validProxies));
  }
});

// 空出站兜底：如果某分组没有节点，用直连兜底
config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound);
      compatible = true;
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

$content = JSON.stringify(config, null, 2);
