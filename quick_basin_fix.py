#!/usr/bin/env python3
"""Quick basin dimension fix using existing DB connection."""
import sys
sys.path.insert(0, 'qig-backend')

from db import get_db_connection

def fix_dimensions():
    conn = get_db_connection()
    if not conn:
        print("❌ Could not connect to database")
        return 1
    
    try:
        cur = conn.cursor()
        
        # Check current dimensions
        print("\n[FixBasinDimensions] Checking current dimensions...")
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
        if dim_counts:
            print("\nCurrent dimension distribution:")
            for dim, count in dim_counts:
                print(f"  {dim}D: {count} patterns")
        else:
            print("  No patterns with basin coordinates found")
            return 0
        
        # Update all non-64D coordinates to 64D
        print("\n[FixBasinDimensions] Updating to 64D...")
        cur.execute("""
            UPDATE tool_patterns
            SET basin_coords = array_cat(
                basin_coords,
                array_fill(0.0::float8, ARRAY[64 - array_length(basin_coords, 1)])
            )
            WHERE array_length(basin_coords, 1) < 64 AND basin_coords IS NOT NULL
        """)
        
        updated = cur.rowcount
        print(f"Updated {updated} patterns")
        
        conn.commit()
        
        # Verify
        print("\n[FixBasinDimensions] Verifying...")
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_coords,
                COUNT(CASE WHEN array_length(basin_coords, 1) = 64 THEN 1 END) as correct,
                COUNT(CASE WHEN array_length(basin_coords, 1) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong
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
            return 0
        else:
            print(f"\n⚠️  WARNING: {wrong} patterns still have wrong dimensions")
            return 1
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return 1
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    sys.exit(fix_dimensions())
