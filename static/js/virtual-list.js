/*
 * 照片浏览应用 - 虚拟列表实现
 * 注意：此文件已被弃用，当前应用使用的是完整列表加载方式，并通过分批加载策略优化性能
 * 保留此文件仅作为参考
 */

// 虚拟列表配置
const virtualListConfig = {
    // 可视区域外的缓冲区行数
    bufferRows: 2,
    // 监听滚动事件的节流时间(ms)
    scrollThrottleTime: 16, // 约60fps
    // 每行显示的照片数量（响应式调整）
    getItemsPerRow() {
        // 根据屏幕宽度动态调整每行显示的照片数量
        const width = window.innerWidth;
        if (width < 640) return 2;
        if (width < 768) return 3;
        if (width < 1024) return 4;
        return 5;
    },
    // 单个照片项的固定高度
    itemHeight: 250,
    // 照片项间距
    itemGap: 8
};

// 虚拟列表状态
const virtualListState = {
    // 当前显示的起始索引
    startIndex: 0,
    // 当前显示的结束索引
    endIndex: 0,
    // 上次滚动处理时间
    lastScrollTime: 0,
    // 是否正在更新DOM
    isUpdating: false,
    // 滚动容器
    scrollContainer: null,
    // 照片容器
    photosContainer: null,
    // 占位元素(用于模拟滚动条长度)
    placeholder: null,
    // DOM元素池
    domPool: [],
    // 当前每行显示的照片数量
    currentItemsPerRow: 5,
    // 当前行高
    currentRowHeight: 0
};

// 注意：以下函数已不再使用，当前应用使用gallery.js中的分批加载策略
function initVirtualList() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function handleScroll() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function updateVisiblePhotos() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function renderPhotosWithVirtualList() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
    // 调用原来的渲染函数
    renderPhotos();
}

function createPhotoItem() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
    return document.createElement('div');
}

function updatePhotoItem() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function loadPhotoImage() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function resetVirtualList() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
}

function resetAndRenderVirtualList() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
    // 调用原来的渲染函数
    renderPhotos();
}

function throttle() {
    console.warn('虚拟列表功能已被弃用，当前使用完整列表加载方式');
    return function() {};
}

// 导出函数，但添加弃用警告
window.initVirtualList = initVirtualList;
window.renderPhotosWithVirtualList = renderPhotosWithVirtualList;
window.resetVirtualList = resetVirtualList;
window.resetAndRenderVirtualList = resetAndRenderVirtualList;