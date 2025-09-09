import requests
import urllib.parse

# 使用实际存在的图片文件测试缩略图API
if __name__ == "__main__":
    # 使用日志中显示的实际存在的图片文件
    real_image_path = r"E:\测试目录\3\5\wallhaven-5g6g33.jpg"
    print(f"测试实际存在的文件: {real_image_path}")
    
    # 进行URL编码
    encoded_path = urllib.parse.quote(real_image_path)
    print(f"URL编码后: {encoded_path}")
    
    # 构建API URL
    url = f"http://localhost:5000/api/thumbnail/{encoded_path}"
    print(f"完整API URL: {url}")
    
    try:
        # 发送GET请求获取缩略图
        print("发送GET请求获取缩略图...")
        response = requests.get(url, stream=True)
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            # 保存缩略图到本地进行验证
            thumbnail_filename = "test_real_thumbnail.jpg"
            with open(thumbnail_filename, 'wb') as f:
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        f.write(chunk)
            print(f"缩略图已成功保存到: {thumbnail_filename}")
        else:
            print(f"获取缩略图失败，状态码: {response.status_code}")
            print(f"错误信息: {response.text}")
    except Exception as e:
        print(f"请求过程中发生错误: {str(e)}")