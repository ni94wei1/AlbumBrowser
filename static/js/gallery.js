// 照片画廊相关功能

// 加载目录列表
function loadDirectories() {
    fetch('/api/directories')
        .then(response => response.json())
        .then(data => {
            // 检查返回的数据格式并兼容处理
            if (data.directories && Array.isArray(data.directories)) {
                // 处理API返回的directories数组
                state.directories = data.directories;
            } else if (Array.isArray(data)) {
                // 如果直接返回数组，也能处理
                state.directories = data;
            } else {
                console.warn('未找到有效目录数据');
                state.directories = [];
            }
            
            // 确保directories数组中的每个元素都有path属性
            state.directories = state.directories.map(dir => 
                typeof dir === 'string' ? { path: dir } : dir
            );
            
            // 渲染目录列表
            renderDirectoriesList();
            
            // 如果有目录，默认选择第一个
            if (state.directories.length > 0) {
                selectDirectory(state.directories[0].path);
            }
        })
        .catch(error => {
            console.error('加载目录失败:', error);
        });
}

// 渲染目录列表
function renderDirectoriesList() {
    if (!elements.directoriesList) return;
    
    elements.directoriesList.innerHTML = '';
    
    state.directories.forEach(dir => {
        // 添加防御性检查，确保dir.path存在且为字符串
        if (!dir || typeof dir.path !== 'string') {
            console.warn('跳过无效目录项:', dir);
            return;
        }
        
        const dirName = dir.name || dir.path.split('\\').pop().split('/').pop();
        const isActive = state.currentDirectory === dir.path;
        
        const dirItem = document.createElement('div');
        dirItem.className = `flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${isActive ? 'bg-primary/10 text-primary' : ''}`;
        dirItem.setAttribute('data-path', dir.path);
        dirItem.innerHTML = `
            <i class="fa fa-folder-o mr-3"></i>
            <span class="truncate max-w-[200px]" title="${dir.path}">${dirName}</span>
        `;
        
        elements.directoriesList.appendChild(dirItem);
    });
    
    // 添加目录选择事件监听
    document.querySelectorAll('#directories-list > div[data-path]').forEach(item => {
        item.addEventListener('click', function() {
            selectDirectory(this.getAttribute('data-path'));
        });
    });
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
    
    // 解析目录路径
    const pathParts = state.currentDirectory.split('\\'); // Windows路径使用\分隔
    let currentPath = '';
    
    // 创建面包屑项
    pathParts.forEach((part, index) => {
        currentPath = currentPath ? currentPath + '\\' + part : part;
        
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
    // 显示加载状态
    elements.gallery.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'col-span-full flex flex-col items-center justify-center py-16 text-center';
    loading.innerHTML = '<i class="fa fa-spinner fa-spin text-4xl text-primary mb-4"></i><p class="text-gray-500">正在加载照片...</p>';
    elements.gallery.appendChild(loading);
    
    fetch(`/api/photos?dir=${encodeURIComponent(directory)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showToast('加载照片失败：' + data.error);
                elements.gallery.innerHTML = '';
                elements.gallery.appendChild(elements.emptyState);
                
                // 隐藏子目录容器
                if (elements.subdirectoriesContainer) {
                    elements.subdirectoriesContainer.classList.add('hidden');
                }
                
                return;
            }
            
            state.photos = data.photos;
            
            // 处理并渲染子目录
            if (data.subdirectories && Array.isArray(data.subdirectories)) {
                renderSubdirectories(data.subdirectories);
            } else {
                // 如果没有子目录或子目录格式错误，隐藏子目录容器
                if (elements.subdirectoriesContainer) {
                    elements.subdirectoriesContainer.classList.add('hidden');
                }
            }
            
            sortPhotos();
            renderPhotos();
            elements.photosCount.textContent = `${state.photos.length} 张照片`;
        })
        .catch(error => {
            console.error('加载照片失败:', error);
            showToast('加载照片失败，请重试');
            elements.gallery.innerHTML = '';
            elements.gallery.appendChild(elements.emptyState);
            
            // 隐藏子目录容器
            if (elements.subdirectoriesContainer) {
                elements.subdirectoriesContainer.classList.add('hidden');
            }
        });
}

// 渲染子目录
function renderSubdirectories(subdirectories) {
    if (!elements.subdirectoriesList || !elements.subdirectoriesContainer) {
        return;
    }
    
    // 清空子目录列表
    elements.subdirectoriesList.innerHTML = '';
    
    // 如果没有子目录，隐藏容器
    if (!subdirectories || subdirectories.length === 0) {
        elements.subdirectoriesContainer.classList.add('hidden');
        return;
    }
    
    // 显示子目录容器
    elements.subdirectoriesContainer.classList.remove('hidden');
    
    // 为每个子目录创建目录项
    subdirectories.forEach(dir => {
        // 添加防御性检查，确保dir.path存在且为字符串
        if (!dir || typeof dir.path !== 'string') {
            console.warn('跳过无效子目录项:', dir);
            return;
        }
        
        // 创建目录项元素
        const dirItem = document.createElement('div');
        dirItem.className = 'subdirectory-item bg-white rounded-lg shadow-sm p-4 flex flex-col items-center hover:shadow-md transition-shadow cursor-pointer min-w-[120px]';
        
        // 获取目录名称
        const dirName = dir.path.split('\\').pop().split('/').pop();
        
        // 获取图标类名（根据是否包含照片显示不同图标）
        const hasPhotos = dir.has_images || false;
        const iconClass = hasPhotos ? 'fa-folder-open text-primary' : 'fa-folder text-gray-500';
        
        // 设置目录项内容
        dirItem.innerHTML = `
            <div class="subdirectory-icon w-12 h-12 rounded-md bg-gray-50 flex items-center justify-center mb-3">
                <i class="fa ${iconClass} text-2xl"></i>
            </div>
            <div class="subdirectory-name text-sm font-medium text-center truncate w-full">${dirName}</div>
            ${hasPhotos ? '<div class="subdirectory-photo-count text-xs text-gray-500 mt-1">有照片</div>' : ''}
        `;
        
        // 添加点击事件
        dirItem.addEventListener('click', () => selectDirectory(dir.path));
        
        // 添加到子目录列表
        elements.subdirectoriesList.appendChild(dirItem);
    });
}

// 排序照片
function sortPhotos() {
    const sortBy = elements.sortSelect.value;
    
    switch (sortBy) {
        case 'newest':
            // 按拍摄日期排序，如果没有拍摄日期则回退到修改时间
            state.photos.sort((a, b) => {
                // 获取拍摄日期，如果不存在则使用修改时间
                const dateA = a.capture_date ? new Date(a.capture_date) : new Date(a.modified);
                const dateB = b.capture_date ? new Date(b.capture_date) : new Date(b.modified);
                // 降序排序（最新的在前）
                return dateB - dateA;
            });
            break;
        case 'oldest':
            state.photos.sort((a, b) => new Date(a.modified) - new Date(b.modified));
            break;
        case 'name-asc':
            state.photos.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            state.photos.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'rating-desc':
            // 按星级从高到低排序，使用与后端一致的方式获取星级
            state.photos.sort((a, b) => {
                // 优先使用EXIF中的评级，如果没有则使用photo_ratings中的值
                const ratingA = a.metadata ? (a.metadata['星级'] || 0) : 0;
                const ratingB = b.metadata ? (b.metadata['星级'] || 0) : 0;
                return ratingB - ratingA;
            });
            break;
    }
}

// 渲染照片 - 优化版，采用分批加载策略
function renderPhotos() {
    elements.gallery.innerHTML = '';
    
    if (state.photos.length === 0) {
        elements.gallery.appendChild(elements.emptyState);
        return;
    }
    
    // 添加样式以使用CSS Grid布局
    elements.gallery.style.display = 'grid';
    elements.gallery.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    elements.gallery.style.gap = '10px';
    elements.gallery.style.padding = '10px';
    
    // 创建所有照片容器但先不显示图片
    const photoItems = [];
    state.photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-container relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group card-hover bg-white';
        photoItem.innerHTML = `
            <div class="photo-wrapper" style="aspect-ratio: 1/1;">
                <!-- 骨架屏 -->
                <div class="w-full h-full bg-gray-200 rounded-lg skeleton-bg animate-pulse"></div>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 rounded-lg">
                <span class="text-white text-xs truncate w-full font-medium">${photo.name}</span>
            </div>
        `;
        
        photoItem.dataset.index = index;
        photoItem.addEventListener('click', () => {
            openLightbox(index);
        });
        
        elements.gallery.appendChild(photoItem);
        photoItems.push(photoItem);
    });
    
    // 分批加载图片策略
    const batchSize = 15; // 每批加载的图片数量
    const batchDelay = 200; // 批与批之间的延迟(ms)
    let loadedCount = 0;
    
    function loadBatch() {
        // 计算当前批次的起始和结束索引
        const startIndex = loadedCount;
        const endIndex = Math.min(startIndex + batchSize, photoItems.length);
        
        // 加载当前批次的图片
        for (let i = startIndex; i < endIndex; i++) {
            loadPhotoImage(photoItems[i], state.photos[i], i);
        }
        
        loadedCount = endIndex;
        
        // 如果还有图片未加载，继续加载下一批
        if (loadedCount < photoItems.length) {
            setTimeout(loadBatch, batchDelay);
        }
    }
    
    // 开始第一批加载
    loadBatch();
}

// 加载单个照片图片
function loadPhotoImage(photoItem, photo, index) {
    if (!photoItem || !photo) {
        return;
    }
    
    const wrapper = photoItem.querySelector('.photo-wrapper');
    if (!wrapper) return;
    
    const img = new Image();
    img.onload = function() {
        // 替换骨架屏为实际图片
        const skeleton = wrapper.querySelector('.skeleton-bg');
        if (skeleton) {
            wrapper.innerHTML = '';
        }
        
        // 设置图片样式以确保完全填满容器
        img.className = 'w-full h-full object-cover rounded-lg transition-all duration-500 group-hover:scale-105 opacity-0 animate-fade-in';
        img.alt = photo.name;
        wrapper.appendChild(img);
        
        // 强制重排以触发动画
        void img.offsetWidth;
        img.classList.remove('opacity-0');
    };
    
    img.onerror = function() {
        wrapper.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><i class="fa fa-exclamation-triangle text-red-500 text-xl"></i></div>';
    };
    
    // 使用渐进式加载
    img.src = `/api/thumbnail/${encodeURIComponent(photo.path)}`;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 导出函数
window.loadDirectories = loadDirectories;
window.renderDirectoriesList = renderDirectoriesList;
window.addNewDirectory = addNewDirectory;
window.selectDirectory = selectDirectory;
window.loadPhotos = loadPhotos;
window.sortPhotos = sortPhotos;
window.renderPhotos = renderPhotos;
window.loadPhotoImage = loadPhotoImage;
window.formatFileSize = formatFileSize;