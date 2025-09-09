import requests
import urllib.parse
import os

# 测试缩略图API - 尝试不同的路径编码方式
if __name__ == "__main__":
    # 测试1: 使用原始路径，让requests自动处理编码
    print("\n=== 测试1: 使用原始路径，让requests自动处理编码 ===")
    windows_path = r"E:\测试目录\IMG_8436.jpg"
    url1 = f"http://localhost:5000/api/thumbnail/{windows_path}"
    print(f"URL: {url1}")
    try:
        response1 = requests.head(url1)
        print(f"响应状态码: {response1.status_code}")
    except Exception as e:
        print(f"请求失败: {str(e)}")
    
    # 测试2: 尝试双重编码路径
    print("\n=== 测试2: 尝试双重编码路径 ===")
    encoded_path = urllib.parse.quote(windows_path)
    double_encoded_path = urllib.parse.quote(encoded_path)
    url2 = f"http://localhost:5000/api/thumbnail/{double_encoded_path}"
    print(f"原始路径: {windows_path}")
    print(f"单次编码: {encoded_path}")
    print(f"双重编码: {double_encoded_path}")
    print(f"URL: {url2}")
    try:
        response2 = requests.head(url2)
        print(f"响应状态码: {response2.status_code}")
    except Exception as e:
        print(f"请求失败: {str(e)}")
    
    # 测试3: 尝试将路径中的反斜杠替换为正斜杠
    print("\n=== 测试3: 尝试将路径中的反斜杠替换为正斜杠 ===")
    forward_slash_path = windows_path.replace('\\', '/')
    url3 = f"http://localhost:5000/api/thumbnail/{forward_slash_path}"
    print(f"替换后的路径: {forward_slash_path}")
    print(f"URL: {url3}")
    try:
        response3 = requests.head(url3)
        print(f"响应状态码: {response3.status_code}")
    except Exception as e:
        print(f"请求失败: {str(e)}")