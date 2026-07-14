/*
 * 中国联通 Cookie 获取
 * 不要把本 js 当作「重写资源」导入！
 * 请引用：https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/cookie.conf
 *
 * 抓取：打开联通 App → 首页点 流量/语音
 * - 通知正文 = 完整 Cookie（点开通知可复制）
 * - 同时尝试写入系统剪贴板，方便直接粘贴
 * - 仅存本地，不会上传任何服务器
 * 存储：ChinaUnicom_Cookie / YaYa_10010.cookie
 */

const NAME = "ChinaUnicom_Cookie";
const LEGACY_KEY = "YaYa_10010.cookie";
const $ = new Env("中国联通Cookie");

if (typeof $request !== "undefined") {
  getCookie();
} else {
  showSaved();
}

function showSaved() {
  const saved = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
  if (!saved) {
    $.msg("中国联通", "暂无 Cookie", "请打开联通 App → 首页点流量/语音");
    return $.done();
  }
  copyText(saved);
  // 标题/副标题尽量短，正文放完整 Cookie，方便点开后长按复制
  $.msg("联通Cookie", copyTip(true), saved);
  console.log(saved);
  $.done();
}

function getCookie() {
  try {
    const headers = $request.headers || {};
    // 兼容各种大小写 / 数组形式
    let cookie =
      headers.Cookie ||
      headers.cookie ||
      headers.COOKIE ||
      "";
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

    // 清洗首尾多余分号空格
    cookie = cookie
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("; ");

    const old = $.getdata(NAME) || $.getdata(LEGACY_KEY) || "";
    const changed = old !== cookie;

    $.setdata(cookie, NAME);
    $.setdata(cookie, LEGACY_KEY);
    copyText(cookie);

    const title = changed ? "✅ 联通Cookie已更新" : "联通Cookie未变化";
    // 完整 Cookie 放在通知 body，点开系统通知即可看到并复制
    $.msg(title, copyTip(true) + " · 点开本通知长按复制", cookie);
    console.log("======== Cookie 全文 ========");
    console.log(cookie);
    console.log("length =", cookie.length);
    console.log("============================");
  } catch (e) {
    $.msg("中国联通", "❌ 获取失败", String(e));
    console.log(e);
  }
  $.done();
}

function copyTip(ok) {
  return ok ? "已尝试复制到剪贴板" : "请点开通知复制";
}

function copyText(text) {
  try {
    // Quantumult X
    if (typeof $prefs !== "undefined" && typeof $prefs.setValueForKey === "function") {
      // 无官方剪贴板 API 时，至少保证本地可读
    }
    // Surge / Loon / Stash / Shadowrocket 常见剪贴板
    if (typeof $clipboard !== "undefined") {
      if (typeof $clipboard === "string" || typeof $clipboard === "object") {
        try {
          // Loon / Shadowrocket: $clipboard = "..."
          // 部分实现是 $clipboard.write / set
          if (typeof $clipboard.write === "function") {
            $clipboard.write(String(text));
            return true;
          }
          if (typeof $clipboard.set === "function") {
            $clipboard.set(String(text));
            return true;
          }
        } catch (_) {}
      }
      try {
        // 直接赋值写法（部分 Loon 版本）
        // eslint-disable-next-line no-global-assign
        $clipboard = String(text);
        return true;
      } catch (_) {}
    }
    // Surge
    if (typeof $utils !== "undefined" && typeof $utils.copy === "function") {
      $utils.copy(String(text));
      return true;
    }
  } catch (e) {
    console.log("copyText failed:", e);
  }
  return false;
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

  // QX 通知：title / subtitle / body
  // body 尽量放完整 Cookie；系统通知点开后可看全文
  this.msg = (title, subtitle = "", body = "") => {
    const t = String(title || "");
    const s = String(subtitle || "");
    const b = String(body || "");
    if (isQX) {
      // 部分旧版本对超长 body 会截断；同时打日志双保险
      $notify(t, s, b);
    } else if (isSurge || isLoon) {
      $notification.post(t, s, b);
    } else {
      console.log(`${t}\n${s}\n${b}`);
    }
  };

  this.done = (val = {}) => {
    if (typeof $done === "function") $done(val);
  };
}
