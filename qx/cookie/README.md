# 中国联通 Cookie 获取（单文件）

只保留联通，只有一个脚本文件：

```text
qx/cookie/china_unicom_cookie.js
```

## 脚本地址

```text
https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
```

## 圈 X 配置（手动，最稳）

### 1. 重写规则

风车 → 重写 → 规则 → 添加：

```text
^https?:\/\/m\.client\.10010\.com\/.+\/smartwisdomCommon url script-request-header https://raw.githubusercontent.com/zmnxx/vps/main/qx/cookie/china_unicom_cookie.js
```

### 2. MitM 主机名

```text
m.client.10010.com
```

开启 MitM，安装并信任证书，打开重写总开关。

## 抓取

1. 打开 **中国联通** App  
2. 首页点 **流量 / 语音**  
3. 通知：**Cookie 获取成功**  
4. **通知正文就是完整 Cookie**，可直接复制  

## 再次查看

把该脚本加到「定时任务」后手动运行，或在重写里点脚本运行：  
会读取本地已保存的 Cookie 并再次通知显示。

## 存储 Key

- `ChinaUnicom_Cookie`
- `YaYa_10010.cookie`（兼容旧脚本）
