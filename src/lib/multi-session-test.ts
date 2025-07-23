// 다중 세션 테스트를 위한 스크립트
export async function testMultipleLogins() {
  console.log('🎮 다중 로그인 테스트 시작\n');

  const baseUrl = 'http://localhost:3001';
  const testAccounts = [
    { username: 'testuser1', password: 'test123' },
    { username: 'testuser2', password: 'test123' },
    { username: 'player1', password: 'password123' }
  ];

  console.log('다음 방법으로 여러 계정을 동시에 로그인할 수 있습니다:\n');

  console.log('방법 1: 브라우저 탭 사용');
  console.log('1. 첫 번째 계정으로 로그인');
  console.log('2. 로비에서 "다른 계정으로 로그인" 버튼 클릭');
  console.log('3. 새 탭에서 다른 계정으로 로그인');
  console.log('4. 각 탭에서 독립적으로 게임 진행 가능\n');

  console.log('방법 2: 다른 브라우저 사용');
  console.log('- Chrome에서 계정 1 로그인');
  console.log('- Firefox에서 계정 2 로그인');
  console.log('- Edge에서 계정 3 로그인\n');

  console.log('방법 3: 시크릿/프라이빗 모드 사용');
  console.log('- 일반 창: 계정 1');
  console.log('- 시크릿 창 1: 계정 2');
  console.log('- 시크릿 창 2: 계정 3\n');

  console.log('테스트 계정:');
  testAccounts.forEach(acc => {
    console.log(`- ${acc.username} / ${acc.password}`);
  });

  console.log('\n이제 여러 계정으로 동시에 로그인하여 서로 배틀할 수 있습니다!');
}