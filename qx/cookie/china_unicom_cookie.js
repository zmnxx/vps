/*
 * 中国联通 - Cookie 获取（仅抓 Cookie）
 * 适配：Quantumult X / Surge / Loon / Shadowrocket
 *
 * 使用方法：
 * 1. 添加重写 + MITM（见 all.qx.conf 或 china_unicom_cookie.qx.conf）
 * 2. 打开「中国联通」官方 App
 * 3. 首页 → 流量 / 语音 / 流量查询
 * 4. 收到「Cookie 获取成功」通知即可
 *
 * 存储 Key：
 * - ChinaUnicom_Cookie
 * - YaYa_10010.cookie（兼容旧脚本）
 *
 * 仓库：https://github.com/zmnxx/vps/tree/main/qx/cookie
 */

const NAME = "ChinaUnicom_Cookie";
const LEGACY_KEY = "YaYa_10010.cookie";

const $ = new Env(NAME);

if (typeof $request !== "undefined") {
  getCookie();
} else {
  $.msg(NAME, "手动运行无效", "请通过重写在联通 App 内触发抓取");
  $.done();
}

function getCookie() {
  try {
    const headers = $request.headers || {};
    const cookie = headers.Cookie || headers.cookie || headers.COOKIE || "";

    if (!cookie) {
      $.log("未发现 Cookie 请求头");
      return $.done();
    }

    // 联通有效 Cookie 通常包含 JSESSIONID
    if (cookie.indexOf("JSESSIONID") === -1) {
      $.log("Cookie 不含 JSESSIONID，已忽略");
      return $.done();
    }

    const old = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
    const oldCookie = parseOld(old);

    if (oldCookie === cookie) {
      $.log("Cookie 未变化，跳过写入");
      return $.done();
    }

    $.setdata(cookie, NAME);
    $.setdata(cookie, LEGACY_KEY);

    $.msg(
      "中国联通",
      "✅ Cookie 获取成功",
      `预览: ${short(cookie, 50)}\n完整内容请运行「查看Cookie」任务或看日志`
    );
    $.log("======== 中国联通 抓取结果 ========");
    $.log("Cookie 已写入: " + NAME + " / " + LEGACY_KEY);
    $.log("Cookie 全文:\n" + cookie);
    $.log("================================");

  } catch (e) {
    $.msg("中国联通", "❌ Cookie 获取失败", String(e));
    $.log(e);
  }
  $.done();
}

function parseOld(v) {
  if (!v) return "";
  try {
    const j = JSON.parse(v);
    return j.cookie || j.val || v;
  } catch (_) {
    return v;
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
