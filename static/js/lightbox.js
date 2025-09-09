// 大图查看器相关功能

// 渲染星级评分
function renderRating(element, rating) {
    element.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = `fa fa-star text-lg transition-all ${i <= rating ? 'text-yellow-400' : 'text-gray-600'} cursor-pointer hover:text-yellow-400/80`;
        star.dataset.rating = i;
        
        // 添加点击事件
        star.addEventListener('click', function() {
            const newRating = parseInt(this.dataset.rating);
            updatePhotoRating(window.state.currentPhoto.path, newRating);
        });
        
        element.appendChild(star);
    }
}

// 更新照片星级
function updatePhotoRating(photoPath, rating) {
    showImageLoadingIndicator('更新星级中...');
    
    fetch(`/api/photo_rating`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file_path: photoPath,
            rating: rating
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新当前显示的星级
            renderRating(window.elements.metaRating, rating);
            renderRating(window.elements.mobileMetaRating, rating);
            
            // 更新当前照片对象的星级信息
            const currentPhoto = window.state.currentPhoto;
            if (currentPhoto && currentPhoto.metadata) {
                currentPhoto.metadata['星级'] = rating;
            }
            
            showToast(`星级已更新为 ${rating} 星`);
        } else {
            showToast('更新星级失败：' + data.error);
        }
    })
    .catch(error => {
        console.error('更新星级失败:', error);
        showToast('更新星级失败，请重试');
    })
    .finally(() => {
        hideImageLoadingIndicator();
    });
}

// 获取并显示照片元数据
function loadAndDisplayMetadata(photoPath) {
    fetch(`/api/photo_metadata/${encodeURIComponent(photoPath)}`)
        .then(response => response.json())
        .then(metadata => {
            // 更新桌面端元数据
            window.elements.metaName.textContent = metadata.name;
            
            // 显示拍摄日期或修改日期
            const exif = metadata.exif || {};
            window.elements.metaDate.textContent = exif['拍摄日期'] || metadata.modified || '未知';
            
            // 拍摄参数
            const camera = [exif['相机厂商'], exif['相机型号']].filter(Boolean).join(' ');
            window.elements.metaCamera.textContent = camera || '未知';
            window.elements.metaAperture.textContent = exif['光圈'] || '未知';
            window.elements.metaExposure.textContent = exif['曝光时间'] || '未知';
            window.elements.metaIso.textContent = exif['ISO'] || '未知';
            window.elements.metaFocal.textContent = exif['焦距'] || '未知';
            
            // 文件信息
            window.elements.metaModified.textContent = metadata.modified || '未知';
            window.elements.metaSize.textContent = formatFileSize(metadata.size);
            
            // 渲染星级
            renderRating(window.elements.metaRating, metadata['星级'] || 0);
            
            // 更新移动端元数据
            window.elements.mobileMetaName.textContent = metadata.name;
            window.elements.mobileMetaDate.textContent = exif['拍摄日期'] || metadata.modified || '未知';
            window.elements.mobileMetaCamera.textContent = camera || '未知';
            window.elements.mobileMetaAperture.textContent = exif['光圈'] || '未知';
            window.elements.mobileMetaExposure.textContent = exif['曝光时间'] || '未知';
            window.elements.mobileMetaIso.textContent = exif['ISO'] || '未知';
            window.elements.mobileMetaFocal.textContent = exif['焦距'] || '未知';
            
            // 渲染移动端星级
            renderRating(window.elements.mobileMetaRating, metadata['星级'] || 0);
        })
        .catch(error => {
            console.error('加载元数据失败:', error);
        });
}

// 显示图片加载指示器
function showImageLoadingIndicator(message = '加载中...') {
    console.log('showImageLoadingIndicator - 开始执行，消息:', message);
    const indicator = window.elements ? window.elements.imageLoadingIndicator : null;
    const loadingText = window.elements ? window.elements.loadingText : null;
    
    console.log('showImageLoadingIndicator - 指示器元素:', indicator ? '找到' : '未找到');
    console.log('showImageLoadingIndicator - 文本元素:', loadingText ? '找到' : '未找到');
    
    if (indicator && loadingText) {
        loadingText.textContent = message;
        console.log('showImageLoadingIndicator - 设置文本内容为:', message);
        indicator.classList.remove('hidden');
        console.log('showImageLoadingIndicator - 移除hidden类，尝试显示指示器');
    }
}

// 隐藏图片加载指示器
function hideImageLoadingIndicator() {
    console.log('hideImageLoadingIndicator - 开始执行');
    const indicator = window.elements ? window.elements.imageLoadingIndicator : null;
    
    console.log('hideImageLoadingIndicator - 指示器元素:', indicator ? '找到' : '未找到');
    
    if (indicator) {
        indicator.classList.add('hidden');
        console.log('hideImageLoadingIndicator - 添加hidden类，尝试隐藏指示器');
    }
}

// 切换原图/浏览图
function toggleOriginalImage() {
    console.log('toggleOriginalImage - 函数开始执行');
    // 阻止事件冒泡，防止触发关闭操作
    if (event && event.stopPropagation) {
        event.stopPropagation();
        console.log('toggleOriginalImage - 已阻止事件冒泡');
    }
    
    if (window.state.photos.length === 0 || window.state.currentPhotoIndex === -1) {
        console.log('toggleOriginalImage - 没有照片可供显示');
        return;
    }
    
    window.state.isOriginalImage = !window.state.isOriginalImage;
    console.log('toggleOriginalImage - 切换isOriginalImage状态为:', window.state.isOriginalImage);
    
    const currentPhoto = window.state.photos[window.state.currentPhotoIndex];
    console.log('toggleOriginalImage - 当前照片路径:', currentPhoto.path);
    
    const imageElement = document.querySelector('#lightbox-content img');
    console.log('toggleOriginalImage - 图片元素获取结果:', imageElement ? '成功' : '失败');
    
    if (imageElement) {
        // 保存原始的onload和onerror事件处理程序
        const originalOnLoad = imageElement.onload;
        const originalOnError = imageElement.onerror;
        
        // 显示加载指示器
        console.log('toggleOriginalImage - 调用showImageLoadingIndicator');
        showImageLoadingIndicator(window.state.isOriginalImage ? '加载原图中...' : '加载浏览图中...');
        
        // 设置新的onload事件处理程序
        imageElement.onload = function() {
            // 隐藏加载指示器
            hideImageLoadingIndicator();
            
            // 重新设置点击放大和拖动功能
            console.log('toggleOriginalImage - 图片加载完成，重新设置点击放大和拖动功能');
            setupImageClickZoom(this);
            setupImageDragging(this);
            
            // 调用原始的onload事件处理程序（如果存在）
            if (typeof originalOnLoad === 'function') {
                originalOnLoad.apply(this, arguments);
            }
        };
        
        // 设置新的onerror事件处理程序
        imageElement.onerror = function() {
            // 隐藏加载指示器
            hideImageLoadingIndicator();
            
            // 调用原始的onerror事件处理程序（如果存在）
            if (typeof originalOnError === 'function') {
                originalOnError.apply(this, arguments);
            }
        };
        
        // 添加随机参数防止缓存问题
        const timestamp = new Date().getTime();
        
        if (window.state.isOriginalImage) {
            imageElement.src = `/api/photo/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
        } else {
            imageElement.src = `/api/viewer_image/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
            // 在浏览图模式下重置缩放
            imageElement.style.transform = 'scale(1)';
            window.state.scale = 1;
        }
    }
    
    // 更新按钮状态
    if (window.state.isOriginalImage) {
        window.elements.originalBtn.innerHTML = '<i class="fa fa-picture-o"></i>';
        window.elements.originalBtn.classList.add('bg-primary/50');
    } else {
        window.elements.originalBtn.innerHTML = '<i class="fa fa-image"></i>';
        window.elements.originalBtn.classList.remove('bg-primary/50');
    }
}

// 显示上一张照片
function showPreviousPhoto() {
    console.log('showPreviousPhoto - 尝试显示上一张照片');
    if (window.state.photos.length === 0) {
        console.log('showPreviousPhoto - 没有照片可供显示');
        return;
    }
    
    const currentIndex = window.state.currentPhotoIndex;
    const newIndex = (currentIndex - 1 + window.state.photos.length) % window.state.photos.length;
    
    console.log('showPreviousPhoto - 照片索引切换:', currentIndex, '->', newIndex);
    
    window.state.currentPhotoIndex = newIndex;
    
    // 加载并显示新照片
    const currentPhoto = window.state.photos[newIndex];
    window.state.currentPhoto = currentPhoto;
    const imageElement = document.querySelector('#lightbox-content img');
    const captionElement = document.querySelector('#lightbox-content p');
    
    console.log('showPreviousPhoto - 当前照片信息:', {
        name: currentPhoto.name,
        path: currentPhoto.path,
        imageElementFound: imageElement ? '是' : '否'
    });
    
    if (imageElement) {
        // 重置缩放状态
        window.state.scale = 1;
        imageElement.style.transform = 'scale(1)';
        
        // 添加随机参数防止缓存问题
        const timestamp = new Date().getTime();
        
        // 更新图片
        if (window.state.isOriginalImage) {
            imageElement.src = `/api/photo/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
        } else {
            imageElement.src = `/api/viewer_image/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
        }
        
        // 更新标题（如果存在）
        if (captionElement) {
            captionElement.textContent = currentPhoto.name;
        }
        
        // 确保图片加载完成后再更新
        imageElement.onload = function() {
            console.log('showPreviousPhoto - 图片加载完成');
            
            // 加载元数据
            loadAndDisplayMetadata(currentPhoto.path);
        };
        
        imageElement.onerror = function() {
            console.error('showPreviousPhoto - 图片加载失败:', currentPhoto.path);
        };
    }
}

// 显示下一张照片
function showNextPhoto() {
    console.log('showNextPhoto - 尝试显示下一张照片');
    if (window.state.photos.length === 0) {
        console.log('showNextPhoto - 没有照片可供显示');
        return;
    }
    
    const currentIndex = window.state.currentPhotoIndex;
    const newIndex = (currentIndex + 1) % window.state.photos.length;
    
    console.log('showNextPhoto - 照片索引切换:', currentIndex, '->', newIndex);
    
    window.state.currentPhotoIndex = newIndex;
    
    // 加载并显示新照片
    const currentPhoto = window.state.photos[newIndex];
    window.state.currentPhoto = currentPhoto;
    const imageElement = document.querySelector('#lightbox-content img');
    const captionElement = document.querySelector('#lightbox-content p');
    
    console.log('showNextPhoto - 当前照片信息:', {
        name: currentPhoto.name,
        path: currentPhoto.path,
        imageElementFound: imageElement ? '是' : '否'
    });
    
    if (imageElement) {
        // 重置缩放状态
        window.state.scale = 1;
        imageElement.style.transform = 'scale(1)';
        
        // 显示加载指示器
        showImageLoadingIndicator('加载下一张照片...');
        
        // 添加随机参数防止缓存问题
        const timestamp = new Date().getTime();
        
        // 更新图片
        if (window.state.isOriginalImage) {
            imageElement.src = `/api/photo/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
        } else {
            imageElement.src = `/api/viewer_image/${encodeURIComponent(currentPhoto.path)}?t=${timestamp}`;
        }
        
        // 更新标题（如果存在）
        if (captionElement) {
            captionElement.textContent = currentPhoto.name;
        }
        
        // 确保图片加载完成后再更新
        imageElement.onload = function() {
            console.log('showNextPhoto - 图片加载完成');
            
            // 隐藏加载指示器
            hideImageLoadingIndicator();
            
            // 加载元数据
            loadAndDisplayMetadata(currentPhoto.path);
        };
        
        imageElement.onerror = function() {
            console.error('showNextPhoto - 图片加载失败:', currentPhoto.path);
            // 隐藏加载指示器
            hideImageLoadingIndicator();
        };
    }
}

// 打开大图查看器
function openLightbox(index) {
    // 确保索引有效
    if (index < 0 || index >= window.state.photos.length) return;
    
    window.state.currentPhotoIndex = index;
    window.state.isOriginalImage = false;
    window.state.scale = 1;
    window.state.isDraggingEnabled = false;
    window.state.position = { x: 0, y: 0 };
    
    // 清空内容容器
    const contentContainer = document.getElementById('lightbox-content');
    if (!contentContainer) return;
    contentContainer.innerHTML = '';
    
    // 获取当前照片
    const currentPhoto = window.state.photos[index];
    window.state.currentPhoto = currentPhoto;
    
    // 显示加载指示器
    showImageLoadingIndicator('加载照片中...');
    
    // 创建单个照片显示 - 确保电脑模式下居中
    const photoDisplay = document.createElement('div');
    photoDisplay.className = 'flex flex-col items-center justify-center';
    photoDisplay.innerHTML = `
        <img src="/api/viewer_image/${encodeURIComponent(currentPhoto.path)}" alt="${currentPhoto.name}" class="max-w-full max-h-[95vh] object-contain shadow-2xl rounded-lg">
    `;
    contentContainer.appendChild(photoDisplay);
    
    // 设置图片加载事件
    const imageElement = contentContainer.querySelector('img');
    if (imageElement) {
        imageElement.onload = function() {
            // 隐藏加载指示器
            hideImageLoadingIndicator();
            
            // 添加图片点击放大功能
            setupImageClickZoom(imageElement);
            
            // 添加图片拖动功能
            setupImageDragging(imageElement);
        };
        
        imageElement.onerror = function() {
            console.error('openLightbox - 图片加载失败:', currentPhoto.path);
            // 隐藏加载指示器
            hideImageLoadingIndicator();
        };
    }
    
    // 加载当前照片元数据
    loadAndDisplayMetadata(currentPhoto.path);
    
    // 显示大图查看器
    if (window.elements.lightbox) {
        window.elements.lightbox.classList.remove('hidden');
        
        // 禁止底层页面滚动
        document.body.style.overflow = 'hidden';
        
        // 添加延迟以允许过渡效果正常工作
        setTimeout(() => {
            window.elements.lightbox.classList.add('opacity-100');
            
            // 显示内容和元数据面板
            setTimeout(() => {
                if (contentContainer) {
                    contentContainer.classList.add('opacity-100', 'translate-x-0');
                }
                if (window.elements.metadataPanel) {
                    window.elements.metadataPanel.classList.remove('translate-x-10', 'opacity-0');
                }
            }, 100);
        }, 10);
        
        // 更新控件显示状态
        updateLightboxControls();
        
        // 添加触摸设备上的点击左右区域切换功能
        addTouchAreaNavigation();
        
        // 设置点击空白区域关闭功能
        setupClickOutsideClose();
    }
}

// 点击空白区域关闭大图查看器
function setupClickOutsideClose() {
    const lightbox = window.elements.lightbox;
    const lightboxContent = document.getElementById('lightbox-content');
    const metadataPanel = window.elements.metadataPanel;
    const controls = [
        document.getElementById('close-lightbox'),
        window.elements.prevBtn,
        window.elements.nextBtn,
        window.elements.originalBtn,
        window.elements.downloadBtn,
        window.elements.toggleMobileMetadataBtn
    ];
    
    // 移除已有的事件监听（如果存在）
    if (lightbox.__closeClickHandler) {
        lightbox.removeEventListener('click', lightbox.__closeClickHandler);
    }
    
    // 添加新的事件监听
    lightbox.__closeClickHandler = function(event) {
        console.log('setupClickOutsideClose - 点击事件触发');
        console.log('setupClickOutsideClose - 点击目标:', event.target);
        
        // 检查是否在电脑模式下
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
        
        console.log('setupClickOutsideClose - 设备信息:', { isMobileDevice, isSmallScreen });
        
        // 仅在电脑模式下启用点击空白区域关闭功能
        if (isMobileDevice || isSmallScreen) {
            console.log('setupClickOutsideClose - 移动设备或小屏幕，不处理点击');
            return;
        }
        
        // 检查点击是否在内容区域或控制按钮外
        const isClickOnContent = lightboxContent && lightboxContent.contains(event.target);
        const isClickOnMetadata = metadataPanel && metadataPanel.contains(event.target);
        
        // 检查控制按钮状态
        console.log('setupClickOutsideClose - originalBtn元素:', window.elements.originalBtn);
        
        const isClickOnControl = controls.some(control => {
            const contains = control && control.contains(event.target);
            console.log('setupClickOutsideClose - 控制按钮检查:', { controlId: control?.id, contains });
            return contains;
        });
        
        console.log('setupClickOutsideClose - 点击分析结果:', { isClickOnContent, isClickOnMetadata, isClickOnControl });
        
        // 如果点击在空白区域且不是控制按钮，关闭lightbox
        if (!isClickOnContent && !isClickOnMetadata && !isClickOnControl) {
            console.log('setupClickOutsideClose - 点击在空白区域，关闭lightbox');
            closeLightbox();
        }
    };
    
    lightbox.addEventListener('click', lightbox.__closeClickHandler);
}

// 设置图片点击放大功能
function setupImageClickZoom(imageElement) {
    // 检查是否为电脑模式
    const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
    const isComputerMode = !isMobileDevice && !isSmallScreen;
    
    if (!isComputerMode) return; // 仅在电脑模式下启用
    
    // 保存原始的max-width和max-height样式
    let originalMaxWidth = imageElement.style.maxWidth;
    let originalMaxHeight = imageElement.style.maxHeight;
    
    // 用于追踪点击事件是否应该被视为真正的点击（而不是拖动后的松口）
    let clickStartX, clickStartY;
    let isRealClick = true;
    let isMouseDown = false; // 新增：跟踪鼠标按下状态
    
    // 鼠标按下事件 - 开始追踪点击位置
    imageElement.addEventListener('mousedown', function(event) {
        console.log('===== 鼠标按下事件触发 =====');
        console.log('window.state.isDraggingEnabled:', window.state.isDraggingEnabled);
        
        if (!window.state.isDraggingEnabled) {
            console.log('拖动未启用，不记录点击位置');
            return;
        }
        
        clickStartX = event.clientX;
        clickStartY = event.clientY;
        isRealClick = true;
        isMouseDown = true; // 设置鼠标按下状态为true
        
        console.log('记录点击起始位置:', {x: clickStartX, y: clickStartY});
        console.log('设置isRealClick为:', isRealClick);
        console.log('设置isMouseDown为:', isMouseDown);
    });
    
    // 鼠标移动事件 - 检测是否发生了拖动
    imageElement.addEventListener('mousemove', function(event) {
        // 只有在拖动启用、有点击起始位置且鼠标按下的情况下，才检测拖动
        if (!window.state.isDraggingEnabled || !clickStartX || !clickStartY || !isMouseDown) {
            return;
        }
        
        // 计算拖动距离
        const dx = Math.abs(event.clientX - clickStartX);
        const dy = Math.abs(event.clientY - clickStartY);
        
        // 如果拖动距离超过10像素，则不视为点击
        // 增加阈值以避免轻微移动被误判为拖动
        if ((dx > 10 || dy > 10) && isRealClick) {
            console.log('检测到拖动:', {dx: dx, dy: dy});
            console.log('设置isRealClick为: false');
            isRealClick = false;
        }
    });
    
    imageElement.addEventListener('click', function(event) {
        console.log('===== 点击事件触发 =====');
        console.log('isRealClick:', isRealClick);
        console.log('window.state.isDragging:', window.state.isDragging);
        console.log('window.state.scale:', window.state.scale);
        
        // 如果正在拖动或者不是真正的点击，不执行缩放逻辑
        if (window.state.isDragging || !isRealClick) {
            console.log('点击被阻止：拖动状态或非真实点击');
            window.state.isDragging = false;
            return;
        }
        
        console.log('点击通过验证，准备执行缩放逻辑');
        
        const rect = imageElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const clickX = event.clientX;
        const clickY = event.clientY;
        
        // 计算点击位置到中心的距离
        const distanceToCenter = Math.sqrt(
            Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
        );
        
        // 判断是否点击在中心区域（图片宽度的2/3内）
        // 将点击区域扩大一倍，从原来的1/6改为1/3
        const isCenterClick = distanceToCenter <= rect.width / 3;
        
        if (!isCenterClick) return; // 不是中心点击，不执行缩放
        
        // 阻止事件冒泡，避免触发左右切换
        event.stopPropagation();
        
        if (window.state.scale === 1) {
            // 使用基于百分比的缩放方式，使不同分辨率图片放大效果一致
            // 设置放大倍数，1.2表示放大到120%（更小的放大比例）
            const zoomFactor = 1.2;
            
            // 放大到指定百分比
            window.state.scale = zoomFactor;
            window.state.isDraggingEnabled = true;
            
            console.log('图片点击放大 - 使用百分比缩放:', zoomFactor);
            
            // 更新图片样式以允许拖动和显示完整尺寸
            imageElement.style.cursor = 'grab';
            imageElement.style.transformOrigin = 'center center';
            imageElement.style.maxWidth = 'none';
            imageElement.style.maxHeight = 'none';
            
            // 重置位置
            window.state.position = { x: 0, y: 0 };
            updateImageTransform(imageElement);
        } else {
            // 恢复原始比例
            window.state.scale = 1;
            window.state.isDraggingEnabled = false;
            window.state.position = { x: 0, y: 0 };
            
            // 恢复默认光标和原始样式
            imageElement.style.cursor = '';
            imageElement.style.maxWidth = originalMaxWidth;
            imageElement.style.maxHeight = originalMaxHeight;
            
            // 更新图片样式
            updateImageTransform(imageElement);
        }
    });
}

// 设置图片拖动功能
function setupImageDragging(imageElement) {
    let isDragging = false;
    let startX, startY;
    let initialPosition;
    
    // 鼠标按下事件
    imageElement.addEventListener('mousedown', function(event) {
        // 只有在拖动启用状态下才能拖动
        if (!window.state.isDraggingEnabled) return;
        
        // 阻止默认行为
        event.preventDefault();
        
        // 设置拖动状态
        isDragging = true;
        window.state.isDragging = true;
        
        // 记录起始位置
        startX = event.clientX;
        startY = event.clientY;
        initialPosition = { ...window.state.position };
        
        // 更改光标样式
        imageElement.style.cursor = 'grabbing';
    });
    
    // 鼠标移动事件
    document.addEventListener('mousemove', function(event) {
        if (!isDragging || !window.state.isDraggingEnabled) return;
        
        // 计算位移
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        
        // 更新位置
        window.state.position = {
            x: initialPosition.x + dx,
            y: initialPosition.y + dy
        };
        
        // 应用变换
        updateImageTransform(imageElement);
    });
    
    // 鼠标释放事件
        document.addEventListener('mouseup', function() {
            // 无论是否处于拖动状态，都立即重置window.state.isDragging
            // 这确保点击事件触发时，isDragging状态已经正确重置
            if (isDragging) {
                console.log('===== 鼠标释放事件触发 =====');
                isDragging = false;
                window.state.isDragging = false; // 立即重置
                console.log('立即重置window.state.isDragging为:', window.state.isDragging);
                
                // 添加延迟以重置其他状态，但不影响点击事件
                setTimeout(() => {
                    console.log('重置其他状态');
                    isRealClick = true;
                    isMouseDown = false; // 重置鼠标按下状态
                    clickStartX = null;
                    clickStartY = null;
                    console.log('重置后 - isRealClick:', isRealClick);
                    console.log('重置后 - isMouseDown:', isMouseDown);
                }, 50);
                imageElement.style.cursor = 'grab';
            } else {
                // 即使没有处于拖动状态，也要重置鼠标按下状态
                isMouseDown = false;
                console.log('鼠标释放，重置isMouseDown为:', isMouseDown);
            }
        });
    
    // 鼠标离开事件
        document.addEventListener('mouseleave', function() {
            if (isDragging) {
                isDragging = false;
                // 添加延迟以确保拖动后释放鼠标不会触发点击重置
                setTimeout(() => {
                    window.state.isDragging = false;
                    isMouseDown = false; // 重置鼠标按下状态
                }, 50);
                imageElement.style.cursor = 'grab';
            } else {
                // 即使没有处于拖动状态，也要重置鼠标按下状态
                isMouseDown = false;
            }
        });
}

// 更新图片变换
function updateImageTransform(imageElement) {
    imageElement.style.transform = `translate(${window.state.position.x}px, ${window.state.position.y}px) scale(${window.state.scale})`;
}

// 添加点击左右区域切换功能
function addTouchAreaNavigation() {
    const lightbox = window.elements.lightbox;
    console.log('addTouchAreaNavigation - 初始化触摸导航功能');
    if (!lightbox) {
        console.log('addTouchAreaNavigation - 未找到lightbox元素');
        return;
    }
    
    // 添加新的事件监听
    function handleLightboxClick(event) {
        // 如果正在拖动，不执行切换
        if (window.state.isDragging) {
            return;
        }
        
        console.log('lightbox被点击 - 目标:', event.target.tagName, '类名:', event.target.className);
        // 只有当点击的是lightbox背景或者专门的切换区域时才响应，且不是点击图片
        if ((event.target === lightbox || event.target.classList.contains('lightbox-navigation-area')) && event.target.tagName !== 'IMG') {
            const rect = lightbox.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const width = rect.width;
            
            console.log('lightbox点击位置分析 - X坐标:', clickX, '宽度:', width, '相对位置:', clickX/width);
            
            // 左侧区域点击显示上一张
            if (clickX < width * 0.3) {
                console.log('点击左侧区域 - 显示上一张照片');
                showPreviousPhoto();
            }
            // 右侧区域点击显示下一张
            else if (clickX > width * 0.7) {
                console.log('点击右侧区域 - 显示下一张照片');
                showNextPhoto();
            } else {
                console.log('点击中间区域 - 不进行切换');
            }
        }
    }
    
    // 移除已有的事件监听（如果存在）
    const oldHandlers = lightbox.__eventHandlers || {};
    if (oldHandlers.touchNavigation) {
        console.log('移除已有的触摸导航事件监听');
        lightbox.removeEventListener('click', oldHandlers.touchNavigation);
    }
    
    // 保存新的事件监听引用
    lightbox.__eventHandlers = lightbox.__eventHandlers || {};
    lightbox.__eventHandlers.touchNavigation = handleLightboxClick;
    
    // 添加新的事件监听
    console.log('添加新的触摸导航事件监听');
    lightbox.addEventListener('click', handleLightboxClick);
}

// 关闭大图查看器
function closeLightbox() {
    window.elements.lightbox.classList.remove('opacity-100');
    
    const content = document.getElementById('lightbox-content');
    content.classList.remove('opacity-100', 'translate-x-0');
    window.elements.metadataPanel.classList.add('translate-x-10', 'opacity-0');
    
    setTimeout(() => {
        window.elements.lightbox.classList.add('hidden');
        // 恢复页面滚动
        document.body.style.overflow = '';
    }, 300);
}

// 切换移动端元数据面板
function toggleMobileMetadata() {
    console.log('toggleMobileMetadata - 尝试切换移动端元数据面板');
    const mobileMetadata = window.elements.mobileMetadata;
    const toggleBtn = window.elements.toggleMobileMetadataBtn;
    
    console.log('toggleMobileMetadata - 元素状态检查:', {
        mobileMetadata: mobileMetadata ? '找到' : '未找到',
        toggleBtn: toggleBtn ? '找到' : '未找到'
    });
    
    if (mobileMetadata && toggleBtn) {
        // 检查是否隐藏（基于opacity）
        const isHidden = mobileMetadata.classList.contains('opacity-0');
        console.log('toggleMobileMetadata - 当前面板状态:', isHidden ? '隐藏' : '显示');
        
        if (isHidden) {
            console.log('toggleMobileMetadata - 显示元数据面板');
            // 显示模态框
            mobileMetadata.classList.remove('opacity-0');
            mobileMetadata.classList.add('opacity-100');
            mobileMetadata.classList.remove('pointer-events-none');
            
            // 找到内部容器并添加缩放效果
            const innerContainer = mobileMetadata.querySelector('div:first-child');
            if (innerContainer) {
                setTimeout(() => {
                    innerContainer.classList.remove('scale-95');
                    innerContainer.classList.add('scale-100');
                }, 50);
            }
            
            // 更新按钮图标
            toggleBtn.innerHTML = '<i class="fa fa-times"></i>';
        } else {
            console.log('toggleMobileMetadata - 隐藏元数据面板');
            // 隐藏模态框
            mobileMetadata.classList.remove('opacity-100');
            mobileMetadata.classList.add('opacity-0');
            
            // 找到内部容器并添加缩放效果
            const innerContainer = mobileMetadata.querySelector('div:first-child');
            if (innerContainer) {
                innerContainer.classList.remove('scale-100');
                innerContainer.classList.add('scale-95');
            }
            
            // 延迟添加pointer-events-none以允许过渡效果完成
            setTimeout(() => {
                mobileMetadata.classList.add('pointer-events-none');
            }, 300);
            
            // 更新按钮图标
            toggleBtn.innerHTML = '<i class="fa fa-info-circle"></i>';
        }
    } else {
        console.log('toggleMobileMetadata - 未找到必要的DOM元素');
    }
}

// 下载当前照片
function downloadCurrentPhoto() {
    if (window.state.photos.length === 0 || window.state.currentPhotoIndex === -1) return;
    
    const photo = window.state.photos[window.state.currentPhotoIndex];
    const downloadUrl = `/api/photo/${encodeURIComponent(photo.path)}`;
    
    // 创建一个临时的下载链接
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = photo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 为不同设备添加响应式样式
function updateLightboxControls() {
    // 使用浏览器API直接判断设备类型
    // 1. 检测触摸支持
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 2. 检测用户代理
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTabletDevice = /tablet|ipad/i.test(userAgent) && !/mobile/i.test(userAgent);
    
    // 3. 结合媒体查询作为补充
    const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
    
    // 判断是否为移动设备（优先使用触摸支持和用户代理检测）
    const isMobile = hasTouchSupport && (isMobileDevice || (!isTabletDevice && isSmallScreen));
    
    // 显示调试信息 - 当前设备模式
    let debugInfo = document.getElementById('device-mode-debug');
    if (!debugInfo) {
        debugInfo = document.createElement('div');
        debugInfo.id = 'device-mode-debug';
        debugInfo.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; font-size: 12px; border-radius: 4px;';
        document.body.appendChild(debugInfo);
    }
    
    let deviceMode = '电脑模式';
    if (isMobile) {
        deviceMode = '手机模式';
    }
    debugInfo.textContent = `当前模式: ${deviceMode}`;
    
    if (window.elements.prevBtn && window.elements.nextBtn) {
        // 在移动设备上隐藏按钮，因为使用点击左右区域切换
        // 在非移动设备上显示按钮
        if (isMobile) {
            window.elements.prevBtn.classList.add('hidden');
            window.elements.nextBtn.classList.add('hidden');
        } else {
            window.elements.prevBtn.classList.remove('hidden');
            window.elements.nextBtn.classList.remove('hidden');
        }
    }
}

// 显示提示信息
function showToast(message) {
    // 检查是否已存在toast元素
    let toast = document.getElementById('toast-message');
    
    if (!toast) {
        // 创建新的toast元素
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-md z-50 opacity-0 transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    
    // 设置消息并显示
    toast.textContent = message;
    
    // 强制重排以触发动画
    void toast.offsetWidth;
    toast.classList.remove('opacity-0');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.add('opacity-0');
    }, 3000);
}

// 关闭搜索模态框
function closeSearch() {
    const searchModalContent = document.getElementById('search-modal-content');
    searchModalContent.classList.add('scale-95');

    setTimeout(() => {
        window.elements.searchModal.classList.add('opacity-0');

        setTimeout(() => {
            window.elements.searchModal.classList.add('hidden');
        }, 300);
    }, 100);
}

// 导出函数
window.renderRating = renderRating;
window.loadAndDisplayMetadata = loadAndDisplayMetadata;
window.toggleOriginalImage = toggleOriginalImage;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.showPreviousPhoto = showPreviousPhoto;
window.showNextPhoto = showNextPhoto;
window.toggleMobileMetadata = toggleMobileMetadata;
window.downloadCurrentPhoto = downloadCurrentPhoto;
window.searchPhotos = searchPhotos;
window.renderSearchResults = renderSearchResults;
window.closeSearch = closeSearch;
window.updateLightboxControls = updateLightboxControls;
window.showToast = showToast;

// 初始化移动端元数据按钮事件监听
document.addEventListener('DOMContentLoaded', function() {
    const mobileMetadataBtn = document.getElementById('toggle-mobile-metadata');
    console.log('DOMContentLoaded - 尝试获取移动端元数据按钮:', mobileMetadataBtn ? '找到' : '未找到');
    if (mobileMetadataBtn) {
        console.log('DOMContentLoaded - 为移动端元数据按钮添加点击事件监听');
        mobileMetadataBtn.addEventListener('click', function(event) {
            console.log('移动端元数据按钮被点击!', event);
            toggleMobileMetadata();
        });
    }
});

// 搜索照片
function searchPhotos(query) {
    if (!query.trim()) {
        showToast('请输入搜索关键词');
        return;
    }
    
    // 显示搜索模态框和加载状态
    const searchModalContent = document.getElementById('search-modal-content');
    const searchResults = document.getElementById('search-results');
    
    searchResults.innerHTML = '<div class="flex items-center justify-center p-8"><i class="fa fa-spinner fa-spin text-2xl text-primary"></i></div>';
    
    fetch(`/api/search?query=${encodeURIComponent(query.trim())}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showToast('搜索失败：' + data.error);
                searchResults.innerHTML = '<div class="text-center p-8 text-gray-500">搜索失败，请重试</div>';
                return;
            }
            
            renderSearchResults(data.results);
        })
        .catch(error => {
            console.error('搜索失败:', error);
            showToast('搜索失败，请重试');
            searchResults.innerHTML = '<div class="text-center p-8 text-gray-500">搜索失败，请重试</div>';
        });
}

// 渲染搜索结果
function renderSearchResults(results) {
    const searchResults = document.getElementById('search-results');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="text-center p-8 text-gray-500">没有找到匹配的照片</div>';
        return;
    }
    
    searchResults.innerHTML = '';
    
    // 创建结果容器
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3';
    
    // 按顺序加载搜索结果图片
    let loadedCount = 0;
    function loadNextResult() {
        if (loadedCount >= results.length) {
            return;
        }
        
        const index = loadedCount;
        const result = results[index];
        
        // 创建结果项
        const resultItem = document.createElement('div');
        resultItem.className = 'relative overflow-hidden rounded-md shadow-md group cursor-pointer card-hover';
        resultItem.innerHTML = `
            <div class="aspect-w-1 aspect-h-1 bg-gray-200">
                <!-- 骨架屏 -->
                <div class="w-full h-full bg-gray-200 rounded-md skeleton-bg"></div>
            </div>
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                <span class="text-white text-xs truncate w-full">${result.name}</span>
            </div>
        `;
        
        // 添加点击事件，找到原始照片索引并打开
        resultItem.addEventListener('click', () => {
            const originalIndex = window.state.photos.findIndex(photo => photo.path === result.path);
            if (originalIndex !== -1) {
                closeSearch();
                openLightbox(originalIndex);
            }
        });
        
        resultsGrid.appendChild(resultItem);
        
        // 加载图片
        const img = new Image();
        img.onload = function() {
            const skeleton = resultItem.querySelector('.skeleton-bg');
            if (skeleton && skeleton.parentElement) {
                skeleton.parentElement.innerHTML = '';
                img.className = 'object-cover w-full h-full rounded-md transition-transform duration-500 group-hover:scale-105';
                img.alt = result.name;
                skeleton.parentElement.appendChild(img);
            }
            
            loadedCount++;
            setTimeout(loadNextResult, 30);
        };
        
        img.onerror = function() {
            loadedCount++;
            setTimeout(loadNextResult, 30);
        };
        
        img.src = `/api/thumbnail/${encodeURIComponent(result.path)}`;
        
        // 如果是第一个结果，直接添加到DOM
        if (index === 0) {
            searchResults.appendChild(resultsGrid);
        }
    }
    
    // 开始加载结果
    loadNextResult();
}

// 导出函数到window对象，使其他模块可以访问
window.closeLightbox = closeLightbox;
window.showPreviousPhoto = showPreviousPhoto;
window.showNextPhoto = showNextPhoto;
window.toggleOriginalImage = toggleOriginalImage;
window.toggleMobileMetadata = toggleMobileMetadata;
window.loadAndDisplayMetadata = loadAndDisplayMetadata;