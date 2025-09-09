// 触摸事件处理功能

// 获取PageView容器
function getPageViewContainer() {
    return document.getElementById('lightbox-pageview');
}

// 初始化触摸事件监听
function initTouchEventListeners() {
    const container = getPageViewContainer();
    if (!container) return;
    
    // 初始化触摸状态变量
    const touchState = {
        startX: 0,
        startY: 0,
        translateX: 0,
        isDragging: false,
        currentScale: 1,
        startDistance: 0,
        lastDistance: 0,
        scaleStart: 1,
        isScaling: false,
        startTime: 0
    };
    
    // 设置触摸事件
    setupTouchEvents(container, touchState);
}

// 设置触摸事件
function setupTouchEvents(container, touchState) {
    // 添加container存在性检查
    if (!container) {
        console.warn('触摸容器不存在，无法设置触摸事件');
        return;
    }
    
    // 触摸开始事件
    container.addEventListener('touchstart', function(e) {
        const touches = e.touches;
        touchState.startTime = Date.now();
        
        // 单指拖动
        if (touches.length === 1) {
            touchState.startX = touches[0].clientX;
            touchState.startY = touches[0].clientY;
            touchState.isDragging = true;
            
            // 获取当前的transform属性
            const style = window.getComputedStyle(container);
            const transform = style.transform;
            
            if (transform && transform !== 'none') {
                // 提取translateX值
                const match = transform.match(/translateX\(([^)]+)\)/);
                if (match && match[1]) {
                    touchState.translateX = parseFloat(match[1]) || 0;
                }
            }
        }
        
        // 双指缩放
        if (touches.length === 2) {
            // 修复：移除对isOriginalImage的限制，允许在任何模式下缩放
            touchState.isScaling = true;
            touchState.startDistance = getDistance(touches[0], touches[1]);
            touchState.scaleStart = touchState.currentScale;
        }
    });
    
    // 触摸移动事件
    container.addEventListener('touchmove', function(e) {
        const touches = e.touches;
        
        // 拖动
        if (touchState.isDragging && touches.length === 1) {
            const currentX = touches[0].clientX;
            const currentY = touches[0].clientY;
            const diffX = currentX - touchState.startX;
            const diffY = currentY - touchState.startY;
            
            // 限制在X轴方向拖动
            const containerWidth = document.getElementById('lightbox-content').offsetWidth;
            const maxTranslateX = 0;
            const minTranslateX = -(state.photos.length - 1) * containerWidth;
            
            let newTranslateX = touchState.translateX + diffX;
            
            // 边界限制
            newTranslateX = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX));
            
            // 应用拖动效果
            container.style.transform = `translateX(${newTranslateX}px)`;
            container.style.transition = 'none';
        }
        
        // 缩放
        if (touchState.isScaling && touches.length === 2) {
            const currentDistance = getDistance(touches[0], touches[1]);
            const scaleFactor = currentDistance / touchState.startDistance;
            touchState.currentScale = touchState.scaleStart * scaleFactor;
            
            // 限制缩放范围
            touchState.currentScale = Math.max(1, Math.min(5, touchState.currentScale));
            
            // 应用缩放效果到当前图片
            const currentPage = document.querySelectorAll('.lightbox-page')[state.currentPhotoIndex];
            const currentImg = currentPage.querySelector('img');
            
            if (currentImg) {
                currentImg.style.transform = `scale(${touchState.currentScale})`;
            }
        }
    });
    
    // 触摸结束事件
    container.addEventListener('touchend', function() {
        const endTime = Date.now();
        const duration = endTime - touchState.startTime;
        
        // 处理拖动结束
        if (touchState.isDragging) {
            const style = window.getComputedStyle(container);
            const transform = style.transform;
            
            let translateX = 0;
            if (transform && transform !== 'none') {
                const match = transform.match(/translateX\(([^)]+)\)/);
                if (match && match[1]) {
                    translateX = parseFloat(match[1]) || 0;
                }
            }
            
            // 计算当前应该显示的页面索引
            const containerWidth = document.getElementById('lightbox-content').offsetWidth;
            
            // 修复：确保正确计算页面索引
            let pageIndex = Math.round(-translateX / containerWidth);
            
            // 确保索引在有效范围内
            pageIndex = Math.max(0, Math.min(state.photos.length - 1, pageIndex));
            
            // 如果是快速滑动（模拟手势），根据滑动方向切换页面
            if (duration < 200) {
                const diffFromCenter = translateX + pageIndex * containerWidth;
                
                // 向左快速滑动，显示下一张
                if (diffFromCenter < -50 && pageIndex < state.photos.length - 1) {
                    pageIndex += 1;
                }
                // 向右快速滑动，显示上一张
                else if (diffFromCenter > 50 && pageIndex > 0) {
                    pageIndex -= 1;
                }
            }
            
            // 使用goToPage函数切换页面，确保图片正确加载
            if (pageIndex !== state.currentPhotoIndex) {
                goToPage(pageIndex);
            }
            
            touchState.isDragging = false;
        }
        
        // 处理缩放结束
        if (touchState.isScaling) {
            touchState.isScaling = false;
        }
    });
}

// 计算两点之间的距离
function getDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// 导出函数
window.initTouchEventListeners = initTouchEventListeners;
window.getPageViewContainer = getPageViewContainer;
window.setupTouchEvents = setupTouchEvents;

// 自动设置触摸事件
// 修复：使用正确的方式初始化触摸事件
window.addEventListener('load', function() {
    initTouchEventListeners();
});