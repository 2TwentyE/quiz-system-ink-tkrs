 // Хранилище данных
const store = {
    tests: {},
    currentTest: null,
    userAnswers: {},
    testResults: [],
    currentUser: null,
    isAdmin: false,
    timer: null,
    timeLeft: 0,
    animationId: null,
    
    // Инициализация хранилища
    init() {
        this.loadFromLocalStorage();
        this.checkAuth();
    },
    
    // Сохранение данных в localStorage
   saveToLocalStorage() {
    try {
        localStorage.setItem('quizSystemTests', JSON.stringify(this.tests));
        localStorage.setItem('quizSystemResults', JSON.stringify(this.testResults));
        
        if (this.currentUser) {
            const authData = {
                user: this.currentUser,
                isAdmin: this.isAdmin,
                expires: Date.now() + 8 * 60 * 60 * 1000
            };
            localStorage.setItem('quizSystemAuth', JSON.stringify(authData));
        }
        console.log("Данные сохранены в localStorage"); // Для отладки
    } catch (e) {
        console.error("Ошибка сохранения в localStorage:", e);
    }
	},
    
    // Загрузка данных из localStorage
	 loadFromLocalStorage() {
		try {
			const tests = localStorage.getItem('quizSystemTests');
			if (tests) {
				this.tests = JSON.parse(tests);
				console.log("Загружено тестов:", Object.keys(this.tests).length);
			}
			
			const results = localStorage.getItem('quizSystemResults');
			if (results) this.testResults = JSON.parse(results);
			
			const auth = localStorage.getItem('quizSystemAuth');
			if (auth) {
				const { user, isAdmin, expires } = JSON.parse(auth);
				if (expires > Date.now()) {
					this.currentUser = user;
					this.isAdmin = isAdmin;
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки из localStorage:", e);
			// Сброс при ошибке
			this.tests = {};
			this.testResults = [];
		}
	},
    
    // Очистка данных авторизации
    clearAuth() {
        localStorage.removeItem('quizSystemAuth');
        this.currentUser = null;
        this.isAdmin = false;
    },
    
    // Добавление теста
    addTest(test) {
    if (!test?.title) {
        console.error("Не указано название теста");
        return false;
    }
    
    // Нормализация структуры теста
    const normalizedTest = {
        title: test.title.trim(),
        timeLimit: parseInt(test.timeLimit) || 10,
        questions: test.questions.map(q => ({
            text: q.text.trim(),
            options: q.options.map(opt => opt.trim()),
            correct: parseInt(q.correct)
        }))
    };
    
    this.tests[normalizedTest.title] = normalizedTest;
    this.saveToLocalStorage();
    console.log("Тест сохранён:", normalizedTest.title); // Для отладки
    return true;
	},
    
    // Удаление теста
    deleteTest(title) {
        if (this.tests[title]) {
            delete this.tests[title];
            this.saveToLocalStorage();
            return true;
        }
        return false;
    },
    
    // Добавление результата
    addResult(result) {
        this.testResults.push(result);
        this.saveToLocalStorage();
    },
    
    // Получение результатов пользователя
    getUserResults(username) {
        return this.testResults.filter(r => r.userName === username);
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
    // Проверка авторизации при загрузке
    if (store.currentUser) {
        registerUser(username, email);
        showApp();
    }
    
    // Настройка событий
    setupEventListeners();
}

// Показать основное приложение
function showApp() {
    elements.loginContainer.classList.add('hidden');
    elements.appContainer.classList.remove('hidden');
    elements.userGreeting.textContent = `Добро пожаловать, ${store.currentUser}${store.isAdmin ? ' (администратор)' : ''}`;
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
function handleLogin(e) {
    e.preventDefault();
    
    const username = elements.usernameInput.value.trim();
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    
    if (username.toLowerCase() === 'admin') {
        if (password === 'admin123') {
            store.currentUser = username;
            store.isAdmin = true;
            store.saveToLocalStorage();
            showApp();
            return;
        }
        alert('Неверный пароль администратора');
        return;
    }
    
    if (username) {
        store.currentUser = username;
        store.isAdmin = false;
        store.saveToLocalStorage();

        registerUser(username);

        showApp();
    } else {
        alert('Введите имя пользователя');
    }

async function registerUser(name, email = '') {
    try {
        const response = await fetch('https://quiz-system-ink-tkrs-production.up.railway.app/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Пользователь зарегистрирован:', data);
        } else {
            console.warn('Ошибка регистрации:', data.message);
        }
    } catch (err) {
        console.error('Ошибка при регистрации:', err);
    }
}
}

// Обработка выхода
function handleLogout() {
    store.clearAuth();
    elements.appContainer.classList.add('hidden');
    elements.loginContainer.classList.remove('hidden');
    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
}

// Отображение списка тестов
function renderTestList() {
	console.log("Текущие тесты:", store.tests);
    elements.testList.innerHTML = '';
	
    const testKeys = Object.keys(store.tests);
    if (testKeys.length === 0) {
        elements.testList.innerHTML = '<p>Нет доступных тестов</p>';
        elements.startTestBtn.disabled = true;
        return;
    }
    
    elements.startTestBtn.disabled = false;
    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    
    testKeys.forEach(title => {
        const test = store.tests[title];
        const item = document.createElement('li');
        item.textContent = `${title} (${test.questions.length} вопросов, ${test.timeLimit || 1} мин)`;
        list.appendChild(item);
    });
    
    elements.testList.appendChild(list);
}

// Начало теста
function startTest() {
    const testKeys = Object.keys(store.tests);
    if (testKeys.length === 0) return;
    
    // Выбор случайного теста
    const randomKey = testKeys[Math.floor(Math.random() * testKeys.length)];
    store.currentTest = store.tests[randomKey];
    store.userAnswers = {};
    
    // Настройка таймера
    startTimer(store.currentTest.timeLimit || 1);
    
    // Отображение теста
    elements.testTitle.textContent = store.currentTest.title;
    elements.questionsContainer.innerHTML = '';
    
    store.currentTest.questions.forEach((question, index) => {
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
function submitTest() {
    stopTimer();
    
    const totalQuestions = store.currentTest.questions.length;
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
    store.currentTest.questions.forEach((question, index) => {
        if (typeof store.userAnswers[index] !== 'undefined' && 
            store.userAnswers[index] === question.correct) {
            correct++;
        }
    });
    
    const score = Math.round((correct / totalQuestions) * 100);
    
    // Сохранение результата
    const result = {
        testName: store.currentTest.title,
        userName: store.currentUser,
        date: new Date().toLocaleString(),
        score: score,
        correct: correct,
        total: totalQuestions,
        answers: {...store.userAnswers}
    };
    
    store.addResult(result);
    showResults(result);
}

// Показать результаты
function showResults(result) {
    elements.testContainer.classList.add('hidden');
    elements.resultsContainer.classList.remove('hidden');
    
    elements.resultsDiv.innerHTML = `
        <div class="result-item">
            <p><strong>Тест:</strong> ${escapeHtml(result.testName)}</p>
            <p><strong>Результат:</strong> ${result.score}% (${result.correct} из ${result.total})</p>
            <p><strong>Дата:</strong> ${escapeHtml(result.date)}</p>
        </div>
        <h3>Детализация ответов:</h3>
    `;
    
    store.currentTest.questions.forEach((question, index) => {
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

function showAdminTestList() {
    elements.addTestForm.classList.add('hidden');
    elements.adminTestList.classList.remove('hidden');
    elements.testsContainer.innerHTML = '';
    
    const testKeys = Object.keys(store.tests);
    if (testKeys.length === 0) {
        elements.testsContainer.innerHTML = '<p>Нет доступных тестов</p>';
        return;
    }
    
    testKeys.forEach(title => {
        const test = store.tests[title];
        const testDiv = document.createElement('div');
        testDiv.className = 'result-item';
        testDiv.innerHTML = `
            <h3>${escapeHtml(title)}</h3>
            <p>Вопросов: ${test.questions.length}</p>
            <p>Время: ${test.timeLimit || 10} мин</p>
            <button class="btn btn-danger delete-test" data-title="${escapeHtml(title)}">Удалить</button>
        `;
        elements.testsContainer.appendChild(testDiv);
    });
    
    // Обработчики удаления
    document.querySelectorAll('.delete-test').forEach(btn => {
        btn.addEventListener('click', function() {
            const title = this.dataset.title;
            if (confirm(`Удалить тест "${title}"?`)) {
                if (store.deleteTest(title)) {
                    showAdminTestList();
                }
            }
        });
    });
}

		function uploadTest() {
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
					timeLimit: parseInt(elements.testTimeLimit.value) || 10,
					questions: questions
				};
				
				if (store.addTest(test)) {
					alert(`Тест "${test.title}" успешно сохранен!`);
					renderTestList(); // Обновляем список тестов
					showAdminTestList(); // Обновляем админ-панель
				}
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
						uploadTest(); // Вызываем функцию сохранения
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
function saveResultsToFile() {
    const userResults = store.getUserResults(store.currentUser);
    const data = JSON.stringify(userResults, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_${store.currentUser}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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