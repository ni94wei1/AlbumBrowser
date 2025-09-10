from flask import Blueprint, jsonify, request
import os
import threading
from data.config_manager import config, save_config, cache, cache_lock
from utils.file_utils import get_subdirectories_without_images
from utils.test_utils import pregenerate_images_for_directory

# 创建蓝图
directory_bp = Blueprint('directory', __name__)

@directory_bp.route('/directories', methods=['GET'])
def get_directories():
    """获取配置的照片目录列表及其不含图片的子目录"""
    directories = []
    
    # 首先添加配置的顶层目录
    for dir_path in config["photo_directories"]:
        directories.append({'path': dir_path})
    
    # 递归获取所有不含图片的子目录（对于每个顶层目录）
    all_subdirs_without_images = []
    for dir_path in config["photo_directories"]:
        subdirs = get_subdirectories_without_images(dir_path)
        all_subdirs_without_images.extend(subdirs)
    
    # 去重，确保每个不含图片的目录只出现一次
    seen_paths = set()
    unique_subdirs = []
    for subdir in all_subdirs_without_images:
        if subdir['path'] not in seen_paths:
            seen_paths.add(subdir['path'])
            unique_subdirs.append(subdir)
    
    # 添加不含图片的子目录
    directories.extend(unique_subdirs)
    
    return jsonify({
        "success": True,
        "directories": directories
    })

@directory_bp.route('/directories', methods=['POST'])
def add_directory():
    """添加新的照片目录"""
    data = request.json
    directory = data.get('directory', '')
    
    if not directory or not os.path.isdir(directory):
        return jsonify({"error": "无效的目录路径"}), 400
    
    if directory not in config["photo_directories"]:
        config["photo_directories"].append(directory)
        # 保存配置
        save_config(config)
        # 清空缓存
        with cache_lock:
            cache.clear()
            
        # 在独立线程中预生成该目录的图片，避免阻塞API响应
        pregen_thread = threading.Thread(target=pregenerate_images_for_directory, args=(directory,))
        pregen_thread.daemon = True  # 设为守护线程，主程序结束时自动终止
        pregen_thread.start()
    
    return jsonify({"success": True, "directories": config["photo_directories"]})

@directory_bp.route('/directories/<int:index>', methods=['DELETE'])
def remove_directory(index):
    """删除照片目录"""
    if 0 <= index < len(config["photo_directories"]):
        config["photo_directories"].pop(index)
        # 保存配置
        save_config(config)
        # 清空缓存
        with cache_lock:
            cache.clear()
        return jsonify({"success": True, "directories": config["photo_directories"]})
    
    return jsonify({"error": "目录索引无效"}), 400