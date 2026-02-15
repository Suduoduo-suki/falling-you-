// ====================  Supabase 配置（请务必替换！） ====================
const SUPABASE_URL = 'https://eouvjxrrmqlaufdmfycl.supabase.co';   // 替换为你的 Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdXZqeHJybXFsYXVmZG1meWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTE3OTcsImV4cCI6MjA4NjM2Nzc5N30.NkTIY33ps8_8-V8CYHHTN5txC6mrwpwQ25UKfucsYYc';      // 替换为你的 anon public 密钥（完整长串）

// 初始化 Supabase 客户端（注意变量名改为 supabaseClient）
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================  全局变量 ====================
let currentUser = null;
let currentCoupleId = null;

// ====================  页面加载 ====================
document.addEventListener('DOMContentLoaded', async function() {
    // 先检查是否已登录
    await checkUser();
    
    // 绑定按钮事件
    document.getElementById('login-btn').addEventListener('click', handleAuth);
    document.getElementById('create-couple-btn').addEventListener('click', createCouple);
    document.getElementById('join-couple-btn').addEventListener('click', joinCouple);
    
    // 如果已登录，直接加载主界面
    if (currentUser) {
        showApp();
    }
});

// ====================  用户认证 ====================
async function handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || password.length < 6) {
        alert('邮箱和密码（至少6位）不能为空');
        return;
    }
    
    // 尝试登录
    let { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    // 如果登录失败（用户不存在），则自动注册
    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            // 注册新用户
            const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
                email: email,
                password: password
            });
            if (signUpError) {
                alert('注册失败：' + signUpError.message);
                return;
            }
            alert('注册成功！请检查邮箱验证（若不验证也可使用）');
            currentUser = signUpData.user;
        } else {
            alert('登录失败：' + error.message);
            return;
        }
    } else {
        currentUser = data.user;
    }
    
    // 登录成功后，加载情侣信息和主界面
    await loadCoupleInfo();
    showApp();
}

// ====================  情侣组管理 ====================
async function loadCoupleInfo() {
    // 查询当前用户是否已加入情侣组
    const { data: userCouples, error } = await supabaseClient
        .from('user_couples')
        .select('couple_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
    
    if (error) {
        console.error('查询情侣组失败', error);
        return;
    }
    
    if (userCouples) {
        currentCoupleId = userCouples.couple_id;
        // 获取情侣组详情
        const { data: couple } = await supabaseClient
            .from('couples')
            .select('*')
            .eq('id', currentCoupleId)
            .single();
        
        document.getElementById('couple-status').innerHTML = `
            <p style="color: var(--success); font-weight: bold;">
                ✅ 已加入情侣组：${couple?.couple_name || '未命名'} <br>
                邀请码：<span style="background: #f0f0f0; padding: 5px 10px; border-radius: 8px;">${couple?.invite_code}</span>
            </p>
        `;
        document.getElementById('invite-box').style.display = 'block';
    } else {
        currentCoupleId = null;
        document.getElementById('couple-status').innerHTML = `
            <p style="color: #888;">你还没有加入情侣组，请创建或输入邀请码。</p>
        `;
        document.getElementById('invite-box').style.display = 'block';
    }
}

async function createCouple() {
    if (!currentUser) return;
    
    // 创建新情侣组
    const coupleName = prompt('为你们的情侣组起个名字（例如：多多和杉杉）', '我们的情侣组');
    if (!coupleName) return;
    
    const { data: newCouple, error } = await supabaseClient
        .from('couples')
        .insert([{ couple_name: coupleName }])
        .select()
        .single();
    
    if (error) {
        alert('创建失败：' + error.message);
        return;
    }
    
    // 将当前用户关联到此情侣组
    const { error: linkError } = await supabaseClient
        .from('user_couples')
        .insert([{ user_id: currentUser.id, couple_id: newCouple.id }]);
    
    if (linkError) {
        alert('关联情侣组失败：' + linkError.message);
        return;
    }
    
    currentCoupleId = newCouple.id;
    alert(`🎉 情侣组创建成功！\n邀请码：${newCouple.invite_code}\n快分享给另一半吧！`);
    await loadCoupleInfo();
}

async function joinCouple() {
    const inviteCode = document.getElementById('invite-code-input').value.trim();
    if (!inviteCode) {
        alert('请输入邀请码');
        return;
    }
    
    // 查找该邀请码对应的情侣组
    const { data: couple, error } = await supabaseClient
        .from('couples')
        .select('id')
        .eq('invite_code', inviteCode)
        .maybeSingle();
    
    if (error || !couple) {
        alert('邀请码无效，请确认');
        return;
    }
    
    // 将当前用户关联到此情侣组
    const { error: linkError } = await supabaseClient
        .from('user_couples')
        .insert([{ user_id: currentUser.id, couple_id: couple.id }]);
    
    if (linkError) {
        // 可能已经加入过了
        if (linkError.message.includes('duplicate key')) {
            alert('你已加入此情侣组');
        } else {
            alert('加入失败：' + linkError.message);
        }
        return;
    }
    
    currentCoupleId = couple.id;
    alert('✅ 成功加入情侣组！');
    await loadCoupleInfo();
}

// ====================  显示主应用 ====================
function showApp() {
    // 隐藏登录卡片，显示主内容
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    // 初始化纪念日（请修改为你们的实际日期）
    window.START_DATE = new Date('2024-01-01');
    updateDaysTogether();
    
    // 加载记录并绑定表单提交
    loadEntries();
    updateStats();
    document.getElementById('entry-form').addEventListener('submit', addEntry);
}

// ====================  记录操作（Supabase 版） ====================
async function addEntry(e) {
    e.preventDefault();
    
    if (!currentCoupleId) {
        alert('请先创建或加入情侣组');
        return;
    }
    
    const type = document.getElementById('entry-type').value;
    const title = document.getElementById('entry-title').value;
    const content = document.getElementById('entry-content').value;
    const lesson = document.getElementById('entry-lesson').value;
    const record_date = new Date().toISOString().split('T')[0];
    
    if (!type || !title || !content || !lesson) {
        alert('请填写所有字段！');
        return;
    }
    
    const { error } = await supabaseClient
        .from('records')
        .insert([{
            user_id: currentUser.id,
            couple_id: currentCoupleId,
            type: type,
            title: title,
            content: content,
            lesson: lesson,
            record_date: record_date
        }]);
    
    if (error) {
        console.error(error);
        alert('保存失败：' + error.message);
        return;
    }
    
    // 重新加载记录和统计
    await loadEntries();
    await updateStats();
    
    // 清空表单
    document.getElementById('entry-form').reset();
    alert('✨ 记录已同步到云端！');
}

async function loadEntries() {
    if (!currentCoupleId) return;
    
    const { data: entries, error } = await supabaseClient
        .from('records')
        .select('*')
        .eq('couple_id', currentCoupleId)
        .order('record_date', { ascending: false });
    
    if (error) {
        console.error('加载记录失败', error);
        return;
    }
    
    const entriesContainer = document.getElementById('entries');
    const emptyState = document.getElementById('empty-state');
    
    entriesContainer.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        entriesContainer.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    entries.forEach(entry => {
        const entryEl = document.createElement('div');
        entryEl.className = `entry ${entry.type}`;
        entryEl.innerHTML = `
            <div class="entry-header">
                <span class="entry-type type-${entry.type}">
                    ${entry.type === 'conflict' ? '矛盾解决' : '美好瞬间'}
                </span>
                <span class="entry-date">${formatDate(entry.record_date)}</span>
            </div>
            <h3 class="entry-title">${escapeHTML(entry.title)}</h3>
            <div class="entry-content">${escapeHTML(entry.content)}</div>
            <div class="entry-lesson">
                <strong>我们的成长：</strong> ${escapeHTML(entry.lesson)}
            </div>
        `;
        entriesContainer.appendChild(entryEl);
    });
}

async function updateStats() {
    if (!currentCoupleId) return;
    
    const { data: entries, error } = await supabaseClient
        .from('records')
        .select('type')
        .eq('couple_id', currentCoupleId);
    
    if (error) {
        console.error('更新统计失败', error);
        return;
    }
    
    const total = entries?.length || 0;
    const conflicts = entries?.filter(e => e.type === 'conflict').length || 0;
    const joys = entries?.filter(e => e.type === 'joy').length || 0;
    
    document.getElementById('total-entries').textContent = total;
    document.getElementById('conflict-entries').textContent = conflicts;
    document.getElementById('joy-entries').textContent = joys;
}

// ====================  辅助函数 ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"]/g, function(c) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[c] || c;
    });
}

function updateDaysTogether() {
    const today = new Date();
    const diffTime = today - window.START_DATE;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('days-together').textContent = diffDays || 0;
}

// ====================  检查当前登录状态 ====================
async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    if (user) {
        await loadCoupleInfo();
    }
}