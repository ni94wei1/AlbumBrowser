import os
from PIL import Image, ImageFile
import io
from utils.file_utils import get_thumbnail_path, get_viewer_image_path
from data.config_manager import config

# 统计数据字典
image_processing_stats = {
    "total_files": 0,
    "generated_thumbnails": 0,
    "skipped_thumbnails": 0,
    "generated_viewer_images": 0,
    "skipped_viewer_images": 0,
    "errors": 0
}

# 配置PIL以更好地处理大图片
ImageFile.LOAD_TRUNCATED_IMAGES = True
ImageFile.MAXBLOCK = 2**25  # 增加缓存块大小

def generate_and_save_thumbnail(file_path):
    """生成并保存指定图片的缩略图到本地（正方形裁剪，优化版）"""
    try:
        # 增加文件计数
        image_processing_stats["total_files"] += 1
        
        # 获取缩略图存储路径（按照原目录结构组织）
        thumbnail_path = get_thumbnail_path(file_path)
        
        # 检查缩略图是否已存在
        if os.path.exists(thumbnail_path):
            # 检查缩略图是否比原图旧
            thumbnail_mtime = os.path.getmtime(thumbnail_path)
            file_mtime = os.path.getmtime(file_path)
            
            if thumbnail_mtime >= file_mtime:
                # 缩略图是最新的，不需要重新生成
                image_processing_stats["skipped_thumbnails"] += 1
                return
            else:
                # 缩略图需要更新
                image_processing_stats["generated_thumbnails"] += 1
        else:
            # 缩略图不存在，需要创建
            image_processing_stats["generated_thumbnails"] += 1
        
        # 生成缩略图
        with Image.open(file_path) as img:
            # 转换为RGB模式（处理透明度）
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 获取原图尺寸
            width, height = img.size
            
            # 针对超大图（超过4000x4000像素），先进行一次快速缩小，减少内存占用
            if width > 4000 or height > 4000:
                # 先按比例缩小到4000像素
                scale_factor = 4000 / max(width, height)
                new_size = (int(width * scale_factor), int(height * scale_factor))
                # 使用LANCZOS重采样方法，平衡质量和速度
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                width, height = new_size
            
            # 计算正方形裁剪区域（居中裁剪）
            min_dim = min(width, height)
            left = (width - min_dim) // 2
            top = (height - min_dim) // 2
            right = left + min_dim
            bottom = top + min_dim
            
            # 裁剪成正方形
            img = img.crop((left, top, right, bottom))
            
            # 调整到目标尺寸，使用更高效的重采样方法
            img.thumbnail(config["thumbnail_size"], Image.Resampling.LANCZOS)
            
            # 保存到本地文件，优化质量设置
            img.save(thumbnail_path, 'JPEG', quality=90, optimize=True, progressive=True)
            
    except Exception as e:
        image_processing_stats["errors"] += 1
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
                image_processing_stats["skipped_viewer_images"] += 1
                return
            else:
                # 浏览用大图需要更新
                image_processing_stats["generated_viewer_images"] += 1
        else:
            # 浏览用大图不存在，需要创建
            image_processing_stats["generated_viewer_images"] += 1
        
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
            
    except Exception as e:
        image_processing_stats["errors"] += 1
        print(f"[错误] 生成浏览用大图 {file_path} 时出错: {str(e)}")

def pregenerate_images():
    """服务端启动时预生成所有照片的缩略图和浏览用大图并保存到本地"""
    print(f"[服务启动] 开始预生成图片...")
    
    # 重置统计计数器
    image_processing_stats.update({
        "total_files": 0,
        "generated_thumbnails": 0,
        "skipped_thumbnails": 0,
        "generated_viewer_images": 0,
        "skipped_viewer_images": 0,
        "errors": 0
    })
    
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
                if os.path.isfile(file_path) and os.path.splitext(filename)[1].lower() in config['supported_formats']:
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
    
    # 输出统计信息
    print(f"[服务启动] 图片预生成完成，共处理 {len(processed_files)} 个文件")
    print(f"[统计信息] 生成缩略图: {image_processing_stats['generated_thumbnails']}, 跳过缩略图: {image_processing_stats['skipped_thumbnails']}")
    print(f"[统计信息] 生成浏览图: {image_processing_stats['generated_viewer_images']}, 跳过浏览图: {image_processing_stats['skipped_viewer_images']}")
    if image_processing_stats['errors'] > 0:
        print(f"[统计信息] 处理错误: {image_processing_stats['errors']}")