import requests
import json
import urllib.parse

# 使用一个简单的测试目录路径
directory = 'E:/照片2025_1'

# 使用urllib.parse进行URL编码
dir_encoded = urllib.parse.quote(directory)

# 构建API URL
url = f'http://localhost:5000/api/photos?dir={dir_encoded}'

print(f'发送请求到: {url}')

# 发送GET请求
try:
    response = requests.get(url)
    
    # 检查响应状态码
    if response.status_code == 200:
        # 解析JSON响应
        data = response.json()
        
        print('请求成功，返回的数据:')
        
        # 打印照片数量
        if 'photos' in data:
            print(f'照片数量: {len(data["photos"])}')
        
        # 打印子目录信息（如果有）
        if 'subdirectories' in data and data['subdirectories']:
            print(f'子目录数量: {len(data["subdirectories"])}')
            print('子目录详情:')
            for subdir in data['subdirectories']:
                print(f"- 路径: {subdir.get('path', 'N/A')}")
                print(f"  名称: {subdir.get('name', 'N/A')}")
                print(f"  有照片: {subdir.get('has_images', 'N/A')}")
                print(f"  有子目录: {subdir.get('has_subdirectories', 'N/A')}")
                print()
        else:
            print('没有子目录或子目录为空')
    else:
        print(f'请求失败，状态码: {response.status_code}')
        print(f'错误信息: {response.text}')
except Exception as e:
    print(f'发生错误: {str(e)}')