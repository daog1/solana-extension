// Background service worker for Solana AI Assistant with proper MCP integration

// Import Google GenAI
import { GoogleGenAI } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

interface Settings {
    geminiApiKey: string;
    mcpUrl: string;
    geminiModel: string;
    temperature: number;
    maxTokens: number;
    responseLanguage: string;
}

interface MCPTool {
    name: string;
    description?: string;
    inputSchema: {
        properties?: any;
        required?: string[];
    };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface TransactionSummaryResponse {
    summary: string;
    toolCalls: any[];
    toolResults: any[];
}

interface ChatResponse {
    response: string;
    toolCalls: any[];
    toolResults: any[];
}

interface MessageRequest {
    action: string;
    signature?: string;
    message?: string;
    history?: ChatMessage[];
}

class SolscanAIAssistant {
    private genAI: GoogleGenAI | null = null;
    private settings: Settings | null = null;
    private mcpTools: MCPTool[] | null = null;
    private mcpClient: Client | null = null;
    private geminiTools: any = null;

    constructor() {
        console.log('SolscanAIAssistant constructor called');
    }

    async init(): Promise<void> {
        try {
            console.log('Initializing Solana AI Assistant...');
            await this.loadSettings();
            console.log('Settings loaded');

            await this.initializeGemini();
            console.log('Gemini initialized');

            await this.loadMCPTools();
            console.log('MCP tools loaded');

            console.log('Solana AI Assistant initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            // Continue with partial initialization
        }
    }

    async loadSettings(): Promise<void> {
        const result = await chrome.storage.sync.get(['geminiApiKey', 'mcpUrl', 'geminiModel', 'temperature', 'maxTokens', 'responseLanguage']);
        this.settings = {
            geminiApiKey: result.geminiApiKey || '',
            mcpUrl: result.mcpUrl || '',
            geminiModel: result.geminiModel || 'gemini-2.5-pro',
            temperature: result.temperature || 0.7,
            maxTokens: result.maxTokens || 2048,
            responseLanguage: result.responseLanguage || 'zh-CN'
        };
        console.log('Settings loaded from chrome.storage');
    }

    async initializeGemini(): Promise<void> {
        if (!this.settings?.geminiApiKey) {
            console.warn('Gemini API key not configured');
            return;
        }

        try {
            this.genAI = new GoogleGenAI({ apiKey: this.settings.geminiApiKey });
            console.log('Gemini AI initialized');
        } catch (error) {
            console.error('Failed to initialize Gemini:', error);
        }
    }

    // Load MCP tools from sol-mcp server (lazy loaded)
    async loadMCPTools(): Promise<void> {
        if (!this.settings?.mcpUrl) {
            console.warn('MCP URL not configured');
            return;
        }

        if (this.mcpClient) {
            // Already loaded
            console.log('MCP tools already loaded');
            return;
        }

        console.log('Starting MCP tools loading...');

        try {
            // Create MCP client transport
            const mcpUrl = this.settings.mcpUrl;
            console.log('MCP URL:', mcpUrl);

            const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
                requestInit: {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            });
            console.log('Transport created');

            // Create MCP client
            this.mcpClient = new Client({
                name: 'solscan-ai-extension',
                version: '1.0.0'
            });
            console.log('MCP client created');

            // Connect to MCP server
            console.log('Connecting to MCP server...');
            await this.mcpClient.connect(transport);
            console.log('Connected to MCP server');

            // List available tools
            console.log('Listing MCP tools...');
            const toolsResponse = await this.mcpClient.listTools();
            this.mcpTools = (toolsResponse.tools || []) as MCPTool[];
            console.log('Loaded MCP tools:', this.mcpTools.length, this.mcpTools);

            // Convert MCP tools to Gemini function declarations
            this.geminiTools = this.convertMCPToolsToGemini(this.mcpTools);
            console.log('Converted to Gemini tools:', this.geminiTools);
        } catch (error) {
            console.error('Failed to load MCP tools:', error);
            console.error('Error details:', error.message, error.stack);
            // Don't set mcpTools to empty array on error, so we can retry
        }
    }

    // Convert MCP tool definitions to Gemini function declarations
    convertMCPToolsToGemini(mcpTools: MCPTool[]): any {
        if (!mcpTools || mcpTools.length === 0) {
            return null; // No tools available
        }

        const functionDeclarations = mcpTools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            parameters: {
                type: 'object',
                properties: tool.inputSchema?.properties || {},
                required: tool.inputSchema?.required || []
            }
        }));

        return [{
            functionDeclarations: functionDeclarations
        }];
    }

    // Call MCP tool
    async callMCPTool(toolName: string, parameters: any): Promise<any> {
        if (!this.mcpClient) {
            throw new Error('MCP client not initialized');
        }

        try {
            const result = await this.mcpClient.callTool({
                name: toolName,
                arguments: parameters
            });
            return result;
        } catch (error) {
            console.error('MCP tool call failed:', error);
            throw error;
        }
    }

    // Generate language-specific prompts
    getTransactionSummaryPrompt(signature: string, language: string): string {
        const prompts: { [key: string]: string } = {
            'zh-CN': `请分析这个Solana交易签名：${signature}

请提供以下信息：
1. 交易概述（Transaction Overview）
2. 涉及的账户（Accounts Involved）
3. 代币转账详情（Token Transfers）
4. 程序调用（Program Calls）
5. 交易费用（Transaction Fee）
6. 任何值得注意的风险或异常（Notable Risks or Anomalies）

请使用中文回复，并提供详细的技术分析。如果需要获取交易数据，请使用可用的工具。`,

            'en-US': `Please analyze this Solana transaction signature: ${signature}

Please provide the following information:
1. Transaction Overview
2. Accounts Involved
3. Token Transfer Details
4. Program Calls
5. Transaction Fee
6. Any notable risks or anomalies

Please respond in English and provide detailed technical analysis. Use available tools if you need to fetch transaction data.`,

            'ja-JP': `このSolana取引署名を分析してください：${signature}

以下の情報を提供してください：
1. 取引概要（Transaction Overview）
2. 関与するアカウント（Accounts Involved）
3. トークン転送の詳細（Token Transfers）
4. プログラム呼び出し（Program Calls）
5. 取引手数料（Transaction Fee）
6. 注目すべきリスクや異常（Notable Risks or Anomalies）

日本語で回答し、詳細な技術分析を提供してください。取引データを取得する必要がある場合は、利用可能なツールを使用してください。`,

            'ko-KR': `이 Solana 거래 서명을 분석하십시오: ${signature}

다음 정보를 제공하십시오:
1. 거래 개요 (Transaction Overview)
2. 관련 계정 (Accounts Involved)
3. 토큰 전송 세부사항 (Token Transfers)
4. 프로그램 호출 (Program Calls)
5. 거래 수수료 (Transaction Fee)
6. 주목할 만한 위험 또는 이상 (Notable Risks or Anomalies)

한국어로 답변하고 상세한 기술 분석을 제공하십시오. 거래 데이터를 가져와야 하는 경우 사용 가능한 도구를 사용하십시오.`
        };

        return prompts[language] || prompts['en-US'];
    }

    // Generate transaction summary using Gemini with MCP tools
    async generateTransactionSummary(signature: string): Promise<TransactionSummaryResponse> {
        if (!this.genAI) {
            throw new Error('Gemini AI not initialized. Please configure your API key.');
        }

        try {
            const prompt = this.getTransactionSummaryPrompt(signature, this.settings!.responseLanguage);

            const response = await this.genAI.models.generateContent({
                model: this.settings!.geminiModel,
                config: {
                    generationConfig: {
                        temperature: this.settings!.temperature,
                        maxOutputTokens: this.settings!.maxTokens,
                    }
                } as any,
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            });

            const responseParts = response.candidates?.[0]?.content?.parts;
            const textPart = responseParts ? responseParts.find((part: any) => part.text) : null;
            const finalText = textPart ? textPart.text : 'Unable to generate summary';

            return {
                summary: finalText,
                toolCalls: [],
                toolResults: []
            };
        } catch (error) {
            console.error('Failed to generate transaction summary:', error);
            throw error;
        }
    }

    getChatPrompt(signature: string, userMessage: string, conversationHistory: ChatMessage[], language: string): string {
        const basePrompts: { [key: string]: string } = {
            'zh-CN': `你正在分析Solana交易签名：${signature}

对话历史：
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

用户问题：${userMessage}

请基于交易数据提供准确、有帮助的回答。如果需要获取更多交易信息，请使用可用的工具。请用中文回复。`,

            'en-US': `You are analyzing a Solana transaction signature: ${signature}

Conversation history:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User question: ${userMessage}

Please provide an accurate and helpful response based on transaction data. Use available tools if you need to fetch more transaction information. Please respond in English.`,

            'ja-JP': `Solana取引署名を分析しています：${signature}

会話履歴：
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

ユーザー質問：${userMessage}

取引データに基づいて正確で役立つ回答を提供してください。より多くの取引情報を取得する必要がある場合は、利用可能なツールを使用してください。日本語で回答してください。`,

            'ko-KR': `Solana 거래 서명을 분석하고 있습니다: ${signature}

대화 기록:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

사용자 질문: ${userMessage}

거래 데이터를 기반으로 정확하고 도움이 되는 답변을 제공하십시오. 더 많은 거래 정보를 가져와야 하는 경우 사용 가능한 도구를 사용하십시오. 한국어로 답변하십시오.`
        };

        return basePrompts[language] || basePrompts['en-US'];
    }

    // Chat with transaction context
    async chatWithTransaction(signature: string, userMessage: string, conversationHistory: ChatMessage[], language: string): Promise<ChatResponse> {
        if (!this.genAI) {
            throw new Error('Gemini AI not initialized');
        }

        // Try to load MCP tools if not loaded yet
        if (!this.geminiTools) {
            console.log('MCP tools not loaded for chat, attempting to load...');
            await this.loadMCPTools();

            if (!this.geminiTools) {
                console.warn('MCP tools still not loaded for chat, proceeding without tools');
                this.geminiTools = null; // No tools available
            }
        }

        try {
            // Build conversation contents from history
            const contents: any[] = [];

            // Add conversation history
            for (const msg of conversationHistory) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }

            // Add current user message
            const context = this.getChatPrompt(signature, userMessage, [], this.settings!.responseLanguage);
            contents.push({
                role: 'user',
                parts: [{ text: context }]
            });

            const config: any = {
                generationConfig: {
                    temperature: this.settings!.temperature,
                    maxOutputTokens: this.settings!.maxTokens,
                },
                tools: this.geminiTools
            };

            // Only include tools if they are available
            if (this.geminiTools) {
                config.tools = this.geminiTools;
            }

            const response = await this.genAI.models.generateContent({
                model: this.settings!.geminiModel,
                config: config,
                contents: contents
            });

            // Get the text response, handling cases where it might be a function call only
            const responseParts = response.candidates?.[0]?.content?.parts;
            const chatTextPart = responseParts ? responseParts.find((part: any) => part.text) : null;
            let finalText = chatTextPart ? chatTextPart.text : '';
            let toolResults: any[] = [];
            let functionCalls: any[] = [];

            // Handle function calls if any
            const responsePartsForCalls = response.candidates?.[0]?.content?.parts;
            const functionCallParts = responsePartsForCalls ? responsePartsForCalls.filter((part: any) => part.functionCall) : [];
            if (functionCallParts.length > 0) {
                console.log('Gemini requested tool calls:', functionCallParts);

                functionCalls = functionCallParts.map((part: any) => part.functionCall);

                // Execute the tool calls
                for (const call of functionCalls) {
                    console.log(`Calling MCP tool: ${call.name} with args:`, call.args);
                    try {
                        const toolResult = await this.callMCPTool(call.name, call.args);
                        console.log(`MCP tool ${call.name} result:`, toolResult);
                        toolResults.push({
                            tool: call.name,
                            result: toolResult
                        });
                    } catch (error) {
                        console.error(`Tool call failed for ${call.name}:`, error);
                        toolResults.push({
                            tool: call.name,
                            error: error.message
                        });
                    }
                }

                // Create a new prompt that includes the tool results
                const toolResultsText = toolResults.map(result =>
                    `Tool: ${result.tool}\nResult: ${JSON.stringify(result.result, null, 2)}`
                ).join('\n\n');

                // Language-specific final prompt text
                const finalPromptAdditions: { [key: string]: string } = {
                    'zh-CN': `\n\n工具调用结果:\n${toolResultsText}\n\n请基于以上工具调用结果提供完整的交易分析总结。`,
                    'en-US': `\n\nTool Call Results:\n${toolResultsText}\n\nPlease provide a complete transaction analysis summary based on the above tool call results.`,
                    'ja-JP': `\n\nツール呼び出し結果:\n${toolResultsText}\n\n上記のツール呼び出し結果に基づいて完全な取引分析サマリーを提供してください。`,
                    'ko-KR': `\n\n도구 호출 결과:\n${toolResultsText}\n\n위의 도구 호출 결과를 기반으로 완전한 거래 분석 요약을 제공하십시오.`
                };

                const finalPrompt = context + (finalPromptAdditions[this.settings!.responseLanguage] || finalPromptAdditions['en-US']);

                console.log('Final prompt for AI analysis:', finalPrompt);

                const finalContents = [
                    {
                        role: 'user',
                        parts: [{ text: finalPrompt }]
                    }
                ];

                const finalConfig: any = {
                    generationConfig: {
                        temperature: this.settings!.temperature,
                        maxOutputTokens: this.settings!.maxTokens,
                    }
                };

                // Only include tools if they are available
                if (this.geminiTools) {
                    finalConfig.tools = this.geminiTools;
                }

                console.log('Making final AI call with model:', this.settings!.geminiModel);
                const finalResponse = await this.genAI.models.generateContent({
                    model: this.settings!.geminiModel,
                    config: finalConfig,
                    contents: finalContents
                });
                console.log('Final AI response received:', finalResponse);

                // Get the text response, handling cases where it might be a function call only
                const finalResponsePartsArray = finalResponse.candidates?.[0]?.content?.parts;
                console.log('Final response parts:', finalResponsePartsArray);
                const chatFinalTextPart = finalResponsePartsArray ? finalResponsePartsArray.find((part: any) => part.text) : null;
                console.log('Final text part found:', chatFinalTextPart);
                finalText = chatFinalTextPart ? chatFinalTextPart.text : '';
                console.log('Final response text extracted:', finalText);
            }

            console.log('Returning chat response:', { response: finalText, toolCalls: functionCalls.length, toolResults: toolResults.length });
            return {
                response: finalText,
                toolCalls: functionCalls,
                toolResults: toolResults
            };
        } catch (error) {
            console.error('Failed to chat with transaction:', error);
            throw error;
        }
    }

    // Reload settings
    async reloadSettings(): Promise<void> {
        await this.loadSettings();
        await this.initializeGemini();
        await this.loadMCPTools();
    }

    // Reload MCP tools
    async reloadMCPTools(): Promise<void> {
        this.mcpClient = null;
        this.mcpTools = null;
        this.geminiTools = null;
        await this.loadMCPTools();
    }

    // Get diagnostics
    getDiagnostics() {
        return {
            assistantCreated: true,
            assistantInitialized: isInitialized,
            settingsLoaded: !!this.settings,
            geminiInitialized: !!this.genAI,
            mcpToolsLoaded: Array.isArray(this.mcpTools) && this.mcpTools.length > 0
        };
    }


}

// Initialize the assistant
let assistant = null;
let isInitialized = false;

console.log('Background script starting...');

// Create assistant synchronously first
try {
    assistant = new SolscanAIAssistant();
    console.log('Solana AI Assistant instance created');
} catch (error) {
    console.error('Failed to create Solana AI Assistant:', error);
}

// Initialize asynchronously
if (assistant) {
    assistant.init().then(() => {
        isInitialized = true;
        console.log('Solana AI Assistant background script fully initialized');
    }).catch(error => {
        console.error('Failed to initialize Solana AI Assistant:', error);
    });
}

console.log('Background script basic initialization complete');

// Message handlers
chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
    console.log('Received message:', request.action, 'from:', sender?.url);

    try {
        if (request.action === 'diagnostics') {
            const diagnostics = assistant ? assistant.getDiagnostics() : {
                assistantCreated: false,
                assistantInitialized: false,
                settingsLoaded: false,
                geminiInitialized: false,
                mcpToolsLoaded: false
            };

            sendResponse({
                success: true,
                diagnostics
            });
            return true;
        }

        // Handle ping first - always respond
        if (request.action === 'ping') {
            console.log('Responding to ping');
            sendResponse({
                success: true,
                message: 'Extension is active (simplified mode)',
                timestamp: Date.now(),
                extensionId: chrome.runtime.id,
                assistantReady: false
            });
            return true;
        }



        // Handle AI functionality
        if (request.action === 'getTransactionSummary') {
            if (!request.signature) {
                sendResponse({ success: false, error: 'Transaction signature is required' });
                return true;
            }

            if (!assistant) {
                sendResponse({ success: false, error: 'AI assistant not initialized. Please check API keys.' });
                return true;
            }

            assistant.generateTransactionSummary(request.signature)
                .then(result => {
                    console.log('Transaction summary generated successfully');
                    sendResponse({ success: true, data: result });
                })
                .catch(error => {
                    console.error('Transaction summary generation failed:', error);
                    sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
                });
            return true;
        }

        if (request.action === 'chatWithTransaction') {
            if (!request.signature || !request.message) {
                sendResponse({ success: false, error: 'Transaction signature and message are required' });
                return true;
            }

            if (!assistant) {
                sendResponse({ success: false, error: 'AI assistant not initialized. Please check API keys.' });
                return true;
            }

            assistant.chatWithTransaction(
                request.signature,
                request.message,
                request.history || []
            )
                .then(result => {
                    console.log('Chat response generated successfully');
                    sendResponse({ success: true, data: result });
                })
                .catch(error => {
                    console.error('Chat response generation failed:', error);
                    sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
                });
            return true;
        }

        if (request.action === 'reloadSettings') {
            if (!assistant) {
                sendResponse({ success: false, error: 'AI assistant not available' });
                return true;
            }

            assistant.reloadSettings()
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        if (request.action === 'reloadMCPTools') {
            if (!assistant) {
                sendResponse({ success: false, error: 'AI assistant not available' });
                return true;
            }

            assistant.reloadMCPTools()
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        // For any other action, respond with not implemented
        console.log('Unknown action:', request.action);
        sendResponse({
            success: false,
            error: 'Unknown action: ' + request.action
        });
        return true;

    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({
            success: false,
            error: 'Internal error: ' + error.message
        });
        return true;
    }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Solana AI Assistant installed with MCP integration');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Solana AI Assistant started up');
});

// Handle extension suspension
chrome.runtime.onSuspend.addListener(() => {
    console.log('Solana AI Assistant suspending');
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        console.log('Settings changed:', Object.keys(changes));
        // Reload settings when they change
        assistant.loadSettings().then(() => {
            console.log('Settings reloaded after change');
        });
    }
});
