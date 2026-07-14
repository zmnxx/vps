# 联通 / 移动 Cookie 获取（Quantumult X）

仓库路径：[`qx/cookie`](https://github.com/zmnxx/vps/tree/main/qx/cookie)

仅抓取 Cookie（移动额外保存登录 Body）。

## 一键订阅（重写引用）

```text
https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/all.qx.conf
```

备用：

```text
https://cdn.jsdelivr.net/gh/zmnxx/vps@main/qx/cookie/all.qx.conf
```

## 圈 X 导入步骤（很重要）

1. 打开 **Quantumult X**
2. 右下角 **风车** → **重写**
3. 点右上角 **引用**
4. 粘贴上面的链接，标签随便写：`cookie`
5. 保存后 **开启** 该重写资源
6. 回到风车 → **MitM**  
   - 开启 MitM  
   - 生成并安装证书，系统里「信任」证书  
   - 主机名里应自动有：  
     `m.client.10010.com, client.app.coc.10086.cn`  
     （没有就手动加）
7. 再开一次 **重写** 总开关

> 注意：这是「重写资源」链接，不是「配置文件 / 节点订阅」。  
> 不要丢到「商店 / 画廊 / 配置文件」里硬导。

## 抓取方法

| 运营商 | 操作 | 成功提示 |
|--------|------|----------|
| 联通 | 打开联通 App → 首页点 **流量 / 语音** | Cookie 获取成功 |
| 移动 | 打开移动 App → **验证码登录** | 参数获取成功 |

## 文件说明

| 文件 | 用途 |
|------|------|
| `all.qx.conf` | 联通+移动 合并重写资源（推荐） |
| `china_unicom_cookie.qx.conf` | 仅联通 |
| `china_mobile_cookie.qx.conf` | 仅移动 |
| `china_unicom_cookie.js` | 联通脚本 |
| `china_mobile_cookie.js` | 移动脚本 |
| `boxjs.json` | 可选，查看已抓到的值 |

## 存储 Key

### 联通
- `ChinaUnicom_Cookie`
- `YaYa_10010.cookie`

### 移动
- `china_mobile_cookie`
- `china_mobile_body`
- `china_mobile_url`
- `china_mobile_headers`
- `china_mobile_phonenumber`

## 如果还是导入失败

### 方案 A：手动添加（最稳）

风车 → 重写 → 规则 → 添加两条：

```text
^https?:\/\/m\.client\.10010\.com\/.+\/smartwisdomCommon url script-request-header https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js

^https?:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/[LD]N\/(uam(onekey|randcode)login|realPersonAuthentication)\/autoLogin url script-request-body https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_mobile_cookie.js
```

然后 MitM 主机名加入：

```text
m.client.10010.com, client.app.coc.10086.cn
```

### 方案 B：Safari 打开链接检查

用 Safari 打开订阅链接，应直接显示文本内容，而不是 GitHub 网页。

## 注意

- Cookie 属于账号凭证，勿公开分享  
- 移动部分接口不只靠 Cookie，脚本会连登录 Body 一起保存  
- 仅供个人学习/查询使用
