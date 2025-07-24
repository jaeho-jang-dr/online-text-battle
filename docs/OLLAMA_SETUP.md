# Ollama AI 설정 가이드

## Ollama란?
Ollama는 로컬에서 실행되는 오픈소스 AI 모델 실행 도구입니다. 
온라인 텍스트 배틀에서는 더 정교한 승부 판정을 위해 사용됩니다.

## Railway에서 Ollama 사용하기

### 옵션 1: Ollama 없이 사용 (추천) ✅
- 환경 변수를 설정하지 않으면 자동으로 기본 판정 시스템 사용
- 충분히 재미있고 공정한 판정 제공
- 추가 설정 불필요

### 옵션 2: 클라우드 Ollama 서비스 사용
1. **Replicate** (https://replicate.com)
   ```bash
   OLLAMA_API_URL=https://api.replicate.com/v1
   OLLAMA_MODEL=meta/llama-2-7b-chat
   REPLICATE_API_TOKEN=your-api-token
   ```

2. **Together AI** (https://together.ai)
   ```bash
   OLLAMA_API_URL=https://api.together.xyz
   OLLAMA_MODEL=togethercomputer/llama-2-7b-chat
   TOGETHER_API_KEY=your-api-key
   ```

### 옵션 3: 자체 Ollama 서버 운영
1. **VPS에 Ollama 설치** (예: DigitalOcean, AWS EC2)
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama serve --host 0.0.0.0
   ```

2. **Railway에 설정**
   ```bash
   OLLAMA_API_URL=http://your-server-ip:11434
   OLLAMA_MODEL=llama2
   ```

### 옵션 4: 로컬 Ollama + Ngrok (개발/테스트용)
1. **로컬에 Ollama 설치**
   - Windows: https://ollama.com/download/windows
   - Mac: `brew install ollama`
   - Linux: `curl -fsSL https://ollama.com/install.sh | sh`

2. **모델 다운로드**
   ```bash
   ollama pull llama2
   ollama pull gemma:2b  # 더 가벼운 모델
   ```

3. **Ollama 실행**
   ```bash
   ollama serve
   ```

4. **Ngrok으로 공개**
   ```bash
   # Ngrok 설치 후
   ngrok http 11434
   ```

5. **생성된 URL을 Railway에 설정**
   ```bash
   OLLAMA_API_URL=https://abc123.ngrok.io
   OLLAMA_MODEL=gemma:2b
   ```

## 추천 모델
- `gemma:2b` - 가장 가벼움, 빠른 응답
- `llama2:7b` - 균형잡힌 성능
- `mistral:7b` - 고품질 판정

## 주의사항
1. Ngrok 무료 버전은 8시간마다 URL이 변경됨
2. 클라우드 서비스는 대부분 유료
3. Ollama 없이도 게임은 완벽하게 작동함