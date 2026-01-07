#!/bin/bash
# Run basin dimension fix for SearchSpaceCollapse database

DB_URL="postgresql://neondb_owner:npg_hk3rWRIPJ6Ht@ep-still-dust-afuqyc6r.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

echo "Installing psycopg2-binary if needed..."
pip3 install psycopg2-binary --quiet

echo ""
echo "Running basin dimension fix..."
python3 fix_basin_dimensions.py "$DB_URL"
