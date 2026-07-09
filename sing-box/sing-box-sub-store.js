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

// 将所有节点合并加入 outbounds 列表中
config.outbounds.push(...proxies);

// 提取所有节点的 tag
const allProxyTags = proxies.map(p => p.tag);

// 香港节点正则
const hkRegex = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(hk|hong.*kong)\b|港|香港|🇭🇰)/i;
// 台湾节点正则
const twRegex = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(tw|taiwan)\b|🇹🇼|台|台湾)/i;
// 日本节点正则
const jpRegex = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(jp|japan)\b|日本|日|🇯🇵)/i;
// 新加坡节点正则
const sgRegex = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(sg|singapore)\b|🇸🇬|新加坡|新)/i;
// 美国节点正则
const usRegex = /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(us|united.*states)\b|美|美国|🇺🇸)/i;

const hkTags = proxies.filter(p => hkRegex.test(p.tag)).map(p => p.tag);
const twTags = proxies.filter(p => twRegex.test(p.tag)).map(p => p.tag);
const jpTags = proxies.filter(p => jpRegex.test(p.tag)).map(p => p.tag);
const sgTags = proxies.filter(p => sgRegex.test(p.tag)).map(p => p.tag);
const usTags = proxies.filter(p => usRegex.test(p.tag)).map(p => p.tag);

// 遍历出站列表，填充 Proxy 组和自动选择组
config.outbounds.forEach(outbound => {
  if (outbound.tag === "Proxy") {
    // 所有的节点信息出现在 Proxy 组中
    // 并在 Proxy 组中也加入“自动选择”作为备选项
    outbound.outbounds.push("自动选择", ...allProxyTags);
  }
  if (outbound.tag === "自动选择") {
    // 自动选择组填入所有的节点
    outbound.outbounds.push(...allProxyTags);
  }
});

// 处理策略组中可能为空的情况
const directDirect = {
  tag: "直连-COMPATIBLE",
  type: "direct"
};

config.outbounds.forEach((outbound) => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(directDirect);
      compatible = true;
    }
    outbound.outbounds.push(directDirect.tag);
  }
});

$content = JSON.stringify(config, null, 2);
