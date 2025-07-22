// 전역 변수
let socket;
let currentUser = null;
let isConnected = false;

// DOM 요소들
const elements = {
    authSection: document.getElementById('auth-section'),
    gameSection: document.getElementById('game-section'),
    connectionStatus: document.getElementById('connection-status'),
    notification: document.getElementById('notification'),
    
    // 인증 탭
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    
    // 게임
    usernameDisplay: document.getElementById('username-display'),
    logoutBtn: document.getElementById('logout-btn'),
    findBattleBtn: document.getElementById('find-battle-btn'),
    cancelBattleBtn: document.getElementById('cancel-battle-btn'),
    
    // 채팅
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    chatSend: document.getElementById('chat-send')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Socket.io 연결
    initializeSocket();
    
    // 이벤트 리스너 등록
    registerEventListeners();
    
    // 저장된 토큰 확인
    checkSavedToken();
}

function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('서버에 연결됨');
        isConnected = true;
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('서버 연결 끊김');
        isConnected = false;
        updateConnectionStatus(false);
    });
    
    socket.on('message', (data) => {
        displayChatMessage(data.username, data.message, data.timestamp);
    });
    
    socket.on('connect_error', (error) => {
        console.error('연결 오류:', error);
        showNotification('서버 연결에 실패했습니다.', 'error');
    });
}

function registerEventListeners() {
    // 인증 탭
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));
    
    // 폼 제출
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);
    
    // 게임
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.findBattleBtn.addEventListener('click', handleFindBattle);
    elements.cancelBattleBtn.addEventListener('click', handleCancelBattle);
    
    // 채팅
    elements.chatSend.addEventListener('click', sendChatMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function switchAuthTab(tab) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'login') {
        elements.loginTab.classList.add('active');
        elements.loginForm.classList.add('active');
    } else {
        elements.registerTab.classList.add('active');
        elements.registerForm.classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('token', result.data.token);
            currentUser = result.data.user;
            showGameSection();
            showNotification('로그인 성공!', 'success');
        } else {
            showNotification(result.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        showNotification('서버와의 통신 중 오류가 발생했습니다.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    if (password !== confirmPassword) {
        showNotification('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: password
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('회원가입 성공! 로그인해주세요.', 'success');
            switchAuthTab('login');
            elements.registerForm.reset();
        } else {
            showNotification(result.message || '회원가입에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('회원가입 오류:', error);
        showNotification('서버와의 통신 중 오류가 발생했습니다.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    showAuthSection();
    showNotification('로그아웃되었습니다.', 'info');
}

function handleFindBattle() {
    if (!currentUser) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }
    
    elements.findBattleBtn.style.display = 'none';
    elements.cancelBattleBtn.style.display = 'inline-block';
    
    // TODO: 실제 매치메이킹 로직 구현
    showNotification('배틀을 찾고 있습니다...', 'info');
    
    // 임시로 5초 후 취소
    setTimeout(() => {
        if (elements.cancelBattleBtn.style.display !== 'none') {
            handleCancelBattle();
            showNotification('상대를 찾지 못했습니다.', 'warning');
        }
    }, 5000);
}

function handleCancelBattle() {
    elements.findBattleBtn.style.display = 'inline-block';
    elements.cancelBattleBtn.style.display = 'none';
    showNotification('배틀 찾기를 취소했습니다.', 'info');
}

function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    
    if (!message) return;
    if (!isConnected) {
        showNotification('서버에 연결되지 않았습니다.', 'error');
        return;
    }
    if (!currentUser) {
        showNotification('로그인이 필요합니다.', 'error');
        return;
    }
    
    socket.emit('message', {
        username: currentUser.username,
        message: message,
        timestamp: new Date()
    });
    
    elements.chatInput.value = '';
}

function displayChatMessage(username, message, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const time = new Date(timestamp).toLocaleTimeString();
    
    messageElement.innerHTML = `
        <span class="username">${username}:</span>
        ${message}
        <span class="timestamp">${time}</span>
    `;
    
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionStatus.textContent = '연결됨';
        elements.connectionStatus.className = 'status-connected';
        elements.chatInput.disabled = false;
        elements.chatSend.disabled = false;
    } else {
        elements.connectionStatus.textContent = '연결 끊김';
        elements.connectionStatus.className = 'status-disconnected';
        elements.chatInput.disabled = true;
        elements.chatSend.disabled = true;
    }
}

function showAuthSection() {
    elements.authSection.classList.add('active');
    elements.gameSection.classList.remove('active');
}

function showGameSection() {
    elements.authSection.classList.remove('active');
    elements.gameSection.classList.add('active');
    
    if (currentUser) {
        elements.usernameDisplay.textContent = currentUser.username;
    }
}

function checkSavedToken() {
    const token = localStorage.getItem('token');
    
    if (token) {
        // TODO: 토큰 유효성 검사 구현
        // 임시로 게임 섹션 표시
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                currentUser = result.data.user;
                showGameSection();
            } else {
                localStorage.removeItem('token');
                showAuthSection();
            }
        })
        .catch(error => {
            console.error('토큰 검증 오류:', error);
            localStorage.removeItem('token');
            showAuthSection();
        });
    } else {
        showAuthSection();
    }
}

function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

// 전역 함수로 export (개발/디버깅용)
window.gameApp = {
    socket,
    currentUser,
    showNotification,
    elements
};