# 🤖 PIXEL MECHA BATTLE

> 一个复古像素风双人机甲对战小游戏 · 纯前端 · 零依赖 · 开箱即玩

![GitHub](https://img.shields.io/badge/language-JavaScript-yellow)
![GitHub](https://img.shields.io/badge/platform-Web-blue)
![GitHub](https://img.shields.io/badge/license-MIT-green)
![GitHub](https://img.shields.io/badge/status-Demo-success)

两名玩家在同一台电脑上操控各自的像素机甲，在赛博朋克夜景下展开剑盾对决。先赢两局者获胜。

---

## ✨ 特性

- **纯代码绘制像素机甲** — 不依赖任何图片素材，机甲的每个像素均由 Canvas API 实时绘制，包含头盔、面甲发光眼、胸口核心、肩甲、背包排气口等细节
- **五套角色动画** — 待机、行走、跳跃、攻击（挥剑+光刃）、防御（举盾）、受击，腿部行走动画带正弦摆动
- **完整战斗系统** — 攻击起手→判定→收招三阶段、正面格挡弹反、无敌帧、击退硬直
- **丰富视觉反馈** — 屏幕震动、受击白闪、粒子四溅+冲击波环、伤害浮字、BLOCK 提示
- **赛博朋克场景** — 闪烁星空、远景城市霓虹窗户随机亮灭、地面透视网格
- **CRT 复古滤镜** — 扫描线叠加 + 屏幕暗角，还原老式街机质感
- **8-bit 音效** — 基于 Web Audio API 实时合成，命中、格挡、选择音效全部代码生成
- **三局两胜制** — 90 秒倒计时，血量归零或超时判定回合胜负
- **零依赖** — 不依赖任何框架、库或构建工具，纯 HTML + CSS + JS

---

## 🎮 操作方式

| 操作 | 玩家 1（蓝色机甲） | 玩家 2（红色机甲） |
|:---:|:---:|:---:|
| 左移 | `A` | `←` |
| 右移 | `D` | `→` |
| 跳跃 | `W` | `↑` |
| 攻击 | `F` | `K` |
| 防御 | `G` | `L` |
| 开始 / 重开 | `Space` | `Space` |

> **提示**：防御仅在面向对手时生效，可格挡正面攻击并弹开对手，但防御有持续时间限制。

---

## 🚀 快速开始

### 方式一：直接打开

下载项目后，用浏览器打开 `index.html` 即可游玩。

### 方式二：本地服务器（推荐）

```bash
# 使用 Python
python3 -m http.server 8080

# 或使用 Node.js
npx serve

# 然后浏览器访问 http://localhost:8080
```

### 方式三：在线 Demo

👉 [点击试玩](https://3a6ff7fa-0p-devc.preview.with.woa.com/index.html)

---

## 📁 项目结构

```
pixel-mecha-battle/
├── index.html        # 页面入口，含 CRT 滤镜叠加层
├── style.css         # 复古 CRT 样式（扫描线 / 暗角 / 像素化渲染）
├── game.js           # 完整游戏引擎（机甲绘制 / 物理 / 战斗 / 粒子 / HUD / 音效）
├── README.md         # 项目说明（本文件）
├── LICENSE           # MIT 开源协议
└── .gitignore        # Git 忽略规则
```

---

## 🛠️ 技术细节

| 模块 | 实现方式 |
|---|---|
| 渲染 | Canvas 2D API，`imageSmoothingEnabled = false` 保持像素硬边 |
| 像素绘制 | 以 3px 为基本单元，逐矩形 `fillRect` 拼接机甲部件 |
| 物理 | 自实现重力、摩擦、地面碰撞、边界限制 |
| 战斗 | 攻击帧窗口判定 + AABB 距离检测 + 格挡方向校验 |
| 音效 | Web Audio API 的 `OscillatorNode` 实时合成方波/锯齿波 |
| 状态机 | idle → walk / jump / attack / block / hit 状态切换 |

---

## 📸 游戏截图

> 截图待补充 — 欢迎提交 PR 添加游戏截图或 GIF

---

## 🗺️ 后续计划

- [ ] 增加角色选择（不同机甲型号）
- [ ] 增加更多场景（沙漠 / 太空 / 工厂）
- [ ] 增加必杀技系统（蓄力释放）
- [ ] 增加 AI 对手（单人模式）
- [ ] 增加音量控制与静音开关
- [ ] 移动端触屏适配

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源，可自由使用、修改和分发。

---

<p align="center">Made with ❤️ and pixels</p>
