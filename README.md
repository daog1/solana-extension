# Solana AI Assistant

A browser extension that provides AI-powered transaction analysis and chat functionality for Solscan transaction pages, using a true MCP (Model Context Protocol) architecture.

## Features

- 🤖 **AI Transaction Summary**: Gemini AI automatically analyzes Solana transactions and generates multi-language summaries
- 💬 **Smart Chat**: Chat with AI assistant to understand transaction details in depth
- 🔗 **MCP Integration**: AI directly calls sol-mcp tools through Model Context Protocol
- 🎯 **Precise Targeting**: Only activates on Solscan transaction pages (`/tx/*`)
- 🌍 **Multi-language Support**: Supports Chinese, English, Japanese, Korean
- ⚡ **Tool Calling**: AI can intelligently call blockchain data retrieval tools

## Technical Architecture

```
Browser Extension → Gemini AI (with MCP tools) → MCP Protocol → sol-mcp Server → Blockchain Data
```

### MCP Workflow
1. User visits Solscan transaction page
2. Extension detects transaction signature
3. Configures AI prompts based on user language preferences
4. Gemini AI receives analysis request and automatically determines which MCP tools to call
5. Gemini calls sol-mcp tools through function calling mechanism to get transaction data
6. Extension executes tool calls and returns results to Gemini
7. Gemini generates intelligent analysis based on complete data

### Fixes Implemented
- ✅ Use correct `@google/genai` package (version 1.26.0)
- ✅ Use official `@modelcontextprotocol/sdk` for MCP client implementation
- ✅ Fixed Gemini API function calling usage
- ✅ Implemented correct MCP tool calling flow (StreamableHTTP transport)
- ✅ Use `gemini-2.0-flash-exp` model
- ✅ Use chat session to maintain conversation context
- ✅ Support multi-language AI responses

### Language Support
- **Chinese (zh-CN)**: Complete Chinese analysis and chat
- **English (en-US)**: Native English responses
- **Japanese (ja-JP)**: Japanese UI and analysis
- **Korean (ko-KR)**: Korean UI and analysis

## Installation Steps

### 1. Download and Build
```bash
git clone <repository-url>
cd solana-ai-extension
npm install  # Install @google/genai dependencies
npm run build  # Use webpack to bundle
```

### 2. Load into Chrome
1. Open Chrome browser and visit `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked extension"
4. Select the `solana-ai-extension/dist` folder

### 3. Configure API Keys and Preferences
1. Click the extension icon to open the settings page
2. Configure the following API keys:
   - **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **Sol-MCP API Key**: For accessing Solana transaction analysis service
3. Set response language:
   - Chinese
   - English
   - Japanese
   - Korean

## Usage

### Automatic Analysis
Visit any Solscan transaction page (like `https://solscan.io/tx/{signature}`), the extension will automatically:
1. Detect transaction signature
2. Gemini AI calls sol-mcp tools through MCP protocol to get transaction data
3. Generate intelligent analysis summary based on complete blockchain data
4. Display on the right side of the page

### Smart Chat
- Click the chat button 💬 in the bottom right corner of the page
- Or click "Start Chat" in the analysis panel
- Chat with AI assistant and ask transaction-related questions
- AI will automatically call MCP tools to get more data as needed

### MCP Tool Support
The extension supports the following sol-mcp tools:
- `get_solana_transaction`: Get complete transaction information
- `analyze_solana_instruction`: Analyze specific instructions
- `get_transaction_with_inner_instructions`: Get call chain
- Other blockchain analysis tools provided by sol-mcp

## Technical Architecture

```
solana-ai-extension/
├── manifest.json          # Extension configuration
├── popup.html/js/css      # Settings page
├── background.js          # Background service (API calls)
├── content.js/css         # Page injection scripts
├── icons/                 # Extension icons
└── _locales/              # Internationalization
```

### API Integration

#### Gemini API
- Used to generate transaction analysis and chat responses
- Supports multiple models: gemini-pro, gemini-pro-vision
- Configurable temperature and max tokens

#### Sol-MCP API
- Get detailed Solana transaction data
- Supports instruction parsing and call chain analysis
- Provides structured transaction information

## Development Notes

### Replace Icons
Current placeholder icons, please replace with actual PNG files:
- `icons/icon16.png` - 16x16px
- `icons/icon32.png` - 32x32px
- `icons/icon48.png` - 48x48px
- `icons/icon128.png` - 128x128px

### Custom Styling
Modify `content.css` to customize UI appearance and adapt to different themes.

### Extend Functionality
New features can be added by modifying these files:
- `background.js` - Add new API integrations
- `content.js` - Modify page behavior
- `popup.html/js` - Extend settings options

## Privacy & Security

- API keys are stored in browser local storage
- Does not collect or upload user browsing data
- All API calls go through official services

## Testing the Extension

### Important: Testing Environment Notes
`test.html` is a standalone HTML file that **cannot be opened directly in browser to test Chrome extension APIs**. Only pages running in extension context can access `chrome.*` APIs.

### Correct Testing Methods

#### Method 1: Test through Extension Popup
1. After loading extension into Chrome, click extension icon to open settings page
2. Test various functions in the settings page
3. Use "Verify Settings" button to verify if settings are saved

#### Method 2: Test through Solscan Page
1. Visit any Solscan transaction page, such as:
   `https://solscan.io/tx/3UchdzqSe8C2HXTXH1fCiZgGiQ72Y4PGV1zBgxnVYwkoka47sCzA9Zs9Hmu8LT3PQMSRTxfeFAX38t2i5FtvCCAJ`
2. Confirm AI analysis panel appears on the right side of the page
3. Test chat functionality and API calls

#### Method 3: Test through Developer Tools
1. Press F12 on Solscan page to open developer tools
2. Run the following commands in Console to test extension:
   ```javascript
   // Test extension connection
   chrome.runtime.sendMessage({ action: 'ping' }).then(response => console.log(response));

   // Test settings
   chrome.storage.sync.get(['geminiApiKey', 'solMcpApiKey']).then(settings => console.log(settings));
   ```

### Troubleshooting Tests

If connection issues occur:
1. Open `chrome://extensions/`
2. Find the Solana AI Assistant extension
3. Click the "Reload" button
4. Check the "Errors" section for error information
5. Open browser developer tools to view console errors

## Troubleshooting

### Extension Not Showing
- Confirm you are on Solscan transaction pages (`/tx/*` path)
- Check if API keys are configured correctly
- View browser console for error messages

### API Call Failures
- Verify API key validity
- Check network connection
- Confirm API quota is sufficient

### Styling Issues
- Try refreshing the page
- Check for conflicts with other extensions
- Confirm Solscan page structure hasn't changed

## Contributing

Welcome to submit Issues and Pull Requests to improve this project.

## License

MIT License