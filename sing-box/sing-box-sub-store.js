const { type, name } = $arguments;

let compatible;
let config = JSON.parse($files[0]);

// 获取 Sub-Store 生成的 sing-box 节点出站数组
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

// 需要剔除的机场订阅信息类关键词（中英文都覆盖）
const excludeRegex = /网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|expire|traffic|reset|subscription|plan/i;

// 过滤掉订阅信息类节点，只保留真正的代理节点
const validProxies = proxies.filter(p => !excludeRegex.test(p.tag));
const allProxyTags = validProxies.map(p => p.tag);

// 将真实节点合并加入 outbounds 列表
config.outbounds.push(...validProxies);

// 遍历出站列表，将所有节点填充到 Proxy 组和"自动选择"组中
config.outbounds.forEach(outbound => {
  if (outbound.tag === "Proxy") {
    // 所有的节点信息出现在 Proxy 组中，并在组内放入"自动选择"作为备选项
    outbound.outbounds.push("自动选择", ...allProxyTags);
  }
  if (outbound.tag === "自动选择") {
    // 自动选择组放入所有有效节点（已剔除订阅信息类）
    outbound.outbounds.push(...allProxyTags);
  }
});

// 兼容处理：如果某个策略组 outbounds 为空，补一个直连标签防止启动报错
config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      const directDirect = {
        tag: "直连-兼容",
        type: "direct"
      };
      config.outbounds.push(directDirect);
      compatible = true;
    }
    outbound.outbounds.push("直连-兼容");
  }
});

$content = JSON.stringify(config, null, 2);
