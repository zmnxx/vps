/**
 * Sub-Store sing-box 1.14.0 配置生成脚本
 *
 * 用法（在 Sub-Store 订阅中作为「资源」并选择本脚本）：
 *   订阅链接处填写 Singbox 订阅 / 订阅集合
 *   在「同步」-「资源」里新增资源，类型选「SingBox 模板」，
 *   内容粘贴 sing-box-template.json，并在「脚本」位置挂载本脚本。
 *
 * 通过 URL 参数可覆盖默认分组与测速 URL，例如：
 *   sing-box.js#type=col&name=我的订阅集合&platform=android
 *
 * 可选参数：
 *   platform: android（默认，启用 override_android_vpn）/ windows（移除 Android 专属字段）
 *
 * 必填参数（通常由 Sub-Store 自动注入）：
 *   name: 订阅 / 订阅集合名称
 *   type: subscription / col(lection)
 */
const { type, name, platform } = $arguments;

// 兼容出站：当某分组没有匹配到任何节点时，填充一个 direct 出站，避免 sing-box 启动报错
const compatible_outbound = { tag: "COMPATIBLE", type: "direct" };
let compatible = false;

// 解析模板配置
let config = JSON.parse($files[0]);

// 拉取当前订阅 / 集合的节点（sing-box internal 格式，返回节点对象数组）
let proxies = await produceArtifact({
    name,
    type: /^1$|col/i.test(type) ? "collection" : "subscription",
    platform: "sing-box",
    produceType: "internal",
});

// 节点名（tag）列表，用于分组填充
let proxyTags = getTags(proxies);

// 平台适配：非 Android 时移除 Android 专属的 override_android_vpn 字段，避免启动报错
if (!/^android$/i.test(platform || "android")) {
    delete config.route.override_android_vpn;
}

// 将节点追加到配置；wireguard / tailscale 类型须进 endpoints[]，其余进 outbounds[]
let wireguardEndpoints = [];
let outboundProxies = [];
proxies.forEach((p) => {
    if (["wireguard", "tailscale"].includes(p.type)) {
        wireguardEndpoints.push(p);
    } else {
        outboundProxies.push(p);
    }
});
config.outbounds.push(...outboundProxies);
if (wireguardEndpoints.length > 0) {
    if (!Array.isArray(config.endpoints)) config.endpoints = [];
    config.endpoints.push(...wireguardEndpoints);
    // wireguard 节点名也并入分组可选列表，便于选择
}

// 填充分组：按 tag 匹配填充 outbounds[]
config.outbounds.forEach((o) => {
    if (o.tag === "Proxy") {
        // Proxy：包含所有代理节点，默认选「自动选择」
        o.outbounds.push(...proxyTags);
    } else if (o.tag === "自动选择") {
        // 自动选择：包含所有代理节点做 URL 测速
        o.outbounds.push(...proxyTags);
    } else if (o.tag === "国内") {
        // 国内：默认直连，可手动切到 Proxy 或具体节点
        o.outbounds.push("直连", "Proxy", ...proxyTags);
    } else if (o.tag === "谷歌") {
        // 谷歌：默认 Proxy，可手动切直连或具体节点
        o.outbounds.push("Proxy", "直连", ...proxyTags);
    } else if (o.tag === "兜底") {
        // 兜底：默认 Proxy，可手动切具体节点
        o.outbounds.push("Proxy", ...proxyTags);
    }
});

// 为任何仍为空的分组填入兼容出站，防止启动报错
config.outbounds.forEach((o) => {
    if (Array.isArray(o.outbounds) && o.outbounds.length === 0) {
        if (!compatible) {
            config.outbounds.push(compatible_outbound);
            compatible = true;
        }
        o.outbounds.push(compatible_outbound.tag);
    }
});

// 最终输出（原版 sing-box 直接可用，无需第三方改造）
$content = JSON.stringify(config, null, 2);

/**
 * 按正则筛选节点名列表；不传正则则返回全部节点名
 * @param {Array} proxies  节点对象数组
 * @param {RegExp} [regex] 可选的匹配正则
 * @returns {Array<string>} 节点 tag 列表
 */
function getTags(proxies, regex) {
    return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
        (p) => p.tag,
    );
}
