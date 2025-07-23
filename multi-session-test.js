// 다중 세션 테스트 가이드
console.log('🎮 Online Text Battle - 다중 로그인 테스트 가이드\n');
console.log('==========================================\n');

console.log('📌 여러 계정을 동시에 로그인하는 방법:\n');

console.log('1️⃣ 브라우저 탭을 이용한 방법 (권장)');
console.log('   - 첫 번째 계정으로 로그인');
console.log('   - 로비에서 "다른 계정으로 로그인" 버튼 클릭');
console.log('   - 새 탭이 열리면 다른 계정으로 로그인');
console.log('   - 각 탭은 독립적인 세션으로 작동\n');

console.log('2️⃣ 다른 브라우저 사용');
console.log('   - Chrome: testuser1 로그인');
console.log('   - Firefox: testuser2 로그인');
console.log('   - Edge: player1 로그인\n');

console.log('3️⃣ 시크릿/프라이빗 모드 활용');
console.log('   - 일반 창: 계정 1');
console.log('   - 시크릿 창: 계정 2');
console.log('   - 다른 시크릿 창: 계정 3\n');

console.log('📝 테스트 시나리오:');
console.log('1. 두 계정으로 각각 로그인');
console.log('2. 각 계정에서 캐릭터 생성');
console.log('3. 한 계정에서 "배틀 시작" 클릭');
console.log('4. 다른 계정도 "배틀 시작" 클릭');
console.log('5. 자동으로 매칭되어 배틀 진행\n');

console.log('🔑 테스트 계정:');
console.log('   - testuser1 / test123');
console.log('   - testuser2 / test123');
console.log('   - player1 / password123\n');

console.log('🌐 접속 URL: http://localhost:3001');
console.log('🌐 새 세션 URL: http://localhost:3001/?new=true\n');

console.log('✨ 이제 여러 계정으로 동시에 접속하여 실시간 배틀을 즐기세요!');