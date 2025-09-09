// 主应用文件 - 照片浏览器

// 应用状态
const state = {
    currentDirectory: '',
    directories: [],
    photos: [],
    currentPhotoIndex: -1,
    isOriginalImage: false,
    scale: 1
};

// DOM元素引用
const elements = {
    // 侧边栏
    sidebar: null,
    directoryName: null,
    directoriesList: null,
    photosCount: null,
    sortSelect: null,
    addDirectoryBtn: null,
    toggleSidebar: null,
    
    // 主内容
    gallery: null,
    emptyState: null,
    
    // 搜索
    searchBtn: null,
    searchModal: null,
    closeSearch: null,
    searchInput: null,
    
    // 大图查看器
    lightbox: null,
    lightboxContent: null,
    closeLightbox: null,
    prevBtn: null,
    nextBtn: null,
    originalBtn: null,
    downloadBtn: null,
    lightboxImg: null,
    
    // 元数据
    metadataPanel: null,
    metaName: null,
    metaDate: null,
    metaCamera: null,
    metaAperture: null,
    metaExposure: null,
    metaIso: null,
    metaFocal: null,
    metaModified: null,
    metaSize: null,
    metaRating: null,
    
    // 移动端元数据
    mobileMetadata: null,
    toggleMobileMetadataBtn: null,
    mobileMetaName: null,
    mobileMetaDate: null,
    mobileMetaCamera: null,
    mobileMetaAperture: null,
    mobileMetaExposure: null,
    mobileMetaIso: null,
    mobileMetaFocal: null,
    mobileMetaRating: null,
    
    // 图片加载指示器
    imageLoadingIndicator: null,
    loadingText: null
};

// 初始化DOM元素引用
function initDOMReferences() {
    // 侧边栏
    elements.sidebar = document.getElementById('sidebar');
    elements.directoryName = document.getElementById('directory-name');
    elements.directoriesList = document.getElementById('directories-list');
    elements.photosCount = document.getElementById('photos-count');
    elements.sortSelect = document.getElementById('sort-select');
    elements.addDirectoryBtn = document.getElementById('add-directory');
    elements.toggleSidebar = document.getElementById('toggle-sidebar');
    
    // 主内容
    elements.gallery = document.getElementById('gallery');
    
    // 创建空状态元素
    elements.emptyState = document.createElement('div');
    elements.emptyState.className = 'col-span-full flex flex-col items-center justify-center py-16 text-center';
    elements.emptyState.innerHTML = '<i class="fa fa-picture-o text-4xl text-gray-400 mb-4"></i><p class="text-gray-500">没有找到照片</p><p class="text-gray-400 text-sm mt-1">请添加包含照片的目录</p>';
    
    // 搜索
    elements.searchBtn = document.getElementById('search-btn');
    elements.searchModal = document.getElementById('search-modal');
    elements.closeSearch = document.getElementById('close-search');
    elements.searchInput = document.getElementById('search-input');
    
    // 大图查看器
    elements.lightbox = document.getElementById('lightbox');
    elements.lightboxContent = document.getElementById('lightbox-content');
    elements.closeLightbox = document.getElementById('close-lightbox');
    elements.prevBtn = document.getElementById('prev-btn');
    elements.nextBtn = document.getElementById('next-btn');
    elements.originalBtn = document.getElementById('original-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    
    // 元数据
    elements.metadataPanel = document.getElementById('metadata-panel');
    elements.metaName = document.getElementById('meta-name');
    elements.metaDate = document.getElementById('meta-date');
    elements.metaCamera = document.getElementById('meta-camera');
    elements.metaAperture = document.getElementById('meta-aperture');
    elements.metaExposure = document.getElementById('meta-exposure');
    elements.metaIso = document.getElementById('meta-iso');
    elements.metaFocal = document.getElementById('meta-focal');
    elements.metaModified = document.getElementById('meta-modified');
    elements.metaSize = document.getElementById('meta-size');
    elements.metaRating = document.getElementById('meta-rating');
    
    // 移动端元数据
    elements.mobileMetadata = document.getElementById('mobile-metadata');
    elements.toggleMobileMetadataBtn = document.getElementById('toggle-mobile-metadata-btn');
    elements.mobileMetaName = document.getElementById('mobile-meta-name');
    elements.mobileMetaDate = document.getElementById('mobile-meta-date');
    elements.mobileMetaCamera = document.getElementById('mobile-meta-camera');
    elements.mobileMetaAperture = document.getElementById('mobile-meta-aperture');
    elements.mobileMetaExposure = document.getElementById('mobile-meta-exposure');
    elements.mobileMetaIso = document.getElementById('mobile-meta-iso');
    elements.mobileMetaFocal = document.getElementById('mobile-meta-focal');
    elements.mobileMetaRating = document.getElementById('mobile-meta-rating');
    
    // 图片加载指示器
    elements.imageLoadingIndicator = document.getElementById('image-loading-indicator');
    elements.loadingText = document.getElementById('loading-text');
    
    // 二维码相关
    elements.showQrCodeBtn = document.getElementById('show-qr-code');
    elements.qrCodeModal = document.getElementById('qr-code-modal');
    elements.closeQrCodeBtn = document.getElementById('close-qr-code');
    elements.qrCodeContainer = document.getElementById('qr-code-container');
    elements.qrCodeUrl = document.getElementById('qr-code-url');
}

// 添加安全的事件监听器（避免重复添加）
function addSafeEventListener(element, event, callback) {
    if (element && element.addEventListener && !element._handlers) {
        element._handlers = {};
    }
    
    if (element && element._handlers && !element._handlers[event]) {
        element._handlers[event] = callback;
        element.addEventListener(event, callback);
    }
}

// 初始化应用
function init() {
    // 初始化DOM引用
    initDOMReferences();
    
    // 加载目录列表
    loadDirectories();
    
    // 设置事件监听
    setupEventListeners();
    
    // 初始化触摸相关功能
    initTouchEvents();
    
    // 更新设备响应式控制
    updateLightboxControls();
}

// 初始化触摸事件
function initTouchEvents() {
    // 为touch.js提供必要的状态变量
    window.touchState = {
        // 这些变量现在在touch.js内部管理，但保持兼容性
        initialized: true
    };
}

// 设置事件监听
function setupEventListeners() {
    // 汉堡菜单
    addSafeEventListener(elements.toggleSidebar, 'click', () => {
        elements.sidebar.classList.toggle('hidden');
    });
    
    // 添加目录
    addSafeEventListener(elements.addDirectoryBtn, 'click', addNewDirectory);
    
    // 排序选项
    addSafeEventListener(elements.sortSelect, 'change', () => {
        sortPhotos();
        renderPhotos();
    });
    
    // 搜索
    addSafeEventListener(elements.searchBtn, 'click', () => {
        elements.searchModal.classList.remove('hidden');
        setTimeout(() => {
            elements.searchModal.classList.remove('opacity-0');
            const searchModalContent = document.getElementById('search-modal-content');
            searchModalContent.classList.remove('scale-95');
            elements.searchInput.focus();
        }, 10);
    });
    
    // 关闭大图查看器
    addSafeEventListener(elements.closeLightbox, 'click', closeLightbox);
    
    // 上一张/下一张
    addSafeEventListener(elements.prevBtn, 'click', showPreviousPhoto);
    addSafeEventListener(elements.nextBtn, 'click', showNextPhoto);
    
    // 原图切换 - 更健壮的事件绑定
    if (elements.originalBtn) {
        console.log('setupEventListeners - 找到originalBtn，准备添加事件监听');
        // 移除可能存在的旧监听器
        if (elements.originalBtn._handlers && elements.originalBtn._handlers.click) {
            elements.originalBtn.removeEventListener('click', elements.originalBtn._handlers.click);
            elements.originalBtn._handlers.click = null;
        }
        // 添加新的监听器，确保事件不会冒泡
        elements.originalBtn.addEventListener('click', function(event) {
            console.log('originalBtn - 点击事件触发');
            event.stopPropagation(); // 确保事件不会冒泡到lightbox
            toggleOriginalImage();
        });
    } else {
        console.log('setupEventListeners - 未找到originalBtn元素');
    }
    
    // 下载照片
    addSafeEventListener(elements.downloadBtn, 'click', downloadCurrentPhoto);
    
    // 切换移动端元数据
    addSafeEventListener(elements.toggleMobileMetadataBtn, 'click', toggleMobileMetadata);
    
    // 窗口大小改变
    addSafeEventListener(window, 'resize', updateLightboxControls);
    
    // 键盘导航
    addSafeEventListener(document, 'keydown', (e) => {
        if (elements.lightbox && !elements.lightbox.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                showPreviousPhoto();
            } else if (e.key === 'ArrowRight') {
                showNextPhoto();
            }
        }
        
        // 二维码模态框键盘关闭
        if (elements.qrCodeModal && !elements.qrCodeModal.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeQrCodeModal();
            }
        }
    });
    
    // 二维码相关事件监听
    addSafeEventListener(elements.showQrCodeBtn, 'click', showQrCode);
    addSafeEventListener(elements.closeQrCodeBtn, 'click', closeQrCodeModal);
    
    // 点击模态框背景关闭
    addSafeEventListener(elements.qrCodeModal, 'click', (e) => {
        if (e.target === elements.qrCodeModal) {
            closeQrCodeModal();
        }
    });
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);

// 生成二维码函数
function showQrCode() {
    try {
        // 获取当前页面URL
        const currentUrl = window.location.href;
        const urlParts = new URL(currentUrl);
        
        // 清空容器
        elements.qrCodeContainer.innerHTML = '';
        
        // 构建二维码内容：使用固定IP地址192.168.100.100:5000
        // 由于浏览器JavaScript无法直接获取本机IP地址，按照用户要求使用固定IP
        const qrCodeUrl = 'http://192.168.100.100:5000';
        
        // 创建二维码
        const qr = qrcode(0, 'L'); // 0表示自动检测版本，L表示低纠错级别
        qr.addData(qrCodeUrl);
        qr.make();
        
        // 将二维码转换为HTML元素
        const qrElement = qr.createImgTag(4, 0); // 4表示像素大小，0表示边距
        elements.qrCodeContainer.innerHTML = qrElement;
        
        // 更新显示的URL文本
        elements.qrCodeUrl.textContent = qrCodeUrl;
        
        // 显示模态框
        elements.qrCodeModal.classList.remove('hidden');
        
        // 添加动画效果
        setTimeout(() => {
            elements.qrCodeModal.classList.add('animate-fade-in');
        }, 10);
    } catch (error) {
        console.error('生成二维码时出错:', error);
        elements.qrCodeContainer.innerHTML = '<p class="text-gray-500">生成二维码失败</p>';
        elements.qrCodeModal.classList.remove('hidden');
    }
}

// 关闭二维码模态框
function closeQrCodeModal() {
    if (elements.qrCodeModal) {
        elements.qrCodeModal.classList.add('hidden');
        elements.qrCodeModal.classList.remove('animate-fade-in');
    }
}

// 导出共享变量和函数
window.state = state;
window.elements = elements;
window.addSafeEventListener = addSafeEventListener;
window.showQrCode = showQrCode;
window.closeQrCodeModal = closeQrCodeModal;