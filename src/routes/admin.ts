import { Router } from 'express';
import { ApiResponse } from '../types';

const router = Router();

// 임시 데이터 (Phase 2에서 실제 데이터베이스로 교체)
const mockData = {
    users: [
        {
            id: 1,
            username: 'testuser1',
            email: 'test1@example.com',
            createdAt: new Date('2024-01-15'),
            lastLogin: new Date(),
            status: 'online'
        },
        {
            id: 2,
            username: 'testuser2',
            email: 'test2@example.com',
            createdAt: new Date('2024-01-20'),
            lastLogin: new Date('2024-01-25') as Date,
            status: 'offline'
        }
    ],
    characters: [
        {
            id: 1,
            userId: 1,
            name: '전사',
            level: 5,
            health: 85,
            maxHealth: 100,
            mana: 25,
            maxMana: 50,
            strength: 18,
            defense: 12,
            speed: 8,
            experience: 250
        },
        {
            id: 2,
            userId: 2,
            name: '마법사',
            level: 3,
            health: 60,
            maxHealth: 80,
            mana: 40,
            maxMana: 60,
            strength: 8,
            defense: 6,
            speed: 12,
            experience: 150
        }
    ],
    battles: [
        {
            id: 1,
            player1Id: 1,
            player2Id: 2,
            player1: { name: '전사' },
            player2: { name: '마법사' },
            status: 'in_progress',
            turnCount: 5,
            createdAt: new Date(),
            winnerId: null as number | null
        },
        {
            id: 2,
            player1Id: 1,
            player2Id: 2,
            player1: { name: '전사' },
            player2: { name: '마법사' },
            status: 'finished',
            turnCount: 8,
            createdAt: new Date('2024-01-25'),
            winnerId: 1 as number | null,
            winner: { name: '전사' }
        }
    ],
    skills: [
        {
            id: 1,
            name: '강타',
            description: '적에게 강력한 물리 공격을 가합니다.',
            manaCost: 10,
            damage: 25,
            cooldown: 2,
            skillType: 'attack'
        },
        {
            id: 2,
            name: '치유',
            description: '체력을 회복합니다.',
            manaCost: 15,
            damage: 0,
            cooldown: 3,
            skillType: 'heal'
        },
        {
            id: 3,
            name: '파이어볼',
            description: '마법 화염구를 발사합니다.',
            manaCost: 20,
            damage: 30,
            cooldown: 3,
            skillType: 'attack'
        }
    ]
};

// 관리자 인증 미들웨어 (임시)
const adminAuth = (req: any, res: any, next: any) => {
    // TODO: 실제 관리자 인증 구현
    // const token = req.headers.authorization?.split(' ')[1];
    // 임시로 모든 요청 허용
    next();
};

// 통계 정보
router.get('/stats', adminAuth, (req, res) => {
    const stats = {
        totalUsers: mockData.users.length,
        onlineUsers: mockData.users.filter(u => u.status === 'online').length,
        activeBattles: mockData.battles.filter(b => b.status === 'in_progress').length,
        totalBattles: mockData.battles.length,
        totalCharacters: mockData.characters.length,
        totalSkills: mockData.skills.length
    };

    const response: ApiResponse = {
        success: true,
        data: stats
    };

    res.json(response);
});

// 시스템 정보
router.get('/system', adminAuth, (req, res) => {
    const systemInfo = {
        uptime: process.uptime(),
        memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        cpuUsage: Math.random() * 100, // 임시 CPU 사용률
        socketConnections: Math.floor(Math.random() * 50) + 10, // 임시 소켓 연결 수
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
    };

    const response: ApiResponse = {
        success: true,
        data: systemInfo
    };

    res.json(response);
});

// 사용자 관리
router.get('/users', adminAuth, (req, res) => {
    const response: ApiResponse = {
        success: true,
        data: mockData.users
    };

    res.json(response);
});

router.post('/users', adminAuth, (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        const response: ApiResponse = {
            success: false,
            message: '모든 필드를 입력해주세요.'
        };
        return res.status(400).json(response);
    }

    const newUser = {
        id: mockData.users.length + 1,
        username,
        email,
        createdAt: new Date(),
        lastLogin: null,
        status: 'offline'
    };

    mockData.users.push(newUser);

    const response: ApiResponse = {
        success: true,
        data: newUser,
        message: '사용자가 성공적으로 추가되었습니다.'
    };

    res.json(response);
});

router.put('/users/:id', adminAuth, (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, email, status } = req.body;

    const userIndex = mockData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        const response: ApiResponse = {
            success: false,
            message: '사용자를 찾을 수 없습니다.'
        };
        return res.status(404).json(response);
    }

    if (username) mockData.users[userIndex].username = username;
    if (email) mockData.users[userIndex].email = email;
    if (status) mockData.users[userIndex].status = status;

    const response: ApiResponse = {
        success: true,
        data: mockData.users[userIndex],
        message: '사용자가 성공적으로 업데이트되었습니다.'
    };

    res.json(response);
});

router.delete('/users/:id', adminAuth, (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = mockData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        const response: ApiResponse = {
            success: false,
            message: '사용자를 찾을 수 없습니다.'
        };
        return res.status(404).json(response);
    }

    mockData.users.splice(userIndex, 1);

    const response: ApiResponse = {
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.'
    };

    res.json(response);
});

// 캐릭터 관리
router.get('/characters', adminAuth, (req, res) => {
    const response: ApiResponse = {
        success: true,
        data: mockData.characters
    };

    res.json(response);
});

router.post('/characters', adminAuth, (req, res) => {
    const { userId, name, level = 1 } = req.body;

    if (!userId || !name) {
        const response: ApiResponse = {
            success: false,
            message: '사용자 ID와 캐릭터 이름은 필수입니다.'
        };
        return res.status(400).json(response);
    }

    const newCharacter = {
        id: mockData.characters.length + 1,
        userId,
        name,
        level,
        health: 100,
        maxHealth: 100,
        mana: 50,
        maxMana: 50,
        strength: 10,
        defense: 8,
        speed: 10,
        experience: 0
    };

    mockData.characters.push(newCharacter);

    const response: ApiResponse = {
        success: true,
        data: newCharacter,
        message: '캐릭터가 성공적으로 생성되었습니다.'
    };

    res.json(response);
});

// 배틀 관리
router.get('/battles', adminAuth, (req, res) => {
    const { status } = req.query;

    let battles = mockData.battles;
    if (status && status !== 'all') {
        battles = battles.filter(b => b.status === status);
    }

    const response: ApiResponse = {
        success: true,
        data: battles
    };

    res.json(response);
});

router.post('/battles/:id/stop', adminAuth, (req, res) => {
    const battleId = parseInt(req.params.id);
    const battleIndex = mockData.battles.findIndex(b => b.id === battleId);

    if (battleIndex === -1) {
        const response: ApiResponse = {
            success: false,
            message: '배틀을 찾을 수 없습니다.'
        };
        return res.status(404).json(response);
    }

    mockData.battles[battleIndex].status = 'cancelled';

    const response: ApiResponse = {
        success: true,
        message: '배틀이 성공적으로 중단되었습니다.'
    };

    res.json(response);
});

// 스킬 관리
router.get('/skills', adminAuth, (req, res) => {
    const response: ApiResponse = {
        success: true,
        data: mockData.skills
    };

    res.json(response);
});

router.post('/skills', adminAuth, (req, res) => {
    const { name, description, manaCost, damage, cooldown, skillType } = req.body;

    if (!name || !description || manaCost === undefined || damage === undefined || 
        cooldown === undefined || !skillType) {
        const response: ApiResponse = {
            success: false,
            message: '모든 필드를 입력해주세요.'
        };
        return res.status(400).json(response);
    }

    const newSkill = {
        id: mockData.skills.length + 1,
        name,
        description,
        manaCost: parseInt(manaCost),
        damage: parseInt(damage),
        cooldown: parseInt(cooldown),
        skillType
    };

    mockData.skills.push(newSkill);

    const response: ApiResponse = {
        success: true,
        data: newSkill,
        message: '스킬이 성공적으로 추가되었습니다.'
    };

    res.json(response);
});

router.put('/skills/:id', adminAuth, (req, res) => {
    const skillId = parseInt(req.params.id);
    const { name, description, manaCost, damage, cooldown, skillType } = req.body;

    const skillIndex = mockData.skills.findIndex(s => s.id === skillId);
    if (skillIndex === -1) {
        const response: ApiResponse = {
            success: false,
            message: '스킬을 찾을 수 없습니다.'
        };
        return res.status(404).json(response);
    }

    const skill = mockData.skills[skillIndex];
    if (name) skill.name = name;
    if (description) skill.description = description;
    if (manaCost !== undefined) skill.manaCost = parseInt(manaCost);
    if (damage !== undefined) skill.damage = parseInt(damage);
    if (cooldown !== undefined) skill.cooldown = parseInt(cooldown);
    if (skillType) skill.skillType = skillType;

    const response: ApiResponse = {
        success: true,
        data: skill,
        message: '스킬이 성공적으로 업데이트되었습니다.'
    };

    res.json(response);
});

router.delete('/skills/:id', adminAuth, (req, res) => {
    const skillId = parseInt(req.params.id);
    const skillIndex = mockData.skills.findIndex(s => s.id === skillId);

    if (skillIndex === -1) {
        const response: ApiResponse = {
            success: false,
            message: '스킬을 찾을 수 없습니다.'
        };
        return res.status(404).json(response);
    }

    mockData.skills.splice(skillIndex, 1);

    const response: ApiResponse = {
        success: true,
        message: '스킬이 성공적으로 삭제되었습니다.'
    };

    res.json(response);
});

// 설정 관리
router.get('/settings', adminAuth, (req, res) => {
    const settings = {
        maxHealth: parseInt(process.env.MAX_HEALTH || '100'),
        maxMana: parseInt(process.env.MAX_MANA || '50'),
        baseDamage: parseInt(process.env.BASE_DAMAGE || '15'),
        turnTimeLimit: parseInt(process.env.TURN_TIME_LIMIT || '30000'),
        maxBattleTime: parseInt(process.env.MAX_BATTLE_TIME || '300000'),
        maxConcurrentBattles: 100,
        maintenanceMode: false
    };

    const response: ApiResponse = {
        success: true,
        data: settings
    };

    res.json(response);
});

router.put('/settings', adminAuth, (req, res) => {
    const { 
        maxHealth, 
        maxMana, 
        baseDamage, 
        turnTimeLimit, 
        maxBattleTime,
        maxConcurrentBattles,
        maintenanceMode 
    } = req.body;

    // TODO: 실제 설정 저장 구현
    console.log('설정 업데이트:', req.body);

    const response: ApiResponse = {
        success: true,
        message: '설정이 성공적으로 저장되었습니다.'
    };

    res.json(response);
});

// 로그 관리
router.get('/logs', adminAuth, (req, res) => {
    const { level, limit = 100 } = req.query;

    // 임시 로그 데이터
    const logs = [
        { level: 'info', message: '서버가 시작되었습니다.', timestamp: new Date() },
        { level: 'warn', message: 'CPU 사용률이 높습니다. (85%)', timestamp: new Date() },
        { level: 'error', message: '데이터베이스 연결 오류가 발생했습니다.', timestamp: new Date() },
        { level: 'info', message: '새로운 사용자가 등록했습니다: user123', timestamp: new Date() },
        { level: 'debug', message: 'Socket 연결: 15개', timestamp: new Date() }
    ];

    let filteredLogs = logs;
    if (level && level !== 'all') {
        filteredLogs = logs.filter(log => log.level === level);
    }

    filteredLogs = filteredLogs.slice(0, parseInt(limit as string));

    const response: ApiResponse = {
        success: true,
        data: filteredLogs
    };

    res.json(response);
});

router.delete('/logs', adminAuth, (req, res) => {
    // TODO: 실제 로그 삭제 구현
    console.log('로그 삭제 요청');

    const response: ApiResponse = {
        success: true,
        message: '로그가 성공적으로 삭제되었습니다.'
    };

    res.json(response);
});

export default router;