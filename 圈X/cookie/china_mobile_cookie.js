/*
 * 中国移动 - Cookie / 登录参数获取（精简版）
 * 适配：Quantumult X / Surge / Loon / Shadowrocket
 *
 * 使用方法：
 * 1. 添加重写 + MITM（见 all.qx.conf 或 china_mobile_cookie.qx.conf）
 * 2. 打开「中国移动」App
 * 3. 使用【手机验证码登录】（人脸登录通常抓不到）
 * 4. 收到成功通知即可
 *
 * 存储 Key：
 * - china_mobile_cookie   : Cookie 字符串
 * - china_mobile_body     : 登录请求体（部分场景后续接口需要）
 * - china_mobile_url      : 触发抓取的 URL
 * - china_mobile_headers  : 关键请求头（JSON）
 * - china_mobile_phonenumber : 识别到的手机号
 *
 * 说明：
 * 移动新版接口除 Cookie 外，常依赖登录 body 里的加密字段。
 * 本脚本会同时保存 Cookie 和 request body。
 *
 * 仓库：https://github.com/zmnxx/vps/tree/main/圈X/cookie
 */

const NAME = "ChinaMobile_Cookie";

const KEY_COOKIE = "china_mobile_cookie";
const KEY_BODY = "china_mobile_body";
const KEY_URL = "china_mobile_url";
const KEY_HEADERS = "china_mobile_headers";
const KEY_PHONE = "china_mobile_phonenumber";

const $ = new Env(NAME);

if (typeof $request !== "undefined") {
  capture();
} else {
  $.msg(NAME, "手动运行无效", "请通过重写在移动 App 登录时触发抓取");
  $.done();
}

function capture() {
  try {
    const url = $request.url || "";
    const headers = $request.headers || {};
    const method = ($request.method || "GET").toUpperCase();
    const body = $request.body || "";

    const cookie =
      headers.Cookie ||
      headers.cookie ||
      headers.COOKIE ||
      extractSetLike(headers) ||
      "";

    const phone = extractPhone(body) || $.getdata(KEY_PHONE) || "";

    if (!cookie && !body) {
      $.log("Cookie 与 Body 均为空，忽略");
      return $.done();
    }

    const oldCookie = $.getdata(KEY_COOKIE) || "";
    const oldBody = $.getdata(KEY_BODY) || "";

    if (cookie && cookie === oldCookie && body && body === oldBody) {
      $.log("参数未变化，跳过");
      return $.done();
    }

    if (cookie) $.setdata(cookie, KEY_COOKIE);
    if (body) $.setdata(body, KEY_BODY);
    $.setdata(url, KEY_URL);
    $.setdata(safeJson(headers), KEY_HEADERS);
    if (phone) $.setdata(phone, KEY_PHONE);

    const tip = [
      cookie ? "Cookie✅" : "Cookie❌",
      body ? "Body✅" : "Body❌",
      phone ? `手机:${phone}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    $.msg("中国移动", "✅ 参数获取成功", tip);
    $.log(`URL: ${url}`);
    $.log(`Method: ${method}`);
    $.log(`Cookie: ${short(cookie)}`);
    $.log(`Body: ${short(body, 120)}`);
  } catch (e) {
    $.msg("中国移动", "❌ 获取失败", String(e));
    $.log(e);
  }
  $.done();
}

function extractPhone(text) {
  if (!text) return "";
  const m =
    String(text).match(
      /(?:cellNum|phone|mobile|msisdn|tel|phonenumber)["'\s:=]+(1\d{10})/i
    ) || String(text).match(/(?<!\d)(1\d{10})(?!\d)/);
  return m ? m[1] : "";
}

function extractSetLike(headers) {
  for (const k of Object.keys(headers || {})) {
    if (/cookie/i.test(k) && headers[k]) return headers[k];
  }
  return "";
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj || {});
  } catch (_) {
    return "{}";
  }
}

function short(s, n = 80) {
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
