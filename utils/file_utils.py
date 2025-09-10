import os
from data.config_manager import config

# 支持的图片格式
SUPPORTED_FORMATS = config['supported_formats']


def get_thumbnail_path(file_path):
    """获取缩略图存储路径（按照原目录结构组织）"""
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    
    # 创建缩略图存储目录（在应用程序目录下，保持原目录结构）
    thumbnail_dir = os.path.join('thumbnails', os.path.dirname(file_path).replace(':', '_'))
    os.makedirs(thumbnail_dir, exist_ok=True)
    
    # 缩略图文件路径
    filename = os.path.basename(file_path)
    name_without_ext, ext = os.path.splitext(filename)
    thumbnail_path = os.path.join(thumbnail_dir, f'{name_without_ext}_thumbnail.jpg')
    
    return thumbnail_path

def get_viewer_image_path(file_path):
    """获取浏览用大图存储路径（按照原目录结构组织）"""
    # 确保文件路径使用正确的分隔符
    file_path = file_path.replace('/', os.path.sep)
    
    # 创建浏览用大图存储目录
    viewer_dir = os.path.join('viewer_images', os.path.dirname(file_path).replace(':', '_'))
    os.makedirs(viewer_dir, exist_ok=True)
    
    # 浏览用大图文件路径
    filename = os.path.basename(file_path)
    name_without_ext, ext = os.path.splitext(filename)
    viewer_image_path = os.path.join(viewer_dir, f'{name_without_ext}_viewer.jpg')
    
    return viewer_image_path

def get_all_images_recursive(directory):
    """递归获取目录及其所有子目录中的图片文件"""
    image_files = []
    try:
        if not os.path.isdir(directory):
            print(f"[错误] 目录不存在: {directory}")
            return []
            
        items = os.listdir(directory)
        
        for item in items:
            item_path = os.path.join(directory, item)
            if os.path.isfile(item_path):
                # 检查文件是否为支持的图片格式
                file_ext = os.path.splitext(item)[1].lower()
                if file_ext in SUPPORTED_FORMATS:
                    image_files.append(item_path)
            elif os.path.isdir(item_path):
                # 递归处理子目录
                subdir_images = get_all_images_recursive(item_path)
                print(f"[调试] 从子目录 {item} 中找到 {len(subdir_images)} 张图片")
                image_files.extend(subdir_images)
    except Exception as e:
        print(f"[错误] 递归获取图片时出错: {str(e)}")
    print(f"[调试] 离开 get_all_images_recursive，目录 {directory} 共找到 {len(image_files)} 张图片")
    return image_files

def get_subdirectories_without_images(directory):
    """递归获取目录下所有不含图片的子目录，包括多层深度"""
    print(f"[调试] 进入 get_subdirectories_without_images，检查目录: {directory}")
    subdirs = []
    try:
        # 先检查当前目录是否包含图片
        has_images = False
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isfile(item_path) and os.path.splitext(item)[1].lower() in SUPPORTED_FORMATS:
                has_images = True
                print(f"[调试] 目录 {directory} 包含图片: {item}")
                break
        
        # 检查当前目录是否包含子目录
        has_subdirectories = False
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isdir(item_path):
                has_subdirectories = True
                break
        
        # 如果当前目录不包含图片但包含子目录，将其添加到列表（除了顶层目录）
        if not has_images:
            print(f"[调试] 目录 {directory} 不包含图片")
            # 只有当目录既没有图片也没有子目录时才被视为真正的空目录
            is_empty_directory = not has_images and not has_subdirectories
            
            # 非空目录或顶层目录不添加到空目录列表
            if directory not in config["photo_directories"] and not is_empty_directory:
                print(f"[调试] 目录 {directory} 不是顶层配置目录，且包含子目录，添加到不含图片但非空的子目录列表")
                # 获取目录的基本名称作为显示名称
                dir_name = os.path.basename(directory)
                subdirs.append({
                    'path': directory,
                    'name': dir_name,
                    'has_images': has_images,
                    'has_subdirectories': has_subdirectories
                })
            elif is_empty_directory:
                print(f"[调试] 目录 {directory} 是空目录（既没有图片也没有子目录），不添加到列表")
            else:
                print(f"[调试] 目录 {directory} 是顶层配置目录，不添加到不含图片的子目录列表")
        
        # 递归检查所有子目录
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isdir(item_path):
                print(f"[调试] 在目录 {directory} 中找到子目录: {item}")
                # 递归获取子目录中的不含图片目录
                child_subdirs = get_subdirectories_without_images(item_path)
                if child_subdirs:
                    print(f"[调试] 从子目录 {item} 中找到 {len(child_subdirs)} 个不含图片的目录")
                else:
                    print(f"[调试] 子目录 {item} 中没有找到不含图片的目录")
                subdirs.extend(child_subdirs)
    except Exception as e:
        print(f"[错误] 获取子目录时出错: {str(e)}")
    print(f"[调试] 离开 get_subdirectories_without_images，目录 {directory} 找到 {len(subdirs)} 个不含图片的子目录")
    return subdirs

def get_all_subdirectories(directory):
    """递归获取目录下的所有子目录，包括包含图片的子目录"""
    print(f"[调试] 进入 get_all_subdirectories，检查目录: {directory}")
    subdirs = []
    try:
        # 检查所有子目录
        for item in os.listdir(directory):
            item_path = os.path.join(directory, item)
            if os.path.isdir(item_path):
                print(f"[调试] 在目录 {directory} 中找到子目录: {item}")
                # 添加当前子目录到列表（除了顶层配置目录）
                if directory not in config["photo_directories"] or item_path not in config["photo_directories"]:
                    dir_name = os.path.basename(item_path)
                    # 检查子目录是否包含图片
                    has_images = False
                    for subitem in os.listdir(item_path):
                        subitem_path = os.path.join(item_path, subitem)
                        if os.path.isfile(subitem_path) and os.path.splitext(subitem)[1].lower() in SUPPORTED_FORMATS:
                            has_images = True
                            break
                    
                    # 检查子目录是否包含其他子目录
                    has_subdirectories = False
                    for subitem in os.listdir(item_path):
                        subitem_path = os.path.join(item_path, subitem)
                        if os.path.isdir(subitem_path):
                            has_subdirectories = True
                            break
                    
                    subdirs.append({
                        'path': item_path,
                        'name': dir_name,
                        'has_images': has_images,
                        'has_subdirectories': has_subdirectories
                    })
                
                # 递归获取子目录的子目录
                child_subdirs = get_all_subdirectories(item_path)
                if child_subdirs:
                    print(f"[调试] 从子目录 {item} 中找到 {len(child_subdirs)} 个子目录")
                subdirs.extend(child_subdirs)
    except Exception as e:
        print(f"[错误] 获取所有子目录时出错: {str(e)}")
    print(f"[调试] 离开 get_all_subdirectories，目录 {directory} 找到 {len(subdirs)} 个子目录")
    return subdirs

def is_directory_accessible(directory, check_subdir=True):
    """检查目录是否可访问"""
    if not os.path.isdir(directory):
        return False
    
    if check_subdir:
        # 检查目录是否在某个已配置目录的子目录中
        for configured_dir in config["photo_directories"]:
            norm_dir = os.path.normpath(configured_dir)
            norm_file = os.path.normpath(directory)
            if norm_file.startswith(norm_dir):
                return True
        return False
    else:
        # 直接检查目录是否存在
        return os.path.isdir(directory)

def is_file_accessible(file_path):
    """检查文件是否可访问（在配置的目录中且是支持的图片格式）"""
    # 检查文件是否存在
    if not os.path.isfile(file_path):
        return False
    
    # 检查文件格式是否支持
    file_ext = os.path.splitext(file_path)[1].lower()
    if file_ext not in SUPPORTED_FORMATS:
        return False
    
    # 检查文件是否在配置的目录中
    for dir_path in config["photo_directories"]:
        norm_dir = os.path.normpath(dir_path)
        norm_file = os.path.normpath(file_path)
        if norm_file.startswith(norm_dir):
            return True
    
    return False