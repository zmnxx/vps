/*
 * 查看已抓取的联通/移动 Cookie
 * 用法：圈 X → 风车 → 工具 → 重写/脚本 或 添加定时任务后手动运行
 *
 * 任务配置示例：
 * event-interaction https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/view_cookie.js, tag=查看Cookie, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/10010.png, enabled=true
 *
 * 或 task_local：
 * 0 0 1 1 * https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/view_cookie.js, tag=查看Cookie, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/10010.png, enabled=true
 */

const NAME = "查看Cookie";
const $ = new Env(NAME);

const KEYS = {
  unicom: [
    ["ChinaUnicom_Cookie", "联通 Cookie"],
    ["YaYa_10010.cookie", "联通 Cookie(兼容)"],
  ],
  mobile: [
    ["china_mobile_cookie", "移动 Cookie"],
    ["china_mobile_body", "移动 Body"],
    ["china_mobile_phonenumber", "移动手机号"],
    ["china_mobile_url", "移动触发URL"],
    ["china_mobile_headers", "移动 Headers"],
  ],
};

(async () => {
  const lines = [];
  let hasAny = false;

  lines.push("======== 中国联通 ========");
  for (const [key, label] of KEYS.unicom) {
    const val = $.getdata(key);
    if (val) {
      hasAny = true;
      lines.push(`✅ ${label}`);
      lines.push(`Key: ${key}`);
      lines.push(val);
      lines.push("------------------------");
    } else {
      lines.push(`❌ ${label} 为空 (${key})`);
    }
  }

  lines.push("");
  lines.push("======== 中国移动 ========");
  for (const [key, label] of KEYS.mobile) {
    const val = $.getdata(key);
    if (val) {
      hasAny = true;
      lines.push(`✅ ${label}`);
      lines.push(`Key: ${key}`);
      lines.push(val);
      lines.push("------------------------");
    } else {
      lines.push(`❌ ${label} 为空 (${key})`);
    }
  }

  const text = lines.join("\n");
  console.log(text);

  // 通知里放摘要；完整内容在「运行结果 / 日志」
  const mobileCookie = $.getdata("china_mobile_cookie") || "";
  const unicomCookie = $.getdata("ChinaUnicom_Cookie") || $.getdata("YaYa_10010.cookie") || "";
  const summary = [
    unicomCookie ? `联通Cookie: ${short(unicomCookie, 40)}` : "联通Cookie: 无",
    mobileCookie ? `移动Cookie: ${short(mobileCookie, 40)}` : "移动Cookie: 无",
  ].join("\n");

  if (!hasAny) {
    $.msg(NAME, "还没有抓到任何 Cookie", "请先打开联通/移动 App 触发抓取");
  } else {
    $.msg(NAME, "✅ 已输出到日志", summary + "\n\n完整内容请看脚本运行日志");
  }

  $.done();
})().catch((e) => {
  console.log(e);
  $.msg(NAME, "运行失败", String(e));
  $.done();
});

function short(s, n = 40) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n) + "..." : s;
}

function Env(name) {
  const isQX = typeof $task !== "undefined";
  const isLoon = typeof $loon !== "undefined";
  const isSurge =
    typeof $httpClient !== "undefined" && typeof $loon === "undefined";

  this.name = name;
  this.log = (...args) => console.log(`[${name}]`, ...args);

  this.getdata = (key) => {
    if (isQX) return $prefs.valueForKey(key);
    if (isSurge || isLoon) return $persistentStore.read(key);
    return null;
  };

  this.setdata = (val, key) => {
    if (isQX) return $prefs.setValueForKey(String(val), key);
    if (isSurge || isLoon) return $persistentStore.write(String(val), key);
    return false;
  };

  this.msg = (title, subtitle = "", body = "") => {
    if (isQX) $notify(title, subtitle, body);
    else if (isSurge) $notification.post(title, subtitle, body);
    else if (isLoon) $notification.post(title, subtitle, body);
    else console.log(`${title}\n${subtitle}\n${body}`);
  };

  this.done = (val = {}) => {
    if (typeof $done === "function") $done(val);
  };
}
