from flask import Flask, render_template, request
from flask_socketio import SocketIO
from datetime import datetime
import sqlite3  # 导入 SQLite 数据库模块

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}  # 记录在线用户 {'sid': '昵称'}

# ========== 数据库相关操作 ==========

# 连接数据库的辅助函数
def get_db():
    # 连接 chat.db 文件，如果不存在会自动创建
    # check_same_thread=False 允许在不同线程中使用同一个连接（Flask-SocketIO 是多线程的）
    conn = sqlite3.connect('chat.db', check_same_thread=False)
    # 让查询结果以字典形式返回，而不是默认的元组
    conn.row_factory = sqlite3.Row
    return conn

# 初始化数据库表（只运行一次）
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    # 创建 messages 表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            time TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# 启动时初始化数据库
init_db()

# ========== 路由与 SocketIO 事件 ==========

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    username = request.args.get('username')
    if not username:
        return False
    
    users[request.sid] = username
    
    # 1. 向所有人广播系统消息
    socketio.emit('system', {
        'content': f'{username} 加入了群聊',
        'time': datetime.now().strftime('%H:%M')
    })
    
    # 2. 更新所有人的在线列表
    socketio.emit('userlist', list(users.values()))
    
    # 3. 重点：向刚连上的这个用户，发送历史聊天记录
    conn = get_db()
    cursor = conn.cursor()
    # 查询最近 50 条消息，按 id 升序排列
    cursor.execute('SELECT username, content, time FROM messages ORDER BY id DESC LIMIT 50')
    rows = cursor.fetchall()
    conn.close()
    
    # 把数据库读出来的记录，变成列表，发给这个新用户
    history = []
    for row in reversed(rows):  # 反转一下，让最旧的在上，最新的在下
        history.append({
            'from': row['username'],
            'content': row['content'],
            'time': row['time']
        })
    
    # 发给特定的用户（不广播），事件名叫 'history'
    socketio.emit('history', history, to=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    username = users.pop(request.sid, None)
    if username:
        socketio.emit('system', {
            'content': f'{username} 离开了群聊',
            'time': datetime.now().strftime('%H:%M')
        })
        socketio.emit('userlist', list(users.values()))

@socketio.on('send_message')
def handle_send_message(data):
    content = data.get('content')
    if content:
        username = users.get(request.sid, '未知用户')
        now_time = datetime.now().strftime('%H:%M')
        
        # 1. 先把消息存进数据库
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (username, content, time) VALUES (?, ?, ?)',
            (username, content, now_time)
        )
        conn.commit()
        conn.close()
        
        # 2. 再广播给所有在线的人
        socketio.emit('receive_message', {
            'content': content,
            'from': username,
            'time': now_time,
            'sid': request.sid
        })

if __name__ == '__main__':
    socketio.run(app, debug=True)