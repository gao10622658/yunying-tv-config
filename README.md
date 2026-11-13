# yunying-tv-config

云映 TV (`cc.yunying.tv`) 双源片源配置静态托管。

## 生效地址

```
https://gao10622658.github.io/yunying-tv-config/config.json
```

在 云映TV -> 设置 -> 资源配置 中填入以上地址并保存。

## 文件

| 文件 | 说明 |
| --- | --- |
| `config.json` | **主配置（当前生效）**：`parser_scripts: ["./source.js"]`，脚本同目录自托管，不依赖作者服务 |
| `config_abs.json` | 备用：`parser_scripts` 指向 `https://code.aston.rocks/source.js` |
| `source.js` | 官方解析脚本副本（325264 B，含 `mod_web_registerParsers`） |

## 配置内容

基于官方 `https://code.aston.rocks/demo.json`，启用其中默认关闭的 LIBVIO 源：

- 欧乐 (`olehdtvjson_parser`) — 14 分类
- LIBVIO (`libvio_script_parser`) — 16 分类

实测 `sourceCount=2` / `usableCount=2`；全局搜索双源共 22 条结果；播放链路验证通过。

## 回退

填回官方原版即恢复单源：

```
https://code.aston.rocks/demo.json
```

## 备注

- 云映TV 只接受公网 HTTPS 配置地址，内网 / 明文 HTTP 会被拒绝。
- 本仓库需保持 **public**，否则匿名访问 GitHub Pages / raw 会 404。
- 片源站点为第三方服务，可用性与合规性由使用方自行承担。
