// Content script for Solana AI Assistant
import { marked } from 'marked';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// UI text translations
const uiTranslations = {
    'zh-CN': {
        aiAnalysis: '🤖 AI 交易分析',
        aiChat: '💬 AI 交易对话',
        startAnalysis: '🚀',
        refreshAnalysis: '🔄',
        startChat: '💬',
        collapse: '−',
        expand: '+',
        analyzing: '正在分析交易...',
        welcome: '点击上方按钮开始AI分析或对话',
        error: '❌ 分析失败: ',
        troubleshooting: '请确保扩展已正确加载并配置了API密钥',
        retry: '重试',
        welcomeMessage: '您好！我是交易分析助手，可以帮您深入了解这个交易的详细信息。请问您有什么问题？',
        typing: '正在输入...',
        errorResponse: '❌ 抱歉，出现错误: '
    },
    'en-US': {
        aiAnalysis: '🤖 AI Transaction Analysis',
        aiChat: '💬 AI Transaction Chat',
        startAnalysis: '🚀',
        refreshAnalysis: '🔄',
        startChat: '💬',
        collapse: '−',
        expand: '+',
        analyzing: 'Analyzing transaction...',
        welcome: 'Click the buttons above to start AI analysis or chat',
        error: '❌ Analysis failed: ',
        troubleshooting: 'Please ensure the extension is properly loaded and API keys are configured',
        retry: 'Retry',
        welcomeMessage: 'Hello! I am a transaction analysis assistant who can help you understand the details of this transaction. What questions do you have?',
        typing: 'Typing...',
        errorResponse: '❌ Sorry, an error occurred: '
    }
};

class SolscanAIAssistant {
    private transactionSignature: string | null = null;
    private summaryPanel: HTMLElement | null = null;
    private chatPanel: HTMLElement | null = null;
    private isLoading: boolean = false;
    private conversationHistory: ChatMessage[] = [];
    private currentLanguage: string = 'en-US';

    constructor() {
        this.init();
    }

    async init(): Promise<void> {
        // Load language setting first
        await this.loadLanguageSetting();

        // Extract transaction signature from URL
        this.transactionSignature = this.extractTransactionSignature();
        if (!this.transactionSignature) {
            console.log('Not a transaction page, skipping initialization');
            return;
        }

        console.log('Initializing Solana AI Assistant for transaction:', this.transactionSignature);

        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }

        // Also watch for dynamic content changes
        this.observePageChanges();
    }

    async loadLanguageSetting(): Promise<void> {
        try {
            const result = await chrome.storage.sync.get('responseLanguage');
            this.currentLanguage = result.responseLanguage || 'en-US';
        } catch (error) {
            console.warn('Failed to load language setting:', error);
            this.currentLanguage = 'en-US';
        }
    }

    extractTransactionSignature(): string | null {
        const pathParts = window.location.pathname.split('/');
        const txIndex = pathParts.findIndex(part => part === 'tx');

        if (txIndex !== -1 && txIndex < pathParts.length - 1) {
            return pathParts[txIndex + 1];
        }

        return null;
    }

    observePageChanges(): void {
        // Watch for URL changes (SPA navigation)
        let currentUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                const newSignature = this.extractTransactionSignature();
                if (newSignature && newSignature !== this.transactionSignature) {
                    this.transactionSignature = newSignature;
                    this.resetUI();
                    this.initializeUI();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    initializeUI(): void {
        // Wait a bit for Solscan to load its content
        setTimeout(() => {
            this.createSummaryPanel();
            this.createChatButton();
        }, 2000);
    }

    createSummaryPanel(): void {
        // Remove existing panel if any
        if (this.summaryPanel) {
            this.summaryPanel.remove();
        }

        const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];

        // Create summary panel
        this.summaryPanel = document.createElement('div');
        this.summaryPanel.id = 'solscan-ai-summary-panel';
        this.summaryPanel.innerHTML = `
            <div class="ai-summary-header">
                <h3>${t.aiAnalysis}</h3>
                <div class="ai-header-actions">
                    <button class="ai-header-button" id="startAnalysis" title="${t.aiAnalysis}">${t.startAnalysis}</button>
                    <button class="ai-header-button" id="refreshSummary" style="display: none;" title="${t.refreshAnalysis}">${t.refreshAnalysis}</button>
                    <button class="ai-header-button" id="openChat" title="${t.aiChat}">${t.startChat}</button>
                    <button class="ai-summary-toggle" id="summaryToggle">${t.collapse}</button>
                </div>
            </div>
            <div class="ai-summary-content" id="summaryContent">
                <div class="ai-summary-welcome">
                    <p>${t.welcome}</p>
                </div>
            </div>
        `;

        // Position the panel - try to find a good spot in Solscan layout
        this.positionSummaryPanel();

        // Add event listeners
        this.bindSummaryPanelEvents();
    }

    positionSummaryPanel(): void {
        // Try to find a better insertion point for Solscan
        let insertPoint = null;
        let insertMethod = 'append';

        // Look for Solscan-specific containers
        const candidates = [
            document.querySelector('[class*="transaction"]'),
            document.querySelector('[class*="tx-"]'),
            document.querySelector('.container'),
            document.querySelector('.main-content'),
            document.querySelector('main'),
            document.querySelector('#__next'), // Next.js app container
            document.body
        ];

        // Find the first visible container
        for (const candidate of candidates) {
            if (candidate && (candidate as HTMLElement).offsetHeight > 0) {
                insertPoint = candidate as HTMLElement;
                break;
            }
        }

        // If we found a container, try to insert at the top
        if (insertPoint && insertPoint !== document.body) {
            // Try to insert before the first meaningful child
            const firstChild = Array.from(insertPoint.children).find(child =>
                (child as HTMLElement).offsetHeight > 0 &&
                !(child as Element).classList.contains('sr-only') &&
                getComputedStyle(child as Element).display !== 'none'
            );

            if (firstChild) {
                insertPoint.insertBefore(this.summaryPanel, firstChild);
                insertMethod = 'insertBefore';
            } else {
                insertPoint.appendChild(this.summaryPanel);
                insertMethod = 'append';
            }
        } else {
            // Fallback to body
            document.body.insertBefore(this.summaryPanel, document.body.firstChild);
            insertMethod = 'body-firstChild';
        }

        console.log('Summary panel positioned:', {
            container: insertPoint?.tagName + (insertPoint?.className ? '.' + insertPoint.className : ''),
            method: insertMethod,
            panelId: this.summaryPanel.id
        });

        // Make panel more visible with better styling
        this.summaryPanel.style.position = 'relative';
        this.summaryPanel.style.zIndex = '1000';
        this.summaryPanel.style.margin = '20px 0';
        this.summaryPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

        // Verify panel is in DOM and visible
        setTimeout(() => {
            const panel = document.getElementById('solscan-ai-summary-panel');
            console.log('Panel verification:', {
                inDOM: !!panel,
                visible: panel ? panel.offsetWidth > 0 && panel.offsetHeight > 0 : false,
                position: panel ? panel.getBoundingClientRect() : null,
                computedStyle: panel ? {
                    display: getComputedStyle(panel).display,
                    visibility: getComputedStyle(panel).visibility,
                    position: getComputedStyle(panel).position
                } : null
            });

            // If panel is not visible, try to force it
            if (panel && (!panel.offsetWidth || !panel.offsetHeight)) {
                console.log('Panel not visible, applying visibility fixes');
                panel.style.display = 'block !important';
                panel.style.visibility = 'visible !important';
                panel.style.position = 'relative !important';
                panel.style.top = '0 !important';
                panel.style.left = '0 !important';
            }
        }, 500);
    }

    bindSummaryPanelEvents(): void {
        const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];
        const toggleBtn = this.summaryPanel.querySelector('#summaryToggle') as HTMLElement;
        const startBtn = this.summaryPanel.querySelector('#startAnalysis') as HTMLElement;
        const refreshBtn = this.summaryPanel.querySelector('#refreshSummary') as HTMLElement;
        const chatBtn = this.summaryPanel.querySelector('#openChat') as HTMLElement;

        toggleBtn.addEventListener('click', () => {
            const content = this.summaryPanel.querySelector('.ai-summary-content') as HTMLElement;
            const isCollapsed = content.style.display === 'none';

            content.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.textContent = isCollapsed ? t.collapse : t.expand;
        });

        startBtn.addEventListener('click', () => {
            this.loadTransactionSummary();
            // Hide start button and show refresh button after analysis starts
            startBtn.style.display = 'none';
            refreshBtn.style.display = 'inline-block';
        });

        refreshBtn.addEventListener('click', () => {
            this.loadTransactionSummary();
        });

        chatBtn.addEventListener('click', () => {
            this.openChatPanel();
        });
    }

    createChatButton(): void {
        // Create floating chat button
        const chatButton = document.createElement('div');
        chatButton.id = 'solscan-ai-chat-button';
        chatButton.innerHTML = `
            <div class="chat-button-icon">💬</div>
        `;

        document.body.appendChild(chatButton);

        chatButton.addEventListener('click', () => {
            this.openChatPanel();
        });
    }

    async loadTransactionSummary(): Promise<void> {
        if (this.isLoading) return;

        this.isLoading = true;
        const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];
        const content = this.summaryPanel.querySelector('#summaryContent') as HTMLElement;

        content.innerHTML = `
            <div class="ai-summary-loading">
                <div class="loading-spinner"></div>
                <p>${t.analyzing}</p>
            </div>
        `;

        try {
            // First check if extension is available
            await this.checkExtensionConnection();

            const response = await chrome.runtime.sendMessage({
                action: 'getTransactionSummary',
                signature: this.transactionSignature
            });

            if (response.success) {
                console.log('Received successful response:', response.data);
                content.innerHTML = `
                    <div class="ai-summary-result">
                        ${this.formatSummary(response.data.summary)}
                    </div>
                `;
                console.log('Summary content updated');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Transaction analysis failed:', error);
            const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];
            content.innerHTML = `
                <div class="ai-summary-error">
                    <p>${t.error}${(error as Error).message}</p>
                    <p><small>${t.troubleshooting}</small></p>
                    <button class="ai-retry-button" onclick="this.closest('.ai-summary-content').dispatchEvent(new Event('retry'))">${t.retry}</button>
                </div>
            `;

            // Bind retry event
            content.addEventListener('retry', () => {
                this.loadTransactionSummary();
            });
        } finally {
            this.isLoading = false;
        }
    }

    async checkExtensionConnection(): Promise<boolean> {
        try {
            // First check if chrome.runtime is available
            if (!chrome || !chrome.runtime) {
                throw new Error('Chrome extension API not available');
            }

            // Check if extension is loaded
            if (!chrome.runtime.id) {
                throw new Error('Extension not properly loaded');
            }

            console.log('Extension ID found:', chrome.runtime.id);

            // Try to get diagnostics first
            let diagnostics = null;
            try {
                diagnostics = await chrome.runtime.sendMessage({ action: 'diagnostics' });
                console.log('Diagnostics received:', diagnostics);
            } catch (diagError) {
                console.warn('Could not get diagnostics:', diagError);
            }

            // Try to send ping message
            const response = await chrome.runtime.sendMessage({ action: 'ping' });

            if (!response) {
                throw new Error('No response from extension background script');
            }

            if (!response.success) {
                throw new Error('Extension background script returned error: ' + (response.error || 'Unknown error'));
            }

            console.log('Extension connection verified successfully');

            // Log diagnostics if available
            if (diagnostics && diagnostics.success) {
                console.log('Extension status:', {
                    initialized: diagnostics.diagnostics.assistantInitialized,
                    settingsLoaded: diagnostics.diagnostics.settingsLoaded,
                    geminiReady: diagnostics.diagnostics.geminiInitialized,
                    mcpReady: diagnostics.diagnostics.mcpToolsLoaded
                });
            }

            return true;

        } catch (error) {
            console.error('Extension connection check failed:', error);

            // Provide specific troubleshooting steps based on error type
            let troubleshootingSteps = '\n\n故障排除步骤：';

            if (error.message.includes('Extension not properly loaded')) {
                troubleshootingSteps += '\n1. 重新加载扩展：转到 chrome://extensions\n2. 确保扩展已启用\n3. 刷新此页面';
            } else if (error.message.includes('Chrome extension API not available')) {
                troubleshootingSteps += '\n1. 确保在Chrome浏览器中\n2. 检查扩展是否正确安装\n3. 尝试重新启动浏览器';
            } else if (error.message.includes('No response from extension')) {
                troubleshootingSteps += '\n1. 检查浏览器控制台是否有错误\n2. 重新加载扩展\n3. 确保扩展有必要的权限\n4. 尝试重新启动浏览器';
            } else {
                troubleshootingSteps += '\n1. 重新加载扩展\n2. 检查浏览器控制台的错误信息\n3. 确保API密钥已正确配置\n4. 尝试重新启动浏览器';
            }

            throw new Error(`扩展连接失败: ${(error as Error).message}${troubleshootingSteps}`);
        }
    }

    formatSummary(summary: string): string {
        // Handle undefined/null summary
        if (!summary || summary.trim() === '') {
            console.warn('Received empty summary content');
            return '<p><em>No summary content available</em></p>';
        }

        // Configure marked for safe rendering
        marked.setOptions({
            breaks: true,
            gfm: true
        });

        try {
            // Render markdown and wrap in a container
            const renderedHtml = marked.parse(summary) as string;
            return `<div class="markdown-content">${renderedHtml}</div>`;
        } catch (error) {
            console.error('Markdown parsing failed for summary:', error);
            return `<p>${summary}</p>`;
        }
    }

    openChatPanel(): void {
        if (this.chatPanel) {
            this.chatPanel.style.display = 'block';
            return;
        }

        const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];

        this.chatPanel = document.createElement('div');
        this.chatPanel.id = 'solscan-ai-chat-panel';
        this.chatPanel.innerHTML = `
            <div class="chat-header">
                <h3>${t.aiChat}</h3>
                <button class="chat-close" id="closeChat">×</button>
            </div>
            <div class="chat-messages" id="chatMessages">
                <div class="chat-message ai-message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <p>${t.welcomeMessage}</p>
                    </div>
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chatInput" placeholder="${this.currentLanguage === 'zh-CN' ? '输入您的问题...' : 'Ask your question...'}" />
                <button id="sendMessage">${this.currentLanguage === 'zh-CN' ? '发送' : 'Send'}</button>
            </div>
            <div class="chat-resize-handle"></div>
        `;

        document.body.appendChild(this.chatPanel);

        // Bind chat events
        this.bindChatEvents();

        // Bind resize events
        this.bindResizeEvents();
    }

    bindChatEvents(): void {
        const closeBtn = this.chatPanel!.querySelector('#closeChat') as HTMLElement;
        const sendBtn = this.chatPanel!.querySelector('#sendMessage') as HTMLElement;
        const input = this.chatPanel!.querySelector('#chatInput') as HTMLInputElement;

        closeBtn.addEventListener('click', () => {
            this.chatPanel!.style.display = 'none';
        });

        sendBtn.addEventListener('click', () => {
            this.sendChatMessage();
        });

        input.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
    }

    bindResizeEvents(): void {
        const resizeHandle = this.chatPanel!.querySelector('.chat-resize-handle') as HTMLElement;
        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        const startResize = (e: MouseEvent) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = this.chatPanel!.offsetWidth;
            startHeight = this.chatPanel!.offsetHeight;

            document.body.style.cursor = 'nw-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        };

        const resize = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);

            // Apply constraints
            const constrainedWidth = Math.max(300, Math.min(600, newWidth));
            const constrainedHeight = Math.max(400, Math.min(window.innerHeight * 0.8, newHeight));

            this.chatPanel!.style.width = `${constrainedWidth}px`;
            this.chatPanel!.style.height = `${constrainedHeight}px`;

            e.preventDefault();
        };

        const stopResize = () => {
            if (!isResizing) return;

            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    }

    async sendChatMessage(): Promise<void> {
        const input = this.chatPanel!.querySelector('#chatInput') as HTMLInputElement;
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addChatMessage('user', message);
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Check extension connection first
            await this.checkExtensionConnection();

            const response = await chrome.runtime.sendMessage({
                action: 'chatWithTransaction',
                signature: this.transactionSignature,
                message: message,
                history: this.conversationHistory
            });

            // Remove typing indicator
            this.hideTypingIndicator();

            if (response.success) {
                console.log('Content script received response:', response);
                console.log('Response.data:', response.data);
                console.log('Response.data.response:', response.data?.response);
                console.log('Response.data.response type:', typeof response.data?.response);
                console.log('Response.data.response length:', response.data?.response?.length);
                this.addChatMessage('ai', response.data.response);

                // Update conversation history
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: response.data.response }
                );
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Chat message failed:', error);
            this.hideTypingIndicator();
            const t = uiTranslations[this.currentLanguage] || uiTranslations['en-US'];
            this.addChatMessage('ai', `${t.errorResponse}${(error as Error).message}`);
        }
    }

    addChatMessage(type: 'user' | 'ai', content: string): void {
        const messagesContainer = this.chatPanel!.querySelector('#chatMessages') as HTMLElement;
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}-message`;

        let formattedContent: string;
        if (type === 'ai') {
            // Handle undefined/null content
            if (!content || content.trim() === '') {
                console.warn('Received empty AI response content');
                formattedContent = '<p><em>No response content received</em></p>';
            } else {
                // Configure marked for safe rendering
                marked.setOptions({
                    breaks: true,
                    gfm: true
                });
                try {
                    const renderedHtml = marked.parse(content) as string;
                    formattedContent = `<div class="markdown-content">${renderedHtml}</div>`;
                } catch (error) {
                    console.error('Markdown parsing failed:', error);
                    formattedContent = `<p>${content}</p>`;
                }
            }
        } else {
            // User messages as plain text
            formattedContent = `<p>${content || ''}</p>`;
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">${type === 'user' ? '👤' : '🤖'}</div>
            <div class="message-content">
                ${formattedContent}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        // Ensure scrolling to bottom after DOM update
        setTimeout(() => {
            (messagesContainer as HTMLElement).scrollTop = messagesContainer.scrollHeight;
        }, 0);
    }

    showTypingIndicator(): void {
        const messagesContainer = this.chatPanel!.querySelector('#chatMessages') as HTMLElement;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message ai-message typing-indicator';
        typingDiv.id = 'typingIndicator';

        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator(): void {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    resetUI(): void {
        if (this.summaryPanel) {
            this.summaryPanel.remove();
            this.summaryPanel = null;
        }
        if (this.chatPanel) {
            this.chatPanel.remove();
            this.chatPanel = null;
        }
        const chatButton = document.getElementById('solscan-ai-chat-button');
        if (chatButton) {
            chatButton.remove();
        }
        this.conversationHistory = [];
    }
}

// Initialize when content script loads
new SolscanAIAssistant();