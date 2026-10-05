document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("scoreForm");
    const tableBody = document.querySelector("#scoreTable tbody");

    // 1. 加载页面时，从后端拉取所有成绩
    function loadScores() {
        fetch('/api/scores')
            .then(res => res.json())
            .then(data => {
                tableBody.innerHTML = ''; // 清空旧数据
                if (data.data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#9aa0a8;">暂无成绩记录</td></tr>';
                    return;
                }
                data.data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.username}</td>
                        <td>${item.subject}</td>
                        <td>${item.score}</td>
                        <td>${item.exam_date}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            })
            .catch(err => console.error('加载成绩失败:', err));
    }

    // 2. 页面一打开就加载
    loadScores();

    // 3. 监听表单提交
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 获取表单里的值
        const data = {
            username: document.getElementById('s_username').value.trim(),
            subject: document.getElementById('s_subject').value,
            score: parseInt(document.getElementById('s_score').value),
            exam_date: document.getElementById('s_date').value
        };

        // 发送 POST 请求给后端
        fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            if (result.status === 'ok') {
                alert('✅ 成绩录入成功！');
                form.reset();   // 清空表单
                loadScores();   // 重新加载列表
            } else {
                alert('❌ ' + result.msg);
            }
        })
        .catch(err => console.error('提交失败:', err));
    });
});