// 等页面加载完毕
document.addEventListener("DOMContentLoaded", () => {
    
    // 定义全局变量
    let socket = null; // 存放 WebSocket 连接
    let myNickname = ""; // 存放自己的昵称

    // ========== 1. 登录逻辑 ==========
    const mask = document.getElementById("mask"); // 获取登录遮罩
    const app = document.getElementById("app"); // 获取主界面
    const nicknameInput = document.getElementById("nickname"); // 昵称输入框
    const joinBtn = document.getElementById("joinBtn"); // 进入按钮

    joinBtn.addEventListener("click", () => {
        const name = nicknameInput.value.trim(); // 去除首尾空格
        if (!name) {
            alert("请输入昵称！");
            return;
        }
        
        myNickname = name; // 记住自己的昵称
        
        // 隐藏遮罩，显示主界面
        mask.classList.add("hidden");
        app.classList.remove("hidden");

        // 建立 WebSocket 连接，带上昵称作为查询参数
        // 注意：io() 是 Socket.IO 前端库提供的
        socket = io({ query: { username: name } });
        
        // 连接建立后，绑定各种事件
        bindSocketEvents();
    });

    // 如果用户已经在输入框里按了回车，也能触发登录
    nicknameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") joinBtn.click();
    });

    // ========== 2. 绑定 Socket 事件 ==========
    function bindSocketEvents() {
        // 获取页面元素
        const form = document.getElementById("composer");
        const input = document.getElementById("input");
        const messages = document.getElementById("messages");
        const usersList = document.getElementById("users");
        const userCount = document.getElementById("count");

        // 发送消息
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            socket.emit("send_message", { content: text });
            input.value = "";
        });

        // 收到聊天消息
        socket.on("receive_message", (data) => {
            // 判断是不是自己发的：比较服务器发来的 sid 和当前的 socket.id
            const isMe = (data.sid === socket.id);
            
            // 创建消息 div
            const div = document.createElement("div");
            div.className = "msg" + (isMe ? " me" : ""); // 如果是自己，加上 me 类
            
            // 组装 HTML
            div.innerHTML = `
                <div class="meta">
                    <span>${isMe ? "我" : data.from}</span>
                    <span>${data.time}</span>
                </div>
                <div class="bubble">${data.content}</div>
            `;
            
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight; // 滚动到底部
        });

        // 收到系统消息（如有人加入/离开）
        socket.on("system", (data) => {
            const div = document.createElement("div");
            div.className = "sys"; // 系统消息专属样式（居中灰色）
            div.textContent = `${data.content} · ${data.time}`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        });

        // 收到在线成员列表更新
        socket.on("userlist", (users) => {
            userCount.textContent = users.length; // 更新人数
            usersList.innerHTML = ""; // 清空旧列表
            users.forEach(name => {
                const li = document.createElement("li");
                li.textContent = name;
                // 如果是自己，高亮显示
                if (name === myNickname) li.classList.add("me");
                usersList.appendChild(li);
            });
        });
        
        // 收到历史聊天记录
        socket.on("history", (history) => {
            history.forEach(msg => {
                // 历史记录里没有 sid，所以只能通过昵称来判断是不是自己发的
                const isMe = (msg.from === myNickname);
                
                const div = document.createElement("div");
                div.className = "msg" + (isMe ? " me" : "");
                div.innerHTML = `
                    <div class="meta">
                        <span>${isMe ? "我" : msg.from}</span>
                        <span>${msg.time}</span>
                    </div>
                    <div class="bubble">${msg.content}</div>
                `;
                messages.appendChild(div);
            });
            // 渲染完历史记录后，滚动到底部
            messages.scrollTop = messages.scrollHeight;
        });
    }
});