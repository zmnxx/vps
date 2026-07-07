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
 * 策略组（极简版）：
 *   代理      - 手动选择（所有节点 + 自动选择 + 直连）
 *   自动选择  - 自动测速（所有有效节点）
 *   国内      - 国内分流（默认直连）
 *   兜底      - 兜底分流（默认走代理，所有未匹配的流量走这里）
 *
 * 分流逻辑：广告拦截 → 私有直连 → 国内直连 → 其余走兜底(代理)
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
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

config.outbounds.push(...proxies);

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag
  );
}

// 过滤信息类节点
const validProxies = proxies.filter(
  (p) =>
    !/(网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|官网|主页)/i.test(
      p.tag
    )
);

// 填充节点到对应分组
config.outbounds.map((i) => {
  if (i.tag === "自动选择") {
    i.outbounds.push(...getTags(validProxies));
  }
  if (i.tag === "代理") {
    i.outbounds.push(...getTags(validProxies));
  }
});

// 空出站兜底
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
