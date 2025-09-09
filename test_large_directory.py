import requests
import time
import urllib.parse

# 要测试的大目录路径，根据用户提到的有600多个文件的目录
# 注意：请根据实际情况修改这个路径
large_directory_path = r"E:\照片2025_1\20250811彭妮吴罗馨选图"

# 构建API URL
base_url = "http://localhost:5000/api/photos"
# 对目录路径进行URL编码
encoded_dir = urllib.parse.quote(large_directory_path)
api_url = f"{base_url}?dir={encoded_dir}"

print(f"测试大目录访问性能：")
print(f"目录路径: {large_directory_path}")
print(f"API URL: {api_url}")
print(f"开始请求，时间: {time.strftime('%H:%M:%S')}")

# 记录开始时间
start_time = time.time()

# 发送请求
try:
    response = requests.get(api_url, timeout=300)  # 增加超时时间，因为目录很大
    
    # 记录结束时间
    end_time = time.time()
    
    # 计算响应时间
    response_time = end_time - start_time
    
    if response.status_code == 200:
        data = response.json()
        photos_count = len(data.get('photos', []))
        subdirs_count = len(data.get('subdirectories', []))
        
        print(f"请求成功！状态码: {response.status_code}")
        print(f"响应时间: {response_time:.2f}秒")
        print(f"返回照片数量: {photos_count}")
        print(f"返回子目录数量: {subdirs_count}")
        
        # 输出前几张照片的信息（如果有的话）
        if photos_count > 0:
            print(f"前3张照片信息:")
            for i, photo in enumerate(data['photos'][:3]):
                print(f"  {i+1}. 名称: {photo['name']}, 大小: {photo['size']}字节")
        
    else:
        print(f"请求失败！状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
except requests.exceptions.Timeout:
    end_time = time.time()
    print(f"请求超时！耗时: {end_time - start_time:.2f}秒")
except Exception as e:
    print(f"请求过程中发生错误: {str(e)}")

print(f"测试完成，时间: {time.strftime('%H:%M:%S')}")