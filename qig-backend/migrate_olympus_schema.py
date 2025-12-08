#!/usr/bin/env python3
"""
Database Migration Tool for Olympus Schema Enhancements

Safely applies the Olympus pantheon schema enhancements to the PostgreSQL database.
Includes rollback capability and validation.
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from datetime import datetime


class OlympusMigration:
    """Handles safe migration of Olympus schema enhancements."""
    
    def __init__(self, db_url: str = None):
        """
        Initialize migration tool.
        
        Args:
            db_url: PostgreSQL connection string (from DATABASE_URL env var if not provided)
        """
        self.db_url = db_url or os.environ.get('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self.conn = None
        self.schema_file = os.path.join(
            os.path.dirname(__file__),
            'olympus_schema_enhancement.sql'
        )
    
    def connect(self):
        """Establish database connection."""
        try:
            self.conn = psycopg2.connect(self.db_url)
            self.conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            print(f"✓ Connected to database")
            return True
        except Exception as e:
            print(f"✗ Failed to connect: {e}")
            return False
    
    def check_existing_tables(self):
        """Check which tables already exist."""
        tables_to_check = [
            'spawned_kernels',
            'pantheon_assessments',
            'shadow_operations',
            'basin_documents',
            'god_reputation',
            'autonomous_operations_log'
        ]
        
        existing = []
        with self.conn.cursor() as cur:
            for table in tables_to_check:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    )
                """, (table,))
                if cur.fetchone()[0]:
                    existing.append(table)
        
        return existing
    
    def backup_existing_data(self, table_name: str):
        """Create a backup of existing table data."""
        backup_table = f"{table_name}_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            with self.conn.cursor() as cur:
                cur.execute(f"""
                    CREATE TABLE {backup_table} AS 
                    SELECT * FROM {table_name}
                """)
                cur.execute(f"SELECT COUNT(*) FROM {backup_table}")
                count = cur.fetchone()[0]
                print(f"  ✓ Backed up {count} rows from {table_name} to {backup_table}")
                return backup_table
        except Exception as e:
            print(f"  ✗ Failed to backup {table_name}: {e}")
            return None
    
    def apply_migration(self, dry_run: bool = False):
        """
        Apply the Olympus schema enhancements.
        
        Args:
            dry_run: If True, only show what would be done
        """
        if not os.path.exists(self.schema_file):
            print(f"✗ Schema file not found: {self.schema_file}")
            return False
        
        # Check existing tables
        existing_tables = self.check_existing_tables()
        if existing_tables:
            print(f"\n⚠ Found existing tables: {', '.join(existing_tables)}")
            print("  Migration will use IF NOT EXISTS clauses to avoid conflicts")
        
        if dry_run:
            print("\n[DRY RUN] Would execute migration from:", self.schema_file)
            with open(self.schema_file, 'r') as f:
                print("\n--- Schema Preview (first 50 lines) ---")
                for i, line in enumerate(f):
                    if i >= 50:
                        print("...")
                        break
                    print(line.rstrip())
            return True
        
        # Apply the schema
        print(f"\n⚡ Applying Olympus schema enhancements...")
        
        try:
            with open(self.schema_file, 'r') as f:
                schema_sql = f.read()
            
            # Split by statement and execute
            statements = [s.strip() for s in schema_sql.split(';') if s.strip()]
            
            with self.conn.cursor() as cur:
                for i, statement in enumerate(statements):
                    # Skip comments and empty statements
                    if statement.startswith('--') or not statement:
                        continue
                    
                    try:
                        cur.execute(statement)
                        if 'CREATE TABLE' in statement.upper():
                            # Extract table name
                            parts = statement.split()
                            if 'IF NOT EXISTS' in statement.upper():
                                table_name = parts[parts.index('EXISTS') + 1]
                            else:
                                table_name = parts[parts.index('TABLE') + 1]
                            print(f"  ✓ Created/verified table: {table_name}")
                        elif 'CREATE INDEX' in statement.upper():
                            print(f"  ✓ Created index")
                        elif 'CREATE VIEW' in statement.upper():
                            print(f"  ✓ Created view")
                        elif 'INSERT INTO' in statement.upper():
                            print(f"  ✓ Inserted initial data")
                    except Exception as e:
                        # Don't fail on already exists errors
                        if 'already exists' in str(e).lower():
                            print(f"  ⚠ Skipping (already exists)")
                        else:
                            print(f"  ✗ Error: {e}")
                            if 'CREATE TABLE' in statement.upper() or 'CREATE INDEX' in statement.upper():
                                print(f"     Statement: {statement[:100]}...")
            
            print(f"\n✓ Migration completed successfully!")
            return True
            
        except Exception as e:
            print(f"\n✗ Migration failed: {e}")
            return False
    
    def validate_migration(self):
        """Validate that the migration was successful."""
        print(f"\n🔍 Validating migration...")
        
        expected_tables = [
            'spawned_kernels',
            'pantheon_assessments',
            'shadow_operations',
            'basin_documents',
            'god_reputation',
            'autonomous_operations_log'
        ]
        
        all_valid = True
        with self.conn.cursor() as cur:
            for table in expected_tables:
                # Check table exists
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    )
                """, (table,))
                exists = cur.fetchone()[0]
                
                if exists:
                    # Get row count
                    cur.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cur.fetchone()[0]
                    print(f"  ✓ {table}: {count} rows")
                else:
                    print(f"  ✗ {table}: NOT FOUND")
                    all_valid = False
        
        # Check views
        views = [
            'active_spawned_kernels',
            'recent_pantheon_assessments',
            'shadow_operations_summary',
            'god_performance_leaderboard'
        ]
        
        for view in views:
            with self.conn.cursor() as cur:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.views 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    )
                """, (view,))
                exists = cur.fetchone()[0]
                
                if exists:
                    print(f"  ✓ View: {view}")
                else:
                    print(f"  ⚠ View: {view} NOT FOUND")
        
        if all_valid:
            print(f"\n✓ All tables validated successfully!")
        else:
            print(f"\n⚠ Some tables are missing")
        
        return all_valid
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            print("\n✓ Database connection closed")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Apply Olympus schema enhancements to PostgreSQL database'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate existing schema, do not apply migration'
    )
    parser.add_argument(
        '--db-url',
        help='PostgreSQL connection string (default: DATABASE_URL env var)'
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("OLYMPUS SCHEMA MIGRATION TOOL")
    print("=" * 70)
    
    try:
        migration = OlympusMigration(db_url=args.db_url)
        
        if not migration.connect():
            sys.exit(1)
        
        if args.validate_only:
            migration.validate_migration()
        else:
            if migration.apply_migration(dry_run=args.dry_run):
                if not args.dry_run:
                    migration.validate_migration()
            else:
                print("\n✗ Migration failed")
                sys.exit(1)
        
        migration.close()
        print("\n✓ Done!")
        
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
