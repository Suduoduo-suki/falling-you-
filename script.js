// ==================== Supabase 配置 ====================
const SUPABASE_URL = 'https://eouvjxrrmqlaufdmfycl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdXZqeHJybXFsYXVmZG1meWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3OTE3OTcsImV4cCI6MjA4NjM2Nzc5N30.NkTIY33ps8_8-V8CYHHTN5txC6mrwpwQ25UKfucsYYc';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== 全局变量 ====================
let currentUser = null;
let currentCoupleId = null;
let currentStartDate = null;

// ==================== 页面加载 ====================
document.addEventListener('DOMContentLoaded', async function() {
    await checkUser();
    
    document.getElementById('login-btn').addEventListener('click', handleAuth);
    document.getElementById('create-couple-btn').addEventListener('click', createCouple);
    document.getElementById('join-couple-btn').addEventListener('click', joinCouple);
    
    if (currentUser) {
        showApp();
    }
});

// ==================== 用户认证 ====================
async function handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || password.length < 6) {
        alert('邮箱和密码（至少6位）不能为空');
        return;
    }
    
    let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        if (error.message.includes('Invalid login credentials')) {
            const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
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
    
    await loadCoupleInfo();
    showApp();
}

// ==================== 情侣组管理 ====================
async function loadCoupleInfo() {
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
        const { data: couple } = await supabaseClient
            .from('couples')
            .select('*')
            .eq('id', currentCoupleId)
            .single();
        
        currentStartDate = couple?.start_date;
        
        document.getElementById('couple-status').innerHTML = `
            <p style="color: var(--success); font-weight: bold;">
                ✅ 已加入情侣组：${couple?.couple_name || '未命名'} <br>
                邀请码：<span style="background: #f0f0f0; padding: 5px 10px; border-radius: 8px;">${couple?.invite_code}</span>
            </p>
        `;
        document.getElementById('invite-box').style.display = 'block';
    } else {
        currentCoupleId = null;
        currentStartDate = null;
        document.getElementById('couple-status').innerHTML = `
            <p style="color: #888;">你还没有加入情侣组，请创建或输入邀请码。</p>
        `;
        document.getElementById('invite-box').style.display = 'block';
    }
}

async function createCouple() {
    if (!currentUser) return;
    
    const coupleName = prompt('为你们的情侣组起个名字（例如：多多和杉杉）', '我们的情侣组');
    if (!coupleName) return;
    
    const startDateInput = prompt('请输入你们在一起的第一天（格式：YYYY-MM-DD，例如 2024-01-01）', '2024-01-01');
    if (!startDateInput) return;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateInput)) {
        alert('日期格式不正确，请使用 YYYY-MM-DD 格式');
        return;
    }
    
    const { data: newCouple, error } = await supabaseClient
        .from('couples')
        .insert([{ 
            couple_name: coupleName,
            start_date: startDateInput
        }])
        .select()
        .single();
    
    if (error) {
        alert('创建失败：' + error.message);
        return;
    }
    
    const { error: linkError } = await supabaseClient
        .from('user_couples')
        .insert([{ user_id: currentUser.id, couple_id: newCouple.id }]);
    
    if (linkError) {
        alert('关联情侣组失败：' + linkError.message);
        return;
    }
    
    currentCoupleId = newCouple.id;
    currentStartDate = newCouple.start_date;
    alert(`🎉 情侣组创建成功！\n邀请码：${newCouple.invite_code}\n快分享给另一半吧！`);
    await loadCoupleInfo();
    updateDaysTogether();
}

async function joinCouple() {
    const inviteCode = document.getElementById('invite-code-input').value.trim();
    if (!inviteCode) {
        alert('请输入邀请码');
        return;
    }
    
    const { data: couple, error } = await supabaseClient
        .from('couples')
        .select('id, start_date')
        .eq('invite_code', inviteCode)
        .maybeSingle();
    
    if (error || !couple) {
        alert('邀请码无效，请确认');
        return;
    }
    
    const { error: linkError } = await supabaseClient
        .from('user_couples')
        .insert([{ user_id: currentUser.id, couple_id: couple.id }]);
    
    if (linkError) {
        if (linkError.message.includes('duplicate key')) {
            alert('你已加入此情侣组');
        } else {
            alert('加入失败：' + linkError.message);
        }
        return;
    }
    
    currentCoupleId = couple.id;
    currentStartDate = couple.start_date;
    alert('✅ 成功加入情侣组！');
    await loadCoupleInfo();
    updateDaysTogether();
}

// ==================== 显示主应用 ====================
function showApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    const form = document.getElementById('entry-form');
    form.removeEventListener('submit', addEntry);
    form.addEventListener('submit', addEntry);
    
    loadEntries();
    updateStats();
    updateDaysTogether();
}

// ==================== 记录操作 ====================
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
            type, title, content, lesson, record_date
        }]);
    
    if (error) {
        console.error(error);
        alert('保存失败：' + error.message);
        return;
    }
    
    await loadEntries();
    await updateStats();
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
    
    const container = document.getElementById('entries');
    const emptyState = document.getElementById('empty-state');
    container.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        container.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    entries.forEach(entry => {
        const el = document.createElement('div');
        el.className = `entry ${entry.type}`;
        el.innerHTML = `
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
        container.appendChild(el);
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

function formatDate(dateString) {
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年${m}月${day}日`;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c] || c);
}

function updateDaysTogether() {
    if (!currentStartDate) {
        document.getElementById('days-together').textContent = '0';
        return;
    }
    const start = new Date(currentStartDate);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = today - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('days-together').textContent = diffDays > 0 ? diffDays : 0;
}

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    currentUser = user;
    if (user) {
        await loadCoupleInfo();
    }
}