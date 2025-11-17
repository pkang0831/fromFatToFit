#!/usr/bin/env python3
"""마이그레이션: users 테이블에 프로필 필드 추가"""

import sys
from pathlib import Path

# backend/app/scripts/에서 실행되므로 backend 디렉토리를 경로에 추가
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine

def migrate():
    """users 테이블에 height_cm, weight_kg, age, gender 컬럼 추가"""
    with engine.connect() as conn:
        # SQLite는 컬럼 존재 여부를 직접 확인할 수 없으므로, try-except로 처리
        columns_to_add = [
            ("height_cm", "REAL"),
            ("weight_kg", "REAL"),
            ("age", "INTEGER"),
            ("gender", "VARCHAR(10)"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # 컬럼이 이미 존재하는지 확인하기 위해 테이블 정보 조회
                result = conn.execute(text(f"PRAGMA table_info(users)"))
                existing_columns = [row[1] for row in result]
                
                if col_name not in existing_columns:
                    print(f"Adding column: {col_name} ({col_type})")
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                else:
                    print(f"Column {col_name} already exists, skipping...")
            except Exception as e:
                print(f"Error adding column {col_name}: {e}")
                # 이미 존재하는 경우 무시하고 계속 진행
                pass
        
        print("Migration completed!")

if __name__ == "__main__":
    migrate()

