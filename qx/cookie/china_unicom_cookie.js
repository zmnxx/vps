/*
 * 中国联通 Cookie 获取（单文件）
 * 仓库：https://github.com/zmnxx/vps/tree/main/qx/cookie
 *
 * ==================== 圈 X 使用 ====================
 * 1）风车 → 重写 → 引用：
 *    https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
 *    （本文件顶部 hostname + 规则可被资源解析器识别；
 *     若引用失败，用下面「手动添加」）
 *
 * 2）手动添加（最稳）：
 *    [重写规则]
 *    ^https?:\/\/m\.client\.10010\.com\/.+\/smartwisdomCommon url script-request-header https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
 *
 *    [MitM 主机名]
 *    m.client.10010.com
 *
 * 3）打开「中国联通」App → 首页点 流量 / 语音
 * 4）通知「Cookie 获取成功」，正文即为完整 Cookie
 *
 * 存储 Key：
 * - ChinaUnicom_Cookie
 * - YaYa_10010.cookie（兼容旧脚本）
 * ==================================================
 *
 * Quantumult X 重写资源（可被部分解析器识别）：
 * hostname = m.client.10010.com
 * ^https?:\/\/m\.client\.10010\.com\/.+\/smartwisdomCommon url script-request-header https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
 */

const NAME = "ChinaUnicom_Cookie";
const LEGACY_KEY = "YaYa_10010.cookie";
const $ = new Env("中国联通Cookie");

if (typeof $request !== "undefined") {
  getCookie();
} else {
  // 手动运行：查看已保存的 Cookie
  const saved = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
  if (saved) {
    console.log("======== 已保存 Cookie ========");
    console.log(saved);
    console.log("================================");
    $.msg("中国联通", "✅ 已保存的 Cookie", saved);
  } else {
    $.msg("中国联通", "暂无 Cookie", "请打开联通 App → 首页点流量/语音 进行抓取");
  }
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

    if (cookie.indexOf("JSESSIONID") === -1) {
      $.log("Cookie 不含 JSESSIONID，已忽略");
      return $.done();
    }

    const old = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
    if (old === cookie) {
      $.log("Cookie 未变化");
      $.msg("中国联通", "Cookie 未变化", cookie);
      return $.done();
    }

    $.setdata(cookie, NAME);
    $.setdata(cookie, LEGACY_KEY);

    // 通知正文直接给完整 Cookie，方便复制
    $.msg("中国联通", "✅ Cookie 获取成功", cookie);
    $.log("======== 中国联通 Cookie ========");
    $.log(cookie);
    $.log("Key: " + NAME + " / " + LEGACY_KEY);
    $.log("================================");
  } catch (e) {
    $.msg("中国联通", "❌ Cookie 获取失败", String(e));
    $.log(e);
  }
  $.done();
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
