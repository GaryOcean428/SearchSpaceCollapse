"""Shadow Service - Default ON shadow ops with UI toggle."""

import os
import json
from typing import Dict, Any
import psycopg2

class ShadowService:
    def __init__(self):
        self.connection_string = os.getenv('DATABASE_URL')
        self.enabled = self._get_enabled()
    
    def _connect(self):
        return psycopg2.connect(self.connection_string)
    
    def _get_enabled(self) -> bool:
        """Get shadow enabled from DB (default true)."""
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT enabled FROM shadow_config ORDER BY updated_at DESC LIMIT 1")
                    row = cur.fetchone()
                    return row[0] if row else True
        except:
            return True  # Default ON
    
    def set_enabled(self, enabled: bool) -> bool:
        """UI toggle."""
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE shadow_config SET enabled = %s, updated_at = NOW()", (enabled,))
                    conn.commit()
                    self.enabled = enabled
                    return True
        except Exception as e:
            print(f"[Shadow] Toggle failed: {e}")
            return False
    
    def init_state(self):
        """Init default shadow state ON startup."""
        if not self.enabled:
            return
        
        gods = ['nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis']
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    for god in gods:
                        cur.execute("""
                            INSERT INTO shadow_operations_state (god_name, state_type, state_data)
                            VALUES (%s, 'active_operations', '[]'::jsonb)
                            ON CONFLICT DO NOTHING
                        """, (god,))
                    conn.commit()
            print("[Shadow] State initialized (default ON)")
        except Exception as e:
            print(f"[Shadow] Init failed: {e}")
    
    def log_op(self, god: str, op: Dict[str, Any]):
        """Log shadow op."""
        if not self.enabled:
            return
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO shadow_operations_log (god_name, operation, metadata)
                        VALUES (%s, %s, %s)
                    """, (god, json.dumps(op.get('operation')), json.dumps(op.get('metadata', {}))))
                    conn.commit()
        except:
            pass  # Silent

shadow_service = ShadowService()