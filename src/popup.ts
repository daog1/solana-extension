// Language translations
const translations = {
    'zh-CN': {
        title: 'Solana AI Assistant',
        subtitle: 'Configure your AI analysis settings',
        geminiApiKey: 'Gemini API Key (预配置)',
        mcpUrl: 'MCP URL',
        geminiModel: 'Gemini Model',
        temperature: 'Temperature',
        maxTokens: 'Max Tokens',
        responseLanguage: 'Response Language',
        saveSettings: 'Save Settings',
        resetSettings: 'Reset',
        verifySettings: 'Verify Settings',
        mcpUrlHelp: '完整的 MCP 服务器 URL，包括 API key 参数',
        geminiModelHelp: '推荐使用 Gemini Flash Latest 以获得最佳的工具调用支持',
        temperatureHelp: 'Controls randomness in AI responses (0 = deterministic, 1 = creative)',
        maxTokensHelp: 'Maximum length of AI responses',
        responseLanguageHelp: 'Language for AI analysis and responses',
        saving: 'Saving settings...',
        saved: 'Settings saved successfully!',
        failed: 'Failed to save settings. Check console for details.',
        resetConfirm: 'Are you sure you want to reset all settings to defaults?',
        resetSuccess: 'Settings reset to defaults',
        resetFailed: 'Failed to reset settings',
        verifying: 'Verifying settings...',
        verified: '✅ Settings are saved and match form values',
        mismatch: '❌ Settings mismatch! Try saving again.',
        verifyError: 'Error verifying settings: ',
        chinese: '中文 (Chinese)',
        english: 'English'
    },
    'en-US': {
        title: 'Solana AI Assistant',
        subtitle: 'Configure your AI analysis settings',
        geminiApiKey: 'Gemini API Key (Pre-configured)',
        mcpUrl: 'MCP URL',
        geminiModel: 'Gemini Model',
        temperature: 'Temperature',
        maxTokens: 'Max Tokens',
        responseLanguage: 'Response Language',
        saveSettings: 'Save Settings',
        resetSettings: 'Reset',
        verifySettings: 'Verify Settings',
        mcpUrlHelp: 'Complete MCP server URL including API key parameter',
        geminiModelHelp: 'Recommended to use Gemini Flash Latest for best tool calling support',
        temperatureHelp: 'Controls randomness in AI responses (0 = deterministic, 1 = creative)',
        maxTokensHelp: 'Maximum length of AI responses',
        responseLanguageHelp: 'Language for AI analysis and responses',
        saving: 'Saving settings...',
        saved: 'Settings saved successfully!',
        failed: 'Failed to save settings. Check console for details.',
        resetConfirm: 'Are you sure you want to reset all settings to defaults?',
        resetSuccess: 'Settings reset to defaults',
        resetFailed: 'Failed to reset settings',
        verifying: 'Verifying settings...',
        verified: '✅ Settings are saved and match form values',
        mismatch: '❌ Settings mismatch! Try saving again.',
        verifyError: 'Error verifying settings: ',
        chinese: '中文 (Chinese)',
        english: 'English'
    }
};

// Settings management
interface Settings {
    geminiApiKey: string;
    mcpUrl: string;
    geminiModel: string;
    temperature: number;
    maxTokens: number;
    responseLanguage: string;
    [key: string]: any;
}

class SettingsManager {
    private defaults: Settings = {
        geminiApiKey: '',
        mcpUrl: '',
        geminiModel: 'gemini-flash-latest',
        temperature: 0.7,
        maxTokens: 2048,
        responseLanguage: 'en-US'
    };

    async load(): Promise<Settings> {
        try {
            const result = await chrome.storage.sync.get(Object.keys(this.defaults));
            return { ...this.defaults, ...result } as Settings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.defaults;
        }
    }

    async save(settings: Settings): Promise<boolean> {
        try {
            console.log('Saving settings:', Object.keys(settings));
            await chrome.storage.sync.set(settings);
            console.log('Settings saved successfully');

            const saved = await chrome.storage.sync.get(Object.keys(settings));
            const allSaved = Object.keys(settings).every(key => saved[key] === settings[key]);

            if (!allSaved) {
                console.error('Settings verification failed:', { expected: settings, actual: saved });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    async reset(): Promise<boolean> {
        try {
            await chrome.storage.sync.set(this.defaults);
            return true;
        } catch (error) {
            console.error('Failed to reset settings:', error);
            return false;
        }
    }
}

// UI management
class UIManager {
    private statusElement: HTMLElement;
    private settingsManager: SettingsManager;
    private currentLanguage: string = 'zh-CN';

    constructor() {
        this.statusElement = document.getElementById('status')!;
        this.settingsManager = new SettingsManager();
        this.init();
    }

    async init(): Promise<void> {
        await this.loadSettings();
        this.bindEvents();
        this.updateRangeValues();
    }

    updateLanguage(language: string): void {
        this.currentLanguage = language;
        const t = translations[language] || translations['zh-CN'];

        // Update header
        const titleElement = document.querySelector('h1');
        if (titleElement) titleElement.textContent = t.title;

        const subtitleElement = document.querySelector('h1').nextElementSibling as HTMLElement;
        if (subtitleElement) subtitleElement.textContent = t.subtitle;

        // Update labels
        const labels = {
            'geminiApiKey': t.geminiApiKey,
            'mcpUrl': t.mcpUrl,
            'geminiModel': t.geminiModel,
            'temperature': t.temperature,
            'maxTokens': t.maxTokens,
            'responseLanguage': t.responseLanguage
        };

        Object.entries(labels).forEach(([id, text]) => {
            const label = document.querySelector(`label[for="${id}"]`);
            if (label) label.textContent = text;
        });

        // Update help texts
        const helpTexts = {
            'mcpUrl': t.mcpUrlHelp,
            'geminiModel': t.geminiModelHelp,
            'temperature': t.temperatureHelp,
            'maxTokens': t.maxTokensHelp,
            'responseLanguage': t.responseLanguageHelp
        };

        Object.entries(helpTexts).forEach(([id, text]) => {
            // Find the help text within the same setting-group
            const inputElement = document.getElementById(id);
            if (inputElement) {
                const settingGroup = inputElement.closest('.setting-group');
                if (settingGroup) {
                    const helpElement = settingGroup.querySelector('.help-text') as HTMLElement;
                    if (helpElement) {
                        helpElement.textContent = text;
                    }
                }
            }
        });

        // Update buttons
        const buttons = {
            'saveSettings': t.saveSettings,
            'resetSettings': t.resetSettings,
            'verifySettings': t.verifySettings
        };

        Object.entries(buttons).forEach(([id, text]) => {
            const button = document.getElementById(id) as HTMLButtonElement;
            if (button) button.textContent = text;
        });
    }

    async loadSettings(): Promise<void> {
        const settings = await this.settingsManager.load();

        (document.getElementById('geminiApiKey') as HTMLInputElement).value = settings.geminiApiKey || '';
        (document.getElementById('mcpUrl') as HTMLInputElement).value = settings.mcpUrl || '';

        (document.getElementById('geminiModel') as HTMLInputElement).value = settings.geminiModel || 'gemini-flash-latest';
        (document.getElementById('temperature') as HTMLInputElement).value = String(settings.temperature || 0.7);
        (document.getElementById('maxTokens') as HTMLInputElement).value = String(settings.maxTokens || 2048);
        (document.getElementById('responseLanguage') as HTMLInputElement).value = settings.responseLanguage || 'zh-CN';

        // Update UI language
        this.updateLanguage(settings.responseLanguage || 'zh-CN');
    }

    bindEvents(): void {
        // Toggle password visibility
        document.querySelectorAll('.toggle-visibility').forEach(button => {
            button.addEventListener('click', (e: Event) => {
                const target = e.target as HTMLElement;
                const input = target.previousElementSibling as HTMLInputElement;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                target.textContent = isPassword ? '🙈' : '👁️';
            });
        });

        // Update range value display
        (document.getElementById('temperature') as HTMLInputElement).addEventListener('input', (e: Event) => {
            const target = e.target as HTMLInputElement;
            (document.getElementById('temperatureValue') as HTMLElement).textContent = target.value;
        });

        // Save settings
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings
        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Verify settings
        document.getElementById('verifySettings').addEventListener('click', () => {
            this.verifySettings();
        });
    }

    updateRangeValues(): void {
        (document.getElementById('temperatureValue') as HTMLElement).textContent =
            (document.getElementById('temperature') as HTMLInputElement).value;
    }

    async saveSettings(): Promise<void> {
        const settings: Settings = {
            geminiApiKey: (document.getElementById('geminiApiKey') as HTMLInputElement).value.trim(),
            mcpUrl: (document.getElementById('mcpUrl') as HTMLInputElement).value.trim(),
            geminiModel: (document.getElementById('geminiModel') as HTMLInputElement).value,
            temperature: parseFloat((document.getElementById('temperature') as HTMLInputElement).value),
            maxTokens: parseInt((document.getElementById('maxTokens') as HTMLInputElement).value),
            responseLanguage: (document.getElementById('responseLanguage') as HTMLInputElement).value
        };

        try {
            const t = translations[this.currentLanguage] || translations['zh-CN'];
            this.showStatus(t.saving, 'info');
            const success = await this.settingsManager.save(settings);

            if (success) {
                this.showStatus(t.saved, 'success');

                // Reload settings to verify they were saved
                setTimeout(async () => {
                    await this.loadSettings();
                    console.log('Settings reloaded and verified');
                }, 500);
            } else {
                this.showStatus(t.failed, 'error');
            }
        } catch (error) {
            console.error('Save settings error:', error);
            const t = translations[this.currentLanguage] || translations['zh-CN'];
            this.showStatus(t.verifyError + error.message, 'error');
        }
    }

    async resetSettings(): Promise<void> {
        const t = translations[this.currentLanguage] || translations['zh-CN'];
        if (confirm(t.resetConfirm)) {
            const success = await this.settingsManager.reset();
            if (success) {
                await this.loadSettings();
                this.updateRangeValues();
                this.showStatus(t.resetSuccess, 'success');
            } else {
                this.showStatus(t.resetFailed, 'error');
            }
        }
    }

    async verifySettings(): Promise<void> {
        try {
            const t = translations[this.currentLanguage] || translations['zh-CN'];
            this.showStatus(t.verifying, 'info');

            const currentSettings = await this.settingsManager.load();
            const formSettings: Settings = {
                geminiApiKey: (document.getElementById('geminiApiKey') as HTMLInputElement).value.trim(),
                mcpUrl: (document.getElementById('mcpUrl') as HTMLInputElement).value.trim(),
                geminiModel: (document.getElementById('geminiModel') as HTMLInputElement).value,
                temperature: parseFloat((document.getElementById('temperature') as HTMLInputElement).value),
                maxTokens: parseInt((document.getElementById('maxTokens') as HTMLInputElement).value),
                responseLanguage: (document.getElementById('responseLanguage') as HTMLInputElement).value
            };

            const matches = Object.keys(formSettings).every(key =>
                currentSettings[key] === formSettings[key]
            );

            if (matches) {
                this.showStatus(t.verified, 'success');
            } else {
                this.showStatus(t.mismatch, 'error');
                console.log('Form settings:', formSettings);
                console.log('Saved settings:', currentSettings);
            }
        } catch (error) {
            console.error('Verify settings error:', error);
            const t = translations[this.currentLanguage] || translations['zh-CN'];
            this.showStatus(t.verifyError + error.message, 'error');
        }
    }

    showStatus(message: string, type: string): void {
        this.statusElement.textContent = message;
        this.statusElement.className = type;
        this.statusElement.style.display = 'block';

        setTimeout(() => {
            this.statusElement.style.display = 'none';
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
});