// 汤仔助手 - 知识库服务实现
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const closeSettingsButton = document.getElementById('close-settings');
    const saveSettingsButton = document.getElementById('save-settings');
    const apiKeyInput = document.getElementById('api-key-input');
    const serviceIdInput = document.getElementById('service-id-input');
    const streamEnabledToggle = document.getElementById('stream-enabled');
    const markdownEnabledToggle = document.getElementById('markdown-enabled');

    // 聊天历史记录
    let chatHistory = [];
    
    // 默认设置
    const defaultSettings = {
        apiKey: '', // 默认为空，需要用户在设置中填写
        serviceId: '', // 默认为空，需要用户在设置中填写
        streamEnabled: true,
        markdownEnabled: true
    };
    
    // 当前设置
    let currentSettings = JSON.parse(localStorage.getItem('tangzaiSettings')) || defaultSettings;
    
    // 初始化设置表单
    function initSettings() {
        apiKeyInput.value = currentSettings.apiKey || '';
        serviceIdInput.value = currentSettings.serviceId || '';
        streamEnabledToggle.checked = currentSettings.streamEnabled;
        markdownEnabledToggle.checked = currentSettings.markdownEnabled;
    }
    
    // 保存设置
    function saveSettings() {
        currentSettings = {
            apiKey: apiKeyInput.value.trim(),
            serviceId: serviceIdInput.value.trim(),
            streamEnabled: streamEnabledToggle.checked,
            markdownEnabled: markdownEnabledToggle.checked
        };
        
        localStorage.setItem('tangzaiSettings', JSON.stringify(currentSettings));
        closeSettings();
        showSystemMessage('设置已保存');
    }
    
    // 打开设置面板
    function openSettings() {
        settingsPanel.style.display = 'block';
        settingsOverlay.style.display = 'block';
        initSettings();
    }
    
    // 关闭设置面板
    function closeSettings() {
        settingsPanel.style.display = 'none';
        settingsOverlay.style.display = 'none';
    }
    
    // 添加用户消息到聊天界面
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 添加到聊天历史
        chatHistory.push({ role: 'user', content: message });
        saveChatHistory();
    }
    
    // 添加AI消息到聊天界面
    function addAIMessage(message, isStreaming = false) {
        // 如果是流式消息，查找是否已有一个正在流式更新的消息元素
        let messageElement;
        if (isStreaming) {
            messageElement = document.querySelector('.ai-message.streaming');
            
            if (!messageElement) {
                messageElement = document.createElement('div');
                messageElement.className = 'message ai-message streaming';
                chatContainer.appendChild(messageElement);
            }
        } else {
            messageElement = document.createElement('div');
            messageElement.className = 'message ai-message';
            chatContainer.appendChild(messageElement);
            
            // 添加到聊天历史
            chatHistory.push({ role: 'assistant', content: message });
            saveChatHistory();
        }
        
        // 根据是否启用Markdown来渲染内容
        if (currentSettings.markdownEnabled) {
            // 使用marked.js解析Markdown
            messageElement.innerHTML = marked.parse(message);
            
            // 如果启用了代码高亮，初始化highlight.js
            document.querySelectorAll('.ai-message pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        } else {
            messageElement.textContent = message;
        }
        
        // 如果是流式消息，添加光标效果
        if (isStreaming) {
            const cursor = document.createElement('span');
            cursor.className = 'streaming-cursor';
            messageElement.appendChild(cursor);
        } else {
            // 移除streaming类
            messageElement.classList.remove('streaming');
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 添加系统消息到聊天界面
    function showSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 保存聊天历史到本地存储
    function saveChatHistory() {
        localStorage.setItem('tangzaiChatHistory', JSON.stringify(chatHistory));
    }
    
    // 从本地存储加载聊天历史
    function loadChatHistory() {
        const savedHistory = localStorage.getItem('tangzaiChatHistory');
        if (savedHistory) {
            try {
                chatHistory = JSON.parse(savedHistory);
                
                // 渲染历史消息
                chatHistory.forEach(msg => {
                    if (msg.role === 'user') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message user-message';
                        messageElement.textContent = msg.content;
                        chatContainer.appendChild(messageElement);
                    } else if (msg.role === 'assistant') {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message ai-message';
                        
                        if (currentSettings.markdownEnabled) {
                            messageElement.innerHTML = marked.parse(msg.content);
                        } else {
                            messageElement.textContent = msg.content;
                        }
                        
                        chatContainer.appendChild(messageElement);
                    }
                });
                
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (e) {
                console.error('Failed to load chat history:', e);
                chatHistory = [];
            }
        }
    }
    
    // 清除聊天历史
    function clearChat() {
        chatContainer.innerHTML = '';
        chatHistory = [];
        localStorage.removeItem('tangzaiChatHistory');
        showSystemMessage('聊天记录已清除');
    }
    
    // 使用非流式API调用知识库服务
    async function callKnowledgeBaseAPI(query) {
        if (!currentSettings.apiKey || !currentSettings.serviceId) {
            showSystemMessage('请先在设置中配置API密钥和服务ID');
            return;
        }
        
        try {
            showSystemMessage('正在查询知识库...');
            
            // 构建请求参数
            const requestData = {
                service_resource_id: currentSettings.serviceId,
                stream: false,
                messages: [
                    {
                        role: "user",
                        content: query
                    }
                ]
            };
            
            // 构建历史消息
            if (chatHistory.length > 1) {
                requestData.messages = [];
                
                // 只取最近的10条消息(5轮对话)，避免上下文过长
                const recentHistory = chatHistory.slice(-10);
                
                recentHistory.forEach(msg => {
                    requestData.messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                });
            }
            
            const response = await fetch('https://api-proxy.example.com/knowledge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSettings.apiKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            if (responseData.code !== 0) {
                throw new Error(`API错误: ${responseData.message}`);
            }
            
            // 添加AI回复到聊天界面
            const answer = responseData.data.generated_answer || '抱歉，知识库中没有找到相关信息。';
            addAIMessage(answer);
            
        } catch (error) {
            console.error('API调用失败:', error);
            showSystemMessage(`请求失败: ${error.message}`);
        }
    }
    
    // 使用流式API调用知识库服务
    async function callKnowledgeBaseStreamAPI(query) {
        if (!currentSettings.apiKey || !currentSettings.serviceId) {
            showSystemMessage('请先在设置中配置API密钥和服务ID');
            return;
        }
        
        try {
            showSystemMessage('正在查询知识库...');
            
            // 构建请求参数
            const requestData = {
                service_resource_id: currentSettings.serviceId,
                stream: true,
                messages: [
                    {
                        role: "user",
                        content: query
                    }
                ]
            };
            
            // 构建历史消息
            if (chatHistory.length > 1) {
                requestData.messages = [];
                
                // 只取最近的10条消息(5轮对话)，避免上下文过长
                const recentHistory = chatHistory.slice(-10);
                
                recentHistory.forEach(msg => {
                    requestData.messages.push({
                        role: msg.role,
                        content: msg.content
                    });
                });
            }
            
            // 创建一个空的AI消息用于流式更新
            addAIMessage('', true);
            let accumulatedResponse = '';
            
            const response = await fetch('https://api-proxy.example.com/knowledge/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSettings.apiKey}`
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`服务器响应错误: ${response.status}`);
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码响应数据
                const chunk = decoder.decode(value, { stream: true });
                
                // 处理SSE格式数据
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (line.startsWith('data:') && line.length > 5) {
                        try {
                            const content = line.substring(5);
                            const data = JSON.parse(content);
                            
                            if (data.code === 0 && data.data && data.data.generated_answer) {
                                const newText = data.data.generated_answer;
                                accumulatedResponse = newText;
                                addAIMessage(accumulatedResponse, true);
                                
                                // 检查是否是最后一个chunk
                                if (data.data.end === true) {
                                    // 最后一次更新，去掉streaming标记
                                    addAIMessage(accumulatedResponse, false);
                                }
                            }
                        } catch (e) {
                            console.error('解析流式数据出错:', e);
                        }
                    }
                }
            }
            
            // 确保最后有一个完整的消息添加到历史
            if (accumulatedResponse) {
                // 如果有有效响应，确保在聊天历史中有一个完整的回复
                chatHistory.push({ role: 'assistant', content: accumulatedResponse });
                saveChatHistory();
            } else {
                // 如果没有有效响应，显示错误消息
                showSystemMessage('未收到有效的回复');
                
                // 移除流式消息占位符
                const streamingMsg = document.querySelector('.ai-message.streaming');
                if (streamingMsg) {
                    streamingMsg.remove();
                }
            }
            
        } catch (error) {
            console.error('API调用失败:', error);
            showSystemMessage(`请求失败: ${error.message}`);
            
            // 移除流式消息占位符
            const streamingMsg = document.querySelector('.ai-message.streaming');
            if (streamingMsg) {
                streamingMsg.remove();
            }
        }
    }
    
    // 发送消息处理函数
    function sendMessage() {
        const message = userInput.value.trim();
        
        if (message.length === 0) {
            return;
        }
        
        // 添加用户消息到界面
        addUserMessage(message);
        
        // 清空输入框
        userInput.value = '';
        
        // 根据设置选择调用普通API或流式API
        if (currentSettings.streamEnabled) {
            callKnowledgeBaseStreamAPI(message);
        } else {
            callKnowledgeBaseAPI(message);
        }
    }
    
    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    clearButton.addEventListener('click', clearChat);
    
    settingsButton.addEventListener('click', openSettings);
    closeSettingsButton.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
    saveSettingsButton.addEventListener('click', saveSettings);
    
    // 初始化
    initSettings();
    loadChatHistory();
    
    // 显示欢迎消息
    if (chatHistory.length === 0) {
        showSystemMessage('欢迎使用汤仔知识库助手！请在下方输入您的问题。');
    }
}); 