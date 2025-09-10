from flask import Blueprint, jsonify, request
import os
import time
from datetime import datetime
import piexif
from data.config_manager import config, photo_ratings, save_ratings_to_file, cache, cache_lock
from utils.file_utils import get_all_images_recursive, is_file_accessible

# 创建蓝图
metadata_bp = Blueprint('metadata', __name__)

@metadata_bp.route('/photo_metadata/<path:file_path>')
def get_photo_metadata(file_path):
    """获取照片元数据"""
    # 先解码URL编码的特殊字符
    import urllib.parse
    file_path = urllib.parse.unquote(file_path)
    
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    
    print(f"[调试] 获取照片元数据请求: {file_path}")
    
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
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in config['supported_formats']:
        error_msg = "文件不存在" if not os.path.isfile(file_path) else f"不支持的文件格式: {os.path.splitext(file_path)[1].lower()}"
        print(f"[错误] 无效的图片文件: {error_msg}")
        return jsonify({"error": f"无效的图片文件: {error_msg}"}), 400
    
    # 构建基础元数据
    file_stats = os.stat(file_path)
    metadata = {
        "basic": {
            "name": os.path.basename(file_path),
            "path": file_path,
            "size": file_stats.st_size,
            "created": datetime.fromtimestamp(file_stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
            "modified": datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
            "accessed": datetime.fromtimestamp(file_stats.st_atime).strftime('%Y-%m-%d %H:%M:%S')
        },
        "exif": {},
        "custom": {
            "star_rating": photo_ratings.get(file_path, 0)
        }
    }
    
    # 尝试获取EXIF数据
    try:
        # 先检查文件是否为JPEG或TIFF格式，只有这些格式支持EXIF
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext in ['.jpg', '.jpeg', '.tiff', '.tif']:
            print(f"[调试] 尝试读取EXIF数据，文件类型: {file_ext}")
            exif_data = piexif.load(file_path)
            
            # 格式化EXIF数据
            formatted_exif = {}
            
            # 处理Image (0th) IFD
            if piexif.ImageIFD in exif_data and exif_data[piexif.ImageIFD]:
                formatted_exif['image'] = {}
                for tag, value in exif_data[piexif.ImageIFD].items():
                    tag_name = piexif.TAGS['Image'][tag]['name'] if tag in piexif.TAGS['Image'] else str(tag)
                    # 转换字节类型的值为字符串
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8', errors='replace')
                        except:
                            value = str(value)
                    formatted_exif['image'][tag_name] = value
            
            # 处理Exif (Exif) IFD
            if piexif.ExifIFD in exif_data and exif_data[piexif.ExifIFD]:
                formatted_exif['exif'] = {}
                for tag, value in exif_data[piexif.ExifIFD].items():
                    tag_name = piexif.TAGS['Exif'][tag]['name'] if tag in piexif.TAGS['Exif'] else str(tag)
                    # 转换字节类型的值为字符串
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8', errors='replace')
                        except:
                            value = str(value)
                    formatted_exif['exif'][tag_name] = value
            
            # 处理GPS (GPS) IFD
            if piexif.GPSIFD in exif_data and exif_data[piexif.GPSIFD]:
                formatted_exif['gps'] = {}
                for tag, value in exif_data[piexif.GPSIFD].items():
                    tag_name = piexif.TAGS['GPS'][tag]['name'] if tag in piexif.TAGS['GPS'] else str(tag)
                    # 转换字节类型的值为字符串
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8', errors='replace')
                        except:
                            value = str(value)
                    formatted_exif['gps'][tag_name] = value
            
            # 添加格式化后的EXIF数据
            metadata['exif'] = formatted_exif
            print(f"[调试] 成功读取EXIF数据")
        else:
            print(f"[调试] 文件类型不支持EXIF数据: {file_ext}")
    except Exception as e:
        print(f"[错误] 读取EXIF数据时出错: {str(e)}")
        metadata['exif_error'] = str(e)
    
    print(f"[调试] 元数据获取完成")
    return jsonify(metadata)

@metadata_bp.route('/search', methods=['GET'])
def search_photos():
    """搜索照片"""
    query = request.args.get('q', '')
    directory = request.args.get('dir', '')
    print(f"[调试] 收到搜索请求: query={query}, directory={directory}")
    
    # 检查查询参数
    if not query:
        print(f"[调试] 查询参数为空")
        return jsonify({"photos": [], "query": query})
    
    # 构建搜索目录
    search_dirs = []
    if directory:
        # 如果提供了特定目录，只搜索该目录
        if os.path.isdir(directory):
            # 验证目录是否在配置中
            is_allowed = False
            for configured_dir in config["photo_directories"]:
                if os.path.normpath(directory).startswith(os.path.normpath(configured_dir)):
                    is_allowed = True
                    break
            if is_allowed:
                search_dirs = [directory]
            else:
                print(f"[错误] 搜索目录访问受限: {directory}")
                return jsonify({"error": "搜索目录访问受限"}), 403
        else:
            print(f"[错误] 搜索目录不存在: {directory}")
            return jsonify({"error": "搜索目录不存在"}), 400
    else:
        # 否则搜索所有配置的目录
        search_dirs = config["photo_directories"]
    
    print(f"[调试] 搜索目录列表: {search_dirs}")
    
    # 检查缓存
    cache_key = f"search:{query}:{directory}"
    current_time = time.time()
    
    with cache_lock:
        if cache_key in cache and current_time - cache[cache_key]['timestamp'] < config['cache_expiry']:
            print(f"[调试] 从缓存获取搜索结果")
            return jsonify(cache[cache_key]['data'])
    
    # 执行搜索
    search_results = []
    query_lower = query.lower()
    
    try:
        print(f"[调试] 开始搜索...")
        for search_dir in search_dirs:
            print(f"[调试] 搜索目录: {search_dir}")
            # 递归获取所有图片文件
            all_images = get_all_images_recursive(search_dir)
            
            # 对每个图片进行搜索匹配
            for file_path in all_images:
                # 文件名匹配（不区分大小写）
                filename = os.path.basename(file_path).lower()
                if query_lower in filename:
                    # 创建照片信息
                    photo_info = {
                        "name": os.path.basename(file_path),
                        "path": file_path,
                        "size": os.path.getsize(file_path),
                        "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S'),
                        "star_rating": photo_ratings.get(file_path, 0)
                    }
                    search_results.append(photo_info)
                    print(f"[调试] 找到匹配项: {file_path}")
        
        # 按修改时间排序（最新的在前）
        search_results.sort(key=lambda x: x['modified'], reverse=True)
        print(f"[调试] 搜索完成，找到 {len(search_results)} 个匹配项")
        
        # 缓存结果
        result = {"photos": search_results, "query": query, "directory": directory}
        with cache_lock:
            cache[cache_key] = {
                'timestamp': current_time,
                'data': result
            }
        
        return jsonify(result)
    except Exception as e:
        print(f"[错误] 搜索过程中出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@metadata_bp.route('/photo_rating', methods=['POST'])
def update_photo_rating():
    """更新照片星级评分"""
    try:
        data = request.json
        file_path = data.get('file_path')
        rating = data.get('rating')
        
        print(f"[调试] 更新照片评分请求: file_path={file_path}, rating={rating}")
        
        # 验证参数
        if not file_path or rating is None:
            print(f"[错误] 缺少必要参数")
            return jsonify({"error": "缺少必要参数"}), 400
        
        # 验证评分范围
        if not isinstance(rating, int) or rating < 0 or rating > 5:
            print(f"[错误] 评分值无效: {rating}")
            return jsonify({"error": "评分值必须是0-5之间的整数"}), 400
        
        # 验证文件路径
        is_allowed = False
        for dir_path in config["photo_directories"]:
            norm_dir = os.path.normpath(dir_path)
            norm_file = os.path.normpath(file_path)
            if norm_file.startswith(norm_dir) and os.path.isfile(file_path):
                is_allowed = True
                break
        
        if not is_allowed:
            print(f"[错误] 文件访问受限或不存在: {file_path}")
            return jsonify({"error": "文件访问受限或不存在"}), 403
        
        # 更新评分
        photo_ratings[file_path] = rating
        print(f"[调试] 更新评分成功: {file_path} -> {rating}")
        
        # 尝试将评分保存到EXIF数据中（如果文件格式支持）
        try:
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.tiff', '.tif']:
                print(f"[调试] 尝试将评分保存到EXIF数据中")
                # 读取当前EXIF数据
                exif_dict = piexif.load(file_path)
                
                # 设置星级评分（使用EXIF中的Rating标签）
                # Rating是0-5的整数值，直接对应我们的评分系统
                exif_dict['Exif'][piexif.ExifIFD.Rating] = rating
                
                # 将更新后的EXIF数据写入文件
                exif_bytes = piexif.dump(exif_dict)
                piexif.insert(exif_bytes, file_path)
                print(f"[调试] EXIF评分更新成功")
            else:
                print(f"[调试] 文件类型不支持EXIF评分更新: {file_ext}")
        except Exception as exif_error:
            print(f"[警告] 更新EXIF评分时出错: {str(exif_error)}")
            # 即使EXIF更新失败，仍然继续更新JSON文件中的评分
        
        # 保存评分到JSON文件
        try:
            save_ratings_to_file()
            print(f"[调试] 评分已保存到JSON文件")
        except Exception as save_error:
            print(f"[错误] 保存评分到JSON文件时出错: {str(save_error)}")
            return jsonify({"error": "评分更新成功，但保存失败"}), 500
        
        # 清除相关缓存，确保下次请求能获取最新数据
        with cache_lock:
            # 查找并清除与该文件相关的缓存
            to_remove = []
            for key in cache:
                # 清除包含该照片的目录缓存
                if key.startswith('photos:') and os.path.dirname(file_path).startswith(key[7:]):
                    to_remove.append(key)
                # 清除搜索缓存
                elif key.startswith('search:'):
                    to_remove.append(key)
            
            for key in to_remove:
                if key in cache:
                    del cache[key]
            
            print(f"[调试] 清除了 {len(to_remove)} 个相关缓存项")
        
        return jsonify({"success": True, "file_path": file_path, "rating": rating})
    except Exception as e:
        print(f"[错误] 更新评分过程中出错: {str(e)}")
        return jsonify({"error": str(e)}), 500