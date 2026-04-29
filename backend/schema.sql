-- BackSpace Database Schema (Python/React compatible)
-- IMPORTANT: users table uses user_id as PK (matching original schema)
-- All other tables use id as PK
-- Foreign keys to users use user_id column

CREATE DATABASE IF NOT EXISTS backspace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE backspace_db;

-- ─── USERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    storage_limit BIGINT DEFAULT 53687091200,
    account_status ENUM('active','inactive','suspended','deleted') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    reset_token VARCHAR(100),
    reset_token_expires DATETIME,
    last_login DATETIME,
    last_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    INDEX idx_email (email),
    INDEX idx_status (account_status),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── USER SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    theme ENUM('light','dark','auto') DEFAULT 'auto',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    email_uploads BOOLEAN DEFAULT TRUE,
    email_sharing BOOLEAN DEFAULT TRUE,
    email_storage BOOLEAN DEFAULT TRUE,
    email_security BOOLEAN DEFAULT TRUE,
    email_updates BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    storage_warning_threshold INT DEFAULT 80,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── FILES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(500),
    original_name VARCHAR(500) NOT NULL,
    file_type ENUM('document','image','video','audio','archive','other') DEFAULT 'other',
    mime_type VARCHAR(100),
    size BIGINT NOT NULL DEFAULT 0,
    telegram_file_id VARCHAR(500),
    telegram_message_id VARCHAR(500),
    telegram_channel_id VARCHAR(500),
    parent_folder_id INT DEFAULT 0,
    is_folder BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(100) UNIQUE,
    deleted_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_trashed (user_id, is_trashed),
    INDEX idx_created_at (created_at),
    INDEX idx_parent (parent_folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SHARE LINKS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_id INT NOT NULL,
    share_token VARCHAR(32) NOT NULL UNIQUE,
    expiry_date DATETIME NULL,
    access_limit INT NULL,
    password_hash VARCHAR(255) NULL,
    allow_download TINYINT(1) DEFAULT 1,
    restriction_type ENUM('anyone','email','domain') DEFAULT 'anyone',
    restriction_value TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME NULL,
    INDEX idx_user (user_id),
    INDEX idx_token (share_token),
    INDEX idx_file (file_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SHARE ACCESS LOG ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS share_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    share_link_id INT NOT NULL,
    access_type ENUM('view','download') NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_share_link (share_link_id),
    FOREIGN KEY (share_link_id) REFERENCES share_links(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ACTIVITY LOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TELEGRAM CONFIG ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bot_token VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    admin_user_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO telegram_config (bot_token, channel_id, admin_user_id)
VALUES ('8206630703:AAFlvC13XGlPyAE4xsdAVihlJIDenfJ4Atk', '-1003871803306', '@Kannan12221');

