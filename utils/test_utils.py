import os
from utils.file_utils import get_all_images_recursive, get_subdirectories_without_images
from data.config_manager import config

def test_folder_penetration():
    """测试文件夹穿透功能，输出详细的调试信息"""
    print("\n===== 开始测试文件夹穿透功能 =====")
    
    # 测试配置的测试目录
    test_dir = "E:\测试目录"
    if os.path.isdir(test_dir):
        print(f"[测试] 找到测试目录: {test_dir}")
        
        # 测试1：递归获取所有图片
        print("[测试1] 递归获取测试目录中的所有图片:")
        all_images = get_all_images_recursive(test_dir)
        print(f"[测试1] 在测试目录中找到 {len(all_images)} 张图片")
        if all_images:
            print(f"[测试1] 前5张图片:")
            for img in all_images[:5]:
                print(f"[测试1]   - {img}")
        
        # 测试2：测试get_photos函数逻辑中的目录验证
        print("\n[测试2] 测试目录验证逻辑:")
        is_subdirectory = False
        for configured_dir in config["photo_directories"]:
            if os.path.normpath(test_dir).startswith(os.path.normpath(configured_dir)):
                is_subdirectory = True
                print(f"[测试2] 目录验证通过: {test_dir} 是已配置目录 {configured_dir} 的子目录")
                break
        if not is_subdirectory:
            print(f"[测试2] 目录验证失败: {test_dir}")
        
        # 测试3：测试不含图片的子目录查找
        print("\n[测试3] 测试不含图片的子目录查找:")
        subdirs_without_images = get_subdirectories_without_images(test_dir)
        print(f"[测试3] 找到 {len(subdirs_without_images)} 个不含图片的子目录")
        if subdirs_without_images:
            print(f"[测试3] 不含图片的子目录列表:")
            for subdir in subdirs_without_images:
                print(f"[测试3]   - {subdir['name']} ({subdir['path']})")
        
        # 测试4：测试多层级穿透
        print("\n[测试4] 测试多层级穿透:")
        # 尝试访问测试目录的子目录
        for subdir_name in ['1', '2', '3']:
            subdir_path = os.path.join(test_dir, subdir_name)
            if os.path.isdir(subdir_path):
                print(f"[测试4] 访问子目录: {subdir_path}")
                subdir_images = get_all_images_recursive(subdir_path)
                print(f"[测试4] 在 {subdir_name} 中找到 {len(subdir_images)} 张图片")
                # 测试更深层级的穿透
                if subdir_name == '3':
                    for deep_subdir_name in ['4', '5']:
                        deep_subdir_path = os.path.join(subdir_path, deep_subdir_name)
                        if os.path.isdir(deep_subdir_path):
                            print(f"[测试4] 访问深层子目录: {deep_subdir_path}")
                            deep_images = get_all_images_recursive(deep_subdir_path)
                            print(f"[测试4] 在 {deep_subdir_name} 中找到 {len(deep_images)} 张图片")
    else:
        print(f"[测试] 警告：测试目录 {test_dir} 不存在")
    
    print("===== 文件夹穿透功能测试结束 =====\n")

def pregenerate_images_for_directory(directory):
    """为指定目录及其所有子目录预生成照片的缩略图和浏览用大图"""
    if not os.path.isdir(directory):
        print(f"[错误] 目录不存在: {directory}")
        return
        
    print(f"[目录添加] 开始为新目录生成图片: {directory}")
    
    # 使用集合来跟踪已经处理过的文件路径，避免重复处理
    processed_files = set()
    
    try:
        # 递归获取目录及其所有子目录中的图片文件
        all_image_files = get_all_images_recursive(directory)
        
        # 为每个图片文件生成缩略图和浏览用大图
        for file_path in all_image_files:
            # 检查文件是否已经处理过
            if file_path not in processed_files:
                # 添加到已处理集合
                processed_files.add(file_path)
                # 生成并保存缩略图
                from utils.image_processor import generate_and_save_thumbnail, generate_and_save_viewer_image
                generate_and_save_thumbnail(file_path)
                generate_and_save_viewer_image(file_path)
    except Exception as e:
        print(f"[错误] 处理目录 {directory} 时出错: {str(e)}")
    
    print(f"[目录添加] 图片生成完成，共处理 {len(processed_files)} 个文件")