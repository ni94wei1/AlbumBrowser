import json
import os
import threading

# 配置文件路径
CONFIG_FILE = 'config.json'
RATING_FILE = 'ratings.json'

# 默认配置
default_config = {
    "photo_directories": [],
    "thumbnail_size": (200, 200),
    "viewer_image_max_size": 1024,
    "viewer_image_max_file_size": 1024 * 1024,  # 1MB
    "supported_formats": ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
    "cache_expiry": 300  # 缓存过期时间（秒）
}

def load_config():
    """加载配置文件，如果不存在则创建默认配置"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                # 合并默认配置，确保所有必要的配置项都存在
                for key, value in default_config.items():
                    if key not in config:
                        config[key] = value
                return config
        except Exception as e:
            print(f"[错误] 加载配置文件失败: {str(e)}")
    
    # 创建默认配置文件
    save_config(default_config)
    return default_config.copy()

def save_config(config):
    """保存配置到文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[错误] 保存配置文件失败: {str(e)}")

def load_ratings():
    """加载照片星级评分数据"""
    if os.path.exists(RATING_FILE):
        try:
            with open(RATING_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[错误] 加载星级评分数据失败: {str(e)}")
    return {}

def save_ratings(ratings):
    """保存照片星级评分数据到文件"""
    try:
        with open(RATING_FILE, 'w', encoding='utf-8') as f:
            json.dump(ratings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[错误] 保存星级评分数据失败: {str(e)}")

# 缓存和锁机制
cache = {}
cache_lock = threading.Lock()

# 全局配置和评分数据
config = load_config()
photo_ratings = load_ratings()

def save_ratings_to_file():
    """保存当前的星级评分数据到文件（兼容metadata_routes.py中的调用）"""
    save_ratings(photo_ratings)