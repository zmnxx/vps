const { type, name } = $arguments;

const compatible_outbound = {
  tag: "COMPATIBLE",
  type: "direct",
};

let compatible;
let config = JSON.parse($files[0]);

let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? "collection" : "subscription",
  platform: "sing-box",
  produceType: "internal",
});

config.outbounds.push(...proxies);

config.outbounds.map((i) => {
  // all: 所有节点
  if (["all"].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }
  // all-auto: 所有节点自动测速
  if (["all-auto"].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies));
  }
  // hk-auto: 香港节点
  if (["hk-auto"].includes(i.tag)) {
    i.outbounds.push(
      ...getTags(
        proxies,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(hk|hong.*kong)\b|港|香港|🇭🇰)/i,
      ),
    );
  }
  // tw-auto: 台湾节点
  if (["tw-auto"].includes(i.tag)) {
    i.outbounds.push(
      ...getTags(
        proxies,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(tw|taiwan)\b|🇹🇼|台|台湾)/i,
      ),
    );
  }
  // jp-auto: 日本节点
  if (["jp-auto"].includes(i.tag)) {
    i.outbounds.push(
      ...getTags(
        proxies,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(jp|japan)\b|日本|日|🇯🇵)/i,
      ),
    );
  }
  // sg-auto: 新加坡节点
  if (["sg-auto"].includes(i.tag)) {
    i.outbounds.push(
      ...getTags(
        proxies,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(sg|singapore)\b|🇸🇬|新加坡|新)/i,
      ),
    );
  }
  // us-auto: 美国节点
  if (["us-auto"].includes(i.tag)) {
    i.outbounds.push(
      ...getTags(
        proxies,
        /^(?!.*(?:网站|网址|获取|订阅|流量|到期|余量|续费|过期|重置|kr|korea|韩国)).*(\b(us|united.*states)\b|美|美国|🇺🇸)/i,
      ),
    );
  }
});

// 对空的 outbound 自动创建 COMPATIBLE(direct) 防止报错
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

function getTags(proxies, regex) {
  return (regex ? proxies.filter((p) => regex.test(p.tag)) : proxies).map(
    (p) => p.tag,
  );
}
