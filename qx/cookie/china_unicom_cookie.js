/*
 * 中国联通 Cookie 获取
 * 不要把本 js 当作「重写资源」导入！
 * 请引用：https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/cookie.conf
 *
 * 抓取：打开联通 App → 首页点 流量/语音
 * 通知正文 = 完整 Cookie（点开通知长按复制）
 * 仅存本地，不上传
 * 存储：ChinaUnicom_Cookie / YaYa_10010.cookie
 */

const NAME = "ChinaUnicom_Cookie";
const LEGACY_KEY = "YaYa_10010.cookie";
const $ = new Env("中国联通Cookie");

if (typeof $request !== "undefined") {
  getCookie();
} else {
  const saved = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
  if (saved) {
    console.log(saved);
    $.msg("联通Cookie", "已保存", saved);
  } else {
    $.msg("中国联通", "暂无 Cookie", "请打开联通 App → 首页点流量/语音");
  }
  $.done();
}

function getCookie() {
  try {
    const headers = $request.headers || {};
    let cookie =
      headers.Cookie || headers.cookie || headers.COOKIE || "";

    if (!cookie) {
      for (const k of Object.keys(headers)) {
        if (String(k).toLowerCase() === "cookie" && headers[k]) {
          cookie = headers[k];
          break;
        }
      }
    }
    if (Array.isArray(cookie)) cookie = cookie.join("; ");
    cookie = String(cookie || "").trim();

    if (!cookie) {
      $.log("未发现 Cookie");
      return $.done();
    }
    if (cookie.indexOf("JSESSIONID") === -1) {
      $.log("无 JSESSIONID，忽略");
      return $.done();
    }

    cookie = cookie
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("; ");

    const old = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
    const changed = old !== cookie;

    $.setdata(cookie, NAME);
    $.setdata(cookie, LEGACY_KEY);

    $.msg(
      changed ? "✅ 联通Cookie已更新" : "联通Cookie未变化",
      "点开通知可复制完整 Cookie",
      cookie
    );
    console.log(cookie);
  } catch (e) {
    $.msg("中国联通", "❌ 获取失败", String(e));
    console.log(e);
  }
  $.done();
}

function Env(name) {
  const isQX = typeof $task !== "undefined";
  const isLoon = typeof $loon !== "undefined";
  const isSurge =
    typeof $httpClient !== "undefined" && typeof $loon === "undefined";

  this.log = (...a) => console.log(`[${name}]`, ...a);

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
    if (isQX) $notify(String(title), String(subtitle), String(body));
    else if (isSurge || isLoon) $notification.post(String(title), String(subtitle), String(body));
    else console.log(`${title}\n${subtitle}\n${body}`);
  };

  this.done = (val = {}) => {
    if (typeof $done === "function") $done(val);
  };
}
