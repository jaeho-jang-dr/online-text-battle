// 관리자 패널 JavaScript

// 전역 변수
let socket;
let currentSection = 'dashboard';
let adminData = {
    users: [],
    characters: [],
    battles: [],
    skills: [],
    stats: {},
    logs: []
};

// DOM 요소들
const elements = {
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.admin-section'),
    serverStatus: document.getElementById('server-status'),
    notification: document.getElementById('notification'),
    
    // 통계 요소들
    totalUsers: document.getElementById('total-users'),
    onlineUsers: document.getElementById('online-users'),
    activeBattles: document.getElementById('active-battles'),
    totalBattles: document.getElementById('total-battles'),
    
    // 실시간 요소들
    realtimeActivity: document.getElementById('realtime-activity'),
    serverUptime: document.getElementById('server-uptime'),
    memoryUsage: document.getElementById('memory-usage'),
    cpuUsage: document.getElementById('cpu-usage'),
    socketConnections: document.getElementById('socket-connections'),
    
    // 테이블 및 리스트
    usersTableBody: document.getElementById('users-table-body'),
    charactersGrid: document.getElementById('characters-grid'),
    battlesList: document.getElementById('battles-list'),
    skillsGrid: document.getElementById('skills-grid'),
    logsList: document.getElementById('logs-list'),
    
    // 모달
    userModal: document.getElementById('user-modal'),
    userForm: document.getElementById('user-form'),
    
    // 버튼들
    refreshStats: document.getElementById('refresh-stats'),
    addUserBtn: document.getElementById('add-user-btn'),
    addCharacterBtn: document.getElementById('add-character-btn'),
    addSkillBtn: document.getElementById('add-skill-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    clearLogsBtn: document.getElementById('clear-logs-btn')
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
});

function initializeAdmin() {
    // Socket.io 연결
    initializeSocket();
    
    // 이벤트 리스너 등록
    registerEventListeners();
    
    // 초기 데이터 로드
    loadInitialData();
    
    // 실시간 업데이트 시작
    startRealtimeUpdates();
}

function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('관리자 소켓 연결됨');
        updateServerStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('관리자 소켓 연결 끊김');
        updateServerStatus(false);
    });
    
    // 관리자 전용 이벤트들
    socket.on('admin:stats', (data) => {
        updateStats(data);
    });
    
    socket.on('admin:activity', (activity) => {
        addRealtimeActivity(activity);
    });
    
    socket.on('admin:system', (systemInfo) => {
        updateSystemInfo(systemInfo);
    });
    
    socket.on('admin:logs', (logEntry) => {
        addLogEntry(logEntry);
    });
    
    // 관리자 인증
    socket.emit('admin:authenticate', {
        token: localStorage.getItem('adminToken')
    });
}

function registerEventListeners() {
    // 네비게이션
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });
    
    // 버튼 이벤트들
    elements.refreshStats?.addEventListener('click', refreshStatistics);
    elements.addUserBtn?.addEventListener('click', showUserModal);
    elements.addCharacterBtn?.addEventListener('click', showCharacterModal);
    elements.addSkillBtn?.addEventListener('click', showSkillModal);
    elements.saveSettingsBtn?.addEventListener('click', saveSettings);
    elements.clearLogsBtn?.addEventListener('click', clearLogs);
    
    // 모달 이벤트들
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', hideModals);
    });
    
    // 폼 제출
    elements.userForm?.addEventListener('submit', handleUserSubmit);
    
    // 필터 버튼들
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = btn.dataset.filter;
            filterBattles(filter);
            
            // 활성 상태 업데이트
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // 검색
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            filterUsers(e.target.value);
        });
    }
    
    // 로그 레벨 필터
    const logLevel = document.getElementById('log-level');
    if (logLevel) {
        logLevel.addEventListener('change', (e) => {
            filterLogs(e.target.value);
        });
    }
}

function switchSection(section) {
    // 네비게이션 업데이트
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // 섹션 표시
    elements.sections.forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    currentSection = section;
    
    // 섹션별 데이터 로드
    loadSectionData(section);
}

async function loadInitialData() {
    try {
        // 모든 데이터를 병렬로 로드
        const [statsRes, usersRes, charactersRes, battlesRes, skillsRes] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/users'),
            fetch('/api/admin/characters'),
            fetch('/api/admin/battles'),
            fetch('/api/admin/skills')
        ]);
        
        if (statsRes.ok) {
            const stats = await statsRes.json();
            updateStats(stats.data);
        }
        
        if (usersRes.ok) {
            const users = await usersRes.json();
            adminData.users = users.data || [];
            renderUsers();
        }
        
        if (charactersRes.ok) {
            const characters = await charactersRes.json();
            adminData.characters = characters.data || [];
            renderCharacters();
        }
        
        if (battlesRes.ok) {
            const battles = await battlesRes.json();
            adminData.battles = battles.data || [];
            renderBattles();
        }
        
        if (skillsRes.ok) {
            const skills = await skillsRes.json();
            adminData.skills = skills.data || [];
            renderSkills();
        }
        
    } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
        showNotification('데이터 로드에 실패했습니다.', 'error');
    }
}

function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            refreshStatistics();
            break;
        case 'users':
            renderUsers();
            break;
        case 'characters':
            renderCharacters();
            break;
        case 'battles':
            renderBattles();
            break;
        case 'skills':
            renderSkills();
            break;
        case 'logs':
            loadLogs();
            break;
        default:
            break;
    }
}

function updateStats(stats) {
    adminData.stats = stats;
    
    if (elements.totalUsers) elements.totalUsers.textContent = stats.totalUsers || '-';
    if (elements.onlineUsers) elements.onlineUsers.textContent = stats.onlineUsers || '-';
    if (elements.activeBattles) elements.activeBattles.textContent = stats.activeBattles || '-';
    if (elements.totalBattles) elements.totalBattles.textContent = stats.totalBattles || '-';
}

function updateSystemInfo(systemInfo) {
    if (elements.serverUptime) {
        elements.serverUptime.textContent = formatUptime(systemInfo.uptime);
    }
    if (elements.memoryUsage) {
        elements.memoryUsage.textContent = `${systemInfo.memoryUsage?.toFixed(1) || 0}%`;
    }
    if (elements.cpuUsage) {
        elements.cpuUsage.textContent = `${systemInfo.cpuUsage?.toFixed(1) || 0}%`;
    }
    if (elements.socketConnections) {
        elements.socketConnections.textContent = systemInfo.socketConnections || 0;
    }
}

function addRealtimeActivity(activity) {
    if (!elements.realtimeActivity) return;
    
    const activityElement = document.createElement('div');
    activityElement.className = 'activity-item';
    activityElement.innerHTML = `
        <div>${activity.message}</div>
        <div class="activity-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    elements.realtimeActivity.insertBefore(activityElement, elements.realtimeActivity.firstChild);
    
    // 최대 50개 항목만 유지
    while (elements.realtimeActivity.children.length > 50) {
        elements.realtimeActivity.removeChild(elements.realtimeActivity.lastChild);
    }
}

function renderUsers() {
    if (!elements.usersTableBody) return;
    
    elements.usersTableBody.innerHTML = '';
    
    adminData.users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '없음'}</td>
            <td>
                <span class="status-badge ${user.status || 'offline'}">${user.status || 'offline'}</span>
            </td>
            <td>
                <button class="action-btn edit" onclick="editUser(${user.id})">편집</button>
                <button class="action-btn view" onclick="viewUser(${user.id})">보기</button>
                <button class="action-btn delete" onclick="deleteUser(${user.id})">삭제</button>
            </td>
        `;
        elements.usersTableBody.appendChild(row);
    });
}

function renderCharacters() {
    if (!elements.charactersGrid) return;
    
    elements.charactersGrid.innerHTML = '';
    
    adminData.characters.forEach(character => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <div class="character-header">
                <div class="character-name">${character.name}</div>
                <div class="character-level">Lv. ${character.level}</div>
            </div>
            <div class="character-stats">
                <div class="stat-row">
                    <span>체력</span>
                    <span>${character.health}/${character.maxHealth}</span>
                </div>
                <div class="stat-row">
                    <span>마나</span>
                    <span>${character.mana}/${character.maxMana}</span>
                </div>
                <div class="stat-row">
                    <span>공격력</span>
                    <span>${character.strength}</span>
                </div>
                <div class="stat-row">
                    <span>방어력</span>
                    <span>${character.defense}</span>
                </div>
                <div class="stat-row">
                    <span>속도</span>
                    <span>${character.speed}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="action-btn edit" onclick="editCharacter(${character.id})">편집</button>
                <button class="action-btn delete" onclick="deleteCharacter(${character.id})">삭제</button>
            </div>
        `;
        elements.charactersGrid.appendChild(card);
    });
}

function renderBattles() {
    if (!elements.battlesList) return;
    
    elements.battlesList.innerHTML = '';
    
    adminData.battles.forEach(battle => {
        const item = document.createElement('div');
        item.className = 'battle-item';
        item.innerHTML = `
            <div class="battle-info">
                <div class="battle-players">${battle.player1?.name || '플레이어1'} vs ${battle.player2?.name || '플레이어2'}</div>
                <div class="battle-details">
                    턴: ${battle.turnCount} | 시작: ${new Date(battle.createdAt).toLocaleString()}
                    ${battle.winnerId ? `| 승자: ${battle.winner?.name || '알 수 없음'}` : ''}
                </div>
            </div>
            <div class="battle-actions">
                <span class="battle-status ${battle.status}">${getStatusText(battle.status)}</span>
                <button class="action-btn view" onclick="viewBattle(${battle.id})">상세보기</button>
                ${battle.status === 'in_progress' ? `<button class="action-btn delete" onclick="stopBattle(${battle.id})">중단</button>` : ''}
            </div>
        `;
        elements.battlesList.appendChild(item);
    });
}

function renderSkills() {
    if (!elements.skillsGrid) return;
    
    elements.skillsGrid.innerHTML = '';
    
    adminData.skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `
            <div class="skill-header">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-type">${getSkillTypeText(skill.skillType)}</div>
            </div>
            <div class="skill-info">
                <div class="info-row">
                    <span>마나 비용</span>
                    <span>${skill.manaCost}</span>
                </div>
                <div class="info-row">
                    <span>데미지</span>
                    <span>${skill.damage}</span>
                </div>
                <div class="info-row">
                    <span>쿨다운</span>
                    <span>${skill.cooldown}턴</span>
                </div>
            </div>
            <div class="skill-description">
                ${skill.description}
            </div>
            <div class="card-actions">
                <button class="action-btn edit" onclick="editSkill(${skill.id})">편집</button>
                <button class="action-btn delete" onclick="deleteSkill(${skill.id})">삭제</button>
            </div>
        `;
        elements.skillsGrid.appendChild(card);
    });
}

function addLogEntry(logEntry) {
    if (!elements.logsList) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${logEntry.level}`;
    entry.innerHTML = `[${new Date(logEntry.timestamp).toLocaleTimeString()}] ${logEntry.message}`;
    
    elements.logsList.insertBefore(entry, elements.logsList.firstChild);
    
    // 최대 500개 로그만 유지
    while (elements.logsList.children.length > 500) {
        elements.logsList.removeChild(elements.logsList.lastChild);
    }
}

// 모달 및 폼 처리
function showUserModal(userId = null) {
    elements.userModal.classList.add('show');
    
    if (userId) {
        // 편집 모드
        const user = adminData.users.find(u => u.id === userId);
        if (user) {
            document.getElementById('user-username').value = user.username;
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-password').value = '';
            document.getElementById('user-modal-title').textContent = '사용자 편집';
        }
    } else {
        // 추가 모드
        elements.userForm.reset();
        document.getElementById('user-modal-title').textContent = '사용자 추가';
    }
}

function hideModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
}

async function handleUserSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('사용자가 성공적으로 추가되었습니다.', 'success');
            hideModals();
            loadSectionData('users');
        } else {
            showNotification(result.message || '사용자 추가에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('사용자 추가 오류:', error);
        showNotification('서버 오류가 발생했습니다.', 'error');
    }
}

// 유틸리티 함수들
function updateServerStatus(connected) {
    const statusDot = elements.serverStatus?.querySelector('.status-dot');
    const statusText = elements.serverStatus?.querySelector('span:last-child');
    
    if (statusDot && statusText) {
        if (connected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = '온라인';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = '오프라인';
        }
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}일 ${hours}시간 ${minutes}분`;
}

function getStatusText(status) {
    const statusMap = {
        waiting: '대기 중',
        in_progress: '진행 중',
        finished: '완료',
        cancelled: '취소됨'
    };
    return statusMap[status] || status;
}

function getSkillTypeText(skillType) {
    const typeMap = {
        attack: '공격',
        defense: '방어',
        heal: '치유',
        buff: '강화',
        debuff: '약화'
    };
    return typeMap[skillType] || skillType;
}

function startRealtimeUpdates() {
    // 5초마다 시스템 정보 요청
    setInterval(() => {
        socket.emit('admin:getSystemInfo');
    }, 5000);
    
    // 30초마다 통계 업데이트
    setInterval(() => {
        refreshStatistics();
    }, 30000);
}

function refreshStatistics() {
    socket.emit('admin:getStats');
}

function showNotification(message, type = 'info') {
    if (!elements.notification) return;
    
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

// 필터 및 검색 함수들
function filterUsers(searchTerm) {
    const rows = elements.usersTableBody?.children;
    if (!rows) return;
    
    Array.from(rows).forEach(row => {
        const username = row.children[1].textContent.toLowerCase();
        const email = row.children[2].textContent.toLowerCase();
        const matches = username.includes(searchTerm.toLowerCase()) || 
                       email.includes(searchTerm.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
}

function filterBattles(filter) {
    const battles = elements.battlesList?.children;
    if (!battles) return;
    
    Array.from(battles).forEach(battle => {
        const status = battle.querySelector('.battle-status').className.split(' ')[1];
        const show = filter === 'all' || status === filter;
        battle.style.display = show ? '' : 'none';
    });
}

function filterLogs(level) {
    const logs = elements.logsList?.children;
    if (!logs) return;
    
    Array.from(logs).forEach(log => {
        const logLevel = log.className.split(' ')[1];
        const show = level === 'all' || logLevel === level;
        log.style.display = show ? '' : 'none';
    });
}

// CRUD 작업들 (스텁)
function editUser(userId) {
    showUserModal(userId);
}

function viewUser(userId) {
    console.log('사용자 상세보기:', userId);
}

function deleteUser(userId) {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        console.log('사용자 삭제:', userId);
    }
}

function editCharacter(characterId) {
    console.log('캐릭터 편집:', characterId);
}

function deleteCharacter(characterId) {
    if (confirm('정말로 이 캐릭터를 삭제하시겠습니까?')) {
        console.log('캐릭터 삭제:', characterId);
    }
}

function viewBattle(battleId) {
    console.log('배틀 상세보기:', battleId);
}

function stopBattle(battleId) {
    if (confirm('정말로 이 배틀을 중단하시겠습니까?')) {
        console.log('배틀 중단:', battleId);
    }
}

function editSkill(skillId) {
    console.log('스킬 편집:', skillId);
}

function deleteSkill(skillId) {
    if (confirm('정말로 이 스킬을 삭제하시겠습니까?')) {
        console.log('스킬 삭제:', skillId);
    }
}

function showCharacterModal() {
    console.log('캐릭터 추가 모달');
}

function showSkillModal() {
    console.log('스킬 추가 모달');
}

function saveSettings() {
    console.log('설정 저장');
    showNotification('설정이 저장되었습니다.', 'success');
}

function clearLogs() {
    if (confirm('정말로 모든 로그를 지우시겠습니까?')) {
        elements.logsList.innerHTML = '';
        showNotification('로그가 지워졌습니다.', 'info');
    }
}

function loadLogs() {
    // 샘플 로그 데이터
    const sampleLogs = [
        { level: 'info', message: '서버가 시작되었습니다.', timestamp: new Date() },
        { level: 'warn', message: 'CPU 사용률이 높습니다. (85%)', timestamp: new Date() },
        { level: 'error', message: '데이터베이스 연결 오류가 발생했습니다.', timestamp: new Date() },
        { level: 'info', message: '새로운 사용자가 등록했습니다: user123', timestamp: new Date() },
        { level: 'debug', message: 'Socket 연결: 15개', timestamp: new Date() }
    ];
    
    sampleLogs.forEach(log => addLogEntry(log));
}

// 전역 함수로 export (개발/디버깅용)
window.adminPanel = {
    adminData,
    socket,
    elements,
    showNotification
};