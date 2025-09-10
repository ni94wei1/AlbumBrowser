from flask import Blueprint, jsonify, request, send_file
import os
import time
from datetime import datetime
from data.config_manager import config, cache, cache_lock, photo_ratings
from utils.file_utils import get_all_images_recursive, get_all_subdirectories, is_file_accessible
from utils.image_processor import generate_and_save_thumbnail, generate_and_save_viewer_image, get_thumbnail_path, get_viewer_image_path

# 创建蓝图
photo_bp = Blueprint('photo', __name__)

@photo_bp.route('/photos', methods=['GET'])
def get_photos():
    """获取指定目录下的照片列表，包括所有子目录中的图片"""
    directory = request.args.get('dir', '')
    print(f"[调试] 收到get_photos请求，目录: {directory}")
    print(f"[调试] 请求参数: {request.args}")
    
    # 针对测试目录添加特别的调试信息
    if "测试目录" in directory:
        print(f"[调试] 访问的是测试目录: {directory}")
    
    if not directory or not os.path.isdir(directory):
        print(f"[调试] 目录为空或不存在: {directory}")
        # 放宽限制，如果目录不在配置中但存在，也允许访问
        # 但仍然需要验证该目录是否在某个已配置目录的子目录中
        is_subdirectory = False
        for configured_dir in config["photo_directories"]:
            if os.path.normpath(directory).startswith(os.path.normpath(configured_dir)):
                is_subdirectory = True
                print(f"[调试] 目录验证通过: {directory} 是已配置目录 {configured_dir} 的子目录")
                break
        if not is_subdirectory:
            print(f"[调试] 目录验证失败: {directory}")
            return jsonify({"error": "无效的目录"}), 400
    
    # 检查缓存
    cache_key = f"photos:{directory}"
    current_time = time.time()
    
    with cache_lock:
        if cache_key in cache:
            # 使用自定义缓存过期时间（如果有），否则使用默认值
            expiry_time = cache[cache_key].get('custom_expiry', config['cache_expiry'])
            if current_time - cache[cache_key]['timestamp'] < expiry_time:
                print(f"[调试] 从缓存获取照片列表，目录: {directory}")
                cache_data = cache[cache_key]['data']
                print(f"[调试] 缓存中的照片数量: {len(cache_data.get('photos', []))}, 子目录数量: {len(cache_data.get('subdirectories', []))}")
                print(f"[调试] 缓存过期时间: {expiry_time}秒")
                return jsonify(cache_data)
    
    # 获取照片列表（递归获取所有子目录中的图片）
    photos = []
    try:
        # 递归获取所有图片文件
        print(f"[调试] 开始递归获取目录 {directory} 及其子目录中的图片")
        all_image_files = get_all_images_recursive(directory)
        print(f"[调试] 递归获取完成，共找到 {len(all_image_files)} 张图片")
        
        # 为每个图片文件创建信息
        # 优化：对于大量文件，只获取基本信息，减少日志输出
        for i, file_path in enumerate(all_image_files):
            filename = os.path.basename(file_path)
            # 创建照片基本信息
            photo_info = {
                "name": filename,
                "path": file_path,
                "size": os.path.getsize(file_path),
                "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S'),
                "capture_date": None,  # 初始化拍摄日期为空
                "metadata": {}
            }
            
            # 优化：只获取基础信息，延迟获取EXIF信息（在需要时由前端请求）
            # 仅从photo_ratings中获取星级，避免重复打开图片文件
            star_rating = photo_ratings.get(file_path, 0)
            photo_info["metadata"] = {"星级": star_rating}
            
            photos.append(photo_info)
        
        # 按修改时间排序（最新的在前）
        photos.sort(key=lambda x: x['modified'], reverse=True)
        print(f"[调试] 照片排序完成，共 {len(photos)} 张照片")
        
        # 获取所有子目录列表
        print(f"[调试] 开始获取目录 {directory} 下的所有子目录")
        subdirectories = get_all_subdirectories(directory)
        print(f"[调试] 找到 {len(subdirectories)} 个子目录")
        # 输出找到的子目录详情
        for subdir in subdirectories:
            status = "包含图片" if subdir['has_images'] else "不含图片"
            print(f"[调试] 子目录: {subdir['name']} ({subdir['path']}) - {status}")
        
        # 缓存结果
        result = {"photos": photos, "directory": directory, "subdirectories": subdirectories}
        print(f"[调试] 准备返回结果 - 照片数: {len(photos)}, 子目录数: {len(subdirectories)}")
        
        # 增强缓存：对于大目录，增加缓存过期时间
        cache_expiry = config['cache_expiry']
        if len(photos) > 500:  # 对于超过500张图片的大目录，延长缓存时间
            cache_expiry = cache_expiry * 2  # 缓存时间翻倍
            print(f"[调试] 检测到大目录，延长缓存时间至 {cache_expiry} 秒")
        
        with cache_lock:
            cache[cache_key] = {
                'timestamp': current_time,
                'data': result,
                'custom_expiry': cache_expiry  # 存储自定义缓存过期时间
            }
        
        # 记录请求完成日志
        print(f"[调试] get_photos请求完成，耗时: {time.time() - current_time:.2f}秒")
        return jsonify(result)
    except Exception as e:
        print(f"[错误] 获取照片列表时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@photo_bp.route('/thumbnail/<path:file_path>')
def get_thumbnail(file_path):
    """获取缩略图"""
    print(f"[调试] 接收到的原始file_path: {file_path}")
    
    # 先解码URL编码的特殊字符
    import urllib.parse
    file_path = urllib.parse.unquote(file_path)
    print(f"[调试] URL解码后的file_path: {file_path}")
    
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    print(f"[调试] 替换分隔符后的file_path: {file_path}")
    
    # 检查文件是否在配置的目录中（容错处理）
    is_allowed = False
    for dir_path in config["photo_directories"]:
        # 规范化目录路径，确保正确处理编码
        norm_dir = os.path.normpath(dir_path)
        norm_file = os.path.normpath(file_path)
        print(f"[调试] 比较目录 {norm_dir} 和文件路径 {norm_file}")
        if norm_file.startswith(norm_dir):
            is_allowed = True
            print(f"[调试] 文件路径在允许的目录中")
            break
    
    if not is_allowed:
        print(f"[错误] 访问受限: {file_path}")
        return jsonify({"error": "访问受限"}), 403
    
    # 检查文件是否存在
    file_exists = os.path.isfile(file_path)
    file_ext = os.path.splitext(file_path)[1].lower()
    is_supported_format = file_ext in config['supported_formats']
    
    print(f"[调试] 文件是否存在: {file_exists}")
    print(f"[调试] 文件扩展名: {file_ext}")
    print(f"[调试] 是否支持的格式: {is_supported_format}")
    
    if not file_exists or not is_supported_format:
        error_msg = "文件不存在" if not file_exists else f"不支持的文件格式: {file_ext}"
        print(f"[错误] 无效的图片文件: {error_msg}")
        return jsonify({"error": f"无效的图片文件: {error_msg}"}), 400
    
    # 获取缩略图存储路径
    thumbnail_path = get_thumbnail_path(file_path)
    
    # 检查本地是否存在缩略图
    if not os.path.exists(thumbnail_path) or os.path.getmtime(thumbnail_path) < os.path.getmtime(file_path):
        # 缩略图不存在或已过期，生成新的
        generate_and_save_thumbnail(file_path)
    
    # 直接发送本地缩略图文件
    try:
        return send_file(thumbnail_path, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@photo_bp.route('/viewer_image/<path:file_path>')
def get_viewer_image(file_path):
    """获取浏览用大图"""
    # 先解码URL编码的特殊字符
    import urllib.parse
    file_path = urllib.parse.unquote(file_path)
    
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    
    # 检查文件是否在配置的目录中（容错处理）
    is_allowed = False
    for dir_path in config["photo_directories"]:
        # 规范化目录路径，确保正确处理编码
        norm_dir = os.path.normpath(dir_path)
        norm_file = os.path.normpath(file_path)
        if norm_file.startswith(norm_dir):
            is_allowed = True
            break
    
    if not is_allowed:
        return jsonify({"error": "访问受限"}), 403
    
    # 检查文件是否存在
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in config['supported_formats']:
        return jsonify({"error": "无效的图片文件"}), 400
    
    # 获取浏览用大图存储路径
    viewer_image_path = get_viewer_image_path(file_path)
    
    # 检查本地是否存在浏览用大图
    if not os.path.exists(viewer_image_path) or os.path.getmtime(viewer_image_path) < os.path.getmtime(file_path):
        # 浏览用大图不存在或已过期，生成新的
        generate_and_save_viewer_image(file_path)
    
    # 直接发送本地浏览用大图文件
    try:
        return send_file(viewer_image_path, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@photo_bp.route('/photo/<path:file_path>')
def get_photo(file_path):
    """获取原始照片"""
    # 先解码URL编码的特殊字符
    import urllib.parse
    file_path = urllib.parse.unquote(file_path)
    
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    
    # 检查文件是否在配置的目录中（容错处理）
    is_allowed = False
    for dir_path in config["photo_directories"]:
        # 规范化目录路径，确保正确处理编码
        norm_dir = os.path.normpath(dir_path)
        norm_file = os.path.normpath(file_path)
        if norm_file.startswith(norm_dir):
            is_allowed = True
            break
    
    if not is_allowed:
        return jsonify({"error": "访问受限"}), 403
    
    # 检查文件是否存在
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in config['supported_formats']:
        return jsonify({"error": "无效的图片文件"}), 400
    
    try:
        return send_file(file_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@photo_bp.route('/test_photos', methods=['GET'])
def test_photos():
    """测试路由，用于调试get_photos函数的执行情况"""
    test_dir = request.args.get('dir', '')
    if not test_dir:
        # 如果没有提供目录参数，尝试使用配置的第一个目录
        if config["photo_directories"]:
            test_dir = config["photo_directories"][0]
        else:
            return jsonify({"error": "没有可用的测试目录"}), 400
    
    print(f"[测试] 测试路由被调用，目录: {test_dir}")
    
    # 检查目录是否存在
    if not os.path.isdir(test_dir):
        return jsonify({"error": f"测试目录不存在: {test_dir}"}), 400
    
    # 尝试获取该目录下的照片
    try:
        # 直接调用get_all_images_recursive函数
        print(f"[测试] 调用get_all_images_recursive函数")
        all_images = get_all_images_recursive(test_dir)
        print(f"[测试] get_all_images_recursive返回 {len(all_images)} 张图片")
        
        # 尝试获取子目录
        print(f"[测试] 调用get_all_subdirectories函数")
        subdirs = get_all_subdirectories(test_dir)
        print(f"[测试] get_all_subdirectories返回 {len(subdirs)} 个子目录")
        
        # 构建测试结果
        result = {
            "success": True,
            "test_directory": test_dir,
            "image_count": len(all_images),
            "subdirectory_count": len(subdirs)
        }
        
        if all_images:
            result["sample_images"] = all_images[:3]  # 返回前3张图片作为示例
        
        return jsonify(result)
    except Exception as e:
        print(f"[测试错误] 测试过程中出错: {str(e)}")
        return jsonify({"error": str(e)}), 500