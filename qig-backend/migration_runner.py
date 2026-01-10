"""
Migration Runner - Automated SQL Migration Execution

Runs SQL migration files on backend startup to ensure schema is up to date.
Tracks applied migrations in a migrations_applied table to avoid re-running.

Usage:
    from migration_runner import run_pending_migrations
    run_pending_migrations()
"""

import os
import hashlib
from datetime import datetime
from typing import List, Tuple, Optional

# Database connection
try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), 'migrations')

def get_db_connection():
    """Get database connection from environment."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("[MigrationRunner] No DATABASE_URL found")
        return None
    
    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"[MigrationRunner] Connection failed: {e}")
        return None


def ensure_migrations_table(conn) -> bool:
    """Create migrations tracking table if it doesn't exist."""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS migrations_applied (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    checksum VARCHAR(64) NOT NULL,
                    applied_at TIMESTAMP DEFAULT NOW(),
                    success BOOLEAN DEFAULT TRUE,
                    error_message TEXT
                )
            """)
            conn.commit()
            return True
    except Exception as e:
        print(f"[MigrationRunner] Failed to create migrations table: {e}")
        conn.rollback()
        return False


def get_applied_migrations(conn) -> dict:
    """Get dict of applied migrations: filename -> checksum."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT filename, checksum FROM migrations_applied WHERE success = TRUE")
            return {row[0]: row[1] for row in cur.fetchall()}
    except Exception:
        return {}


def compute_checksum(filepath: str) -> str:
    """Compute SHA256 checksum of migration file."""
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


def get_pending_migrations(conn) -> List[Tuple[str, str, str]]:
    """Get list of (filename, filepath, checksum) for pending migrations."""
    if not os.path.exists(MIGRATIONS_DIR):
        print(f"[MigrationRunner] Migrations directory not found: {MIGRATIONS_DIR}")
        return []
    
    applied = get_applied_migrations(conn)
    pending = []
    
    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if not filename.endswith('.sql'):
            continue
        
        filepath = os.path.join(MIGRATIONS_DIR, filename)
        checksum = compute_checksum(filepath)
        
        # Skip if already applied with same checksum
        if filename in applied:
            if applied[filename] == checksum:
                continue
            else:
                print(f"[MigrationRunner] {filename} changed since last apply (checksum mismatch)")
        
        pending.append((filename, filepath, checksum))
    
    return pending


def apply_migration(conn, filename: str, filepath: str, checksum: str) -> bool:
    """Apply a single migration file."""
    print(f"[MigrationRunner] Applying: {filename}")
    
    try:
        with open(filepath, 'r') as f:
            sql = f.read()
        
        with conn.cursor() as cur:
            cur.execute(sql)
        
        conn.commit()
        
        # Record successful migration
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO migrations_applied (filename, checksum, success)
                VALUES (%s, %s, TRUE)
                ON CONFLICT (filename) DO UPDATE SET
                    checksum = EXCLUDED.checksum,
                    applied_at = NOW(),
                    success = TRUE,
                    error_message = NULL
            """, (filename, checksum))
        conn.commit()
        
        print(f"[MigrationRunner] ✓ Applied: {filename}")
        return True
        
    except Exception as e:
        conn.rollback()
        error_msg = str(e)[:500]
        print(f"[MigrationRunner] ✗ Failed: {filename} - {error_msg}")
        
        # Record failed migration
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO migrations_applied (filename, checksum, success, error_message)
                    VALUES (%s, %s, FALSE, %s)
                    ON CONFLICT (filename) DO UPDATE SET
                        checksum = EXCLUDED.checksum,
                        applied_at = NOW(),
                        success = FALSE,
                        error_message = EXCLUDED.error_message
                """, (filename, checksum, error_msg))
            conn.commit()
        except Exception:
            pass
        
        return False


def run_pending_migrations() -> Tuple[int, int]:
    """
    Run all pending SQL migrations.
    
    Returns:
        Tuple of (applied_count, failed_count)
    """
    if not PSYCOPG2_AVAILABLE:
        print("[MigrationRunner] psycopg2 not available, skipping migrations")
        return (0, 0)
    
    conn = get_db_connection()
    if not conn:
        return (0, 0)
    
    try:
        if not ensure_migrations_table(conn):
            return (0, 0)
        
        pending = get_pending_migrations(conn)
        
        if not pending:
            print("[MigrationRunner] No pending migrations")
            return (0, 0)
        
        print(f"[MigrationRunner] Found {len(pending)} pending migration(s)")
        
        applied = 0
        failed = 0
        
        for filename, filepath, checksum in pending:
            if apply_migration(conn, filename, filepath, checksum):
                applied += 1
            else:
                failed += 1
        
        print(f"[MigrationRunner] Complete: {applied} applied, {failed} failed")
        return (applied, failed)
        
    finally:
        conn.close()


def get_migration_status() -> dict:
    """Get status of all migrations."""
    if not PSYCOPG2_AVAILABLE:
        return {'error': 'psycopg2 not available'}
    
    conn = get_db_connection()
    if not conn:
        return {'error': 'No database connection'}
    
    try:
        ensure_migrations_table(conn)
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT filename, checksum, applied_at, success, error_message
                FROM migrations_applied
                ORDER BY applied_at DESC
            """)
            rows = cur.fetchall()
        
        applied = []
        for row in rows:
            applied.append({
                'filename': row[0],
                'checksum': row[1],
                'applied_at': row[2].isoformat() if row[2] else None,
                'success': row[3],
                'error': row[4]
            })
        
        pending = get_pending_migrations(conn)
        
        return {
            'applied': applied,
            'pending': [p[0] for p in pending],
            'total_applied': len([a for a in applied if a['success']]),
            'total_pending': len(pending)
        }
        
    finally:
        conn.close()


if __name__ == '__main__':
    print("[MigrationRunner] Running migrations...")
    applied, failed = run_pending_migrations()
    print(f"[MigrationRunner] Done: {applied} applied, {failed} failed")
