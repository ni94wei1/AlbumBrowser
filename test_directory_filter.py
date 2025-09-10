import os
import sys
import tempfile

# 添加项目根目录到Python路径，以便导入模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入应用程序中的函数
from app import get_subdirectories_without_images

# 创建测试目录结构
def create_test_directories():
    """创建测试目录结构：
    - 测试根目录
      - dir_with_images: 包含图片的目录
      - dir_with_subdirs: 不包含图片但包含子目录的目录
        - subdir1: 子目录1
      - empty_dir: 既不包含图片也不包含子目录的空目录
    """
    # 创建临时目录作为测试根目录
    test_root = tempfile.mkdtemp(prefix="photo_app_test_")
    
    # 创建包含图片的目录
    dir_with_images = os.path.join(test_root, "dir_with_images")
    os.makedirs(dir_with_images)
    # 创建一个模拟图片文件
    with open(os.path.join(dir_with_images, "test_image.jpg"), "w") as f:
        f.write("This is a test image file.")
    
    # 创建不包含图片但包含子目录的目录
    dir_with_subdirs = os.path.join(test_root, "dir_with_subdirs")
    os.makedirs(dir_with_subdirs)
    subdir1 = os.path.join(dir_with_subdirs, "subdir1")
    os.makedirs(subdir1)
    
    # 创建空目录
    empty_dir = os.path.join(test_root, "empty_dir")
    os.makedirs(empty_dir)
    
    return test_root, dir_with_images, dir_with_subdirs, empty_dir

# 测试get_subdirectories_without_images函数
def test_get_subdirectories_without_images():
    print("===== 开始测试 get_subdirectories_without_images 函数 =====")
    
    # 创建测试目录结构
    test_root, dir_with_images, dir_with_subdirs, empty_dir = create_test_directories()
    print(f"创建测试目录结构：{test_root}")
    
    try:
        # 测试1：获取包含图片的目录的不含图片的子目录
        print(f"\n测试1: 测试包含图片的目录 {os.path.basename(dir_with_images)}")
        subdirs = get_subdirectories_without_images(dir_with_images)
        print(f"结果: 找到 {len(subdirs)} 个不含图片的子目录")
        assert len(subdirs) == 0, f"预期结果：0个子目录，实际结果：{len(subdirs)}个子目录"
        
        # 测试2：获取包含子目录但不包含图片的目录的不含图片的子目录
        print(f"\n测试2: 测试包含子目录但不包含图片的目录 {os.path.basename(dir_with_subdirs)}")
        subdirs = get_subdirectories_without_images(dir_with_subdirs)
        print(f"结果: 找到 {len(subdirs)} 个不含图片的子目录")
        # 预期应该包含 dir_with_subdirs 本身（因为它不包含图片但包含子目录）
        # 但不应该包含 subdir1（因为它是一个空目录）
        assert len(subdirs) == 1, f"预期结果：1个子目录，实际结果：{len(subdirs)}个子目录"
        
        # 测试3：获取空目录的不含图片的子目录
        print(f"\n测试3: 测试空目录 {os.path.basename(empty_dir)}")
        subdirs = get_subdirectories_without_images(empty_dir)
        print(f"结果: 找到 {len(subdirs)} 个不含图片的子目录")
        assert len(subdirs) == 0, f"预期结果：0个子目录，实际结果：{len(subdirs)}个子目录"
        
        # 测试4：获取测试根目录的不含图片的子目录
        print(f"\n测试4: 测试测试根目录")
        subdirs = get_subdirectories_without_images(test_root)
        print(f"结果: 找到 {len(subdirs)} 个不含图片的子目录")
        # 预期应该包含 dir_with_subdirs 和 subdir1，但不包含 empty_dir
        found_empty_dir = any(os.path.basename(subdir["path"]) == "empty_dir" for subdir in subdirs)
        assert not found_empty_dir, "预期结果：不应该包含空目录 empty_dir"
        
        print("\n===== 所有测试通过！ =====")
    except AssertionError as e:
        print(f"\n===== 测试失败！ =====")
        print(f"错误: {str(e)}")
    finally:
        # 清理测试目录
        print(f"\n清理测试目录：{test_root}")
        # 注意：在实际运行时，你可能需要手动删除临时目录，因为这里的简单删除可能不够安全
        
if __name__ == "__main__":
    test_get_subdirectories_without_images()