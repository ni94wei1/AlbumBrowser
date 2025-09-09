import os
import sys

# 确保可以导入app模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入应用程序中的测试函数
from app import test_folder_penetration

if __name__ == "__main__":
    print("开始测试文件夹穿透功能...")
    test_folder_penetration()
    print("测试完成！")