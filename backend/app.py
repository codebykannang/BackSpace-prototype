"""
BackSpace Flask API
- Files are uploaded to a Telegram private channel in 19 MB chunks
  (Telegram public getFile API limit = 20 MB per file)
- On download all chunks are fetched in order and streamed as one file
- Share link download works the same way (no auth cookie needed)
"""
from flask import Flask, request, jsonify, send_file, session, Response, stream_with_context
from flask_cors import CORS
from flask_session import Session
import mysql.connector
from mysql.connector import Error
import bcrypt
import os, secrets, tempfile, io
try:
    from dotenv import load_dotenv
    _parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(_parent_env):
        load_dotenv(_parent_env)
    load_dotenv()
except ImportError:
    pass

from datetime import datetime, timedelta
from functools import wraps

try:
    import requests as req_lib
    _requests_ok = True
except ImportError:
    req_lib = None
    _requests_ok = False

# ─── APP CONFIG ────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'backspace-2D5A4F-secret-2024')

_session_dir = os.path.join(os.path.dirname(__file__), 'flask_session')
os.makedirs(_session_dir, exist_ok=True)
app.config['SESSION_TYPE']        = 'filesystem'
app.config['SESSION_FILE_DIR']    = _session_dir
app.config['SESSION_PERMANENT']   = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# No local storage — files live on Telegram.
# We still keep the folder in case of temp usage.
_upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(_upload_dir, exist_ok=True)
app.config['UPLOAD_FOLDER']          = _upload_dir
app.config['MAX_CONTENT_LENGTH']     = 10 * 1024 * 1024 * 1024   # 10 GB hard cap

Session(app)

_allowed_origins = os.environ.get(
    'CORS_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000'
).split(',')
CORS(app, supports_credentials=True, origins=_allowed_origins)

DB = {
    'host':     os.environ.get('DB_HOST', 'localhost'),
    'user':     os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASS', ''),
    'database': os.environ.get('DB_NAME', 'backspace_db'),
    'charset':  'utf8mb4',
}

TG_API      = 'https://api.telegram.org'
CHUNK_SIZE  = 19 * 1024 * 1024   # 19 MB — safely under the 20 MB getFile limit

# ─── DB / UTIL ─────────────────────────────────────────────────────────────────

def db():
    try:
        return mysql.connector.connect(**DB)
    except Error as e:
        print(f"============================================================")
        print(f"DATABASE CONNECTION ERROR:")
        print(f"Could not connect to MySQL server at {DB['host']}.")
        print(f"Details: {e}")
        print(f"Please ensure MySQL is running and database configuration in your .env is correct.")
        print(f"Current Config -> Host: {DB['host']}, User: {DB['user']}, Database: {DB['database']}")
        print(f"============================================================")
        return None

def fmt_size(b):
    if not b: return '0 B'
    units = ['B','KB','MB','GB','TB']
    i, v = 0, float(b)
    while v >= 1024 and i < 4:
        v /= 1024; i += 1
    return f'{v:.2f} {units[i]}'

def file_type(name):
    ext = name.rsplit('.',1)[-1].lower() if '.' in name else ''
    if ext in {'jpg','jpeg','png','gif','bmp','webp','svg'}: return 'image'
    if ext in {'mp4','avi','mov','wmv','flv','mkv','webm'}:  return 'video'
    if ext in {'mp3','wav','ogg','m4a','flac'}:              return 'audio'
    if ext in {'zip','rar','7z','tar','gz'}:                 return 'archive'
    if ext in {'pdf','doc','docx','xls','xlsx','ppt','pptx','txt','rtf','csv'}: return 'document'
    return 'other'

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def send_email(to_email, subject, html_body):
    """Utility to send HTML emails via SMTP (e.g. Gmail). Fail-safe so server doesn't crash."""
    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT')
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASSWORD')
    smtp_from = os.environ.get('SMTP_FROM', 'BackSpace <noreply@backspace.cloud>')

    if not smtp_server or not smtp_user or not smtp_pass:
        print("SMTP NOT CONFIG: Email sending bypassed (please fill in SMTP config in .env)")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = to_email

        part = MIMEText(html_body, 'html')
        msg.attach(part)

        port = int(smtp_port or 587)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_server, port, timeout=10)
        else:
            server = smtplib.SMTP(smtp_server, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())
        server.quit()
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"SMTP Error: {e}")
        return False

def send_welcome_email(email, username):
    subject = "Welcome to BackSpace — Unlimited Cloud Storage! 🚀"
    html = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; background-color: #f4fbfa; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #111c1a; border: 1px solid #e0eae8;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a3d34; font-family: 'Syne', sans-serif; font-size: 28px; margin: 0;">BackSpace</h1>
            <p style="color: #7a9e99; font-size: 14px; margin-top: 5px;">Unlimited Cloud Storage</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e0eae8; margin: 20px 0;"/>
        <p style="font-size: 16px; line-height: 1.6;">Hello <strong>{username}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for registering at BackSpace! Your unlimited cloud storage space has been activated.</p>
        <div style="background-color: #ffffff; border: 1px solid #c8deda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1a3d34;">Account Details:</h3>
            <ul style="padding-left: 20px; margin-bottom: 0; font-size: 14px; line-height: 1.6;">
                <li><strong>Username:</strong> {username}</li>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Storage Capacity:</strong> Unlimited</li>
            </ul>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">You can drag & drop files up to 5 GB to store them securely. All file parts are split and uploaded using secure Telegram channels.</p>
        <hr style="border: 0; border-top: 1px solid #e0eae8; margin: 30px 0 20px;"/>
        <p style="font-size: 12px; color: #7a9e99; text-align: center; margin: 0;">© 2026 BackSpace. All rights reserved.</p>
    </div>
    """
    return send_email(email, subject, html)

def send_password_change_email(email, username):
    subject = "Security Alert: BackSpace Password Changed 🔒"
    html = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; background-color: #fef2f2; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #991b1b; border: 1px solid #fca5a5;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #991b1b; font-family: 'Syne', sans-serif; font-size: 28px; margin: 0;">BackSpace Security Alert</h1>
        </div>
        <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 20px 0;"/>
        <p style="font-size: 16px; line-height: 1.6; color: #111c1a;">Hello <strong>{username}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: #111c1a;">This is an automated notification to alert you that the password for your BackSpace account was changed recently.</p>
        <div style="background-color: #ffffff; border: 1px solid #fca5a5; padding: 15px; border-radius: 8px; margin: 20px 0; color: #111c1a;">
            <p style="margin: 0; font-size: 14px; line-height: 1.6;"><strong>Time of change:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #7a9e99;">If you initiated this change, no action is required. If you did NOT authorize this change, please contact support immediately at <strong>theprozenix@gmail.com</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 30px 0 20px;"/>
        <p style="font-size: 12px; color: #7a9e99; text-align: center; margin: 0;">© 2026 BackSpace. All rights reserved.</p>
    </div>
    """
    return send_email(email, subject, html)

def send_share_link_email(email, username, filename, share_url):
    subject = "Your Shareable Link is Ready! 🔗"
    html = f"""
    <div style="font-family: 'DM Sans', Arial, sans-serif; background-color: #f4fbfa; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #111c1a; border: 1px solid #e0eae8;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1a3d34; font-family: 'Syne', sans-serif; font-size: 28px; margin: 0;">BackSpace Sharing</h1>
        </div>
        <hr style="border: 0; border-top: 1px solid #e0eae8; margin: 20px 0;"/>
        <p style="font-size: 16px; line-height: 1.6;">Hello <strong>{username}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">You have generated a secure sharing link for your file:</p>
        <div style="background-color: #ffffff; border: 1px solid #c8deda; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all;">
            <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>File:</strong> {filename}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Link URL:</strong> <a href="{share_url}" style="color: #2d6b5c; font-weight: 600;">{share_url}</a></p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">You can revoke or manage this link anytime via the Sharing tab in your dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #e0eae8; margin: 30px 0 20px;"/>
        <p style="font-size: 12px; color: #7a9e99; text-align: center; margin: 0;">© 2026 BackSpace. All rights reserved.</p>
    </div>
    """
    return send_email(email, subject, html)

def log(user_id, action, details=''):
    c = db()
    if not c: return
    try:
        cur = c.cursor()
        cur.execute(
            'INSERT INTO activity_log (user_id,action,details,ip_address,user_agent) VALUES (%s,%s,%s,%s,%s)',
            (user_id, action, details, request.remote_addr, request.headers.get('User-Agent','')[:200])
        )
        c.commit()
    finally:
        c.close()

def auth(f):
    @wraps(f)
    def wrap(*a, **kw):
        if 'user_id' not in session or 'session_token' not in session:
            session.clear()
            return jsonify({'success':False,'error':'Not authenticated'}), 401
        c = db()
        if not c:
            # Fallback if DB connection fails temporarily
            return f(*a, **kw)
        try:
            cur = c.cursor(dictionary=True)
            cur.execute(
                'SELECT session_id FROM user_sessions '
                'WHERE user_id=%s AND session_token=%s AND is_active=1',
                (session['user_id'], session['session_token'])
            )
            if not cur.fetchone():
                session.clear()
                return jsonify({'success':False,'error':'Session expired or revoked'}), 401
        finally:
            c.close()
        return f(*a, **kw)
    return wrap

def ser(row):
    if not row: return row
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in row.items()}

def ensure_file_parts_table(cur):
    pass

def ensure_db_schema():
    """Ensure all required tables exist on application startup."""
    c = db()
    if not c:
        return
    try:
        cur = c.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS file_parts (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                file_id      INT NOT NULL,
                part_number  INT NOT NULL,
                telegram_file_id VARCHAR(500) NOT NULL,
                part_size    BIGINT DEFAULT 0,
                INDEX idx_file_part (file_id, part_number),
                FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_user_sess (user_id, is_active),
                INDEX idx_token (session_token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        c.commit()
        print("Database migration check passed.")
    except Exception as e:
        print(f"Database Migration Error: {e}")
    finally:
        c.close()

# Run database schema verification on boot
ensure_db_schema()

# ─── TELEGRAM ──────────────────────────────────────────────────────────────────

def tg_config():
    # Try environment variables first
    env_token = os.environ.get('TG_BOT_TOKEN')
    env_channel = os.environ.get('TG_CHANNEL_ID')
    if env_token and env_channel:
        return env_token.strip(), env_channel.strip()

    c = db()
    if not c: return None, None
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT bot_token,channel_id FROM telegram_config WHERE is_active=1 LIMIT 1')
        row = cur.fetchone()
        if not row or 'YOUR_BOT_TOKEN' in (row['bot_token'] or ''):
            return None, None
        return row['bot_token'], row['channel_id']
    finally:
        c.close()

def tg_upload_chunk(bot_token, channel_id, chunk_bytes, part_name, mime):
    """Upload one chunk (≤19 MB) to Telegram. Returns telegram_file_id."""
    if not _requests_ok:
        raise RuntimeError("'requests' not installed — run: pip install requests")
    resp = req_lib.post(
        f'{TG_API}/bot{bot_token}/sendDocument',
        data={'chat_id': channel_id},
        files={'document': (part_name, chunk_bytes, mime or 'application/octet-stream')},
        timeout=300
    )
    data = resp.json()
    if not data.get('ok'):
        raise RuntimeError(f"Telegram upload failed: {data.get('description','unknown')}")
    msg = data['result']
    doc = (msg.get('document') or msg.get('video') or msg.get('audio') or
           msg.get('animation') or (msg.get('photo') or [{}])[-1] or {})
    return str(doc.get('file_id', ''))

def tg_get_file_url(bot_token, telegram_file_id):
    """Resolve a telegram_file_id to a direct HTTPS URL (≤20 MB files only)."""
    if not _requests_ok:
        raise RuntimeError("'requests' not installed")
    resp = req_lib.get(
        f'{TG_API}/bot{bot_token}/getFile',
        params={'file_id': telegram_file_id},
        timeout=30
    )
    data = resp.json()
    if not data.get('ok'):
        raise RuntimeError(f"Telegram getFile failed: {data.get('description','unknown')}")
    return f"{TG_API}/file/bot{bot_token}/{data['result']['file_path']}"

def tg_iter_part(bot_token, telegram_file_id):
    """Generator: stream one Telegram part chunk-by-chunk."""
    url = tg_get_file_url(bot_token, telegram_file_id)
    r = req_lib.get(url, stream=True, timeout=300)
    if r.status_code != 200:
        raise RuntimeError(f"Telegram part fetch HTTP {r.status_code}")
    for chunk in r.iter_content(chunk_size=65536):
        if chunk:
            yield chunk

def build_download_response(bot_token, parts, original_name, total_size):
    """
    Stream all parts (list of telegram_file_ids ordered by part_number)
    back to the browser as a single continuous download.
    """
    safe_name = original_name.replace('"', '_')

    @stream_with_context
    def generate():
        for tg_fid in parts:
            yield from tg_iter_part(bot_token, tg_fid)

    headers = {
        'Content-Disposition': f'attachment; filename="{safe_name}"',
        'Content-Type': 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
    }
    if total_size:
        headers['Content-Length'] = str(total_size)

    return Response(generate(), headers=headers, status=200)

def get_file_parts(cur, file_id):
    """Return list of telegram_file_ids for a file, ordered by part_number."""
    cur.execute(
        'SELECT telegram_file_id FROM file_parts WHERE file_id=%s ORDER BY part_number ASC',
        (file_id,)
    )
    return [row['telegram_file_id'] for row in cur.fetchall()]

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
def register():
    d = request.get_json() or {}
    email    = d.get('email','').strip().lower()
    password = d.get('password','')
    confirm  = d.get('confirm_password','')

    if not email or not password or not confirm:
        return jsonify({'success':False,'error':'All fields required'})
    if password != confirm:
        return jsonify({'success':False,'error':'Passwords do not match'})
    if len(password) < 8:
        return jsonify({'success':False,'error':'Password must be at least 8 characters'})

    base = ''.join(c for c in email.split('@')[0] if c.isalnum()) or 'user'
    if len(base) < 3: base += str(secrets.randbelow(900)+100)

    c = db()
    if not c: return jsonify({'success':False,'error':'Database connection failed'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT user_id FROM users WHERE email=%s', (email,))
        if cur.fetchone():
            return jsonify({'success':False,'error':'Email already registered'})

        username = base; n = 1
        while True:
            cur.execute('SELECT user_id FROM users WHERE username=%s', (username,))
            if not cur.fetchone(): break
            username = f'{base}{n}'; n += 1

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            'INSERT INTO users (username,email,password_hash,full_name) VALUES (%s,%s,%s,%s)',
            (username, email, pw_hash, username)
        )
        uid = cur.lastrowid
        cur.execute('INSERT INTO user_settings (user_id) VALUES (%s)', (uid,))
        
        # Create session token
        token = secrets.token_hex(32)
        cur.execute(
            'INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent) '
            'VALUES (%s, %s, %s, %s)',
            (uid, token, request.remote_addr, request.headers.get('User-Agent','')[:255])
        )
        c.commit()

        session['user_id']  = uid
        session['username'] = username
        session['email']    = email
        session['session_token'] = token
        
        log(uid, 'register', email)
        
        # Send registration welcome email in background/safely
        send_welcome_email(email, username)
        
        return jsonify({'success':True,'user':{'id':uid,'username':username,'email':email}})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.get_json() or {}
    email    = d.get('email','').strip().lower()
    password = d.get('password','')
    if not email or not password:
        return jsonify({'success':False,'error':'Email and password required'})

    c = db()
    if not c: return jsonify({'success':False,'error':'Database connection failed'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            "SELECT user_id,username,email,password_hash,full_name,avatar_url "
            "FROM users WHERE email=%s AND account_status='active'", (email,)
        )
        u = cur.fetchone()
        if not u or not bcrypt.checkpw(password.encode(), u['password_hash'].encode()):
            return jsonify({'success':False,'error':'Invalid email or password'})
        # Create session token
        token = secrets.token_hex(32)
        cur.execute(
            'INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent) '
            'VALUES (%s, %s, %s, %s)',
            (u['user_id'], token, request.remote_addr, request.headers.get('User-Agent','')[:255])
        )
        cur.execute('UPDATE users SET last_login=NOW(),last_ip=%s WHERE user_id=%s',
                    (request.remote_addr, u['user_id']))
        c.commit()
        session['user_id']  = u['user_id']
        session['username'] = u['username']
        session['email']    = u['email']
        session['session_token'] = token
        log(u['user_id'], 'login', email)
        return jsonify({'success':True,'user':{
            'id':u['user_id'],'username':u['username'],
            'email':u['email'],'full_name':u['full_name'],'avatar_url':u['avatar_url'],
        }})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    uid = session.get('user_id')
    token = session.get('session_token')
    if uid:
        log(uid, 'logout')
        if token:
            c = db()
            if c:
                try:
                    cur = c.cursor()
                    cur.execute(
                        'UPDATE user_sessions SET is_active=0 WHERE user_id=%s AND session_token=%s',
                        (uid, token)
                    )
                    c.commit()
                except Exception as e:
                    print(f"Logout session deactivation error: {e}")
                finally:
                    c.close()
    session.clear()
    return jsonify({'success':True})


@app.route('/api/auth/me', methods=['GET'])
@auth
def me():
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            'SELECT user_id AS id,username,email,full_name,avatar_url,bio,created_at '
            'FROM users WHERE user_id=%s', (session['user_id'],)
        )
        return jsonify({'success':True,'user':ser(cur.fetchone())})
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# STATS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/stats', methods=['GET'])
@auth
def stats():
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT COALESCE(SUM(size),0) AS t FROM files WHERE user_id=%s AND is_trashed=0',(uid,))
        total_bytes = int(cur.fetchone()['t'])
        cur.execute('SELECT COUNT(*) AS c FROM files WHERE user_id=%s AND is_trashed=0 AND is_folder=0',(uid,))
        total_files = cur.fetchone()['c']
        cur.execute('SELECT COUNT(*) AS c FROM share_links WHERE user_id=%s AND is_active=1',(uid,))
        shared = cur.fetchone()['c']
        cur.execute('SELECT COUNT(*) AS c FROM activity_log WHERE user_id=%s AND created_at>=NOW()-INTERVAL 1 DAY',(uid,))
        activity = cur.fetchone()['c']
        cur.execute("""
            SELECT file_type,COALESCE(SUM(size),0) AS s
            FROM files WHERE user_id=%s AND is_trashed=0 AND is_folder=0 GROUP BY file_type
        """, (uid,))
        by_type = {}
        for r in cur.fetchall():
            s = int(r['s'])
            pct = round(s/total_bytes*100,1) if total_bytes else 0
            by_type[r['file_type']] = {'size':fmt_size(s),'bytes':s,'percentage':pct}
        cur.execute("""
            SELECT id,original_name,file_type,size,created_at
            FROM files WHERE user_id=%s AND is_trashed=0 AND is_folder=0
            ORDER BY created_at DESC LIMIT 8
        """, (uid,))
        recent = [dict(ser(f), size_fmt=fmt_size(f['size'])) for f in cur.fetchall()]
        return jsonify({'success':True,
            'stats':{'total_storage':fmt_size(total_bytes),'total_storage_bytes':total_bytes,
                     'total_files':total_files,'shared_links':shared,
                     'recent_activity':activity,'storage_by_type':by_type},
            'recent_files':recent})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# FILES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/files', methods=['GET'])
@auth
def list_files():
    uid = session['user_id']
    fid = int(request.args.get('folder_id', 0))
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT id,original_name,file_type,size,is_folder,parent_folder_id,
                   created_at,updated_at,is_public,share_token
            FROM files WHERE user_id=%s AND parent_folder_id=%s AND is_trashed=0
            ORDER BY is_folder DESC,created_at DESC
        """, (uid, fid))
        files = [dict(ser(f), size_fmt=fmt_size(f['size'])) for f in cur.fetchall()]
        bc, cur_id = [], fid
        while cur_id > 0:
            cur.execute(
                'SELECT id,original_name,parent_folder_id FROM files WHERE id=%s AND user_id=%s AND is_folder=1',
                (cur_id, uid)
            )
            row = cur.fetchone()
            if row: bc.insert(0,{'id':row['id'],'name':row['original_name']}); cur_id=row['parent_folder_id']
            else: break
        return jsonify({'success':True,'files':files,'breadcrumb':bc})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/files/search', methods=['GET'])
@auth
def search_files():
    uid = session['user_id']
    q = request.args.get('q','').strip()
    if not q: return jsonify({'success':True,'files':[]})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT id,original_name,file_type,size,is_folder,parent_folder_id,created_at
            FROM files WHERE user_id=%s AND is_trashed=0 AND original_name LIKE %s
            ORDER BY created_at DESC LIMIT 20
        """, (uid, f'%{q}%'))
        files = [dict(ser(f), size_fmt=fmt_size(f['size'])) for f in cur.fetchall()]
        return jsonify({'success':True,'files':files})
    finally:
        c.close()


@app.route('/api/files/create-folder', methods=['POST'])
@auth
def create_folder():
    uid = session['user_id']
    d   = request.get_json() or {}
    name = d.get('name','').strip()
    pid  = int(d.get('parent_folder_id', 0))
    if not name: return jsonify({'success':False,'error':'Name required'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute(
            "INSERT INTO files (user_id,original_name,file_type,size,is_folder,parent_folder_id) "
            "VALUES (%s,%s,'other',0,1,%s)", (uid, name, pid)
        )
        fid = cur.lastrowid; c.commit()
        log(uid, 'create_folder', name)
        return jsonify({'success':True,'folder_id':fid})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/files/upload', methods=['POST'])
@auth
def upload_file():
    uid = session['user_id']
    if 'file' not in request.files:
        return jsonify({'success':False,'error':'No file provided'})
    f   = request.files['file']
    pid = int(request.form.get('parent_folder_id', 0))
    if not f.filename:
        return jsonify({'success':False,'error':'Empty filename'})

    orig = f.filename
    ft   = file_type(orig)
    mime = f.content_type or 'application/octet-stream'

    bot_token, channel_id = tg_config()
    if not bot_token or not channel_id:
        return jsonify({'success':False,
                        'error':'Telegram not configured. Update bot_token and channel_id in telegram_config table.'})

    # ── Stream the upload to a temp file so we can handle GB-level files ──────
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, dir=_upload_dir, suffix='.tmp') as tmp:
            tmp_path = tmp.name
            f.save(tmp)

        total_size = os.path.getsize(tmp_path)

        # ── Split into CHUNK_SIZE parts and upload each to Telegram ───────────
        part_ids = []   # list of (part_number, telegram_file_id, chunk_size)
        part_num = 0
        with open(tmp_path, 'rb') as fh:
            while True:
                chunk = fh.read(CHUNK_SIZE)
                if not chunk:
                    break
                part_num += 1
                part_name = f'{orig}.part{part_num:04d}' if total_size > CHUNK_SIZE else orig
                try:
                    tg_fid = tg_upload_chunk(bot_token, channel_id, chunk, part_name, mime)
                except Exception as e:
                    return jsonify({'success':False,'error':f'Telegram upload error (part {part_num}): {str(e)}'})
                part_ids.append((part_num, tg_fid, len(chunk)))

        # ── Save metadata to DB ───────────────────────────────────────────────
        first_tg_fid = part_ids[0][1] if part_ids else ''
        c = db()
        if not c: return jsonify({'success':False,'error':'DB error'})
        try:
            cur = c.cursor()
            ensure_file_parts_table(cur)
            cur.execute(
                'INSERT INTO files '
                '(user_id,original_name,name,file_type,mime_type,size,'
                ' telegram_file_id,telegram_channel_id,is_folder,parent_folder_id) '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,0,%s)',
                (uid, orig, orig, ft, mime, total_size,
                 first_tg_fid, channel_id, pid)
            )
            file_db_id = cur.lastrowid
            # Store every part
            cur.executemany(
                'INSERT INTO file_parts (file_id,part_number,telegram_file_id,part_size) VALUES (%s,%s,%s,%s)',
                [(file_db_id, pn, tfid, ps) for pn, tfid, ps in part_ids]
            )
            c.commit()
            log(uid, 'upload', f'{orig} ({len(part_ids)} parts)')
            return jsonify({'success':True,'file_id':file_db_id,
                            'name':orig,'size':fmt_size(total_size),
                            'parts':len(part_ids)})
        except Exception as e:
            return jsonify({'success':False,'error':str(e)})
        finally:
            c.close()

    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try: os.remove(tmp_path)
            except: pass


@app.route('/api/files/<int:fid>/delete', methods=['POST'])
@auth
def delete_file(fid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute('UPDATE files SET is_trashed=1 WHERE id=%s AND user_id=%s',(fid,uid))
        cur.execute('UPDATE files SET is_trashed=1 WHERE parent_folder_id=%s AND user_id=%s',(fid,uid))
        c.commit(); log(uid,'trash',f'id={fid}')
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/files/<int:fid>/rename', methods=['POST'])
@auth
def rename_file(fid):
    uid  = session['user_id']
    name = (request.get_json() or {}).get('name','').strip()
    if not name: return jsonify({'success':False,'error':'Name required'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute('UPDATE files SET original_name=%s WHERE id=%s AND user_id=%s',(name,fid,uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()


@app.route('/api/files/<int:fid>/download', methods=['GET'])
@auth
def download_file(fid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'}), 500
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            'SELECT id,original_name,size,telegram_file_id,name FROM files '
            'WHERE id=%s AND user_id=%s AND is_trashed=0 AND is_folder=0',
            (fid, uid)
        )
        f = cur.fetchone()
        if not f:
            return jsonify({'success':False,'error':'File not found'}), 404

        log(uid, 'download', f['original_name'])

        bot_token, _ = tg_config()
        if not bot_token:
            return jsonify({'success':False,'error':'Telegram not configured'}), 500

        # ── Try file_parts table first (chunked upload) ───────────────────────
        ensure_file_parts_table(cur)
        parts = get_file_parts(cur, f['id'])

        if parts:
            return build_download_response(bot_token, parts, f['original_name'], f['size'])

        # ── Single-part Telegram file (legacy or small file) ─────────────────
        if f.get('telegram_file_id'):
            return build_download_response(bot_token, [f['telegram_file_id']],
                                           f['original_name'], f['size'])

        # ── Fallback: old local file ──────────────────────────────────────────
        if f.get('name'):
            local = os.path.join(_upload_dir, f['name'])
            if os.path.exists(local):
                return send_file(local, as_attachment=True, download_name=f['original_name'])

        return jsonify({'success':False,'error':'File data not found on server'}), 404
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# TRASH
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/trash', methods=['GET'])
@auth
def list_trash():
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT id,original_name,file_type,size,is_folder,updated_at
            FROM files WHERE user_id=%s AND is_trashed=1 ORDER BY updated_at DESC
        """, (uid,))
        files = [dict(ser(f), size_fmt=fmt_size(f['size'])) for f in cur.fetchall()]
        return jsonify({'success':True,'files':files})
    finally:
        c.close()

@app.route('/api/trash/restore/<int:fid>', methods=['POST'])
@auth
def restore(fid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute('UPDATE files SET is_trashed=0 WHERE id=%s AND user_id=%s',(fid,uid))
        c.commit(); log(uid,'restore',f'id={fid}')
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/trash/delete-permanently/<int:fid>', methods=['POST'])
@auth
def delete_perm(fid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT name,telegram_file_id FROM files WHERE id=%s AND user_id=%s AND is_trashed=1',(fid,uid))
        row = cur.fetchone()
        if row and row['name'] and not row.get('telegram_file_id'):
            p = os.path.join(_upload_dir, row['name'])
            if os.path.exists(p): os.remove(p)
        cur.execute('DELETE FROM files WHERE id=%s AND user_id=%s',(fid,uid))
        c.commit(); log(uid,'delete_perm',f'id={fid}')
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/trash/empty', methods=['POST'])
@auth
def empty_trash():
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            "SELECT name FROM files WHERE user_id=%s AND is_trashed=1 "
            "AND name IS NOT NULL AND (telegram_file_id IS NULL OR telegram_file_id='')",(uid,)
        )
        for row in cur.fetchall():
            p = os.path.join(_upload_dir, row['name'])
            if os.path.exists(p): os.remove(p)
        cur.execute('DELETE FROM files WHERE user_id=%s AND is_trashed=1',(uid,))
        c.commit(); log(uid,'empty_trash')
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/trash/restore-selected', methods=['POST'])
@auth
def restore_selected():
    uid = session['user_id']
    ids = (request.get_json() or {}).get('file_ids',[])
    if not ids: return jsonify({'success':False,'error':'No ids'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        ph = ','.join(['%s']*len(ids))
        cur.execute(f'UPDATE files SET is_trashed=0 WHERE id IN ({ph}) AND user_id=%s',(*ids,uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/trash/delete-selected', methods=['POST'])
@auth
def delete_selected():
    uid = session['user_id']
    ids = (request.get_json() or {}).get('file_ids',[])
    if not ids: return jsonify({'success':False,'error':'No ids'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        ph = ','.join(['%s']*len(ids))
        cur.execute(
            f'SELECT name,telegram_file_id FROM files WHERE id IN ({ph}) AND user_id=%s AND is_trashed=1',
            (*ids,uid)
        )
        for row in cur.fetchall():
            if row['name'] and not row.get('telegram_file_id'):
                p = os.path.join(_upload_dir, row['name'])
                if os.path.exists(p): os.remove(p)
        cur.execute(f'DELETE FROM files WHERE id IN ({ph}) AND user_id=%s',(*ids,uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# SHARING
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/sharing/links', methods=['GET'])
@auth
def sharing_links():
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT sl.id,sl.share_token,sl.expiry_date,sl.access_limit,sl.allow_download,
                   sl.is_active,sl.created_at,f.original_name,f.file_type,f.size
            FROM share_links sl JOIN files f ON sl.file_id=f.id
            WHERE sl.user_id=%s AND sl.is_active=1 ORDER BY sl.created_at DESC
        """, (uid,))
        links = [dict(ser(l), size_fmt=fmt_size(l['size'])) for l in cur.fetchall()]
        return jsonify({'success':True,'links':links})
    finally:
        c.close()

@app.route('/api/sharing/create', methods=['POST'])
@auth
def create_link():
    uid = session['user_id']
    d   = request.get_json() or {}
    fid          = int(d.get('file_id',0))
    expiry_days  = d.get('expiry_days')
    allow_dl     = d.get('allow_download', True)
    access_limit = d.get('access_limit')
    if not fid: return jsonify({'success':False,'error':'File ID required'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT id FROM files WHERE id=%s AND user_id=%s AND is_trashed=0',(fid,uid))
        if not cur.fetchone(): return jsonify({'success':False,'error':'File not found'})
        token  = secrets.token_hex(16)
        expiry = datetime.now()+timedelta(days=int(expiry_days)) if expiry_days else None
        cur.execute("""
            INSERT INTO share_links (user_id,file_id,share_token,expiry_date,access_limit,allow_download)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (uid,fid,token,expiry,access_limit,1 if allow_dl else 0))
        lid = cur.lastrowid; c.commit()
        log(uid,'share',f'file_id={fid}')
        return jsonify({'success':True,'token':token,'link_id':lid})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/sharing/revoke/<int:lid>', methods=['POST'])
@auth
def revoke_link(lid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute('UPDATE share_links SET is_active=0,revoked_at=NOW() WHERE id=%s AND user_id=%s',(lid,uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/share/<token>', methods=['GET'])
def view_share(token):
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT sl.*,f.original_name,f.file_type,f.size,f.name AS stored_name,f.telegram_file_id
            FROM share_links sl JOIN files f ON sl.file_id=f.id
            WHERE sl.share_token=%s AND sl.is_active=1
        """, (token,))
        link = cur.fetchone()
        if not link: return jsonify({'success':False,'error':'Link not found or revoked'})
        if link['expiry_date'] and link['expiry_date'] < datetime.now():
            return jsonify({'success':False,'error':'Link has expired'})
        cur.execute(
            "INSERT INTO share_access (share_link_id,access_type,ip_address,user_agent) VALUES (%s,'view',%s,%s)",
            (link['id'],request.remote_addr,request.headers.get('User-Agent','')[:200])
        )
        c.commit()
        return jsonify({'success':True,'file':{
            'name':link['original_name'],'type':link['file_type'],
            'size':fmt_size(link['size']),'allow_download':bool(link['allow_download']),'token':token
        }})
    finally:
        c.close()

@app.route('/api/share/<token>/download', methods=['GET'])
def download_share(token):
    """
    Public download — no login required.
    Streams all Telegram parts (or falls back to local) as one file.
    """
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'}), 500
    try:
        cur = c.cursor(dictionary=True)
        cur.execute("""
            SELECT sl.*,
                   f.id AS file_db_id,
                   f.original_name,
                   f.name AS stored_name,
                   f.telegram_file_id,
                   f.size
            FROM share_links sl JOIN files f ON sl.file_id=f.id
            WHERE sl.share_token=%s AND sl.is_active=1 AND sl.allow_download=1
        """, (token,))
        link = cur.fetchone()
        if not link:
            return jsonify({'success':False,'error':'Link not found or download not allowed'}), 403
        if link['expiry_date'] and link['expiry_date'] < datetime.now():
            return jsonify({'success':False,'error':'Link has expired'}), 403
        if link['access_limit']:
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM share_access WHERE share_link_id=%s AND access_type='download'",
                (link['id'],)
            )
            if cur.fetchone()['cnt'] >= link['access_limit']:
                return jsonify({'success':False,'error':'Access limit reached'}), 403

        # Log the download access
        cur.execute(
            "INSERT INTO share_access (share_link_id,access_type,ip_address,user_agent) VALUES (%s,'download',%s,%s)",
            (link['id'], request.remote_addr, request.headers.get('User-Agent','')[:200])
        )
        c.commit()

        bot_token, _ = tg_config()
        if not bot_token:
            return jsonify({'success':False,'error':'Telegram not configured on server'}), 500

        # ── Multi-part (chunked upload) ───────────────────────────────────────
        ensure_file_parts_table(cur)
        parts = get_file_parts(cur, link['file_db_id'])
        if parts:
            return build_download_response(bot_token, parts, link['original_name'], link['size'])

        # ── Single Telegram file_id ───────────────────────────────────────────
        if link.get('telegram_file_id'):
            return build_download_response(bot_token, [link['telegram_file_id']],
                                           link['original_name'], link['size'])

        # ── Legacy local file ─────────────────────────────────────────────────
        if link.get('stored_name'):
            local = os.path.join(_upload_dir, link['stored_name'])
            if os.path.exists(local):
                return send_file(local, as_attachment=True, download_name=link['original_name'])

        return jsonify({'success':False,'error':'File data not found'}), 404
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/profile', methods=['GET'])
@auth
def profile():
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute(
            'SELECT user_id AS id,username,email,full_name,bio,avatar_url,created_at,last_login '
            'FROM users WHERE user_id=%s', (uid,)
        )
        u = ser(cur.fetchone())
        cur.execute('SELECT * FROM user_settings WHERE user_id=%s',(uid,))
        s = cur.fetchone()
        if not s:
            cur.execute('INSERT INTO user_settings (user_id) VALUES (%s)',(uid,))
            c.commit()
            s = {'theme':'auto','language':'en','timezone':'UTC',
                 'email_notifications':True,'push_notifications':True}
        cur.execute("""
            SELECT COALESCE(SUM(CASE WHEN is_trashed=0 THEN size ELSE 0 END),0) AS total_storage,
                   COUNT(CASE WHEN is_trashed=0 AND is_folder=0 THEN 1 END) AS total_files,
                   COUNT(CASE WHEN is_trashed=0 AND is_folder=1 THEN 1 END) AS total_folders,
                   COUNT(CASE WHEN is_trashed=1 THEN 1 END) AS trashed_files
            FROM files WHERE user_id=%s
        """, (uid,))
        stats = cur.fetchone() or {}
        # Query active user sessions from the DB
        cur.execute(
            'SELECT session_id AS id, ip_address, user_agent AS browser_name, last_activity, session_token '
            'FROM user_sessions WHERE user_id=%s AND is_active=1 ORDER BY last_activity DESC',
            (uid,)
        )
        sessions = []
        current_token = session.get('session_token', '')
        for r in cur.fetchall():
            is_current = (r['session_token'] == current_token)
            ua = r['browser_name'] or 'Unknown Browser'
            if 'Chrome' in ua: browser = 'Google Chrome'
            elif 'Firefox' in ua: browser = 'Mozilla Firefox'
            elif 'Safari' in ua: browser = 'Apple Safari'
            elif 'Edge' in ua: browser = 'Microsoft Edge'
            else: browser = ua[:60]
            
            sessions.append({
                'id': r['id'],
                'device_type': 'mobile' if any(m in ua.lower() for m in ['mobile', 'android', 'iphone']) else 'desktop',
                'browser_name': browser,
                'ip_address': r['ip_address'] or 'Unknown IP',
                'last_activity': r['last_activity'].isoformat() if isinstance(r['last_activity'], datetime) else r['last_activity'],
                'is_current': is_current
            })

        return jsonify({'success':True,'user':u,'settings':s,'stats':stats,'sessions':sessions})
    finally:
        c.close()

@app.route('/api/profile/sessions/revoke/<int:sid>', methods=['POST'])
@auth
def revoke_session(sid):
    uid = session['user_id']
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute('UPDATE user_sessions SET is_active=0 WHERE session_id=%s AND user_id=%s', (sid, uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/profile/update', methods=['POST'])
@auth
def update_profile():
    uid = session['user_id']
    d   = request.get_json() or {}
    full_name = d.get('full_name','').strip()
    bio       = d.get('bio','').strip()
    username  = d.get('username','').strip()
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('UPDATE users SET full_name=%s,bio=%s WHERE user_id=%s',(full_name,bio,uid))
        if username:
            cur.execute('SELECT user_id FROM users WHERE username=%s AND user_id!=%s',(username,uid))
            if cur.fetchone(): return jsonify({'success':False,'error':'Username taken'})
            cur.execute('UPDATE users SET username=%s WHERE user_id=%s',(username,uid))
            session['username'] = username
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/profile/change-password', methods=['POST'])
@auth
def change_password():
    uid = session['user_id']
    d   = request.get_json() or {}
    cur_pw  = d.get('current_password','')
    new_pw  = d.get('new_password','')
    conf_pw = d.get('confirm_password','')
    if new_pw != conf_pw: return jsonify({'success':False,'error':'Passwords do not match'})
    if len(new_pw) < 8:   return jsonify({'success':False,'error':'Min 8 characters'})
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT password_hash FROM users WHERE user_id=%s',(uid,))
        u = cur.fetchone()
        if not bcrypt.checkpw(cur_pw.encode(), u['password_hash'].encode()):
            return jsonify({'success':False,'error':'Current password incorrect'})
        new_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
        cur.execute('UPDATE users SET password_hash=%s WHERE user_id=%s',(new_hash,uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

@app.route('/api/profile/settings', methods=['POST'])
@auth
def save_settings():
    uid = session['user_id']
    d   = request.get_json() or {}
    c = db()
    if not c: return jsonify({'success':False,'error':'DB error'})
    try:
        cur = c.cursor()
        cur.execute("""
            UPDATE user_settings SET theme=%s,language=%s,timezone=%s,
            email_notifications=%s,push_notifications=%s WHERE user_id=%s
        """, (d.get('theme','auto'),d.get('language','en'),d.get('timezone','UTC'),
              d.get('email_notifications',True),d.get('push_notifications',True),uid))
        c.commit()
        return jsonify({'success':True})
    except Exception as e:
        return jsonify({'success':False,'error':str(e)})
    finally:
        c.close()

# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/public/stats', methods=['GET'])
def public_stats():
    c = db()
    if not c: return jsonify({'total_users':0,'total_files':0})
    try:
        cur = c.cursor(dictionary=True)
        cur.execute('SELECT COUNT(*) AS c FROM users')
        users = cur.fetchone()['c']
        cur.execute('SELECT COUNT(*) AS c FROM files WHERE is_trashed=0')
        files = cur.fetchone()['c']
        return jsonify({'total_users':users,'total_files':files})
    finally:
        c.close()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
