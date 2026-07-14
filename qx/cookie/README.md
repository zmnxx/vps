# 联通 / 移动 Cookie 获取（Quantumult X）

仓库路径：[`qx/cookie`](https://github.com/zmnxx/vps/tree/main/qx/cookie)

仅抓取 Cookie（移动额外保存登录 Body），给圈 X 重写使用。

> 路径使用纯英文 `qx/cookie`，避免中文目录在 GitHub / 圈 X 中乱码。

## 文件

| 文件 | 说明 |
|------|------|
| `all.qx.conf` | **推荐**：联通+移动合并配置 |
| `china_unicom_cookie.js` | 联通抓 Cookie 脚本 |
| `china_unicom_cookie.qx.conf` | 仅联通配置 |
| `china_mobile_cookie.js` | 移动抓 Cookie/Body 脚本 |
| `china_mobile_cookie.qx.conf` | 仅移动配置 |
| `boxjs.json` | 可选，方便查看已抓到的值 |

## 一键订阅（圈 X）

```text
https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/all.qx.conf
```

备用（jsDelivr）：

```text
https://cdn.jsdelivr.net/gh/zmnxx/vps@main/qx/cookie/all.qx.conf
```

## 使用步骤

1. 圈 X → 重写 → 引用 / 订阅上面的 `all.qx.conf` 并启用  
2. 开启 MITM，信任证书  
3. 抓取：
   - **联通**：打开联通 App → 首页点「流量 / 语音」
   - **移动**：打开移动 App → **手机验证码登录**（人脸通常无效）
4. 收到成功通知即可

## 存储 Key

### 联通

- `ChinaUnicom_Cookie`
- `YaYa_10010.cookie`（兼容旧脚本）

### 移动

- `china_mobile_cookie`
- `china_mobile_body`
- `china_mobile_url`
- `china_mobile_headers`
- `china_mobile_phonenumber`

## 脚本直链

```text
https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_mobile_cookie.js
```

## 注意

- Cookie 属于账号凭证，勿公开分享已抓到的内容  
- 移动部分接口不只靠 Cookie，脚本会连登录 Body 一起保存  
- 仅供个人学习/查询使用
