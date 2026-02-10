// 设置你们在一起的第一天（请修改为你们的纪念日）
const START_DATE = new Date('2024-01-01');

// 初始化 - 页面加载时从本地存储获取数据
document.addEventListener('DOMContentLoaded', function() {
    loadEntries();
    updateStats();
    updateDaysTogether();
    
    // 表单提交事件
    document.getElementById('entry-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addEntry();
    });
});

// 计算在一起天数
function updateDaysTogether() {
    const today = new Date();
    const diffTime = today - START_DATE;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('days-together').textContent = diffDays;
}

// 添加新记录
function addEntry() {
    const type = document.getElementById('entry-type').value;
    const title = document.getElementById('entry-title').value;
    const content = document.getElementById('entry-content').value;
    const lesson = document.getElementById('entry-lesson').value;
    
    if (!type || !title || !content || !lesson) {
        alert('请填写所有字段！');
        return;
    }
    
    const entry = {
        id: Date.now(), // 使用时间戳作为唯一ID
        type: type,
        title: title,
        content: content,
        lesson: lesson,
        date: new Date().toISOString().split('T')[0] // 当前日期
    };
    
    // 获取现有记录
    let entries = JSON.parse(localStorage.getItem('relationshipEntries')) || [];
    entries.push(entry);
    
    // 保存到本地存储
    localStorage.setItem('relationshipEntries', JSON.stringify(entries));
    
    // 重新加载记录
    loadEntries();
    updateStats();
    
    // 清空表单
    document.getElementById('entry-form').reset();
    
    // 显示成功消息
    alert('记录保存成功！✨');
}

// 加载所有记录
function loadEntries() {
    const entriesContainer = document.getElementById('entries');
    const emptyState = document.getElementById('empty-state');
    let entries = JSON.parse(localStorage.getItem('relationshipEntries')) || [];
    
    // 按日期倒序排列（最新的在前面）
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 清空容器（除了空状态）
    entriesContainer.innerHTML = '';
    
    if (entries.length === 0) {
        // 显示空状态
        entriesContainer.appendChild(emptyState);
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        // 为每条记录创建HTML
        entries.forEach(entry => {
            const entryEl = document.createElement('div');
            entryEl.className = `entry ${entry.type}`;
            entryEl.innerHTML = `
                <div class="entry-header">
                    <span class="entry-type type-${entry.type}">
                        ${entry.type === 'conflict' ? '矛盾解决' : '美好瞬间'}
                    </span>
                    <span class="entry-date">${formatDate(entry.date)}</span>
                </div>
                <h3 class="entry-title">${entry.title}</h3>
                <div class="entry-content">${entry.content}</div>
                <div class="entry-lesson">
                    <strong>我们的成长：</strong> ${entry.lesson}
                </div>
            `;
            entriesContainer.appendChild(entryEl);
        });
    }
}

// 更新统计数据
function updateStats() {
    let entries = JSON.parse(localStorage.getItem('relationshipEntries')) || [];
    
    const total = entries.length;
    const conflicts = entries.filter(e => e.type === 'conflict').length;
    const joys = entries.filter(e => e.type === 'joy').length;
    
    document.getElementById('total-entries').textContent = total;
    document.getElementById('conflict-entries').textContent = conflicts;
    document.getElementById('joy-entries').textContent = joys;
}

// 格式化日期为中文格式
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// 添加一些初始示例数据（第一次使用时）
function addSampleData() {
    const sampleEntries = [
        {
            id: 1,
            type: 'joy',
            title: '第一次约会',
            content: '在咖啡厅聊了整整一下午，发现我们有那么多共同爱好，时间仿佛静止了。',
            lesson: '真正的契合是即使沉默也不尴尬，是能接住对方抛出的每一个梗。',
            date: '2024-01-15'
        },
        {
            id: 2,
            type: 'conflict',
            title: '关于回复消息的沟通',
            content: '因为工作忙回复慢，产生了误会和情绪。',
            lesson: '学会了主动报备行程，并约定「忙完会第一时间回复」的安全信号。',
            date: '2024-02-10'
        }
    ];
    
    localStorage.setItem('relationshipEntries', JSON.stringify(sampleEntries));
    loadEntries();
    updateStats();
}

// 如果你想添加示例数据，取消下面这行的注释（第一次使用时）
// addSampleData();