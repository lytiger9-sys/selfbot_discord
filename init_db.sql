CREATE DATABASE IF NOT EXISTS bot_db;
USE bot_db;

-- 라이센스 테이블
CREATE TABLE IF NOT EXISTS licenses (
    id VARCHAR(50) PRIMARY KEY,
    duration_days INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(50) DEFAULT NULL,
    token TEXT DEFAULT NULL,
    start_date DATETIME DEFAULT NULL,
    expiry_date DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 설정 테이블
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(50) PRIMARY KEY,
    afk_enabled BOOLEAN DEFAULT FALSE,
    afk_message TEXT,
    partner_message TEXT,
    streaming_text TEXT,
    rpc_text TEXT,
    large_image_url TEXT,
    small_image_url TEXT,
    token TEXT
);

-- 파트너 서버 목록
CREATE TABLE IF NOT EXISTS partner_servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50),
    channel_id VARCHAR(50),
    UNIQUE KEY unique_partner_channel_per_user (user_id, channel_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 파트너 자동 전송 스케줄 상태
CREATE TABLE IF NOT EXISTS partner_automation_settings (
    user_id VARCHAR(50) PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    last_sent_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 서버 템플릿 저장 테이블
CREATE TABLE IF NOT EXISTS guild_templates (
    owner_id VARCHAR(50) PRIMARY KEY,
    source_guild_id VARCHAR(50) NOT NULL,
    source_guild_name VARCHAR(255) NOT NULL,
    template_data LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
