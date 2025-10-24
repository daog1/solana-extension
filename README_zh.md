# Solana AI Assistant

一个浏览器扩展，为Solscan交易页面提供AI驱动的交易分析和对话功能，采用真正的MCP (Model Context Protocol) 架构。

## 功能特性

- 🤖 **AI交易总结**: Gemini AI自动分析Solana交易并生成多语言总结
- 💬 **智能对话**: 与AI助手对话，深入了解交易细节
- 🔗 **MCP集成**: 通过Model Context Protocol让AI直接调用sol-mcp工具
- 🎯 **精准定位**: 仅在Solscan交易页面 (`/tx/*`) 激活
- 🌍 **多语言支持**: 支持中文、英文、日文、韩文
- ⚡ **工具调用**: AI可以智能调用区块链数据获取工具

## 技术架构

```
浏览器扩展 → Gemini AI (带MCP工具) → MCP协议 → sol-mcp服务器 → 区块链数据
```

### MCP工作流程
1. 用户访问Solscan交易页面
2. 扩展检测交易签名
3. 根据用户语言偏好配置AI提示词
4. Gemini AI接收分析请求并自动判断需要调用哪些MCP工具
5. Gemini通过function calling机制调用sol-mcp工具获取交易数据
6. 扩展执行工具调用并将结果返回给Gemini
7. Gemini基于完整数据生成对应语言的智能分析

### 修复内容
- ✅ 使用正确的`@google/genai`包（版本1.26.0）
- ✅ 使用官方`@modelcontextprotocol/sdk`实现MCP客户端
- ✅ 修正了Gemini API的function calling使用方式
- ✅ 实现了正确的MCP工具调用流程（StreamableHTTP transport）
- ✅ 使用`gemini-2.0-flash-exp`模型
- ✅ 使用chat session维护对话上下文
- ✅ 支持多语言AI响应

### 语言支持
- **中文 (zh-CN)**: 完整的中文分析和对话
- **English (en-US)**: 原生英文响应
- **日本語 (ja-JP)**: 日文用户界面和分析
- **한국어 (ko-KR)**: 韩文用户界面和分析

## 安装步骤

### 1. 下载和构建
```bash
git clone <repository-url>
cd solana-ai-extension
npm install  # 安装 @google/genai 依赖
npm run build  # 使用webpack打包
```

### 2. 加载到Chrome
1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `solana-ai-extension/dist` 文件夹

### 3. 配置API密钥和偏好
1. 点击扩展图标打开设置页面
2. 配置以下API密钥：
   - **Gemini API Key**: 从 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取
   - **Sol-MCP API Key**: 用于访问Solana交易分析服务
3. 设置响应语言：
   - 中文 (Chinese)
   - English
   - 日本語 (Japanese)
   - 한국어 (Korean)

## 使用方法

### 自动分析
访问任何Solscan交易页面（如 `https://solscan.io/tx/{signature}`），扩展会自动：
1. 检测交易签名
2. Gemini AI通过MCP协议调用sol-mcp工具获取交易数据
3. 基于完整区块链数据生成智能分析总结
4. 显示在页面右侧

### 智能对话
- 点击页面右下角的聊天按钮 💬
- 或在分析面板中点击"开始对话"
- 与AI助手对话，询问交易相关问题
- AI会根据需要自动调用MCP工具获取更多数据

### MCP工具支持
扩展支持以下sol-mcp工具：
- `get_solana_transaction`: 获取完整交易信息
- `analyze_solana_instruction`: 分析特定指令
- `get_transaction_with_inner_instructions`: 获取调用链
- 其他sol-mcp提供的区块链分析工具

## 技术架构

```
solana-ai-extension/
├── manifest.json          # 扩展配置
├── popup.html/js/css      # 设置页面
├── background.js          # 后台服务 (API调用)
├── content.js/css         # 页面注入脚本
├── icons/                 # 扩展图标
└── _locales/              # 国际化
```

### API集成

#### Gemini API
- 用于生成交易分析和对话响应
- 支持多种模型：gemini-pro, gemini-pro-vision
- 可配置温度和最大token数

#### Sol-MCP API
- 获取详细的Solana交易数据
- 支持指令解析和调用链分析
- 提供结构化交易信息

## 开发说明

### 替换图标
当前使用占位符图标，请替换为实际的PNG文件：
- `icons/icon16.png` - 16x16px
- `icons/icon32.png` - 32x32px
- `icons/icon48.png` - 48x48px
- `icons/icon128.png` - 128x128px

### 自定义样式
修改 `content.css` 来自定义UI外观，适配不同主题。

### 扩展功能
可以通过修改以下文件添加新功能：
- `background.js` - 添加新的API集成
- `content.js` - 修改页面行为
- `popup.html/js` - 扩展设置选项

## 隐私与安全

- API密钥存储在浏览器本地存储中
- 不会收集或上传用户浏览数据
- 所有API调用都通过官方服务

## 测试扩展

### 重要：测试环境说明
`test.html` 是一个独立的HTML文件，**不能直接在浏览器中打开测试Chrome扩展API**。只有在扩展上下文中运行的页面才能访问 `chrome.*` API。

### 正确测试方法

#### 方法1：通过扩展Popup测试
1. 加载扩展到Chrome后，点击扩展图标打开设置页面
2. 在设置页面中测试各项功能
3. 使用"Verify Settings"按钮验证设置是否保存

#### 方法2：通过Solscan页面测试
1. 访问任意Solscan交易页面，如：
   `https://solscan.io/tx/3UchdzqSe8C2HXTXH1fCiZgGiQ72Y4PGV1zBgxnVYwkoka47sCzA9Zs9Hmu8LT3PQMSRTxfeFAX38t2i5FtvCCAJ`
2. 确认AI分析面板出现在页面右侧
3. 测试对话功能和API调用

#### 方法3：通过开发者工具测试
1. 在Solscan页面按F12打开开发者工具
2. 在Console中运行以下命令测试扩展：
   ```javascript
   // 测试扩展连接
   chrome.runtime.sendMessage({ action: 'ping' }).then(response => console.log(response));

   // 测试设置
   chrome.storage.sync.get(['geminiApiKey', 'solMcpApiKey']).then(settings => console.log(settings));
   ```

### 故障排除测试

如果遇到连接问题：
1. 打开 `chrome://extensions/`
2. 找到Solana AI Assistant扩展
3. 点击"重新加载"按钮
4. 检查"错误"部分是否有错误信息
5. 打开浏览器开发者工具查看控制台错误

## 故障排除

### 扩展不显示
- 确认在Solscan交易页面 (`/tx/*` 路径)
- 检查API密钥是否正确配置
- 查看浏览器控制台错误信息

### API调用失败
- 验证API密钥有效性
- 检查网络连接
- 确认API配额充足

### 样式问题
- 尝试刷新页面
- 检查是否与其他扩展冲突
- 确认Solscan页面结构未发生变化

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License