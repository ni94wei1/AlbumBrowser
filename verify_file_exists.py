import os

# 验证文件是否存在
if __name__ == "__main__":
    # 测试文件路径
    test_file = r"E:\测试目录\IMG_8436.jpg"
    print(f"检查文件是否存在: {test_file}")
    
    if os.path.isfile(test_file):
        print(f"文件存在！大小: {os.path.getsize(test_file)} 字节")
        # 检查文件扩展名
        file_ext = os.path.splitext(test_file)[1].lower()
        print(f"文件扩展名: {file_ext}")
    else:
        print("文件不存在！")
        
        # 检查目录是否存在
        directory = os.path.dirname(test_file)
        if os.path.isdir(directory):
            print(f"目录存在: {directory}")
            # 列出目录中的文件，看看是否有类似的文件
            print("目录中的文件:")
            try:
                files = os.listdir(directory)
                for file in files[:10]:  # 只显示前10个文件
                    print(f"  - {file}")
                if len(files) > 10:
                    print(f"  ... 还有 {len(files) - 10} 个文件")
            except Exception as e:
                print(f"无法列出目录内容: {str(e)}")
        else:
            print(f"目录不存在: {directory}")