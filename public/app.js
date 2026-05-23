// ============================================================
// API
// ============================================================
const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('quizSystemToken');

const api = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        };
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Ошибка запроса');
        }
        return response.json();
    },
    get(ep)        { return this.request(ep); },
    post(ep, d)    { return this.request(ep, { method: 'POST',   body: JSON.stringify(d) }); },
    put(ep, d)     { return this.request(ep, { method: 'PUT',    body: JSON.stringify(d) }); },
    delete(ep)     { return this.request(ep, { method: 'DELETE' }); }
};

// ============================================================
// Store
// ============================================================
const store = {
    currentTest: null, userAnswers: {}, testResults: [],
    currentUser: null, fullName: null, isAdmin: false,
    animationId: null, timeLeft: 0,

    init() { this.loadFromLocalStorage(); },

    save() {
        try {
            localStorage.setItem('quizSystemResults', JSON.stringify(this.testResults));
            if (this.currentUser)
                localStorage.setItem('quizSystemAuth', JSON.stringify({
                    user: this.currentUser, fullName: this.fullName,
                    isAdmin: this.isAdmin, expires: Date.now() + 8 * 3600 * 1000
                }));
        } catch(e) { console.error(e); }
    },

    loadFromLocalStorage() {
        try {
            authToken = localStorage.getItem('quizSystemToken');
            const res = localStorage.getItem('quizSystemResults');
            if (res) this.testResults = JSON.parse(res);
            const auth = localStorage.getItem('quizSystemAuth');
            if (auth) {
                const d = JSON.parse(auth);
                if (d.expires > Date.now()) {
                    this.currentUser = d.user; this.fullName = d.fullName; this.isAdmin = d.isAdmin;
                } else this.clearAuth();
            }
        } catch(e) { console.error(e); }
    },

    clearAuth() {
        ['quizSystemAuth','quizSystemToken'].forEach(k => localStorage.removeItem(k));
        authToken = null; this.currentUser = null; this.fullName = null; this.isAdmin = false;
    },

    addResult(r) { this.testResults.push(r); this.save(); },
    getUserResults(u) { return this.testResults.filter(r => r.userName === u); }
};

// ============================================================
// DOM refs
// ============================================================
const el = {
    loginContainer: document.getElementById('loginContainer'),
    tabLogin:        document.getElementById('tabLogin'),
    tabRegister:     document.getElementById('tabRegister'),
    loginForm:       document.getElementById('loginForm'),
    loginEmail:      document.getElementById('loginEmail'),
    loginPassword:   document.getElementById('loginPassword'),
    loginError:      document.getElementById('loginError'),
    registerForm:    document.getElementById('registerForm'),
    regName:         document.getElementById('regName'),
    regEmail:        document.getElementById('regEmail'),
    regPassword:     document.getElementById('regPassword'),
    regPasswordConfirm: document.getElementById('regPasswordConfirm'),
    registerError:   document.getElementById('registerError'),
    toggleAdminLogin: document.getElementById('toggleAdminLogin'),
    adminLoginForm:  document.getElementById('adminLoginForm'),
    adminUsername:   document.getElementById('adminUsername'),
    adminPassword:   document.getElementById('adminPassword'),
    adminError:      document.getElementById('adminError'),

    appContainer:    document.getElementById('appContainer'),
    userGreeting:    document.getElementById('userGreeting'),
    logoutBtn:       document.getElementById('logoutBtn'),
    mainScreen:      document.getElementById('mainScreen'),
    testList:        document.getElementById('testList'),
    startTestBtn:    document.getElementById('startTest'),
    adminPanelBtn:   document.getElementById('adminPanelBtn'),

    testContainer:   document.getElementById('testContainer'),
    timeLeftDisplay: document.getElementById('timeLeft'),
    progressBar:     document.getElementById('progressBar'),
    testTitle:       document.getElementById('testTitle'),
    questionsContainer: document.getElementById('questionsContainer'),
    submitTestBtn:   document.getElementById('submitTest'),
    backBtn:         document.getElementById('backBtn'),

    resultsContainer: document.getElementById('resultsContainer'),
    resultsDiv:       document.getElementById('results'),
    saveResultsBtn:   document.getElementById('saveResults'),
    newTestBtn:       document.getElementById('newTest'),

    adminPanel:       document.getElementById('adminPanel'),
    showAddTestBtn:   document.getElementById('showAddTest'),
    showTestListBtn:  document.getElementById('showTestList'),
    exportAllResults: document.getElementById('exportAllResults'),
    exportAllTests:   document.getElementById('exportAllTests'),
    backToMainBtn:    document.getElementById('backToMain'),
    addTestForm:      document.getElementById('addTestForm'),
    editorTitle:      document.getElementById('editorTitle'),
    editingTestId:    document.getElementById('editingTestId'),
    testTitleInput:   document.getElementById('testTitleInput'),
    testTimeLimit:    document.getElementById('testTimeLimit'),
    questionsEditor:  document.getElementById('questionsEditor'),
    addQuestionBtn:   document.getElementById('addQuestionBtn'),
    testFile:         document.getElementById('testFile'),
    loadFromFile:     document.getElementById('loadFromFile'),
    uploadTestBtn:    document.getElementById('uploadTest'),
    cancelEdit:       document.getElementById('cancelEdit'),
    adminTestList:    document.getElementById('adminTestList'),
    testsContainer:   document.getElementById('testsContainer'),
};

// ============================================================
// Init
// ============================================================
function init() {
    store.init();
    if (store.currentUser && authToken) showApp();
    setupEventListeners();
}

function setupEventListeners() {
    el.tabLogin.addEventListener('click',    () => switchTab('login'));
    el.tabRegister.addEventListener('click', () => switchTab('register'));
    el.loginForm.addEventListener('submit',      handleLogin);
    el.registerForm.addEventListener('submit',   handleRegister);
    el.adminLoginForm.addEventListener('submit', handleAdminLogin);
    el.toggleAdminLogin.addEventListener('click', () => {
        el.adminLoginForm.classList.toggle('hidden');
        el.toggleAdminLogin.textContent = el.adminLoginForm.classList.contains('hidden')
            ? 'Вход для администратора' : 'Скрыть';
    });
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const inp = document.getElementById(btn.dataset.target);
            inp.type = inp.type === 'password' ? 'text' : 'password';
            btn.textContent = inp.type === 'password' ? '👁' : '🙈';
        });
    });
    el.regPassword.addEventListener('input', updatePasswordStrength);

    el.logoutBtn.addEventListener('click',     handleLogout);
    el.startTestBtn.addEventListener('click',  startTest);
    el.adminPanelBtn.addEventListener('click', showAdminPanel);
    el.backBtn.addEventListener('click',       backToMain);
    el.backToMainBtn.addEventListener('click', backToMain);
    el.newTestBtn.addEventListener('click',    backToMain);
    el.submitTestBtn.addEventListener('click', submitTest);
    el.saveResultsBtn.addEventListener('click', exportMyResultsToExcel);

    el.showAddTestBtn.addEventListener('click',   () => openEditor(null));
    el.showTestListBtn.addEventListener('click',  showAdminTestList);
    el.exportAllResults.addEventListener('click', exportAllResultsToExcel);
    el.exportAllTests.addEventListener('click',   exportTestsToExcel);
    el.addQuestionBtn.addEventListener('click',   addQuestionBlock);
    el.loadFromFile.addEventListener('click',     loadTestFromFile);
    el.uploadTestBtn.addEventListener('click',    saveTest);
    el.cancelEdit.addEventListener('click',       showAdminTestList);
}

// ============================================================
// Auth helpers
// ============================================================
function switchTab(tab) {
    const isLogin = tab === 'login';
    el.tabLogin.classList.toggle('active', isLogin);
    el.tabRegister.classList.toggle('active', !isLogin);
    el.loginForm.classList.toggle('hidden', !isLogin);
    el.registerForm.classList.toggle('hidden', isLogin);
    clearErrors();
}
function clearErrors() {
    [el.loginError, el.registerError, el.adminError].forEach(e => { e.textContent=''; e.classList.add('hidden'); });
}
function showError(elem, msg) { elem.textContent = msg; elem.classList.remove('hidden'); }

function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? null : 'Введите корректный email'; }
function validatePassword(p) { return p.length >= 6 ? null : 'Пароль: минимум 6 символов'; }

function updatePasswordStrength() {
    const val = el.regPassword.value;
    let wrap = document.getElementById('strengthWrap');
    if (!wrap) {
        wrap = document.createElement('div'); wrap.id = 'strengthWrap';
        wrap.innerHTML = `<div class="password-strength"><div class="password-strength-bar" id="strengthBar"></div></div>
                          <div class="password-strength-label" id="strengthLabel"></div>`;
        el.regPassword.closest('.form-group').appendChild(wrap);
    }
    const bar = document.getElementById('strengthBar');
    const lbl = document.getElementById('strengthLabel');
    if (!val) { bar.className='password-strength-bar'; lbl.textContent=''; return; }
    let s=0;
    if(val.length>=6)s++; if(val.length>=10)s++;
    if(/[A-ZА-Я]/.test(val))s++; if(/[0-9]/.test(val))s++; if(/[^a-zA-Zа-яА-Я0-9]/.test(val))s++;
    const lvls=[{max:2,cls:'strength-weak',txt:'Слабый',color:'var(--danger)'},
                {max:3,cls:'strength-medium',txt:'Средний',color:'var(--warning)'},
                {max:5,cls:'strength-strong',txt:'Надёжный',color:'var(--accent)'}];
    const lvl=lvls.find(l=>s<=l.max);
    bar.className=`password-strength-bar ${lvl.cls}`; lbl.textContent=lvl.txt; lbl.style.color=lvl.color;
}

// ============================================================
// Login / Register / Logout
// ============================================================
async function handleLogin(e) {
    e.preventDefault(); clearErrors();
    const email=el.loginEmail.value.trim(), password=el.loginPassword.value;
    const err=validateEmail(email); if(err) return showError(el.loginError,err);
    if(!password) return showError(el.loginError,'Введите пароль');
    try { applySession(await api.post('/auth/login',{email,password})); showApp(); }
    catch(err) { showError(el.loginError, err.message); }
}

async function handleRegister(e) {
    e.preventDefault(); clearErrors();
    const fullName=el.regName.value.trim(), email=el.regEmail.value.trim(),
          password=el.regPassword.value, confirm=el.regPasswordConfirm.value;
    if(!fullName||fullName.length<2) return showError(el.registerError,'Введите полное имя (мин. 2 символа)');
    const emailErr=validateEmail(email); if(emailErr) return showError(el.registerError,emailErr);
    const pwErr=validatePassword(password); if(pwErr) return showError(el.registerError,pwErr);
    if(password!==confirm) return showError(el.registerError,'Пароли не совпадают');
    try {
        await api.post('/auth/register',{fullName,email,password});
        applySession(await api.post('/auth/login',{email,password}));
        showApp();
    } catch(err) { showError(el.registerError, err.message); }
}

async function handleAdminLogin(e) {
    e.preventDefault(); clearErrors();
    const username=el.adminUsername.value.trim(), password=el.adminPassword.value;
    if(!username) return showError(el.adminError,'Введите имя пользователя');
    if(!password) return showError(el.adminError,'Введите пароль');
    try {
        const data=await api.post('/auth/login',{username,password});
        if(!data.user.isAdmin) return showError(el.adminError,'Нет прав администратора');
        applySession(data); showApp();
    } catch(err) { showError(el.adminError, err.message); }
}

function applySession(data) {
    authToken=data.token; localStorage.setItem('quizSystemToken',authToken);
    store.currentUser=data.user.email||data.user.username;
    store.fullName=data.user.fullName||data.user.username;
    store.isAdmin=data.user.isAdmin; store.save();
}

function handleLogout() {
    store.clearAuth();
    el.appContainer.classList.add('hidden'); el.loginContainer.classList.remove('hidden');
    el.loginEmail.value=''; el.loginPassword.value=''; switchTab('login');
}

function showApp() {
    el.loginContainer.classList.add('hidden'); el.appContainer.classList.remove('hidden');
    el.userGreeting.textContent=`Добро пожаловать, ${store.fullName||store.currentUser}${store.isAdmin?' (администратор)':''}`;
    el.adminPanelBtn.classList.toggle('hidden',!store.isAdmin);
    renderTestList();
}

// ============================================================
// Test list (user view)
// ============================================================
async function renderTestList() {
    el.testList.innerHTML='<p class="text-muted">Загрузка...</p>';
    try {
        const tests=await api.get('/tests');
        if(!tests.length) { el.testList.innerHTML='<p class="text-muted">Нет доступных тестов.</p>'; el.startTestBtn.disabled=true; return; }
        el.startTestBtn.disabled=false;
        el.testList.innerHTML='';
        tests.forEach(t=>{
            const item=document.createElement('div'); item.className='test-list-item';
            item.innerHTML=`<span class="test-list-item-title">${escapeHtml(t.title)}</span>
                            <span class="test-list-item-meta">⏱ ${t.time_limit} мин</span>`;
            item.addEventListener('click',()=>startSpecificTest(t.id));
            el.testList.appendChild(item);
        });
    } catch { el.testList.innerHTML='<p class="text-muted">Ошибка загрузки тестов.</p>'; el.startTestBtn.disabled=true; }
}

// ============================================================
// Running a test
// ============================================================
async function startSpecificTest(testId) {
    try {
        const test=await api.get(`/tests/${testId}`);
        store.currentTest={id:test.id,title:test.title,timeLimit:test.time_limit,questions:test.questions};
        store.userAnswers={};
        startTimer(store.currentTest.timeLimit||10);
        displayTest();
    } catch { alert('Ошибка загрузки теста'); }
}

async function startTest() {
    try {
        const tests=await api.get('/tests');
        if(!tests.length){alert('Нет доступных тестов');return;}
        await startSpecificTest(tests[Math.floor(Math.random()*tests.length)].id);
    } catch { alert('Ошибка при запуске теста'); }
}

function displayTest() {
    el.testTitle.textContent=store.currentTest.title;
    el.questionsContainer.innerHTML='';
    store.currentTest.questions.forEach((q,i)=>{
        const qDiv=document.createElement('div'); qDiv.className='question';
        qDiv.innerHTML=`<h3>Вопрос ${i+1}: ${escapeHtml(q.text)}</h3><div class="options" id="opts_${i}"></div>`;
        el.questionsContainer.appendChild(qDiv);
        const optsDiv=qDiv.querySelector(`#opts_${i}`);
        q.options.forEach((opt,oi)=>{
            const wrap=document.createElement('div'); wrap.className='option';
            const radio=document.createElement('input'); radio.type='radio'; radio.name=`q${i}`; radio.id=`q${i}o${oi}`; radio.value=oi;
            radio.addEventListener('change',()=>{store.userAnswers[i]=parseInt(oi);});
            const lbl=document.createElement('label'); lbl.htmlFor=radio.id; lbl.textContent=escapeHtml(opt); lbl.style.marginLeft='8px';
            wrap.appendChild(radio); wrap.appendChild(lbl); optsDiv.appendChild(wrap);
        });
    });
    el.mainScreen.classList.add('hidden'); el.testContainer.classList.remove('hidden');
}

// ── Timer ──
function startTimer(minutes) {
    stopTimer();
    const total=minutes*60; store.timeLeft=total; let last=Date.now();
    el.progressBar.style.transform='scaleX(1)'; el.progressBar.className='progress-bar';
    function update(){
        const now=Date.now(); store.timeLeft=Math.max(0,store.timeLeft-(now-last)/1000); last=now;
        const p=store.timeLeft/total;
        el.progressBar.style.transform=`scaleX(${p})`; updateTimerDisplay();
        if(p<0.3)el.progressBar.classList.add('progress-warning');
        if(p<0.15)el.progressBar.classList.add('progress-danger');
        if(store.timeLeft>0){store.animationId=requestAnimationFrame(update);}
        else{stopTimer();alert('Время вышло!');submitTest();}
    }
    store.animationId=requestAnimationFrame(update);
}
function stopTimer(){if(store.animationId){cancelAnimationFrame(store.animationId);store.animationId=null;}}
function updateTimerDisplay(){
    const m=Math.floor(store.timeLeft/60),s=Math.floor(store.timeLeft%60);
    el.timeLeftDisplay.textContent=`${m}:${s<10?'0':''}${s}`;
    el.timeLeftDisplay.className='timer';
    if(store.timeLeft<60)el.timeLeftDisplay.classList.add('timer-danger');
    else if(store.timeLeft<120)el.timeLeftDisplay.classList.add('timer-warning');
}

// ── Submit ──
async function submitTest(){
    stopTimer();
    const total=store.currentTest.questions.length, answered=Object.keys(store.userAnswers).length;
    if(answered<total&&!confirm(`Отвечено ${answered} из ${total}. Завершить?`)){startTimer(Math.ceil(store.timeLeft/60));return;}
    let correct=0;
    store.currentTest.questions.forEach((q,i)=>{if(store.userAnswers[i]===q.correct)correct++;});
    const score=Math.round(correct/total*100);
    const localResult={testName:store.currentTest.title,userName:store.currentUser,
        date:new Date().toLocaleString(),score,correct,total,answers:{...store.userAnswers}};
    try{
        const saved=await api.post('/results',{testId:store.currentTest.id,score,correct,total,answers:store.userAnswers});
        if(saved.completedAt)localResult.date=new Date(saved.completedAt).toLocaleString();
    }catch{console.warn('Результат не сохранён на сервере');}
    store.addResult(localResult); showResults(localResult);
}

function showResults(result){
    el.testContainer.classList.add('hidden'); el.resultsContainer.classList.remove('hidden');
    const pct=result.score;
    const badgeClass=pct>=70?'score-pass':'score-fail';
    el.resultsDiv.innerHTML=`
        <div class="result-item">
            <p><strong>Тест:</strong> ${escapeHtml(result.testName)}</p>
            <div><span class="score-badge ${badgeClass}">${pct}%</span>
                 <span class="text-muted"> (${result.correct} из ${result.total} верно)</span></div>
            <p><strong>Дата:</strong> ${escapeHtml(result.date)}</p>
        </div>
        <h3>Детализация:</h3>`;
    store.currentTest.questions.forEach((q,i)=>{
        const ok=store.userAnswers[i]===q.correct;
        const ua=store.userAnswers[i]!==undefined?escapeHtml(q.options[store.userAnswers[i]]):'Нет ответа';
        const div=document.createElement('div'); div.className=`result-item ${ok?'result-correct':'result-incorrect'}`;
        div.innerHTML=`<p><strong>Вопрос ${i+1}:</strong> ${escapeHtml(q.text)}</p>
                       <p><strong>Ваш ответ:</strong> ${ua} ${ok?'✓':'✗'}</p>
                       ${!ok?`<p><strong>Правильный:</strong> ${escapeHtml(q.options[q.correct])}</p>`:''}`;
        el.resultsDiv.appendChild(div);
    });
}

// ============================================================
// ADMIN PANEL
// ============================================================
function showAdminPanel(){el.mainScreen.classList.add('hidden');el.adminPanel.classList.remove('hidden');showAdminTestList();}

// ── Admin test list ──
async function showAdminTestList(){
    el.addTestForm.classList.add('hidden'); el.adminTestList.classList.remove('hidden');
    el.testsContainer.innerHTML='<p class="text-muted">Загрузка...</p>';
    try{
        const tests=await api.get('/tests');
        el.testsContainer.innerHTML='';
        if(!tests.length){el.testsContainer.innerHTML='<p class="text-muted">Тестов нет. Создайте первый!</p>';return;}
        tests.forEach(t=>{
            const div=document.createElement('div'); div.className='test-admin-item';
            div.innerHTML=`
                <div class="test-admin-info">
                    <h4>${escapeHtml(t.title)}</h4>
                    <p>⏱ ${t.time_limit} мин</p>
                </div>
                <div class="test-admin-actions">
                    <button class="btn btn-secondary btn-sm edit-test" data-id="${t.id}">✏️ Редактировать</button>
                    <button class="btn btn-secondary btn-sm export-test" data-id="${t.id}" data-title="${escapeHtml(t.title)}">📥 Excel</button>
                    <button class="btn btn-danger btn-sm delete-test" data-id="${t.id}" data-title="${escapeHtml(t.title)}">🗑 Удалить</button>
                </div>`;
            el.testsContainer.appendChild(div);
        });
        el.testsContainer.querySelectorAll('.edit-test').forEach(btn=>
            btn.addEventListener('click',()=>openEditor(btn.dataset.id)));
        el.testsContainer.querySelectorAll('.export-test').forEach(btn=>
            btn.addEventListener('click',()=>exportSingleTestToExcel(btn.dataset.id,btn.dataset.title)));
        el.testsContainer.querySelectorAll('.delete-test').forEach(btn=>
            btn.addEventListener('click',async()=>{
                if(!confirm(`Удалить тест "${btn.dataset.title}"?`))return;
                try{await api.delete(`/tests/${btn.dataset.id}`);showAdminTestList();}
                catch(e){alert(`Ошибка: ${e.message}`);}
            }));
    }catch(err){el.testsContainer.innerHTML=`<p>Ошибка: ${err.message}</p>`;}
}

// ============================================================
// INTERACTIVE TEST EDITOR
// ============================================================
let editorQuestions = []; // [{text, options:[], correct}]

async function openEditor(testId) {
    el.adminTestList.classList.add('hidden');
    el.addTestForm.classList.remove('hidden');
    editorQuestions = [];
    el.questionsEditor.innerHTML = '';
    el.editingTestId.value = '';
    el.testTitleInput.value = '';
    el.testTimeLimit.value  = '10';

    if (testId) {
        el.editorTitle.textContent = 'Редактирование теста';
        el.editingTestId.value = testId;
        try {
            const test = await api.get(`/tests/${testId}`);
            el.testTitleInput.value = test.title;
            el.testTimeLimit.value  = test.time_limit;
            test.questions.forEach(q => addQuestionBlock(q));
        } catch(e) { alert('Ошибка загрузки теста: ' + e.message); return; }
    } else {
        el.editorTitle.textContent = 'Новый тест';
        addQuestionBlock(); // первый пустой вопрос
    }
}

function addQuestionBlock(data = null) {
    const idx = el.questionsEditor.children.length;
    const q = data || { text: '', options: ['', '', '', ''], correct: 0 };

    const block = document.createElement('div');
    block.className = 'question-editor';
    block.dataset.idx = idx;

    block.innerHTML = `
        <div class="question-editor-header">
            <h4>Вопрос ${idx + 1}</h4>
            <button class="btn btn-danger btn-sm remove-question">✕ Удалить</button>
        </div>
        <div class="form-group">
            <label>Текст вопроса:</label>
            <textarea class="q-text" rows="2" placeholder="Введите вопрос...">${escapeHtml(q.text)}</textarea>
        </div>
        <div class="options-editor">
            <label>Варианты ответов <span class="text-muted">(отметьте правильный)</span>:</label>
            <div class="options-list"></div>
        </div>
        <button class="btn btn-outline btn-sm add-option mt-2">＋ Добавить вариант</button>
    `;

    block.querySelector('.remove-question').addEventListener('click', () => {
        block.remove();
        renumberQuestions();
    });

    block.querySelector('.add-option').addEventListener('click', () => {
        addOptionRow(block.querySelector('.options-list'), block, null, false);
    });

    el.questionsEditor.appendChild(block);

    // Добавляем варианты
    const optsList = block.querySelector('.options-list');
    q.options.forEach((opt, oi) => {
        addOptionRow(optsList, block, opt, oi === q.correct);
    });
}

function addOptionRow(container, questionBlock, value = '', isCorrect = false) {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
        <input type="radio" name="correct_${Date.now()}_${Math.random()}" title="Правильный ответ" ${isCorrect ? 'checked' : ''}>
        <span class="option-correct-label">✓</span>
        <input type="text" class="opt-text" placeholder="Вариант ответа" value="${escapeHtml(value||'')}">
        <button class="btn btn-danger btn-sm remove-option">✕</button>
    `;

    // Радиокнопки в рамках одного вопроса должны иметь одно имя
    const radio = row.querySelector('input[type="radio"]');
    const qIdx  = Array.from(el.questionsEditor.children).indexOf(questionBlock);
    radio.name  = `correct_q${qIdx}`;

    radio.addEventListener('change', () => {
        // Снять выбор со всех в этом вопросе
        container.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        radio.checked = true;
    });

    row.querySelector('.remove-option').addEventListener('click', () => {
        if (container.children.length <= 2) { alert('Минимум 2 варианта ответа'); return; }
        row.remove();
    });

    container.appendChild(row);
}

function renumberQuestions() {
    Array.from(el.questionsEditor.children).forEach((block, i) => {
        block.querySelector('h4').textContent = `Вопрос ${i + 1}`;
        // Обновить name у radio
        block.querySelectorAll('input[type="radio"]').forEach(r => { r.name = `correct_q${i}`; });
    });
}

function collectEditorData() {
    const questions = [];
    let error = null;

    Array.from(el.questionsEditor.children).forEach((block, qi) => {
        if (error) return;
        const text = block.querySelector('.q-text').value.trim();
        if (!text) { error = `Вопрос ${qi+1}: введите текст вопроса`; return; }

        const optRows = Array.from(block.querySelectorAll('.options-list .option-row'));
        if (optRows.length < 2) { error = `Вопрос ${qi+1}: нужно минимум 2 варианта`; return; }

        const options = [];
        let correct = -1;

        optRows.forEach((row, oi) => {
            const txt = row.querySelector('.opt-text').value.trim();
            if (!txt) { error = `Вопрос ${qi+1}, вариант ${oi+1}: введите текст`; return; }
            options.push(txt);
            if (row.querySelector('input[type="radio"]').checked) correct = oi;
        });

        if (correct === -1) { error = `Вопрос ${qi+1}: отметьте правильный ответ`; return; }
        questions.push({ text, options, correct });
    });

    return { questions, error };
}

async function saveTest() {
    const title     = el.testTitleInput.value.trim();
    const timeLimit = parseInt(el.testTimeLimit.value) || 10;
    const testId    = el.editingTestId.value;

    if (!title) { alert('Введите название теста'); return; }
    if (!el.questionsEditor.children.length) { alert('Добавьте хотя бы один вопрос'); return; }

    const { questions, error } = collectEditorData();
    if (error) { alert(error); return; }

    try {
        if (testId) {
            // Редактирование — PUT
            await api.put(`/tests/${testId}`, { title, timeLimit, questions });
            alert('Тест обновлён!');
        } else {
            // Создание — POST
            await api.post('/tests', { title, timeLimit, questions });
            alert('Тест создан!');
        }
        renderTestList();
        showAdminTestList();
    } catch(e) { alert(`Ошибка: ${e.message}`); }
}

// ============================================================
// Load from file (JSON or Excel)
// ============================================================
function loadTestFromFile() {
    const file = el.testFile.files[0];
    if (!file) { alert('Выберите файл'); return; }

    if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.title || !Array.isArray(data.questions)) throw new Error('Неверный формат');
                fillEditorFromData(data);
            } catch(err) { alert('Ошибка файла: ' + err.message); }
        };
        reader.readAsText(file);
    } else if (file.name.match(/\.xlsx?$/)) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const wb   = XLSX.read(e.target.result, { type: 'binary' });
                const ws   = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                const data = parseExcelTest(rows);
                fillEditorFromData(data);
            } catch(err) { alert('Ошибка Excel: ' + err.message); }
        };
        reader.readAsBinaryString(file);
    } else {
        alert('Поддерживаются файлы .json, .xlsx, .xls');
    }
}

function parseExcelTest(rows) {
    // Формат Excel:
    // Строка 1: Название | <название теста>
    // Строка 2: Время    | <минуты>
    // Строка 3: пустая
    // Строка 4+: Вопрос | Вариант1 | Вариант2 | Вариант3 | Вариант4 | НомерПравильного(1-based)
    if (!rows.length) throw new Error('Пустой файл');
    const title     = String(rows[0]?.[1] || 'Новый тест').trim();
    const timeLimit = parseInt(rows[1]?.[1]) || 10;
    const questions = [];

    for (let i = 3; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const text    = String(row[0]).trim();
        const options = [row[1],row[2],row[3],row[4]].map(v=>String(v||'').trim()).filter(Boolean);
        const correct = parseInt(row[5]) - 1; // 1-based → 0-based
        if (!text || options.length < 2 || isNaN(correct)) continue;
        questions.push({ text, options, correct: Math.max(0, Math.min(correct, options.length-1)) });
    }
    if (!questions.length) throw new Error('Не найдено ни одного вопроса. Проверьте формат файла.');
    return { title, timeLimit, questions };
}

function fillEditorFromData(data) {
    el.testTitleInput.value = data.title || '';
    el.testTimeLimit.value  = data.timeLimit || 10;
    el.questionsEditor.innerHTML = '';
    el.editingTestId.value  = ''; // новый тест из файла
    el.editorTitle.textContent = 'Новый тест (из файла)';
    data.questions.forEach(q => addQuestionBlock(q));
    el.adminTestList.classList.add('hidden');
    el.addTestForm.classList.remove('hidden');
    alert(`Загружено вопросов: ${data.questions.length}. Проверьте и сохраните тест.`);
}

// ============================================================
// EXCEL EXPORT
// ============================================================

// Экспорт результатов текущего пользователя
function exportMyResultsToExcel() {
    const results = store.getUserResults(store.currentUser);
    if (!results.length) { alert('Нет результатов для экспорта'); return; }

    const rows = [['Тест','Результат (%)','Верных','Всего вопросов','Дата']];
    results.forEach(r => {
        rows.push([r.testName, r.score, r.correct, r.total, r.date]);
    });

    downloadExcel(rows, `Результаты_${store.fullName||store.currentUser}_${today()}.xlsx`);
}

// Экспорт всех результатов (для администратора)
async function exportAllResultsToExcel() {
    try {
        const results = await api.get('/results/all');
        if (!results.length) { alert('Нет результатов для экспорта'); return; }

        const rows = [['ФИО','Email','Тест','Результат (%)','Верных','Всего вопросов','Дата']];
        results.forEach(r => {
            rows.push([
                r.full_name||'', r.email||'',
                r.test_title, r.score, r.correct_answers, r.total_questions,
                new Date(r.completed_at).toLocaleString()
            ]);
        });

        downloadExcel(rows, `Все_результаты_${today()}.xlsx`);
    } catch(e) { alert('Ошибка экспорта: ' + e.message); }
}

// Экспорт всех тестов
async function exportTestsToExcel() {
    try {
        const tests = await api.get('/tests');
        if (!tests.length) { alert('Нет тестов для экспорта'); return; }

        const wb = XLSX.utils.book_new();

        for (const t of tests) {
            const full = await api.get(`/tests/${t.id}`);
            const rows = [
                ['Название', full.title],
                ['Время (мин)', full.time_limit],
                [],
                ['Вопрос','Вариант 1','Вариант 2','Вариант 3','Вариант 4','Правильный (номер)']
            ];
            full.questions.forEach(q => {
                const opts = [...q.options];
                while (opts.length < 4) opts.push('');
                rows.push([q.text, opts[0], opts[1], opts[2], opts[3], q.correct + 1]);
            });
            const ws = XLSX.utils.aoa_to_sheet(rows);
            // Ширина колонок
            ws['!cols'] = [{wch:50},{wch:30},{wch:30},{wch:30},{wch:30},{wch:10}];
            const sheetName = full.title.substring(0, 31).replace(/[\\/?*[\]:]/g,'_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        XLSX.writeFile(wb, `Тесты_${today()}.xlsx`);
    } catch(e) { alert('Ошибка экспорта: ' + e.message); }
}

// Экспорт одного теста
async function exportSingleTestToExcel(testId, testTitle) {
    try {
        const test = await api.get(`/tests/${testId}`);
        const rows = [
            ['Название', test.title],
            ['Время (мин)', test.time_limit],
            [],
            ['Вопрос','Вариант 1','Вариант 2','Вариант 3','Вариант 4','Правильный (номер)']
        ];
        test.questions.forEach(q => {
            const opts=[...q.options]; while(opts.length<4)opts.push('');
            rows.push([q.text, opts[0], opts[1], opts[2], opts[3], q.correct+1]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:50},{wch:30},{wch:30},{wch:30},{wch:30},{wch:10}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Тест');
        XLSX.writeFile(wb, `${testTitle.substring(0,40)}_${today()}.xlsx`);
    } catch(e) { alert('Ошибка экспорта: ' + e.message); }
}

function downloadExcel(rows, filename) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map((_,i) => ({ wch: i === 0 ? 40 : 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Данные');
    XLSX.writeFile(wb, filename);
}

function today() { return new Date().toISOString().slice(0,10); }

// ============================================================
// Navigation
// ============================================================
function backToMain() {
    el.testContainer.classList.add('hidden'); el.resultsContainer.classList.add('hidden');
    el.adminPanel.classList.add('hidden'); el.mainScreen.classList.remove('hidden'); stopTimer();
}

// ============================================================
// Utils
// ============================================================
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

document.addEventListener('DOMContentLoaded', init);
