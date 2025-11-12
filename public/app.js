// Хранилище данных (работа с API)
const store = {
    currentTest: null,
    userAnswers: {},
    currentUser: null,
    isAdmin: false,
    timer: null,
    timeLeft: 0,
    animationId: null,
    
    // Инициализация хранилища
    init() {
        this.checkAuth();
    },
    
    // Проверка авторизации при загрузке
    checkAuth() {
        try {
            const auth = localStorage.getItem('quizSystemAuth');
            if (auth) {
                const { user, isAdmin, expires } = JSON.parse(auth);
                if (expires > Date.now()) {
                    this.currentUser = user;
                    this.isAdmin = isAdmin;
                    showApp(); // Показываем приложение если пользователь авторизован
                } else {
                    this.clearAuth(); // Очищаем если сессия истекла
                }
            }
        } catch (e) {
            console.error("Ошибка проверки авторизации:", e);
            this.clearAuth();
        }
    },
    
    // Очистка данных авторизации
    clearAuth() {
        localStorage.removeItem('quizSystemAuth');
        this.currentUser = null;
        this.isAdmin = false;
    },
    
    // Регистрация пользователя
    async registerUser(username, email, isAdmin = false) {
        try {
            const response = await fetch('https://backend-production-5f60.up.railway.app/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: username, 
                    email: email,
                    is_admin: isAdmin 
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка регистрации');
            }
            
            return await response.json();
        } catch (err) {
            console.error('Ошибка регистрации:', err);
            throw err;
        }
    },

    // Получение пользователя
    async getUser(username) {
        try {
            const response = await fetch(`https://backend-production-5f60.up.railway.app/api/users/${username}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (err) {
            console.error('Ошибка получения пользователя:', err);
            return null;
        }
    },

    // Добавление теста
    async addTest(test) {
        try {
            const response = await fetch('https://backend-production-5f60.up.railway.app/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка сохранения теста');
            }
            
            return await response.json();
        } catch (err) {
            console.error('Ошибка добавления теста:', err);
            throw err;
        }
    },

    // Получение всех тестов
    async getTests() {
        try {
            const response = await fetch('https://backend-production-5f60.up.railway.app/api/tests');
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (err) {
            console.error('Ошибка получения тестов:', err);
            return [];
        }
    },

    // Удаление теста
    async deleteTest(testId) {
        try {
            const response = await fetch(`https://backend-production-5f60.up.railway.app/api/tests/${testId}`, {
                method: 'DELETE'
            });
            
            return response.ok;
        } catch (err) {
            console.error('Ошибка удаления теста:', err);
            return false;
        }
    },

    // Добавление результата
    async addResult(result) {
        try {
            const response = await fetch('https://backend-production-5f60.up.railway.app/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка сохранения результата');
            }
            
            return await response.json();
        } catch (err) {
            console.error('Ошибка сохранения результата:', err);
            throw err;
        }
    },

    // Получение результатов пользователя
    async getUserResults(userId) {
        try {
            const response = await fetch(`https://backend-production-5f60.up.railway.app/api/results/user/${userId}`);
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (err) {
            console.error('Ошибка получения результатов:', err);
            return [];
        }
    }
};

// DOM элементы
const elements = {
    loginContainer: document.getElementById('loginContainer'),
    appContainer: document.getElementById('appContainer'),
    loginForm: document.getElementById('loginForm'),
    usernameInput: document.getElementById('username'),
    emailInput: document.getElementById('email'),
    passwordField: document.getElementById('passwordField'),
    passwordInput: document.getElementById('password'),
    userGreeting: document.getElementById('userGreeting'),
    logoutBtn: document.getElementById('logoutBtn'),
    testList: document.getElementById('testList'),
    startTestBtn: document.getElementById('startTest'),
    adminPanelBtn: document.getElementById('adminPanelBtn'),
    testContainer: document.getElementById('testContainer'),
    timeLeftDisplay: document.getElementById('timeLeft'),
    progressBar: document.getElementById('progressBar'),
    testTitle: document.getElementById('testTitle'),
    questionsContainer: document.getElementById('questionsContainer'),
    submitTestBtn: document.getElementById('submitTest'),
    backBtn: document.getElementById('backBtn'),
    resultsContainer: document.getElementById('resultsContainer'),
    resultsDiv: document.getElementById('results'),
    saveResultsBtn: document.getElementById('saveResults'),
    newTestBtn: document.getElementById('newTest'),
    adminPanel: document.getElementById('adminPanel'),
    showAddTestBtn: document.getElementById('showAddTest'),
    showTestListBtn: document.getElementById('showTestList'),
    backToMainBtn: document.getElementById('backToMain'),
    addTestForm: document.getElementById('addTestForm'),
    adminTestList: document.getElementById('adminTestList'),
    testTitleInput: document.getElementById('testTitleInput'),
    testTimeLimit: document.getElementById('testTimeLimit'),
    testJson: document.getElementById('testJson'),
    uploadTestBtn: document.getElementById('uploadTest'),
    testFile: document.getElementById('testFile'),
    loadFromFileBtn: document.getElementById('loadFromFile'),
    testsContainer: document.getElementById('testsContainer')
};

// Инициализация приложения
function init() {
    store.init();
    setupEventListeners();
}

// Показать основное приложение
function showApp() {
    elements.loginContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
    elements.userGreeting.textContent = `Добро пожаловать, ${store.currentUser.name}${store.isAdmin ? ' (администратор)' : ''}`;
    elements.adminPanelBtn.classList.toggle('hidden', !store.isAdmin);
    renderTestList();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Форма входа
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.usernameInput.addEventListener('input', () => {
        elements.passwordField.classList.toggle('hidden', 
            elements.usernameInput.value.toLowerCase() !== 'admin');
    });
    
    // Кнопки навигации
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.startTestBtn.addEventListener('click', startTest);
    elements.adminPanelBtn.addEventListener('click', showAdminPanel);
    elements.backBtn.addEventListener('click', backToMain);
    elements.backToMainBtn.addEventListener('click', backToMain);
    elements.newTestBtn.addEventListener('click', backToMain);
    
    // Админ-панель
    elements.showAddTestBtn.addEventListener('click', showAddTestForm);
    elements.showTestListBtn.addEventListener('click', showAdminTestList);
    elements.uploadTestBtn.addEventListener('click', uploadTest);
    elements.loadFromFileBtn.addEventListener('click', loadTestFromFile);
    
    // Тестирование
    elements.submitTestBtn.addEventListener('click', submitTest);
    elements.saveResultsBtn.addEventListener('click', saveResultsToFile);
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const username = elements.usernameInput.value.trim();
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    try {
        // Админский вход
        if (username.toLowerCase() === 'admin') {
            if (password === 'admin123') {
                let user = await store.getUser('admin');
                if (!user) {
                    user = await store.registerUser('admin', 'admin@example.com', true);
                }
                store.currentUser = user;
                store.isAdmin = true;
                
                // Сохраняем сессию
                const authData = {
                    user: user,
                    isAdmin: true,
                    expires: Date.now() + 8 * 60 * 60 * 1000
                };
                localStorage.setItem('quizSystemAuth', JSON.stringify(authData));
                
                showApp();
                return;
            }
            throw new Error('Неверный пароль администратора');
        }
        
        // Обычный пользователь
        if (username && email) {
            let user = await store.getUser(username);
            if (!user) {
                user = await store.registerUser(username, email, false);
            }
            store.currentUser = user;
            store.isAdmin = false;
            
            // Сохраняем сессию
            const authData = {
                user: user,
                isAdmin: false,
                expires: Date.now() + 8 * 60 * 60 * 1000
            };
            localStorage.setItem('quizSystemAuth', JSON.stringify(authData));
            
            showApp();
        } else {
            throw new Error('Введите имя и email');
        }
    } catch (err) {
        alert(err.message);
    }
}

// Обработка выхода
function handleLogout() {
    store.clearAuth();
    elements.appContainer.classList.add('hidden');
    elements.loginContainer.classList.remove('hidden');
    elements.usernameInput.value = '';
    elements.emailInput.value = '';
    elements.passwordInput.value = '';
}

// Отображение списка тестов
async function renderTestList() {
    elements.testList.innerHTML = '<p>Загрузка тестов...</p>';
    
    try {
        const tests = await store.getTests();
        
        if (tests.length === 0) {
            elements.testList.innerHTML = '<p>Нет доступных тестов</p>';
            elements.startTestBtn.disabled = true;
            return;
        }
        
        elements.startTestBtn.disabled = false;
        
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        
        tests.forEach(test => {
            const item = document.createElement('li');
            item.innerHTML = `
                <div class="test-item">
                    <strong>${escapeHtml(test.title)}</strong><br>
                    <small>${test.questions.length} вопросов, ${test.time_limit || 10} мин</small>
                </div>
            `;
            list.appendChild(item);
        });
        
        elements.testList.innerHTML = '';
        elements.testList.appendChild(list);
    } catch (err) {
        elements.testList.innerHTML = '<p>Ошибка загрузки тестов</p>';
        console.error('Ошибка рендеринга тестов:', err);
    }
}

// Начало теста
async function startTest() {
    try {
        const tests = await store.getTests();
        if (tests.length === 0) return;
        
        // Выбор случайного теста
        const randomTest = tests[Math.floor(Math.random() * tests.length)];
        store.currentTest = randomTest;
        store.userAnswers = {};
        
        // Настройка таймера
        startTimer(store.currentTest.time_limit || 10);
        
        // Отображение теста
        elements.testTitle.textContent = store.currentTest.title;
        elements.questionsContainer.innerHTML = '';
        
        const questions = Array.isArray(store.currentTest.questions) ? 
            store.currentTest.questions : JSON.parse(store.currentTest.questions);
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            questionDiv.innerHTML = `<h3>Вопрос ${index + 1}: ${escapeHtml(question.text)}</h3>`;
            
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options';
            
            question.options.forEach((option, optionIndex) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option';
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question_${index}`;
                radio.id = `q${index}_opt${optionIndex}`;
                radio.value = optionIndex;
                
                radio.addEventListener('change', () => {
                    store.userAnswers[index] = parseInt(optionIndex);
                });
                
                const label = document.createElement('label');
                label.htmlFor = radio.id;
                label.textContent = escapeHtml(option);
                
                optionDiv.appendChild(radio);
                optionDiv.appendChild(label);
                optionsDiv.appendChild(optionDiv);
            });
            
            questionDiv.appendChild(optionsDiv);
            elements.questionsContainer.appendChild(questionDiv);
        });
        
        // Переключение экранов
        document.getElementById('mainScreen').classList.add('hidden');
        elements.testContainer.classList.remove('hidden');
    } catch (err) {
        alert('Ошибка начала теста: ' + err.message);
    }
}

// Таймер теста
function startTimer(minutes) {
    stopTimer();
    
    const totalSeconds = minutes * 60;
    store.timeLeft = totalSeconds;
    let lastTime = Date.now();
    
    // Сброс прогресс-бара
    elements.progressBar.style.transform = 'scaleX(1)';
    elements.progressBar.className = 'progress-bar';
    
    function update() {
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        
        store.timeLeft = Math.max(0, store.timeLeft - delta);
        const progress = store.timeLeft / totalSeconds;
        
        // Обновление UI
        elements.progressBar.style.transform = `scaleX(${progress})`;
        updateTimerDisplay();
        
        // Изменение состояния
        if (progress < 0.3) elements.progressBar.classList.add('progress-warning');
        if (progress < 0.15) elements.progressBar.classList.add('progress-danger');
        
        if (store.timeLeft > 0) {
            store.animationId = requestAnimationFrame(update);
        } else {
            stopTimer();
            alert('Время вышло! Тест будет завершен.');
            submitTest();
        }
    }
    
    store.animationId = requestAnimationFrame(update);
}

function stopTimer() {
    if (store.animationId) {
        cancelAnimationFrame(store.animationId);
        store.animationId = null;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(store.timeLeft / 60);
    const seconds = Math.floor(store.timeLeft % 60);
    elements.timeLeftDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    // Изменение стиля
    elements.timeLeftDisplay.className = 'timer';
    if (store.timeLeft < 60) elements.timeLeftDisplay.classList.add('timer-danger');
    else if (store.timeLeft < 120) elements.timeLeftDisplay.classList.add('timer-warning');
}

// Завершение теста
async function submitTest() {
    stopTimer();
    
    const questions = Array.isArray(store.currentTest.questions) ? 
        store.currentTest.questions : JSON.parse(store.currentTest.questions);
    
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(store.userAnswers).length;
    
    // Проверка на все ответы
    if (answeredQuestions < totalQuestions) {
        const unanswered = totalQuestions - answeredQuestions;
        if (!confirm(`Вы ответили не на все вопросы. Осталось ${unanswered}. Завершить тест?`)) {
            startTimer(Math.floor(store.timeLeft / 60));
            return;
        }
    }
    
    // Подсчет правильных ответов
    let correct = 0;
    questions.forEach((question, index) => {
        if (typeof store.userAnswers[index] !== 'undefined' && 
            store.userAnswers[index] === question.correct) {
            correct++;
        }
    });
    
    const score = Math.round((correct / totalQuestions) * 100);
    
    // Сохранение результата
    const result = {
        user_id: store.currentUser.id,
        test_id: store.currentTest.id,
        score: score,
        correct_answers: correct,
        total_questions: totalQuestions,
        answers: store.userAnswers
    };
    
    try {
        await store.addResult(result);
        showResults(result, questions);
    } catch (err) {
        alert('Ошибка сохранения результата: ' + err.message);
        showResults(result, questions); // Все равно показываем результаты
    }
}

// Показать результаты
function showResults(result, questions) {
    elements.testContainer.classList.add('hidden');
    elements.resultsContainer.classList.remove('hidden');
    
    elements.resultsDiv.innerHTML = `
        <div class="result-item">
            <p><strong>Тест:</strong> ${escapeHtml(store.currentTest.title)}</p>
            <p><strong>Результат:</strong> ${result.score}% (${result.correct_answers} из ${result.total_questions})</p>
            <p><strong>Дата:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <h3>Детализация ответов:</h3>
    `;
    
    questions.forEach((question, index) => {
        const isCorrect = typeof store.userAnswers[index] !== 'undefined' && 
                         store.userAnswers[index] === question.correct;
        const userAnswer = typeof store.userAnswers[index] !== 'undefined' 
            ? escapeHtml(question.options[store.userAnswers[index]])
            : 'Нет ответа';
        const correctAnswer = escapeHtml(question.options[question.correct]);
        
        const questionDiv = document.createElement('div');
        questionDiv.className = `result-item ${isCorrect ? 'result-correct' : 'result-incorrect'}`;
        questionDiv.innerHTML = `
            <p><strong>Вопрос ${index + 1}:</strong> ${escapeHtml(question.text)}</p>
            <p><strong>Ваш ответ:</strong> ${userAnswer}</p>
            <p><strong>Правильный ответ:</strong> ${correctAnswer}</p>
        `;
        
        elements.resultsDiv.appendChild(questionDiv);
    });
}

// Админ-панель
function showAdminPanel() {
    document.getElementById('mainScreen').classList.add('hidden');
    elements.adminPanel.classList.remove('hidden');
    showAddTestForm();
}

function showAddTestForm() {
    elements.addTestForm.classList.remove('hidden');
    elements.adminTestList.classList.add('hidden');
    elements.testTitleInput.value = '';
    elements.testTimeLimit.value = '10';
    elements.testJson.value = '';
}

async function showAdminTestList() {
    elements.addTestForm.classList.add('hidden');
    elements.adminTestList.classList.remove('hidden');
    elements.testsContainer.innerHTML = '<p>Загрузка тестов...</p>';
    
    try {
        const tests = await store.getTests();
        
        if (tests.length === 0) {
            elements.testsContainer.innerHTML = '<p>Нет доступных тестов</p>';
            return;
        }
        
        elements.testsContainer.innerHTML = '';
        
        tests.forEach(test => {
            const questions = Array.isArray(test.questions) ? 
                test.questions : JSON.parse(test.questions);
                
            const testDiv = document.createElement('div');
            testDiv.className = 'result-item';
            testDiv.innerHTML = `
                <h3>${escapeHtml(test.title)}</h3>
                <p>Вопросов: ${questions.length}</p>
                <p>Время: ${test.time_limit || 10} мин</p>
                <button class="btn btn-danger delete-test" data-id="${test.id}" data-title="${escapeHtml(test.title)}">Удалить</button>
            `;
            elements.testsContainer.appendChild(testDiv);
        });
        
        // Обработчики удаления
        document.querySelectorAll('.delete-test').forEach(btn => {
            btn.addEventListener('click', async function() {
                const testId = this.dataset.id;
                const title = this.dataset.title;
                if (confirm(`Удалить тест "${title}"?`)) {
                    if (await store.deleteTest(testId)) {
                        showAdminTestList();
                    } else {
                        alert('Ошибка удаления теста');
                    }
                }
            });
        });
    } catch (err) {
        elements.testsContainer.innerHTML = '<p>Ошибка загрузки тестов</p>';
        console.error('Ошибка загрузки тестов:', err);
    }
}

async function uploadTest() {
    if (!elements.testTitleInput.value.trim()) {
        alert('Введите название теста');
        return;
    }
    
    try {
        const questions = JSON.parse(elements.testJson.value);
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Должен быть хотя бы один вопрос');
        }
        
        questions.forEach((q, i) => {
            if (!q.text || !q.options || !Array.isArray(q.options) || q.correct === undefined) {
                throw new Error(`Ошибка в вопросе ${i + 1}: неверный формат`);
            }
            if (q.correct < 0 || q.correct >= q.options.length) {
                throw new Error(`Ошибка в вопросе ${i + 1}: некорректный правильный ответ`);
            }
        });
        
        const test = {
            title: elements.testTitleInput.value.trim(),
            time_limit: parseInt(elements.testTimeLimit.value) || 10,
            questions: questions
        };
        
        await store.addTest(test);
        alert(`Тест "${test.title}" успешно сохранен!`);
        renderTestList();
        showAdminTestList();
    } catch (e) {
        alert(`Ошибка: ${e.message}`);
    }
}

function loadTestFromFile() {
    if (!elements.testFile.files.length) {
        alert('Выберите файл');
        return;
    }

    const file = elements.testFile.files[0];
    
    if (!file.name.endsWith('.json')) {
        alert('Пожалуйста, выберите файл в формате JSON');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const testData = JSON.parse(e.target.result);
            
            // Валидация структуры теста
            if (!testData.title || !testData.questions || !Array.isArray(testData.questions)) {
                throw new Error('Неверный формат теста: должен содержать title и questions');
            }

            // Проверка каждого вопроса
            testData.questions.forEach((q, i) => {
                if (!q.text || !q.options || !Array.isArray(q.options) || q.correct === undefined) {
                    throw new Error(`Ошибка в вопросе ${i + 1}: неверный формат`);
                }
                if (q.correct < 0 || q.correct >= q.options.length) {
                    throw new Error(`Ошибка в вопросе ${i + 1}: некорректный правильный ответ`);
                }
            });

            // Автоматически заполняем форму и предлагаем сохранить
            elements.testTitleInput.value = testData.title;
            elements.testTimeLimit.value = testData.timeLimit || 10;
            elements.testJson.value = JSON.stringify(testData.questions, null, 2);
            
            if (confirm(`Тест "${testData.title}" успешно загружен. Сохранить сейчас?`)) {
                uploadTest();
            }
        } catch (e) {
            alert(`Ошибка при загрузке файла: ${e.message}`);
            console.error(e);
        }
    };
    
    reader.onerror = function() {
        alert('Ошибка при чтении файла');
    };
    
    reader.readAsText(file);
}

// Навигация
function backToMain() {
    elements.testContainer.classList.add('hidden');
    elements.resultsContainer.classList.add('hidden');
    elements.adminPanel.classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    stopTimer();
}

// Сохранение результатов в файл
async function saveResultsToFile() {
    try {
        const userResults = await store.getUserResults(store.currentUser.id);
        const data = JSON.stringify(userResults, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `results_${store.currentUser.name}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('Ошибка сохранения результатов: ' + err.message);
    }
}

// Вспомогательные функции
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Запуск приложения
init();
