#!/usr/bin/env python3
"""마이그레이션: workout_logs 및 body_fat_analyses 테이블 생성"""

import sys
from pathlib import Path

# backend/app/scripts/에서 실행되므로 backend 디렉토리를 경로에 추가
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import engine

def migrate():
    """workout_logs 및 body_fat_analyses 테이블 생성"""
    with engine.connect() as conn:
        # workout_logs 테이블 생성
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workout_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    activity_type VARCHAR(100) NOT NULL,
                    duration_minutes INTEGER,
                    calories_burned REAL,
                    distance_km REAL,
                    notes TEXT,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            print("Created table: workout_logs")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Table workout_logs already exists, skipping.")
            else:
                print(f"Error creating workout_logs: {e}")
                raise

        # body_fat_analyses 테이블 생성
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS body_fat_analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    image_path VARCHAR(500) NOT NULL,
                    body_fat_percentage REAL,
                    percentile_rank REAL,
                    created_at DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """))
            print("Created table: body_fat_analyses")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Table body_fat_analyses already exists, skipping.")
            else:
                print(f"Error creating body_fat_analyses: {e}")
                raise

        conn.commit()
    print("Migration completed!")

if __name__ == "__main__":
    migrate()

