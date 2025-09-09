from flask import Flask, jsonify, send_file, request, render_template
import os
import hashlib
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
import time
import json
import threading
from datetime import datetime
from flask import Flask, render_template, jsonify, request, send_file
from PIL.ExifTags import TAGS, GPSTAGS
import piexif

# 星级评分数据文件
RATING_FILE = 'photo_ratings.json'

app = Flask(__name__)

# 配置文件路径
CONFIG_FILE = 'config.json'

# 缩略图存储目录
THUMBNAIL_DIR = 'thumbnails'
# 浏览用大图存储目录
VIEWER_IMAGE_DIR = 'viewer_images'

# 检查并创建缩略图和浏览图目录
for dir_path in [THUMBNAIL_DIR, VIEWER_IMAGE_DIR]:
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

# 根据文件路径生成缩略图目录结构
def get_thumbnail_path(file_path):
    """根据原照片路径生成对应的缩略图存储路径"""
    # 查找文件所属的最具体（最长）的目录路径
    matching_directories = []
    for directory in config["photo_directories"]:
        if file_path.startswith(directory):
            matching_directories.append(directory)
    
    # 如果有匹配的目录，选择最长的那个（最具体的路径）
    if matching_directories:
        # 按目录长度排序，最长的排在前面
        matching_directories.sort(key=len, reverse=True)
        directory = matching_directories[0]
        
        # 使用稳定的MD5哈希算法生成目录标识，确保在不同进程中结果一致
        dir_hash = hashlib.md5(directory.encode('utf-8')).hexdigest()
        # 获取文件在目录中的相对路径
        rel_path = os.path.relpath(file_path, directory)
        # 创建对应的缩略图目录结构
        thumbnail_dir = os.path.join(THUMBNAIL_DIR, dir_hash, os.path.dirname(rel_path))
        # 确保目录存在
        if not os.path.exists(thumbnail_dir):
            os.makedirs(thumbnail_dir, exist_ok=True)
        # 生成缩略图文件名（保留原文件名）
        thumbnail_filename = f"thumbnail_{os.path.basename(file_path)}"
        # 确保扩展名是jpg
        base_name, _ = os.path.splitext(thumbnail_filename)
        thumbnail_filename = f"{base_name}.jpg"
        return os.path.join(thumbnail_dir, thumbnail_filename)
    
    # 如果文件不在任何配置的目录中，使用默认的哈希方式
    safe_filename = f"{hash(file_path)}_{os.path.basename(file_path).replace(os.path.sep, '_')}"
    return os.path.join(THUMBNAIL_DIR, safe_filename)

# 根据文件路径生成浏览用大图目录结构
def get_viewer_image_path(file_path):
    """根据原照片路径生成对应的浏览用大图存储路径"""
    # 查找文件所属的最具体（最长）的目录路径
    matching_directories = []
    for directory in config["photo_directories"]:
        if file_path.startswith(directory):
            matching_directories.append(directory)
    
    # 如果有匹配的目录，选择最长的那个（最具体的路径）
    if matching_directories:
        # 按目录长度排序，最长的排在前面
        matching_directories.sort(key=len, reverse=True)
        directory = matching_directories[0]
        
        # 使用稳定的MD5哈希算法生成目录标识，确保在不同进程中结果一致
        dir_hash = hashlib.md5(directory.encode('utf-8')).hexdigest()
        # 获取文件在目录中的相对路径
        rel_path = os.path.relpath(file_path, directory)
        # 创建对应的浏览用大图目录结构
        viewer_image_dir = os.path.join(VIEWER_IMAGE_DIR, dir_hash, os.path.dirname(rel_path))
        # 确保目录存在
        if not os.path.exists(viewer_image_dir):
            os.makedirs(viewer_image_dir, exist_ok=True)
        # 生成浏览用大图文件名（保留原文件名）
        viewer_image_filename = f"viewer_{os.path.basename(file_path)}"
        # 确保扩展名是jpg
        base_name, _ = os.path.splitext(viewer_image_filename)
        viewer_image_filename = f"{base_name}.jpg"
        return os.path.join(viewer_image_dir, viewer_image_filename)
    
    # 如果文件不在任何配置的目录中，使用默认的哈希方式
    safe_filename = f"{hash(file_path)}_{os.path.basename(file_path).replace(os.path.sep, '_')}"
    return os.path.join(VIEWER_IMAGE_DIR, safe_filename)

# 检查并创建配置文件
if not os.path.exists(CONFIG_FILE):
    default_config = {
        "photo_directories": [],
        "thumbnail_size": [300, 300],  # 正方形缩略图，尺寸增大到300x300
        "viewer_image_max_size": 2048,  # 浏览用大图的最大尺寸（像素），从1024增加到2048
        "viewer_image_max_file_size": 10 * 1024 * 1024,  # 浏览用大图的最大文件大小（10MB），从1MB增加到10MB
        "cache_expiry": 3600  # 缓存过期时间（秒）
    }
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(default_config, f, ensure_ascii=False, indent=2)

# 读取配置
with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
    config = json.load(f)

# 读取或初始化星级评分数据
if os.path.exists(RATING_FILE):
    with open(RATING_FILE, 'r', encoding='utf-8') as f:
        photo_ratings = json.load(f)
else:
    photo_ratings = {}

# 缓存管理
cache = {}
cache_lock = threading.Lock()

# 支持的图片格式
SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

# 预生成缩略图和浏览用大图函数
def pregenerate_images():
    """服务端启动时预生成所有照片的缩略图和浏览用大图并保存到本地"""
    print(f"[服务启动] 开始预生成图片...")
    
    # 使用集合来跟踪已经处理过的文件路径，避免重复处理
    processed_files = set()
    
    # 遍历所有配置的目录
    for directory in config["photo_directories"]:
        if not os.path.isdir(directory):
            continue
            
        try:
            # 获取目录中的所有图片文件
            for filename in os.listdir(directory):
                file_path = os.path.join(directory, filename)
                if os.path.isfile(file_path) and os.path.splitext(filename)[1].lower() in SUPPORTED_FORMATS:
                    # 检查文件是否已经处理过
                    if file_path not in processed_files:
                        # 添加到已处理集合
                        processed_files.add(file_path)
                        # 生成并保存缩略图
                        generate_and_save_thumbnail(file_path)
                        # 生成并保存浏览用大图
                        generate_and_save_viewer_image(file_path)
        except Exception as e:
            print(f"[错误] 处理目录 {directory} 时出错: {str(e)}")
    
    print(f"[服务启动] 图片预生成完成，共处理 {len(processed_files)} 个文件")
    

def generate_and_save_thumbnail(file_path):
    """生成并保存指定图片的缩略图到本地（正方形裁剪）"""
    try:
        # 获取缩略图存储路径（按照原目录结构组织）
        thumbnail_path = get_thumbnail_path(file_path)
        
        # 检查缩略图是否已存在
        if os.path.exists(thumbnail_path):
            # 检查缩略图是否比原图旧
            thumbnail_mtime = os.path.getmtime(thumbnail_path)
            file_mtime = os.path.getmtime(file_path)
            
            if thumbnail_mtime >= file_mtime:
                # 缩略图是最新的，不需要重新生成
                print(f"[缩略图] 跳过: {file_path} (缩略图已是最新)")
                return
            else:
                print(f"[缩略图] 更新: {file_path} -> {thumbnail_path} (缩略图过期)")
        else:
            print(f"[缩略图] 新建: {file_path} -> {thumbnail_path} (缩略图不存在)")
        
        # 生成缩略图
        with Image.open(file_path) as img:
            # 转换为RGB模式（处理透明度）
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 获取原图尺寸
            width, height = img.size
            
            # 计算正方形裁剪区域（居中裁剪）
            min_dim = min(width, height)
            left = (width - min_dim) // 2
            top = (height - min_dim) // 2
            right = left + min_dim
            bottom = top + min_dim
            
            # 裁剪成正方形
            img = img.crop((left, top, right, bottom))
            
            # 调整到目标尺寸
            img.thumbnail(config["thumbnail_size"])
            
            # 保存到本地文件，提高质量解决模糊问题
            img.save(thumbnail_path, 'JPEG', quality=90)
            
        print(f"[缩略图] 已生成: {file_path} -> {thumbnail_path}")
    except Exception as e:
        print(f"[错误] 生成缩略图 {file_path} 时出错: {str(e)}")


def generate_and_save_viewer_image(file_path):
    """生成并保存指定图片的浏览用大图到本地（控制在1MB以内）"""
    try:
        # 获取浏览用大图存储路径（按照原目录结构组织）
        viewer_image_path = get_viewer_image_path(file_path)
        
        # 检查浏览用大图是否已存在
        if os.path.exists(viewer_image_path):
            # 检查浏览用大图是否比原图旧
            viewer_image_mtime = os.path.getmtime(viewer_image_path)
            file_mtime = os.path.getmtime(file_path)
            
            if viewer_image_mtime >= file_mtime:
                # 浏览用大图是最新的，不需要重新生成
                print(f"[浏览图] 跳过: {file_path} (浏览用大图已是最新)")
                return
            else:
                print(f"[浏览图] 更新: {file_path} -> {viewer_image_path} (浏览用大图过期)")
        else:
            print(f"[浏览图] 新建: {file_path} -> {viewer_image_path} (浏览用大图不存在)")
        
        # 生成浏览用大图
        with Image.open(file_path) as img:
            # 转换为RGB模式（处理透明度）
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 获取原图尺寸
            width, height = img.size
            
            # 调整图片尺寸，使其不超过最大尺寸
            max_size = config.get("viewer_image_max_size", 1024)
            if width > max_size or height > max_size:
                # 计算缩放比例
                ratio = min(max_size / width, max_size / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                # 调整尺寸
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # 保存到本地文件，控制文件大小在1MB以内
            max_file_size = config.get("viewer_image_max_file_size", 1 * 1024 * 1024)
            
            # 尝试不同的质量值，直到文件大小符合要求
            quality = 90
            while quality > 50:
                # 先保存到内存中，检查大小
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, 'JPEG', quality=quality)
                img_byte_arr.seek(0)
                
                # 检查文件大小
                if len(img_byte_arr.getvalue()) <= max_file_size:
                    # 文件大小符合要求，保存到磁盘
                    with open(viewer_image_path, 'wb') as f:
                        f.write(img_byte_arr.getvalue())
                    break
                
                # 文件大小超过限制，降低质量
                quality -= 5
            else:
                # 如果质量降到50以下还是超过大小限制，就直接保存当前质量
                img.save(viewer_image_path, 'JPEG', quality=50)
            
        print(f"[浏览图] 已生成: {file_path} -> {viewer_image_path}")
    except Exception as e:
        print(f"[错误] 生成浏览用大图 {file_path} 时出错: {str(e)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/directories', methods=['GET'])
def get_directories():
    """获取配置的照片目录列表"""
    # 将字符串路径转换为对象数组，每个对象包含path属性
    directories = [{'path': dir_path} for dir_path in config["photo_directories"]]
    return jsonify({
        "success": True,
        "directories": directories
    })

@app.route('/api/directories', methods=['POST'])
def add_directory():
    """添加新的照片目录"""
    data = request.json
    directory = data.get('directory', '')
    
    if not directory or not os.path.isdir(directory):
        return jsonify({"error": "无效的目录路径"}), 400
    
    if directory not in config["photo_directories"]:
        config["photo_directories"].append(directory)
        # 保存配置
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        # 清空缓存
        with cache_lock:
            cache.clear()
    
    return jsonify({"success": True, "directories": config["photo_directories"]})

@app.route('/api/directories/<int:index>', methods=['DELETE'])
def remove_directory(index):
    """删除照片目录"""
    if 0 <= index < len(config["photo_directories"]):
        config["photo_directories"].pop(index)
        # 保存配置
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        # 清空缓存
        with cache_lock:
            cache.clear()
        return jsonify({"success": True, "directories": config["photo_directories"]})
    
    return jsonify({"error": "目录索引无效"}), 400

@app.route('/api/photos', methods=['GET'])
def get_photos():
    """获取指定目录下的照片列表"""
    directory = request.args.get('dir', '')
    if not directory or directory not in config["photo_directories"] or not os.path.isdir(directory):
        return jsonify({"error": "无效的目录"}), 400
    
    # 检查缓存
    cache_key = f"photos:{directory}"
    current_time = time.time()
    
    with cache_lock:
        if cache_key in cache and current_time - cache[cache_key]['timestamp'] < config['cache_expiry']:
            return jsonify(cache[cache_key]['data'])
    
    # 获取照片列表
    photos = []
    try:
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path) and os.path.splitext(filename)[1].lower() in SUPPORTED_FORMATS:
                # 创建照片基本信息
                photo_info = {
                    "name": filename,
                    "path": file_path,
                    "size": os.path.getsize(file_path),
                    "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S'),
                    "capture_date": None  # 初始化拍摄日期为空
                }
                
                # 尝试从EXIF获取拍摄日期
                try:
                    with Image.open(file_path) as img:
                        exif_data = img._getexif()
                        if exif_data:
                            # 检查拍摄日期标签 (DateTimeOriginal - 标签ID 36867)
                            if 36867 in exif_data:
                                capture_date_str = exif_data[36867]
                                try:
                                    # 将EXIF日期格式 (YYYY:MM:DD HH:MM:SS) 转换为标准格式
                                    photo_info["capture_date"] = datetime.strptime(capture_date_str, '%Y:%m:%d %H:%M:%S').strftime('%Y-%m-%d %H:%M:%S')
                                except ValueError:
                                    # 如果日期格式解析失败，保持为原始字符串
                                    photo_info["capture_date"] = capture_date_str
                except Exception as exif_error:
                    print(f"[警告] 获取照片EXIF日期时出错: {str(exif_error)}")
                
                # 尝试获取照片星级信息
                try:
                    # 优先从photo_ratings中获取星级
                    star_rating = photo_ratings.get(file_path, 0)
                    
                    # 尝试从EXIF中获取星级，以确保最新的评级信息
                    try:
                        with Image.open(file_path) as img:
                            exif_data = img._getexif()
                            if exif_data:
                                # 检查主要评级标签
                                if 18246 in exif_data:  # 18246是Rating的标签ID
                                    main_rating = exif_data[18246]
                                    if isinstance(main_rating, int) and 0 <= main_rating <= 5:
                                        star_rating = main_rating
                                # 检查Windows评级标签
                                elif 40961 in exif_data:  # Windows照片评级标签
                                    windows_rating_value = exif_data[40961]
                                    if isinstance(windows_rating_value, int):
                                        # Windows评级映射: 0-5星对应0,25,50,75,100,125
                                        if windows_rating_value == 0:
                                            star_rating = 0
                                        elif windows_rating_value == 25:
                                            star_rating = 1
                                        elif windows_rating_value == 50:
                                            star_rating = 2
                                        elif windows_rating_value == 75:
                                            star_rating = 3
                                        elif windows_rating_value == 100:
                                            star_rating = 4
                                        elif windows_rating_value == 125:
                                            star_rating = 5
                    except Exception as exif_error:
                        print(f"[警告] 获取照片EXIF数据时出错: {str(exif_error)}")
                        # 即使EXIF读取失败，也继续使用photo_ratings中的值
                    
                    # 添加星级信息到metadata字段
                    photo_info["metadata"] = {
                        "星级": star_rating
                    }
                except Exception as metadata_error:
                    print(f"[警告] 获取照片元数据时出错: {str(metadata_error)}")
                    # 如果获取元数据失败，仍然添加空的metadata字段，确保前端代码正常运行
                    photo_info["metadata"] = {}
                
                photos.append(photo_info)
        
        # 按修改时间排序（最新的在前）
        photos.sort(key=lambda x: x['modified'], reverse=True)
        
        # 缓存结果
        result = {"photos": photos, "directory": directory}
        with cache_lock:
            cache[cache_key] = {
                'timestamp': current_time,
                'data': result
            }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/thumbnail/<path:file_path>')
def get_thumbnail(file_path):
    """获取照片缩略图"""
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
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in SUPPORTED_FORMATS:
        return jsonify({"error": "无效的图片文件"}), 400
    
    # 获取缩略图存储路径（按照原目录结构组织）
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

@app.route('/api/viewer_image/<path:file_path>')
def get_viewer_image(file_path):
    """获取浏览用大图"""
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
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in SUPPORTED_FORMATS:
        return jsonify({"error": "无效的图片文件"}), 400
    
    # 获取浏览用大图存储路径（按照原目录结构组织）
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

@app.route('/api/photo/<path:file_path>')
def get_photo(file_path):
    """获取原始照片"""
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
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in SUPPORTED_FORMATS:
        return jsonify({"error": "无效的图片文件"}), 400
    
    try:
        return send_file(file_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/photo_metadata/<path:file_path>')
def get_photo_metadata(file_path):
    """获取照片的元数据"""
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
    if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in SUPPORTED_FORMATS:
        return jsonify({"error": "无效的图片文件"}), 400
    
    try:
        # 基本文件信息
        metadata = {
            "name": os.path.basename(file_path),
            "path": file_path,
            "size": os.path.getsize(file_path),
            "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # 尝试读取EXIF数据
        try:
            with Image.open(file_path) as img:
                exif_data = img._getexif()
                if exif_data:
                    exif = {}
                    # 存储从EXIF读取的评级
                    exif_rating = None
                    
                    for tag, value in exif_data.items():
                        tag_name = TAGS.get(tag, tag)
                        # 处理常见的EXIF字段
                        if tag_name == 'DateTimeOriginal':
                            exif['拍摄日期'] = value
                        elif tag_name == 'Make':
                            exif['相机厂商'] = value
                        elif tag_name == 'Model':
                            exif['相机型号'] = value
                        elif tag_name == 'FNumber':
                            exif['光圈'] = f"f/{value}"
                        elif tag_name == 'ExposureTime':
                            exif['曝光时间'] = f"{value}s"
                        elif tag_name == 'ISOSpeedRatings':
                            exif['ISO'] = value
                        elif tag_name == 'FocalLength':
                            exif['焦距'] = f"{value}mm"
                        elif tag_name == 'GPSInfo':
                            # GPS信息可以根据需要进一步解析
                            exif['GPS信息'] = '已记录'
                        # 检查是否有其他评级相关标签（优先处理，因为在某些情况下更准确）
                        elif tag_name == 'Rating':  # 某些相机可能使用不同的评级标签
                            try:
                                print(f"[调试] 文件名: {os.path.basename(file_path)}")  # 添加文件名调试
                                print(f"[调试] 检测到主要评级标签('Rating'): {value} (类型: {type(value)})")
                                if isinstance(value, int) and 0 <= value <= 5:
                                    main_rating = value  # 存储主要评级值
                                    print(f"[调试] 保存主要评级值: {value}星")
                                    exif['主要评级'] = value
                            except Exception as e:
                                print(f"[警告] 处理主要评级标签时出错: {str(e)}")
                                pass
                        # 检查是否有Windows评级标签
                        elif tag == 40961:  # Windows照片评级标签
                            try:
                                # Windows的评级值处理
                                print(f"[调试] 检测到Windows评级原始值: {value} (类型: {type(value)})")
                                windows_rating = 0
                                if isinstance(value, int):
                                    if 0 <= value <= 5:
                                        windows_rating = value  # 直接使用1-5星的数值
                                        print(f"[调试] 应用1-5星系统: {value} → {windows_rating}星")
                                    elif value == 0:
                                        windows_rating = 0
                                        print(f"[调试] 应用百分比系统: {value} → {windows_rating}星")
                                    elif value == 25:
                                        windows_rating = 1
                                        print(f"[调试] 应用百分比系统: {value} → {windows_rating}星") 
                                    elif value == 50:
                                        windows_rating = 2
                                        print(f"[调试] 应用百分比系统: {value} → {windows_rating}星")
                                    elif value == 75:
                                        windows_rating = 3
                                        print(f"[调试] 应用百分比系统: {value} → {windows_rating}星")
                                    elif value == 100:
                                        windows_rating = 4
                                        print(f"[调试] 应用百分比系统: {value} → {windows_rating}星")  # 100代表4星
                                    else:
                                        windows_rating = 0
                                        print(f"[调试] 未知评级值: {value} → 设为0星")
                                    exif['Windows评级'] = value
                                else:
                                    print(f"[警告] Windows评级值不是整数: {value} (类型: {type(value)})")
                                
                                # 决定使用哪个评级值 - 优先使用主要评级，如果没有则使用Windows评级
                                if 'main_rating' in locals() and main_rating > 0:
                                    exif_rating = main_rating
                                    print(f"[调试] 优先使用主要评级: {main_rating}星")
                                else:
                                    exif_rating = windows_rating
                                    print(f"[调试] 使用Windows评级: {windows_rating}星")
                                print(f"[调试] 最终映射星级: {exif_rating}星")
                            except Exception as e:
                                print(f"[警告] 处理Windows评级时出错: {str(e)}")
                                pass
                    
                    metadata['exif'] = exif
        except Exception as exif_error:
            print(f"[警告] 读取EXIF数据失败: {str(exif_error)}")
            metadata['exif'] = {}
        
        # 星级信息 - 优先使用EXIF中的评级，否则从评分数据文件中读取
        if exif_rating is not None:
            metadata['星级'] = exif_rating
        else:
            metadata['星级'] = photo_ratings.get(file_path, 0)  # 默认星级为0
        
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_photos():
    """搜索照片"""
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify({"photos": []})
    
    results = []
    try:
        for directory in config["photo_directories"]:
            for root, _, files in os.walk(directory):
                for filename in files:
                    if os.path.splitext(filename)[1].lower() in SUPPORTED_FORMATS and query in filename.lower():
                        file_path = os.path.join(root, filename)
                        results.append({
                            "name": filename,
                            "path": file_path,
                            "directory": directory,
                            "size": os.path.getsize(file_path),
                            "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
                        })
        
        # 按修改时间排序
        results.sort(key=lambda x: x['modified'], reverse=True)
        
        return jsonify({"photos": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/photo_rating', methods=['POST'])
def update_photo_rating():
    """更新照片的星级评分"""
    try:
        data = request.json
        file_path = data.get('file_path', '')
        rating = data.get('rating', 0)
        
        # 验证输入
        if not file_path or not isinstance(rating, int) or rating < 0 or rating > 5:
            return jsonify({"success": False, "error": "无效的文件路径或星级评分"}), 400
        
        # 确保文件路径使用正确的分隔符
        file_path = file_path.replace('/', os.path.sep)
        
        # 检查文件是否在配置的目录中（安全检查）
        is_allowed = False
        for dir_path in config["photo_directories"]:
            norm_dir = os.path.normpath(dir_path)
            norm_file = os.path.normpath(file_path)
            if norm_file.startswith(norm_dir):
                is_allowed = True
                break
        
        if not is_allowed:
            return jsonify({"success": False, "error": "访问受限"}), 403
        
        # 检查文件是否存在
        if not os.path.isfile(file_path) or os.path.splitext(file_path)[1].lower() not in SUPPORTED_FORMATS:
            return jsonify({"success": False, "error": "无效的图片文件"}), 400
        
        # 更新星级评分到JSON文件
        photo_ratings[file_path] = rating
        
        # 保存星级评分数据到文件
        with open(RATING_FILE, 'w', encoding='utf-8') as f:
            json.dump(photo_ratings, f, ensure_ascii=False, indent=2)
        
        # 尝试修改原图的EXIF评级数据
        try:
            # 只处理JPG和TIFF格式的图片，因为不是所有格式都支持EXIF
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.tiff', '.tif']:
                with Image.open(file_path) as img:
                    # 获取当前EXIF数据
                    exif_dict = {}
                    if img.info.get('exif'):
                        try:
                            exif_dict = piexif.load(img.info['exif'])
                        except:
                            # 如果EXIF数据损坏或格式错误，创建新的EXIF字典
                            exif_dict = {'0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
                    else:
                        exif_dict = {'0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
                    
                    # 更新主要评级标签 ('Rating')
                    # 在EXIF标准中，'Rating'通常存储在0th IFD
                    exif_dict['0th'][piexif.ImageIFD.Rating] = rating
                    
                    try:
                        # 更新Windows照片评级标签 (40961)
                        # Windows评级映射: 0-5星对应0,25,50,75,100,125
                        windows_rating_value = rating * 25  # 0星=0, 1星=25, 2星=50, 3星=75, 4星=100, 5星=125
                        
                        # 确保值的类型正确
                        if not isinstance(windows_rating_value, int):
                            windows_rating_value = int(windows_rating_value)
                        
                        # 将Windows评级标签添加到0th IFD
                        exif_dict['0th'][40961] = windows_rating_value
                        print(f"[调试] 已添加Windows评级标签 40961: {windows_rating_value}")
                    except Exception as win_error:
                        print(f"[警告] 添加Windows评级标签失败: {str(win_error)}")
                        # 即使Windows标签添加失败，也继续尝试保存其他标签
                    
                    # 生成新的EXIF数据
                    try:
                        exif_bytes = piexif.dump(exif_dict)
                        print(f"[调试] EXIF数据生成成功，大小: {len(exif_bytes)} bytes")
                    except Exception as dump_error:
                        print(f"[错误] 生成EXIF数据失败: {str(dump_error)}")
                        # 尝试修复特定问题：如果是40961标签导致的问题，尝试移除它
                        if str(dump_error) == "40961":
                            print("[调试] 检测到40961标签问题，尝试移除该标签后重新生成EXIF数据")
                            if 40961 in exif_dict['0th']:
                                del exif_dict['0th'][40961]
                                try:
                                    exif_bytes = piexif.dump(exif_dict)
                                    print(f"[调试] 移除40961标签后，EXIF数据生成成功，大小: {len(exif_bytes)} bytes")
                                except Exception as second_dump_error:
                                    print(f"[错误] 移除40961标签后，EXIF数据生成仍失败: {str(second_dump_error)}")
                                    # 如果仍然失败，保留原始EXIF数据但添加评级信息
                                    if img.info.get('exif'):
                                        print("[调试] 使用原始EXIF数据，仅添加主要评级标签")
                                        # 创建一个仅包含评级信息的简单EXIF数据
                                        rating_only_exif = {'0th': {piexif.ImageIFD.Rating: rating}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
                                        exif_bytes = piexif.dump(rating_only_exif)
                                    else:
                                        print("[调试] 无原始EXIF数据，使用仅含评级的最小化EXIF数据")
                                        rating_only_exif = {'0th': {piexif.ImageIFD.Rating: rating}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
                                        exif_bytes = piexif.dump(rating_only_exif)
                        else:
                            # 对于其他错误，尽量保留原始EXIF数据
                            if img.info.get('exif'):
                                print("[调试] 使用原始EXIF数据，不进行修改")
                                exif_bytes = img.info['exif']
                            else:
                                print("[调试] 无原始EXIF数据，使用仅含评级的最小化EXIF数据")
                                rating_only_exif = {'0th': {piexif.ImageIFD.Rating: rating}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': None}
                                exif_bytes = piexif.dump(rating_only_exif)
                    
                    # 保存修改后的图片，保留原图格式
                    try:
                        # 尝试使用原始图像的格式参数
                        img_format = img.format
                        if img_format:
                            img.save(file_path, format=img_format, quality=95, exif=exif_bytes)
                        else:
                            img.save(file_path, quality=95, exif=exif_bytes)
                        print(f"[成功] 已更新原图EXIF评级: {file_path} → {rating}星")
                    except Exception as save_error:
                        print(f"[警告] 保存图片时出错: {str(save_error)}")
                        # 如果保存失败，尝试不修改EXIF数据直接保存
                        try:
                            if img.info.get('exif'):
                                img.save(file_path, quality=95, exif=img.info['exif'])
                            else:
                                img.save(file_path, quality=95)
                            print("[成功] 已保存图片但未修改EXIF数据")
                        except Exception as final_save_error:
                            print(f"[错误] 保存图片失败: {str(final_save_error)}")
            else:
                print(f"[提示] 跳过EXIF更新，文件格式不支持: {file_path}")
        except Exception as exif_error:
            print(f"[警告] 更新EXIF数据失败: {str(exif_error)}")
            # 即使EXIF更新失败，也继续返回成功，因为JSON文件已经更新
        
        return jsonify({"success": True, "rating": rating})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # 提示用户在生产环境中不要使用debug=True
    print("注意：在生产环境中请使用WSGI服务器运行此应用，不要使用debug=True")
    
    # 启动时预生成缩略图和浏览用大图（在独立线程中运行，避免阻塞服务启动）
    image_thread = threading.Thread(target=pregenerate_images)
    image_thread.daemon = True  # 设为守护线程，主程序结束时自动终止
    image_thread.start()
    
    # 禁用debug模式下的自动重启功能，避免图片重复生成
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)