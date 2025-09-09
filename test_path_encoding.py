import sys
import urllib.parse
import os

# 测试URL编码和解码
if __name__ == "__main__":
    # 模拟一个典型的Windows文件路径
    windows_path = r"E:\\测试目录\\IMG_8436.jpg"
    print(f"原始Windows路径: {windows_path}")
    
    # 模拟JavaScript的encodeURIComponent
    encoded_path = urllib.parse.quote(windows_path)
    print(f"URL编码后: {encoded_path}")
    
    # 模拟Flask路由中的路径获取
    url_path = f"/api/thumbnail/{encoded_path}"
    print(f"完整URL路径: {url_path}")
    
    # 模拟Flask中提取文件路径参数
    # 假设Flask会自动解码URL编码的部分
    extracted_path = encoded_path
    print(f"从URL中提取的路径: {extracted_path}")
    
    # 模拟Flask中的路径处理
    # 1. 替换URL分隔符为操作系统分隔符
    processed_path = extracted_path.replace('/', os.path.sep)
    print(f"处理后的路径(替换分隔符): {processed_path}")
    
    # 2. 规范化路径
    normalized_path = os.path.normpath(processed_path)
    print(f"规范化后的路径: {normalized_path}")
    
    # 3. 检查路径是否正确
    print(f"路径是否存在: {os.path.exists(normalized_path)}")
    
    # 如果路径存在，检查是否能正确获取缩略图
    if os.path.exists(normalized_path):
        # 模拟get_thumbnail_path函数的部分逻辑
        # 计算目录哈希
        import hashlib
        base_dir = r"E:\\测试目录"
        dir_hash = hashlib.md5(base_dir.encode('utf-8')).hexdigest()
        print(f"目录哈希: {dir_hash}")
        
        # 计算相对路径
        rel_path = os.path.relpath(normalized_path, base_dir)
        print(f"相对路径: {rel_path}")
        
        # 构建缩略图路径
        THUMBNAIL_DIR = 'thumbnails'
        thumbnail_dir = os.path.join(THUMBNAIL_DIR, dir_hash, os.path.dirname(rel_path))
        thumbnail_filename = f"thumbnail_{os.path.basename(normalized_path)}"
        base_name, _ = os.path.splitext(thumbnail_filename)
        thumbnail_filename = f"{base_name}.jpg"
        thumbnail_path = os.path.join(thumbnail_dir, thumbnail_filename)
        print(f"期望的缩略图路径: {thumbnail_path}")
        print(f"缩略图是否存在: {os.path.exists(thumbnail_path)}")