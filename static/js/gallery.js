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
    // 注意：在实际环境中，这里可能需要更复杂的目录选择逻辑
    // 由于安全限制，浏览器无法直接访问本地文件系统目录
    // 这里提供一个示例，让用户手动输入目录路径
    const directory = prompt('请输入照片目录路径：');
    if (directory) {
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
    }
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
    
    // 加载该目录下的照片
    loadPhotos(directory);
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
                return;
            }
            
            state.photos = data.photos;
            sortPhotos();
            renderPhotos();
            elements.photosCount.textContent = `${state.photos.length} 张照片`;
        })
        .catch(error => {
            console.error('加载照片失败:', error);
            showToast('加载照片失败，请重试');
            elements.gallery.innerHTML = '';
            elements.gallery.appendChild(elements.emptyState);
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

// 渲染照片
function renderPhotos() {
    elements.gallery.innerHTML = '';
    
    if (state.photos.length === 0) {
        elements.gallery.appendChild(elements.emptyState);
        return;
    }
    
    // 创建所有照片容器但先不显示图片
    const photoItems = [];
    state.photos.forEach((photo, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-container relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group card-hover bg-white';
        photoItem.innerHTML = `
            <div class="photo-wrapper">
                <!-- 骨架屏 -->
                <div class="w-full h-full bg-gray-200 rounded-lg skeleton-bg"></div>
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
    
    // 按顺序加载图片以确保布局稳定
    let loadedCount = 0;
    function loadNextImage() {
        if (loadedCount >= state.photos.length) {
            return;
        }
        
        const index = loadedCount;
        const photo = state.photos[index];
        const photoItem = photoItems[index];
        const img = new Image();
        
        img.onload = function() {
            // 替换骨架屏为实际图片
            const wrapper = photoItem.querySelector('.photo-wrapper');
            wrapper.innerHTML = '';
            img.className = 'object-contain max-w-full max-h-full rounded-lg transition-all duration-500 group-hover:scale-105 opacity-0 animate-fade-in';
            img.alt = photo.name;
            wrapper.appendChild(img);
            // 强制重排以触发动画
            void img.offsetWidth;
            img.classList.remove('opacity-0');
            
            loadedCount++;
            // 延迟加载下一张，避免一次性请求过多
            setTimeout(loadNextImage, 50);
        };
        
        img.onerror = function() {
            loadedCount++;
            setTimeout(loadNextImage, 50);
        };
        
        img.src = `/api/thumbnail/${encodeURIComponent(photo.path)}`;
    }
    
    // 开始按顺序加载图片
    loadNextImage();
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
window.formatFileSize = formatFileSize;