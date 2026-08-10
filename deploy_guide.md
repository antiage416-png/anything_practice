# 🌐 24시간 365일 무인 가동 클라우드 서버 배포 가이드 (Oracle Cloud / AWS EC2)

본 가이드는 PC를 꺼두어도 퀀트 시스템이 24시간 백그라운드에서 자동 가동되도록 **Oracle Cloud Always Free** 및 **AWS EC2 Free Tier** 가상 서버에 Docker 기반으로 배포하는 전체 과정을 담고 있습니다.

---

## 📋 목차
1. [방법 1. Oracle Cloud Always Free 배포 (평생 무료 - 가장 추천)](#-방법-1-oracle-cloud-always-free-배포-평생-무료---가장-추천)
2. [방법 2. AWS EC2 Free Tier 배포 (1년 무료)](#-방법-2-aws-ec2-free-tier-배포-1년-무료)
3. [3. Docker 1초 자동 배포 및 24시간 무인 가동](#-3-docker-1초-자동-배포-및-24시간-무인-가동)
4. [4. 방화벽 (8080 포트) 개방 및 대시보드 접속](#-4-방화벽-8080-포트-개방-및-대시보드-접속)

---

## 🧡 방법 1. Oracle Cloud Always Free 배포 (평생 무료 - 가장 추천)

오라클 클라우드는 **평생 무료(Always Free)** 인스턴스를 제공하여 퀀트 시스템 24시간 가동에 최적입니다.

### 1단계: 오라클 클라우드 인스턴스 생성
1. [Oracle Cloud (oracle.com/cloud/free)](https://www.oracle.com/cloud/free/) 회원가입 및 로그인.
2. 메인 화면에서 **`VM 인스턴스 생성 (Create VM Instance)`** 선택.
3. **이미지 및 형상 (Image and Shape)**:
   - **OS**: Ubuntu 22.04 LTS 또는 24.04 LTS 선택
   - **Shape**: `Ampere` (ARM 4 Core, 24GB RAM - Always Free) 또는 `VM.Standard.E2.1.Micro` (AMD - Always Free)
4. **SSH 키 추가**: `SSH 키 쌍 자동 생성` ➔ **`.key (개인 키 저장)`** 다운로드.
5. **`생성 (Create)`** 버튼 클릭하여 VM 개설 (약 1분 소요 ➔ `공용 IP 주소` 확인).

---

## 💛 방법 2. AWS EC2 Free Tier 배포 (1년 무료)

### 1단계: AWS EC2 인스턴스 생성
1. [AWS Console (aws.amazon.com)](https://aws.amazon.com/) 로그인 후 **EC2 Dashboard** 접속.
2. **`인스턴스 시작 (Launch Instance)`** 클릭.
3. **OS**: `Ubuntu Server 22.04 LTS` 선택.
4. **인스턴스 유형**: `t2.micro` 또는 `t3.micro` (Free Tier 사용 가능).
5. **키 페어**: 새 키 페어 생성 후 `.pem` 키 파일 다운로드.
6. **보안 그룹 (Security Group)**:
   - SSH (Port 22) - 위치 지정
   - 사용자 지정 TCP (Port 8080) - `0.0.0.0/0` (웹 대시보드 관제용 포트)

---

## 🐳 3. Docker 1초 자동 배포 및 24시간 무인 가동

클라우드 서버(Ubuntu)에 접속하여 깃허브 코드를 가져온 뒤 Docker로 24시간 백그라운드 구동합니다.

### 1단계: SSH를 통해 클라우드 서버 접속 (Windows PowerShell)
```powershell
# 다운로드받은 키 파일 위치로 이동 후 접속 (IP주소는 본인 서버 IP 입력)
ssh -i "your-key.pem" ubuntu@YOUR_SERVER_PUBLIC_IP
```

### 2단계: Ubuntu 필수 프로그램 & Docker 설치 (서버 터미널)
```bash
# 시스템 업데이트 및 Docker, Git 설치
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-v2

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 실행 가능하도록)
sudo usermod -aG docker $USER
newgrp docker
```

### 3단계: 깃허브 코드 클론 & Docker 컨테이너 1초 가동
```bash
# 깃허브 리포지토리 클론
git clone https://github.com/antiage416-png/anything_practice.git
cd anything_practice

# Docker Compose로 24/7 무인 자동 가동 시작
docker compose up -d --build
```

- **`-d` 옵션**: 서버 접속을 끊거나 터미널을 닫아도 백그라운드에서 24시간 365일 계속 가동됩니다.
- **`restart: always` 설정**: 서버가 재부팅되어도 컨테이너가 자동으로 다시 켜집니다.

---

## 🔓 4. 방화벽 (8080 포트) 개방 및 대시보드 접속

웹 대시보드(`http://YOUR_SERVER_IP:8080`)에 외부 스마트폰이나 PC에서 접속할 수 있도록 방화벽 포트를 열어줍니다.

### Ubuntu OS 내부 방화벽 개방 (서버 터미널)
```bash
# Ubuntu ufw 방화벽 및 iptables 포트 8080 허용
sudo ufw allow 8080/tcp
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
```

### Oracle Cloud 수신 규칙 (Ingress Rules) 추가 (오라클 웹 콘솔)
1. 오라클 웹 콘솔 ➔ **`인스턴스 세부정보`** ➔ **`기본 VNIC`** ➔ **`서브넷`** 클릭.
2. **`보안 목록 (Security Lists)`** ➔ **`Default Security List`** 선택.
3. **`수신 규칙 추가 (Add Ingress Rules)`**:
   - **소스 CIDR**: `0.0.0.0/0`
   - **대상 포트 범위**: `8080`
   - **설명**: `Quant Web Dashboard Port`

---

## 📱 접속 및 모니터링 확인

이제 언제 어디서나 브라우저를 열고 접속할 수 있습니다:
👉 **`http://YOUR_SERVER_PUBLIC_IP:8080`**

### 실행 상태 확인 명령어
```bash
# 컨테이너 가동 상태 확인
docker ps

# 퀀트 엔진 텔레메트리 실시간 로그 확인
docker logs -f quant_trading_system
```
