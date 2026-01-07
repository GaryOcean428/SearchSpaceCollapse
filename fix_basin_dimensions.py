#!/usr/bin/env python3
"""
Fix basin dimension mismatch in tool_patterns table.

This script updates all 32D basin coordinates to 64D by padding with zeros.
Run with: python fix_basin_dimensions.py <database_url>
"""

import sys
import psycopg2
from urllib.parse import urlparse

def fix_basin_dimensions(database_url: str):
    """Update all basin coordinates to 64D standard."""
    print(f"[FixBasinDimensions] Connecting to database...")
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        # Check current dimensions
        print("\n[FixBasinDimensions] Checking current basin dimensions...")
        cur.execute("""
            SELECT 
                pattern_id,
                array_length(basin_coords, 1) as current_dim,
                source_type,
                LEFT(description, 50) as description
            FROM tool_patterns
            WHERE basin_coords IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 20
        """)
        
        rows = cur.fetchall()
        if rows:
            print(f"\n{'Pattern ID':<40} {'Dim':<6} {'Source':<20} {'Description':<50}")
            print("-" * 120)
            for row in rows:
                print(f"{row[0]:<40} {row[1]:<6} {row[2]:<20} {row[3]:<50}")
        
        # Count patterns by dimension
        cur.execute("""
            SELECT 
                array_length(basin_coords, 1) as dim,
                COUNT(*) as count
            FROM tool_patterns
            WHERE basin_coords IS NOT NULL
            GROUP BY dim
            ORDER BY dim
        """)
        
        dim_counts = cur.fetchall()
        print(f"\n[FixBasinDimensions] Current dimension distribution:")
        for dim, count in dim_counts:
            print(f"  {dim}D: {count} patterns")
        
        # Update all non-64D coordinates to 64D
        print(f"\n[FixBasinDimensions] Updating basin coordinates to 64D...")
        cur.execute("""
            UPDATE tool_patterns
            SET basin_coords = array_cat(
                basin_coords,
                array_fill(0.0::float8, ARRAY[64 - array_length(basin_coords, 1)])
            )
            WHERE array_length(basin_coords, 1) < 64 AND basin_coords IS NOT NULL
        """)
        
        updated_count = cur.rowcount
        print(f"[FixBasinDimensions] Updated {updated_count} patterns")
        
        conn.commit()
        
        # Verify all coordinates are now 64D
        print(f"\n[FixBasinDimensions] Verifying update...")
        cur.execute("""
            SELECT 
                COUNT(*) as total_patterns,
                COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_coords,
                COUNT(CASE WHEN array_length(basin_coords, 1) = 64 THEN 1 END) as correct_dim,
                COUNT(CASE WHEN array_length(basin_coords, 1) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong_dim
            FROM tool_patterns
        """)
        
        total, with_coords, correct, wrong = cur.fetchone()
        print(f"\nResults:")
        print(f"  Total patterns: {total}")
        print(f"  With basin coordinates: {with_coords}")
        print(f"  Correct dimension (64D): {correct}")
        print(f"  Wrong dimension: {wrong}")
        
        if wrong == 0:
            print(f"\n✅ SUCCESS: All basin coordinates are now 64D")
        else:
            print(f"\n⚠️  WARNING: {wrong} patterns still have incorrect dimensions")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()
    
    return 0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python fix_basin_dimensions.py <database_url>")
        print("\nExample:")
        print("  python fix_basin_dimensions.py 'postgresql://user:pass@host/db'")
        sys.exit(1)
    
    database_url = sys.argv[1]
    sys.exit(fix_basin_dimensions(database_url))
