// 照片浏览调试工具

// DOM加载完成后初始化调试工具
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 照片浏览调试工具已加载 ===');
    
    // 创建调试界面元素
    createDebugUI();
});

// 创建调试界面
function createDebugUI() {
    // 检查是否已存在调试界面
    if (document.getElementById('gallery-debug-tool')) {
        return;
    }
    
    // 创建调试工具容器
    const debugContainer = document.createElement('div');
    debugContainer.id = 'gallery-debug-tool';
    debugContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        max-width: 300px;
        font-family: Arial, sans-serif;
        font-size: 12px;
    `;
    
    // 添加标题
    const title = document.createElement('h3');
    title.textContent = '照片浏览调试工具';
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; color: #333;';
    debugContainer.appendChild(title);
    
    // 添加分隔线
    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: #eee; margin: 10px 0;';
    debugContainer.appendChild(divider);
    
    // 添加调试按钮
    const debugButtons = [
        {
            id: 'debug-check-state',
            text: '检查全局状态',
            onClick: checkGlobalState
        },
        {
            id: 'debug-test-api',
            text: '测试目录API',
            onClick: testDirectoriesAPI
        },
        {
            id: 'debug-load-dirs',
            text: '加载目录（标准）',
            onClick: function() {
                if (window.loadDirectories) {
                    window.loadDirectories();
                } else {
                    showDebugMessage('错误：loadDirectories函数不可用');
                }
            }
        },
        {
            id: 'debug-load-dirs-direct',
            text: '直接加载目录',
            onClick: function() {
                if (window.loadDirectoriesDirectly) {
                    window.loadDirectoriesDirectly();
                } else {
                    showDebugMessage('错误：loadDirectoriesDirectly函数不可用');
                }
            }
        },
        {
            id: 'debug-check-dom',
            text: '检查DOM元素',
            onClick: checkDOMElements
        }
    ];
    
    debugButtons.forEach(btnInfo => {
        const button = document.createElement('button');
        button.id = btnInfo.id;
        button.textContent = btnInfo.text;
        button.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 8px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        button.onclick = btnInfo.onClick;
        debugContainer.appendChild(button);
    });
    
    // 添加消息显示区域
    const messageArea = document.createElement('div');
    messageArea.id = 'debug-message-area';
    messageArea.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 4px;
        max-height: 150px;
        overflow-y: auto;
        font-size: 11px;
        color: #666;
    `;
    debugContainer.appendChild(messageArea);
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.style.cssText = `
        width: 100%;
        padding: 8px;
        margin-top: 10px;
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    closeButton.onclick = function() {
        debugContainer.remove();
    };
    debugContainer.appendChild(closeButton);
    
    // 添加到页面
    document.body.appendChild(debugContainer);
    
    showDebugMessage('调试工具已初始化');
}

// 显示调试消息
function showDebugMessage(message) {
    const messageArea = document.getElementById('debug-message-area');
    if (messageArea) {
        const messageEl = document.createElement('div');
        messageEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        messageEl.style.marginBottom = '4px';
        messageArea.appendChild(messageEl);
        messageArea.scrollTop = messageArea.scrollHeight;
    }
    console.log(`[调试] ${message}`);
}

// 检查全局状态
function checkGlobalState() {
    showDebugMessage('=== 检查全局状态 ===');
    
    // 检查必要的全局对象
    const checks = [
        { name: 'window.state', exists: !!window.state },
        { name: 'loadDirectories', exists: typeof window.loadDirectories === 'function' },
        { name: 'renderDirectoriesList', exists: typeof window.renderDirectoriesList === 'function' },
        { name: 'loadDirectoriesDirectly', exists: typeof window.loadDirectoriesDirectly === 'function' },
        { name: 'isEmptyDirectory', exists: typeof window.isEmptyDirectory === 'function' },
        { name: 'isHiddenDirectory', exists: typeof window.isHiddenDirectory === 'function' }
    ];
    
    checks.forEach(check => {
        showDebugMessage(`${check.name}: ${check.exists ? '存在' : '不存在'}`);
    });
    
    // 检查state内容
    if (window.state) {
        showDebugMessage('state内容:');
        showDebugMessage(`- directories数量: ${window.state.directories ? window.state.directories.length : 0}`);
        showDebugMessage(`- currentPath: ${window.state.currentPath || '未设置'}`);
        showDebugMessage(`- images: ${window.state.images ? window.state.images.length : 0} 张图片`);
    }
    
    showDebugMessage('=== 全局状态检查完成 ===');
}

// 测试目录API
function testDirectoriesAPI() {
    showDebugMessage('开始测试目录API...');
    
    fetch('/api/directories')
        .then(response => {
            showDebugMessage(`API响应状态: ${response.status}`);
            return response.json();
        })
        .then(data => {
            showDebugMessage('API返回数据:');
            if (data.directories && Array.isArray(data.directories)) {
                showDebugMessage(`- 找到 ${data.directories.length} 个目录`);
                
                // 显示前3个目录作为示例
                const sampleDirs = data.directories.slice(0, 3);
                sampleDirs.forEach((dir, index) => {
                    const dirPath = dir.path || (typeof dir === 'string' ? dir : `目录${index}`);
                    showDebugMessage(`  ${index + 1}. ${dirPath}`);
                });
                
                if (data.directories.length > 3) {
                    showDebugMessage(`  ... 还有 ${data.directories.length - 3} 个目录`);
                }
            } else {
                showDebugMessage('- 未找到directories数组');
                showDebugMessage(`- 数据类型: ${typeof data}`);
            }
        })
        .catch(error => {
            showDebugMessage(`API请求失败: ${error.message}`);
        });
}

// 检查DOM元素
function checkDOMElements() {
    showDebugMessage('=== 检查DOM元素 ===');
    
    const elements = [
        { id: 'directories-list', desc: '目录列表容器' },
        { id: 'gallery-container', desc: '相册容器' },
        { id: 'current-directory', desc: '当前目录显示' },
        { id: 'breadcrumb', desc: '面包屑导航' },
        { id: 'subdirectories', desc: '子目录导航' }
    ];
    
    elements.forEach(el => {
        const element = document.getElementById(el.id);
        if (element) {
            showDebugMessage(`${el.desc} (${el.id}): 存在`);
            showDebugMessage(`  - 子元素数量: ${element.children.length}`);
            showDebugMessage(`  - 可见性: ${element.offsetParent !== null ? '可见' : '隐藏'}`);
        } else {
            showDebugMessage(`${el.desc} (${el.id}): 不存在`);
        }
    });
    
    showDebugMessage('=== DOM元素检查完成 ===');
}

// 直接渲染测试目录（用于测试UI）
function testRenderDirectories(directories) {
    const directoriesList = document.getElementById('directories-list');
    if (!directoriesList) {
        showDebugMessage('未找到directories-list元素');
        return;
    }
    
    // 清空列表
    directoriesList.innerHTML = '';
    
    // 添加测试目录
    directories.forEach((dir, index) => {
        const dirItem = document.createElement('div');
        dirItem.className = 'flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors';
        dirItem.setAttribute('data-path', dir.path);
        dirItem.innerHTML = `
            <i class="fa fa-folder text-primary mr-3"></i>
            <span class="truncate max-w-[200px]" title="${dir.path}">${dir.name}</span>
        `;
        
        directoriesList.appendChild(dirItem);
    });
    
    showDebugMessage(`已渲染 ${directories.length} 个测试目录`);
}

// 导出调试函数
window.galleryDebug = {
    checkGlobalState,
    testDirectoriesAPI,
    checkDOMElements,
    showDebugMessage
};

console.log('照片浏览调试工具已加载完成。按F12打开控制台，输入 galleryDebug.checkGlobalState() 等命令进行调试。');