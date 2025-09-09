import requests
import json

# 定义要测试的目录
# 注意：在Python字符串中，反斜杠需要转义
# 我们可以尝试直接调用原始的get_photos API，因为测试路由似乎有问题
test_directory = "E:\\测试目录"

# 尝试访问原始的get_photos API
print(f"尝试访问get_photos API，目录: {test_directory}")
response = requests.get(f"http://localhost:5000/api/photos?dir={test_directory}")

print(f"状态码: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"成功获取照片数据: {json.dumps(data, ensure_ascii=False, indent=2)}")
else:
    print(f"请求失败: {response.text}")

# 也尝试直接访问根目录，确保服务正常运行
print("\n尝试访问根目录...")
root_response = requests.get("http://localhost:5000")
print(f"根目录状态码: {root_response.status_code}")
print(f"根目录响应长度: {len(root_response.text)} 字符")