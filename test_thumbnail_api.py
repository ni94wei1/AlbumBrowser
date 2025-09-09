import requests
import urllib.parse

# 测试缩略图API
if __name__ == "__main__":
    # 模拟一个典型的Windows文件路径
    windows_path = r"E:\\测试目录\\IMG_8436.jpg"
    print(f"原始Windows路径: {windows_path}")
    
    # 进行URL编码
    encoded_path = urllib.parse.quote(windows_path)
    print(f"URL编码后: {encoded_path}")
    
    # 构建API URL
    url = f"http://localhost:5000/api/thumbnail/{encoded_path}"
    print(f"完整API URL: {url}")
    
    try:
        # 发送HEAD请求检查响应状态
        print("发送HEAD请求...")
        head_response = requests.head(url)
        print(f"HEAD响应状态码: {head_response.status_code}")
        print(f"HEAD响应头: {head_response.headers}")
        
        if head_response.status_code == 200:
            # 如果HEAD请求成功，尝试获取完整的缩略图
            print("发送GET请求获取缩略图...")
            get_response = requests.get(url, stream=True)
            print(f"GET响应状态码: {get_response.status_code}")
            
            if get_response.status_code == 200:
                # 保存缩略图到本地进行验证
                thumbnail_filename = "test_thumbnail.jpg"
                with open(thumbnail_filename, 'wb') as f:
                    for chunk in get_response.iter_content(chunk_size=1024):
                        if chunk:
                            f.write(chunk)
                print(f"缩略图已保存到: {thumbnail_filename}")
            else:
                print(f"获取缩略图失败，状态码: {get_response.status_code}")
                print(f"错误信息: {get_response.text}")
        else:
            print(f"HEAD请求失败，状态码: {head_response.status_code}")
            
    except Exception as e:
        print(f"请求过程中发生错误: {str(e)}")