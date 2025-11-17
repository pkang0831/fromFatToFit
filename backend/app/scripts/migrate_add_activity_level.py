#!/usr/bin/env python3
"""마이그레이션: users 테이블에 activity_level 필드 추가"""

import sys
from pathlib import Path

# backend/app/scripts/에서 실행되므로 backend 디렉토리를 경로에 추가
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine

def migrate():
    """users 테이블에 activity_level 컬럼 추가"""
    with engine.connect() as conn:
        try:
            # 컬럼이 이미 존재하는지 확인하기 위해 테이블 정보 조회
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_columns = [row[1] for row in result]
            
            if "activity_level" not in existing_columns:
                print("Adding column: activity_level (VARCHAR(20))")
                conn.execute(text("ALTER TABLE users ADD COLUMN activity_level VARCHAR(20) DEFAULT 'sedentary'"))
                conn.commit()
                print("Migration completed!")
            else:
                print("Column activity_level already exists, skipping...")
        except Exception as e:
            print(f"Error adding column activity_level: {e}")
            # 이미 존재하는 경우 무시하고 계속 진행
            pass

if __name__ == "__main__":
    migrate()

