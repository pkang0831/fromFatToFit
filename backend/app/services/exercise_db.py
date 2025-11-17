"""
운동 데이터베이스 서비스
Parquet 파일에서 운동 데이터를 로드하고 검색/칼로리 계산 제공
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd

# 데이터 파일 경로
_EXERCISE_DB_PATH = Path(__file__).parent.parent / "data" / "exercise_db" / "exercise_data.parquet"
_DF: Optional[pd.DataFrame] = None


def _load_exercise_db() -> pd.DataFrame:
    """운동 데이터베이스 로드"""
    global _DF
    if _DF is not None:
        return _DF
    
    if not _EXERCISE_DB_PATH.exists():
        raise FileNotFoundError(f"Exercise database not found: {_EXERCISE_DB_PATH}")
    
    _DF = pd.read_parquet(_EXERCISE_DB_PATH)
    
    # 검색을 위한 인덱스 생성
    _DF["search_text"] = (
        _DF["category"].astype(str).str.lower() + " " +
        _DF["exercise_name"].astype(str).str.lower() + " " +
        _DF["full_name"].astype(str).str.lower()
    )
    
    return _DF


def search_exercises(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """운동 검색"""
    if not query or not query.strip():
        return []
    
    df = _load_exercise_db()
    query_lower = query.strip().lower()
    query_words = [w for w in query_lower.split() if w]
    
    if not query_words:
        return []
    
    # 검색어가 포함된 운동 필터링
    mask = df["search_text"].str.contains(query_lower, case=False, na=False)
    
    # 모든 단어가 포함된 항목 우선
    all_words_mask = True
    for word in query_words:
        all_words_mask = all_words_mask & df["search_text"].str.contains(word, case=False, na=False)
    
    # 점수 계산
    def calculate_score(row):
        score = 0.0
        text = str(row["search_text"]).lower()
        
        # 정확한 일치
        if query_lower in text:
            score += 1000
            if text.startswith(query_lower):
                score += 500
        
        # 모든 단어 포함
        words_found = sum(1 for word in query_words if word in text)
        if words_found == len(query_words):
            score += 500
        
        # 카테고리 일치
        if query_lower in str(row["category"]).lower():
            score += 200
        
        # 운동명 일치
        if query_lower in str(row["exercise_name"]).lower():
            score += 300
        
        return score
    
    filtered = df[mask].copy()
    if len(filtered) == 0:
        return []
    
    filtered["score"] = filtered.apply(calculate_score, axis=1)
    filtered = filtered.sort_values("score", ascending=False)
    
    results = filtered.head(limit)
    
    return results[[
        "category", "exercise_name", "full_name", "met",
        "kcal_per_hour_60kg", "kcal_per_hour_70kg", "kcal_per_hour_80kg",
        "kcal_slope", "kcal_intercept"
    ]].to_dict("records")


def get_exercise_detail(exercise_name: str, category: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """운동 상세 정보 조회"""
    df = _load_exercise_db()
    
    if category:
        mask = (df["category"] == category) & (df["exercise_name"] == exercise_name)
    else:
        mask = df["exercise_name"] == exercise_name
    
    result = df[mask]
    if len(result) == 0:
        return None
    
    return result.iloc[0].to_dict()


def calculate_calories_burned(
    exercise_name: str,
    duration_minutes: float,
    weight_kg: float,
    category: Optional[str] = None,
) -> float:
    """운동 칼로리 계산
    
    Args:
        exercise_name: 운동 이름
        duration_minutes: 운동 시간 (분)
        weight_kg: 체중 (kg)
        category: 운동 카테고리 (선택사항)
    
    Returns:
        소모 칼로리 (kcal)
    """
    exercise = get_exercise_detail(exercise_name, category)
    if exercise is None:
        return 0.0
    
    # 선형 보간: kcal = slope * weight + intercept
    kcal_per_hour = exercise["kcal_slope"] * weight_kg + exercise["kcal_intercept"]
    
    # 분 단위로 변환
    kcal_per_minute = kcal_per_hour / 60.0
    
    # 총 칼로리 계산
    total_kcal = kcal_per_minute * duration_minutes
    
    return max(0.0, total_kcal)


def get_categories() -> List[str]:
    """모든 운동 카테고리 목록 반환"""
    df = _load_exercise_db()
    return sorted(df["category"].unique().tolist())

