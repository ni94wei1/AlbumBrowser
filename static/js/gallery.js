// 照片画廊相关功能

// 加载目录列表
function loadDirectories() {
    console.log('=== 开始加载目录列表 ===');
    fetch('/api/directories')
        .then(response => {
            console.log('API响应状态:', response.status);
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('API返回数据:', data);
            
            // 初始化目录数组
            let directories = [];
            
            // 检查返回的数据格式并兼容处理
            if (data && data.directories && Array.isArray(data.directories)) {
                // 处理API返回的directories数组
                directories = data.directories;
                console.log('找到directories数组，长度:', directories.length);
            } else if (Array.isArray(data)) {
                // 如果直接返回数组，也能处理
                directories = data;
                console.log('直接返回数组，长度:', directories.length);
            } else {
                console.warn('未找到有效目录数据', typeof data, data);
                directories = [];
            }
            
            // 确保directories数组中的每个元素都有path属性
            state.directories = directories.map((dir, index) => {
                if (typeof dir === 'string') {
                    return { path: dir, name: dir.split('\\').pop().split('/').pop() };
                } else if (typeof dir === 'object' && dir) {
                    // 确保path存在
                    if (!dir.path) {
                        dir.path = `目录${index}`;
                    }
                    // 确保name存在
                    if (!dir.name) {
                        dir.name = dir.path.split('\\').pop().split('/').pop();
                    }
                    return dir;
                }
                return { path: `目录${index}`, name: `目录${index}` };
            });
            
            console.log('处理后的目录数据:', state.directories);
            
            // 渲染目录列表
            renderDirectoriesList();
            
            // 如果有目录，默认选择第一个
            if (state.directories.length > 0) {
                console.log('选择第一个目录:', state.directories[0].path);
                selectDirectory(state.directories[0].path);
            } else {
                console.log('没有找到任何目录');
                // 显示提示信息，引导用户添加目录
                const directoriesList = document.getElementById('directories-list');
                if (directoriesList) {
                    directoriesList.innerHTML = '<div class="p-4 text-center text-gray-500">\n<i class="fa fa-info-circle text-xl mb-2"></i>\n<p>未找到任何目录</p>\n<p class="text-sm text-gray-400 mt-1">请点击"添加目录"按钮</p>\n</div>';
                }
            }
        })
        .catch(error => {
            console.error('加载目录失败:', error);
            showToast('加载目录失败: ' + error.message);
            // 显示错误信息
            const directoriesList = document.getElementById('directories-list');
            if (directoriesList) {
                directoriesList.innerHTML = `<div class="p-4 text-center text-red-500">\n<i class="fa fa-exclamation-circle text-xl mb-2"></i>\n<p>加载目录失败</p>\n<p class="text-sm text-red-400 mt-1">${error.message}</p>\n</div>`;
            }
        });
    
    console.log('=== 加载目录列表函数调用完成 ===');
}

// 直接加载和显示目录，绕过所有过滤条件
function loadDirectoriesDirectly() {
    console.log('=== 直接加载目录模式启动 ===');
    
    // 1. 首先清空任何可能存在的旧数据
    state.directories = [];
    
    // 2. 直接调用API获取目录
    fetch('/api/directories')
        .then(response => response.json())
        .then(data => {
            console.log('API直接返回数据:', data);
            
            // 3. 提取目录数据
            let directories = [];
            if (data.directories && Array.isArray(data.directories)) {
                directories = data.directories;
            } else if (Array.isArray(data)) {
                directories = data;
            }
            
            console.log('提取的目录数量:', directories.length);
            
            // 4. 强制显示所有目录，不进行任何过滤
            const directoriesList = document.getElementById('directories-list');
            if (directoriesList) {
                // 清空列表
                directoriesList.innerHTML = '';
                
                // 显示成功消息
                const successMsg = document.createElement('div');
                successMsg.className = 'p-2 text-green-600 text-sm bg-green-50 rounded-md mb-2';
                successMsg.textContent = `成功加载 ${directories.length} 个目录`;
                directoriesList.appendChild(successMsg);
                
                // 直接添加所有目录到列表
                directories.forEach((dir, index) => {
                    // 确保目录对象有path属性
                    const dirPath = dir.path || (typeof dir === 'string' ? dir : `目录${index}`);
                    const dirName = dir.name || dirPath.split('\\').pop().split('/').pop();
                    
                    const dirItem = document.createElement('div');
                    dirItem.className = 'flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors';
                    dirItem.setAttribute('data-path', dirPath);
                    dirItem.innerHTML = `
                        <i class="fa fa-folder text-primary mr-3"></i>
                        <span class="truncate max-w-[200px]" title="${dirPath}">${dirName}</span>
                    `;
                    
                    // 添加点击事件
                    dirItem.addEventListener('click', function() {
                        console.log('选择目录:', this.getAttribute('data-path'));
                        selectDirectory(this.getAttribute('data-path'));
                    });
                    
                    directoriesList.appendChild(dirItem);
                });
                
                // 如果没有目录，显示提示
                if (directories.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'p-4 text-center text-gray-500';
                    emptyMsg.innerHTML = '<i class="fa fa-info-circle text-xl mb-2"></i><p>未找到任何目录</p>';
                    directoriesList.appendChild(emptyMsg);
                }
            } else {
                console.error('未找到directories-list元素');
            }
            
            console.log('=== 直接加载目录模式完成 ===');
        })
        .catch(error => {
            console.error('直接加载目录失败:', error);
            const directoriesList = document.getElementById('directories-list');
            if (directoriesList) {
                directoriesList.innerHTML = '<div class="p-4 text-center text-red-500">加载目录失败</div>';
            }
        });
}

// 导出直接加载函数到全局
window.loadDirectoriesDirectly = loadDirectoriesDirectly;

// 渲染照片列表
function renderPhotos() {
    console.log('=== 开始渲染照片 ===');
    
    // 检查DOM元素是否存在
    if (!elements.gallery) {
        console.error('错误: 未找到照片画廊元素');
        return;
    }
    
    // 清空画廊
    elements.gallery.innerHTML = '';
    
    // 如果没有照片，显示空状态
    if (!state.photos || state.photos.length === 0) {
        elements.gallery.appendChild(elements.emptyState);
        return;
    }
    
    // 渲染照片
    state.photos.forEach((photo, index) => {
        try {
            // 创建照片容器
            const photoContainer = document.createElement('div');
            photoContainer.className = 'photo-container bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 card-hover';
            
            // 创建照片包装器
            const photoWrapper = document.createElement('div');
            photoWrapper.className = 'photo-wrapper aspect-square';
            
            // 创建图片元素
            const img = document.createElement('img');
            
            // 设置图片源（使用缩略图或原图）
            if (photo.thumbnail) {
                img.src = photo.thumbnail;
            } else if (photo.path) {
                img.src = `/api/thumbnail/${encodeURIComponent(photo.path)}`;
            } else if (photo.url) {
                img.src = photo.url;
            } else {
                // 如果没有有效的图片源，使用占位图
                img.src = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22150%22%20viewBox%3D%220%200%20200%20150%22%3E%3Crect%20width%3D%22200%22%20height%3D%22150%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%2285%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20fill%3D%22%239ca3af%22%3E照片%3C%2Ftext%3E%3C%2Fsvg%3E';
            }
            
            // 设置图片属性
            img.alt = photo.name || `照片${index + 1}`;
            img.className = 'object-cover w-full h-full';
            img.loading = 'lazy'; // 使用懒加载
            
            // 添加点击事件以打开大图查看器
            photoContainer.addEventListener('click', () => {
                openLightbox(index);
            });
            
            // 将图片添加到包装器
            photoWrapper.appendChild(img);
            
            // 将包装器添加到容器
            photoContainer.appendChild(photoWrapper);
            
            // 将照片容器添加到画廊
            elements.gallery.appendChild(photoContainer);
            
        } catch (error) {
            console.error(`渲染照片[${index}]失败:`, error);
            // 创建错误占位符
            const errorElement = document.createElement('div');
            errorElement.className = 'bg-gray-100 rounded-lg p-4 flex items-center justify-center aspect-video';
            errorElement.innerHTML = '<i class="fa fa-exclamation-circle text-red-500 text-2xl"></i>';
            elements.gallery.appendChild(errorElement);
        }
    });
    
    console.log(`=== 照片渲染完成，共渲染 ${state.photos.length} 张照片 ===`);
}

// 排序照片
function sortPhotos() {
    console.log('=== 开始排序照片 ===');
    
    if (!state.photos || state.photos.length <= 1) {
        console.log('无需排序，照片数量不足');
        return;
    }
    
    // 获取排序方式
    const sortMethod = elements.sortSelect ? elements.sortSelect.value : 'newest';
    console.log('排序方式:', sortMethod);
    
    // 根据选择的排序方式对照片进行排序
    switch (sortMethod) {
        case 'newest':
            // 按修改时间倒序排序（最新优先）
            state.photos.sort((a, b) => {
                const dateA = new Date(a.modified || 0).getTime();
                const dateB = new Date(b.modified || 0).getTime();
                return dateB - dateA;
            });
            break;
        
        case 'oldest':
            // 按修改时间正序排序（最旧优先）
            state.photos.sort((a, b) => {
                const dateA = new Date(a.modified || 0).getTime();
                const dateB = new Date(b.modified || 0).getTime();
                return dateA - dateB;
            });
            break;
        
        case 'name-asc':
            // 按名称字母顺序升序排序（A-Z）
            state.photos.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        
        case 'name-desc':
            // 按名称字母顺序降序排序（Z-A）
            state.photos.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameB.localeCompare(nameA);
            });
            break;
        
        case 'rating-desc':
            // 按星级降序排序
            state.photos.sort((a, b) => {
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return ratingB - ratingA;
            });
            break;
        
        default:
            console.warn('未知的排序方式:', sortMethod);
    }
    
    console.log('=== 照片排序完成 ===');
}

// 渲染子目录
function renderSubdirectories(subdirectories) {
    // 检查子目录容器是否存在
    if (!elements.subdirectoriesContainer) {
        console.error('子目录容器未找到');
        return;
    }
    
    // 清空容器
    elements.subdirectoriesContainer.innerHTML = '';
    
    if (!subdirectories || subdirectories.length === 0) {
        elements.subdirectoriesContainer.classList.add('hidden');
        return;
    }
    
    // 显示子目录容器
    elements.subdirectoriesContainer.classList.remove('hidden');
    
    // 创建子目录列表
    const directoryList = document.createElement('div');
    directoryList.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4';
    
    subdirectories.forEach(directory => {
        const directoryCard = document.createElement('div');
        directoryCard.className = 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors';
        directoryCard.setAttribute('data-directory', directory.path);
        
        // 子目录名称
        const directoryName = document.createElement('div');
        directoryName.className = 'text-sm font-medium truncate';
        directoryName.textContent = directory.name || directory.path.split('/').pop().split('\\').pop();
        
        // 子目录图标
        const directoryIcon = document.createElement('div');
        directoryIcon.className = 'text-xl mb-2 text-blue-500';
        directoryIcon.textContent = '📁';
        
        // 添加点击事件
        directoryCard.addEventListener('click', () => {
            selectDirectory(directory.path);
        });
        
        directoryCard.appendChild(directoryIcon);
        directoryCard.appendChild(directoryName);
        directoryList.appendChild(directoryCard);
    });
    
    elements.subdirectoriesContainer.appendChild(directoryList);
    console.log('子目录已渲染，数量:', subdirectories.length);
}

// 检查目录路径中是否包含任何以点开头的部分（父目录或当前目录）
function isHiddenDirectory(path) {
    if (!path || typeof path !== 'string') {
        return false;
    }
    
    // 分割路径并检查每个部分
    const pathParts = path.split(/[\\/]/); // 支持Windows和Unix路径
    return pathParts.some(part => part && part.startsWith('.'));
}

// 检查目录是否为空
function isEmptyDirectory(dir) {
    // 添加防御性检查
    if (!dir) {
        return true;
    }
    
    // 对于顶层目录，如果没有明确的has_images和has_subdirectories属性，默认认为目录不为空
    // 这可以确保即使是包含子目录的顶层目录也能显示出来
    if (dir.has_images === undefined && dir.has_subdirectories === undefined) {
        return false;
    }
    
    // 如果目录有照片（严格检查，避免将0或空字符串误判为无照片）
    if (dir.has_images && dir.has_images !== 0 && dir.has_images !== '') {
        return false;
    }
    
    // 如果目录有子目录，则不为空
    if (dir.has_subdirectories && dir.has_subdirectories !== 0 && dir.has_subdirectories !== '') {
        return false;
    }
    
    // 只有当我们明确知道目录既没有照片也没有子目录时，才认为它为空
    return (dir.has_images === false || dir.has_images === 0 || dir.has_images === '') && 
           (dir.has_subdirectories === false || dir.has_subdirectories === 0 || dir.has_subdirectories === '');
}

// 渲染目录列表
function renderDirectoriesList() {
    console.log('=== 开始渲染目录列表 ===');
    console.log('当前state.directories:', state.directories, '长度:', state.directories.length);
    
    // 检查DOM元素是否存在
    if (!elements.directoriesList) {
        console.error('错误: 未找到目录列表元素');
        // 尝试备用方法查找元素
        elements.directoriesList = document.getElementById('directories-list');
        if (!elements.directoriesList) {
            console.error('备用方法也未能找到目录列表元素');
            return;
        }
    }
    
    // 清空列表
    elements.directoriesList.innerHTML = '';
    
    // 如果没有目录，显示提示信息
    if (!state.directories || state.directories.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'p-4 text-center text-gray-500';
        emptyMessage.innerHTML = '<i class="fa fa-folder-o text-xl mb-2"></i><p>未添加任何照片目录</p><p class="text-sm">点击"添加目录"按钮开始</p>';
        elements.directoriesList.appendChild(emptyMessage);
        console.log('目录列表为空，显示提示信息');
        return;
    }
    
    let visibleDirCount = 0;
    let hiddenDirCount = 0;
    let emptyDirCount = 0;
    let invalidDirCount = 0;
    
    // 创建调试信息容器
    const debugInfo = document.createElement('div');
    debugInfo.className = 'p-2 text-xs text-gray-500 bg-gray-50 rounded-md mb-2 flex justify-between items-center';
    debugInfo.innerHTML = `
        <span>调试: 共 ${state.directories.length} 个目录</span>
        <button id="toggle-debug-mode" class="text-blue-500 hover:underline">显示全部</button>
    `;
    elements.directoriesList.appendChild(debugInfo);
    
    // 创建调试模式切换功能
    document.getElementById('toggle-debug-mode').addEventListener('click', function() {
        const isDebugMode = this.textContent === '隐藏调试';
        this.textContent = isDebugMode ? '显示全部' : '隐藏调试';
        
        // 重新渲染目录列表，根据调试模式决定是否显示所有目录
        renderDirectoriesList(/* debugMode= */!isDebugMode);
    });
    
    // 默认不使用调试模式
    const debugMode = false;
    
    // 处理每个目录
    state.directories.forEach((dir, index) => {
        // 添加防御性检查，确保dir对象有效
        if (!dir || (typeof dir !== 'object' && typeof dir !== 'string')) {
            console.warn(`跳过无效目录项 [${index}]:`, dir);
            invalidDirCount++;
            return;
        }
        
        // 提取目录路径和名称
        let dirPath, dirName;
        if (typeof dir === 'string') {
            dirPath = dir;
            dirName = dirPath.split('\\').pop().split('/').pop();
        } else {
            // 确保path存在
            if (!dir.path) {
                dirPath = `目录${index}`;
                invalidDirCount++;
                console.warn(`目录项 [${index}] 缺少path属性，使用默认值:`, dirPath);
            } else {
                dirPath = dir.path;
            }
            dirName = dir.name || dirPath.split('\\').pop().split('/').pop();
        }
        
        // 检查路径中是否包含任何以点开头的部分
        const isHidden = isHiddenDirectory(dirPath);
        if (isHidden && !debugMode) {
            console.log('跳过隐藏目录:', dirPath);
            hiddenDirCount++;
            return;
        }
        
        // 检查目录是否为空
        const isEmpty = isEmptyDirectory(dir);
        if (isEmpty && !debugMode) {
            console.log('跳过空目录:', dirPath);
            emptyDirCount++;
            return;
        }
        
        visibleDirCount++;
        
        const isActive = state.currentDirectory === dirPath;
        
        // 根据目录状态设置不同的样式
        let dirClass = `flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${isActive ? 'bg-primary/10 text-primary' : ''}`;
        let iconClass = 'fa fa-folder-o mr-3';
        
        if (isHidden && debugMode) {
            dirClass += ' border-l-4 border-gray-300';
            iconClass = 'fa fa-eye-slash mr-3 text-gray-400';
        } else if (isEmpty && debugMode) {
            dirClass += ' border-l-4 border-yellow-300';
            iconClass = 'fa fa-folder-open-o mr-3 text-yellow-500';
        }
        
        const dirItem = document.createElement('div');
        dirItem.className = dirClass;
        dirItem.setAttribute('data-path', dirPath);
        dirItem.setAttribute('title', dirPath);
        
        // 创建目录项内容
        let itemContent = `
            <i class="${iconClass}"></i>
            <span class="truncate max-w-[180px]">${dirName}</span>
        `;
        
        // 在调试模式下显示额外信息
        if (debugMode) {
            const statusTexts = [];
            if (isHidden) statusTexts.push('隐藏');
            if (isEmpty) statusTexts.push('空');
            if (statusTexts.length > 0) {
                itemContent += `<span class="ml-2 text-xs text-gray-500">(${statusTexts.join(',')})</span>`;
            }
        }
        
        dirItem.innerHTML = itemContent;
        
        elements.directoriesList.appendChild(dirItem);
    });
    
    // 添加调试统计信息
    const statsMessage = document.createElement('div');
    statsMessage.className = 'p-2 text-xs text-gray-600 bg-gray-50 rounded-md mt-2';
    statsMessage.innerHTML = `
        <div class="flex justify-between">
            <span>可见: ${visibleDirCount}</span>
            <span>隐藏: ${hiddenDirCount}</span>
            <span>空目录: ${emptyDirCount}</span>
            <span>无效: ${invalidDirCount}</span>
        </div>
    `;
    elements.directoriesList.appendChild(statsMessage);
    
    // 如果所有目录都被过滤掉了，显示提示信息
    if (visibleDirCount === 0) {
        const noVisibleDirs = document.createElement('div');
        noVisibleDirs.className = 'p-4 text-center text-gray-500 my-2';
        noVisibleDirs.innerHTML = `
            <i class="fa fa-info-circle text-xl mb-2"></i>
            <p>没有可显示的目录</p>
            <p class="text-sm mt-1">${hiddenDirCount > 0 ? `过滤了 ${hiddenDirCount} 个隐藏目录，` : ''}
            ${emptyDirCount > 0 ? `过滤了 ${emptyDirCount} 个空目录` : ''}</p>
            <p class="text-sm text-blue-500 mt-2">点击上方"显示全部"按钮查看所有目录</p>
        `;
        elements.directoriesList.insertBefore(noVisibleDirs, statsMessage);
    }
    
    // 添加目录选择事件监听
    document.querySelectorAll('#directories-list > div[data-path]').forEach(item => {
        item.addEventListener('click', function() {
            const path = this.getAttribute('data-path');
            console.log('点击目录项:', path);
            selectDirectory(path);
        });
    });
    
    console.log(`=== 渲染目录列表完成 === 可见: ${visibleDirCount}, 隐藏: ${hiddenDirCount}, 空目录: ${emptyDirCount}, 无效: ${invalidDirCount}`);
}

// 添加新目录
function addNewDirectory() {
    // 获取模态框元素
    const directoryModal = document.getElementById('directory-modal');
    const directoryInput = document.getElementById('directory-input');
    const closeModalBtn = document.getElementById('close-directory-modal');
    const cancelBtn = document.getElementById('cancel-directory');
    const confirmBtn = document.getElementById('confirm-directory');
    
    // 清空输入框
    directoryInput.value = '';
    
    // 显示模态框
    directoryModal.classList.remove('hidden');
    
    // 关闭模态框的函数
    function closeModal() {
        directoryModal.classList.add('hidden');
        // 移除事件监听器以防止内存泄漏
        closeModalBtn.removeEventListener('click', closeModal);
        cancelBtn.removeEventListener('click', closeModal);
        confirmBtn.removeEventListener('click', handleConfirm);
        
        // 移除ESC键的事件监听
        document.removeEventListener('keydown', handleEscKey);
    }
    
    // 处理ESC键关闭模态框
    function handleEscKey(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    }
    
    // 处理确认添加
    function handleConfirm() {
        const directory = directoryInput.value.trim();
        if (directory) {
            // 关闭模态框
            closeModal();
            
            // 在实际应用中，服务端需要验证这个目录是否存在且可访问
            fetch('/api/directories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ directory })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    state.directories = data.directories;
                    renderDirectoriesList();
                    showToast('目录添加成功');
                } else {
                    showToast('添加失败：' + data.error);
                }
            })
            .catch(error => {
                console.error('添加目录失败:', error);
                showToast('添加目录失败，请重试');
            });
        } else {
            showToast('请输入有效的目录路径');
        }
    }
    
    // 添加事件监听器
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', handleConfirm);
    
    // 添加ESC键事件监听
    document.addEventListener('keydown', handleEscKey);
    
    // 自动聚焦到输入框
    directoryInput.focus();
}

// 选择目录
function selectDirectory(directory) {
    state.currentDirectory = directory;
    elements.directoryName.textContent = directory.split('\\').pop().split('/').pop();
    
    // 在小屏幕设备上选择目录后自动隐藏侧边栏
    if (window.innerWidth < 768) {
        elements.sidebar.classList.add('hidden');
    }
    
    // 重新渲染目录列表以更新激活状态
    renderDirectoriesList();
    
    // 更新面包屑导航
    updateBreadcrumb();
    
    // 加载该目录下的照片
    loadPhotos(directory);
}

// 更新面包屑导航
function updateBreadcrumb() {
    if (!elements.breadcrumb || !state.currentDirectory) {
        return;
    }
    
    // 清空面包屑
    elements.breadcrumb.innerHTML = '';
    
    // 解析目录路径 - 支持Windows和Unix风格路径分隔符
    const pathParts = state.currentDirectory.split(/[\\/]/); // 使用正则表达式支持\和/
    let currentPath = '';
    
    // 创建面包屑项
    pathParts.forEach((part, index) => {
        // 跳过以点开头的部分
        if (part.startsWith('.')) {
            return;
        }
        
        // 检测原始路径中使用的主要分隔符
        const originalSeparator = state.currentDirectory.includes('\\') ? '\\' : '/';
        currentPath = currentPath ? currentPath + originalSeparator + part : part;
        
        const breadcrumbItem = document.createElement('div');
        breadcrumbItem.className = 'flex items-center';
        
        // 如果是最后一项，不添加点击事件
        if (index === pathParts.length - 1) {
            breadcrumbItem.innerHTML = `<span class="text-gray-700 font-medium">${part}</span>`;
        } else {
            breadcrumbItem.innerHTML = `
                <span class="cursor-pointer hover:text-primary transition-colors">${part}</span>
                <i class="fa fa-chevron-right text-xs mx-2 text-gray-300"></i>
            `;
            breadcrumbItem.addEventListener('click', () => selectDirectory(currentPath));
        }
        
        elements.breadcrumb.appendChild(breadcrumbItem);
    });
}

// 加载照片
function loadPhotos(directory) {
    console.log('=== 开始加载照片 ===');
    console.log('当前选择的目录:', directory);
    
    // 显示加载状态
    elements.gallery.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'col-span-full flex flex-col items-center justify-center py-16 text-center';
    loading.innerHTML = '<i class="fa fa-spinner fa-spin text-4xl text-primary mb-4"></i><p class="text-gray-500">正在加载照片...</p>';
    elements.gallery.appendChild(loading);
    
    const apiUrl = `/api/photos?dir=${encodeURIComponent(directory)}`;
    console.log('准备请求照片API:', apiUrl);
    
    fetch(apiUrl)
        .then(response => {
            console.log('照片API响应状态:', response.status);
            console.log('照片API响应头部:', response.headers.get('content-type'));
            return response.json().catch(error => {
                console.error('解析JSON失败:', error);
                // 尝试查看原始响应内容
                return response.text().then(text => {
                    console.error('原始响应内容:', text);
                    throw new Error('API返回无效JSON: ' + text.substring(0, 100) + '...');
                });
            });
        })
        .then(data => {
            console.log('照片API返回数据:', data);
            
            // 详细检查返回数据结构
            console.log('数据类型:', typeof data);
            console.log('数据包含photos属性:', 'photos' in data);
            console.log('photos是否为数组:', Array.isArray(data.photos));
            console.log('photos数量:', data.photos ? data.photos.length : 0);
            
            if (data.error) {
                console.error('加载照片API错误:', data.error);
                showToast('加载照片失败：' + data.error);
                elements.gallery.innerHTML = '';
                elements.gallery.appendChild(elements.emptyState);
                
                // 隐藏子目录容器
                if (elements.subdirectoriesContainer) {
                    elements.subdirectoriesContainer.classList.add('hidden');
                }
                
                return;
            }
            
            state.photos = data.photos || [];
            console.log('获取到的照片数量:', state.photos.length);
            
            // 处理并渲染子目录
            if (data.subdirectories && Array.isArray(data.subdirectories)) {
                console.log('获取到的子目录数量:', data.subdirectories.length);
                renderSubdirectories(data.subdirectories);
            } else {
                console.log('没有子目录或子目录格式错误');
                // 如果没有子目录或子目录格式错误，隐藏子目录容器
                if (elements.subdirectoriesContainer) {
                    elements.subdirectoriesContainer.classList.add('hidden');
                }
            }
            
            sortPhotos();
            console.log('准备渲染照片');
            renderPhotos();
            elements.photosCount.textContent = `${state.photos.length} 张照片`;
        })
        .catch(error => {
            console.error('加载照片失败:', error);
            console.error('错误堆栈:', error.stack);
            showToast('加载照片失败，请重试');
            elements.gallery.innerHTML = '';
            elements.gallery.appendChild(elements.emptyState);
            
            // 隐藏子目录容器
            if (elements.subdirectoriesContainer) {
                elements.subdirectoriesContainer.classList.add('hidden');
            }
        });
}