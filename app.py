from flask import Flask, render_template
import os
import threading
import json
from datetime import datetime

# 导入配置管理模块
from data.config_manager import load_config, save_config, load_ratings, save_ratings, config, photo_ratings

# 导入工具函数
from utils.file_utils import SUPPORTED_FORMATS
from utils.image_processor import pregenerate_images

# 导入路由模块
from routes.directory_routes import directory_bp
from routes.photo_routes import photo_bp
from routes.metadata_routes import metadata_bp

app = Flask(__name__)

# 注册蓝图
bp_prefix = '/api'
app.register_blueprint(directory_bp, url_prefix=bp_prefix)
app.register_blueprint(photo_bp, url_prefix=bp_prefix)
app.register_blueprint(metadata_bp, url_prefix=bp_prefix)

# 缩略图存储目录
THUMBNAIL_DIR = 'thumbnails'
# 浏览用大图存储目录
VIEWER_IMAGE_DIR = 'viewer_images'

# 检查并创建缩略图和浏览图目录
for dir_path in [THUMBNAIL_DIR, VIEWER_IMAGE_DIR]:
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test')
def test():
    return "服务器运行正常!"

if __name__ == '__main__':
    # 启动预生成图片的线程
    if config.get('photo_directories', []):
        pregen_thread = threading.Thread(target=pregenerate_images)
        pregen_thread.daemon = True
        pregen_thread.start()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 预生成图片线程已启动")
    
    # 启动Flask服务器
    app.run(host='0.0.0.0', port=5000, debug=True)