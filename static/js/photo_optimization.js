// 照片浏览性能优化模块

// 图片加载优化 - 实现视口懒加载功能
function initImageLazyLoading() {
    // 创建IntersectionObserver实例来监测元素是否在视口中
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // 加载真实图片
                const dataSrc = img.getAttribute('data-src');
                if (dataSrc) {
                    img.src = dataSrc;
                    img.removeAttribute('data-src');
                    
                    // 加载完成后移除骨架屏
                    const skeleton = img.parentElement.querySelector('.skeleton-bg');
                    if (skeleton) {
                        skeleton.remove();
                    }
                    
                    // 停止观察已加载的图片
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '200px 0px', // 提前200px开始加载
        threshold: 0.1
    });
    
    // 存储observer实例以供全局访问
    window.imageObserver = observer;
}

// 批量图片请求优化 - 实现图片请求合并功能
const BatchImageLoader = {
    batchSize: 10, // 每批次请求的图片数量
    delay: 50, // 批次间的延迟（毫秒）
    queue: [],
    processing: false,
    
    // 添加图片到队列
    add(imagePath, callback) {
        this.queue.push({ path: imagePath, callback });
        if (!this.processing) {
            this.processNextBatch();
        }
    },
    
    // 处理下一批图片请求
    processNextBatch() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }
        
        this.processing = true;
        
        // 获取当前批次的图片
        const batch = this.queue.splice(0, this.batchSize);
        const batchPromises = [];
        
        // 并行请求当前批次的图片
        batch.forEach((item, index) => {
            // 添加小延迟以避免请求过于集中
            const promise = new Promise((resolve) => {
                setTimeout(() => {
                    const img = new Image();
                    img.onload = () => {
                        resolve({ success: true, path: item.path, img, index });
                    };
                    img.onerror = () => {
                        resolve({ success: false, path: item.path, index });
                    };
                    img.src = `/api/thumbnail/${encodeURIComponent(item.path)}`;
                }, this.delay * index);
            });
            batchPromises.push(promise);
        });
        
        // 处理当前批次的所有请求完成后的回调
        Promise.all(batchPromises).then(results => {
            results.forEach(result => {
                const item = batch[result.index];
                if (result.success) {
                    item.callback(result.img);
                } else {
                    // 处理加载失败的情况
                    const errorImg = new Image();
                    errorImg.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%25%22%20height%3D%22100%25%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%23999%22%3E%E2%98%BC%3C%2Ftext%3E%3C%2Fsvg%3E';
                    item.callback(errorImg);
                }
            });
            
            // 处理下一批
            setTimeout(() => {
                this.processNextBatch();
            }, this.delay);
        });
    }
};

// 图片预热缓存机制 - 提前预加载即将查看的图片
function preloadNearbyImages(currentIndex, photoCount) {
    // 只在用户浏览大图时预加载
    if (!window.isLightboxOpen) return;
    
    const preloadCount = 3; // 预加载前后各3张图片
    const preloadQueue = [];
    
    // 预加载下N张图片
    for (let i = 1; i <= preloadCount; i++) {
        const nextIndex = (currentIndex + i) % photoCount;
        if (nextIndex >= 0 && nextIndex < state.photos.length) {
            preloadQueue.push(state.photos[nextIndex].path);
        }
    }
    
    // 预加载上N张图片
    for (let i = 1; i <= preloadCount; i++) {
        const prevIndex = (currentIndex - i + photoCount) % photoCount;
        if (prevIndex >= 0 && prevIndex < state.photos.length) {
            preloadQueue.push(state.photos[prevIndex].path);
        }
    }
    
    // 执行预加载
    preloadQueue.forEach(path => {
        // 创建预加载图片对象
        const preloadImg = new Image();
        preloadImg.src = `/api/thumbnail/${encodeURIComponent(path)}`;
        
        // 同时预加载查看器图片
        const viewerImg = new Image();
        viewerImg.src = `/api/viewer_image/${encodeURIComponent(path)}`;
    });
}

// 缓存优化 - 实现前端图片缓存管理
const ImageCacheManager = {
    maxSize: 100, // 最大缓存100张图片
    cache: new Map(), // 使用Map存储，保持插入顺序
    
    // 添加图片到缓存
    add(key, imageData) {
        // 如果缓存已满，删除最早的缓存项
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, {
            data: imageData,
            timestamp: Date.now()
        });
    },
    
    // 从缓存获取图片
    get(key) {
        if (this.cache.has(key)) {
            const cached = this.cache.get(key);
            // 更新访问时间，实现LRU
            cached.timestamp = Date.now();
            return cached.data;
        }
        return null;
    },
    
    // 检查图片是否在缓存中
    has(key) {
        return this.cache.has(key);
    },
    
    // 清理过期缓存
    cleanup(expiryTime = 3600000) { // 默认1小时过期
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > expiryTime) {
                this.cache.delete(key);
            }
        }
    }
};

// 将性能优化模块暴露到全局window对象
window.performanceModule = {
    initImageLazyLoading,
    BatchImageLoader,
    preloadNearbyImages,
    ImageCacheManager
};

// 兼容旧的模块系统
try {
    // 尝试使用ES模块导出（如果环境支持）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.performanceModule;
    }
} catch (e) {
    // 忽略在浏览器环境中使用CommonJS模块系统的错误
}

// 如果在浏览器环境中，自动初始化懒加载
if (typeof window !== 'undefined') {
    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImageLazyLoading);
    } else {
        initImageLazyLoading();
    }
}