#!/usr/bin/env python3
"""
운동 데이터베이스를 Parquet 파일로 변환
"""

import sys
from pathlib import Path
import pandas as pd

# backend/app/scripts/에서 실행되므로 backend 디렉토리를 경로에 추가
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

CALORIES_DB = {
    "Walking": {
        "Slow 3 km/h": {"MET": 2.5, "kcal_per_hour": {"60kg": 158, "70kg": 184, "80kg": 210}},
        "Moderate 4 km/h": {"MET": 3.3, "kcal_per_hour": {"60kg": 208, "70kg": 243, "80kg": 277}},
        "Brisk 5.5 km/h": {"MET": 4.3, "kcal_per_hour": {"60kg": 271, "70kg": 316, "80kg": 361}},
    },
    "Hiking": {
        "Mixed flat + uphill": {"MET": 6.5, "kcal_per_hour": {"60kg": 410, "70kg": 478, "80kg": 546}},
    },
    "Running": {
        "8 km/h (7:30/km)": {"MET": 8.3, "kcal_per_hour": {"60kg": 523, "70kg": 610, "80kg": 697}},
        "9.7 km/h (6:11/km)": {"MET": 9.8, "kcal_per_hour": {"60kg": 617, "70kg": 721, "80kg": 823}},
        "12 km/h (5:00/km)": {"MET": 12.5, "kcal_per_hour": {"60kg": 788, "70kg": 919, "80kg": 1050}},
    },
    "Cycling": {
        "16–19 km/h": {"MET": 6.8, "kcal_per_hour": {"60kg": 428, "70kg": 501, "80kg": 571}},
        "19–22 km/h": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
        ">22 km/h": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
    },
    "Swimming": {
        "Freestyle (moderate)": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
        "Breaststroke (vigorous)": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Butterfly (very vigorous)": {"MET": 13.0, "kcal_per_hour": {"60kg": 819, "70kg": 954, "80kg": 1092}},
    },
    "Rowing Machine": {
        "Moderate": {"MET": 7.0, "kcal_per_hour": {"60kg": 441, "70kg": 515, "80kg": 588}},
        "Vigorous": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
    },
    "Elliptical": {
        "Moderate": {"MET": 5.0, "kcal_per_hour": {"60kg": 315, "70kg": 368, "80kg": 420}},
    },
    "Stair Climber": {
        "Stepper machine": {"MET": 8.8, "kcal_per_hour": {"60kg": 554, "70kg": 647, "80kg": 739}},
    },
    "Jump Rope": {
        "Moderate": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Fast": {"MET": 12.0, "kcal_per_hour": {"60kg": 756, "70kg": 882, "80kg": 1008}},
    },
    "Strength Training": {
        "Moderate (rest between sets)": {"MET": 3.5, "kcal_per_hour": {"60kg": 221, "70kg": 258, "80kg": 294}},
        "Vigorous (short rests)": {"MET": 6.0, "kcal_per_hour": {"60kg": 378, "70kg": 441, "80kg": 504}},
    },
    "Yoga": {
        "Hatha": {"MET": 2.5, "kcal_per_hour": {"60kg": 158, "70kg": 184, "80kg": 210}},
        "Power yoga": {"MET": 4.0, "kcal_per_hour": {"60kg": 252, "70kg": 294, "80kg": 336}},
    },
    "Pilates": {
        "Mat": {"MET": 3.0, "kcal_per_hour": {"60kg": 189, "70kg": 221, "80kg": 252}},
    },
    "Dance": {
        "Aerobics": {"MET": 7.0, "kcal_per_hour": {"60kg": 441, "70kg": 515, "80kg": 588}},
        "Social dance": {"MET": 4.8, "kcal_per_hour": {"60kg": 302, "70kg": 352, "80kg": 403}},
    },
    "Boxing": {
        "Heavy bag": {"MET": 5.5, "kcal_per_hour": {"60kg": 347, "70kg": 405, "80kg": 462}},
        "Sparring": {"MET": 12.0, "kcal_per_hour": {"60kg": 756, "70kg": 882, "80kg": 1008}},
    },
    "Martial Arts": {
        "Taekwondo etc.": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
    },
    "Basketball": {
        "Game": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
    },
    "Soccer": {
        "Game": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
    },
    "Tennis": {
        "Singles": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
        "Doubles": {"MET": 5.0, "kcal_per_hour": {"60kg": 315, "70kg": 368, "80kg": 420}},
    },
    "Badminton": {
        "Recreational": {"MET": 5.5, "kcal_per_hour": {"60kg": 347, "70kg": 405, "80kg": 462}},
    },
    "Golf": {
        "Walking + carry bag": {"MET": 4.3, "kcal_per_hour": {"60kg": 271, "70kg": 316, "80kg": 361}},
    },
    "Skiing": {
        "Downhill": {"MET": 6.0, "kcal_per_hour": {"60kg": 378, "70kg": 441, "80kg": 504}},
        "Cross-country": {"MET": 9.0, "kcal_per_hour": {"60kg": 567, "70kg": 661, "80kg": 756}},
    },
    "Gardening": {
        "Lawn mowing (walking)": {"MET": 4.5, "kcal_per_hour": {"60kg": 284, "70kg": 331, "80kg": 378}},
    },
    "Housework": {
        "Mopping/Cleaning": {"MET": 3.5, "kcal_per_hour": {"60kg": 221, "70kg": 258, "80kg": 294}},
    },
    "Gym Strength Training": {
        "Circuit training": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
        "Traditional strength (moderate)": {"MET": 5.0, "kcal_per_hour": {"60kg": 315, "70kg": 368, "80kg": 420}},
        "Heavy lifting (high intensity)": {"MET": 6.0, "kcal_per_hour": {"60kg": 378, "70kg": 441, "80kg": 504}},
        "Bodyweight (moderate)": {"MET": 4.0, "kcal_per_hour": {"60kg": 252, "70kg": 294, "80kg": 336}},
        "Bodyweight (vigorous)": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
        "Powerlifting (low volume)": {"MET": 3.0, "kcal_per_hour": {"60kg": 189, "70kg": 221, "80kg": 252}},
        "CrossFit / HIIT": {"MET": 9.0, "kcal_per_hour": {"60kg": 567, "70kg": 661, "80kg": 756}},
        "Machine isolation": {"MET": 3.5, "kcal_per_hour": {"60kg": 221, "70kg": 258, "80kg": 294}},
        "Functional free weights": {"MET": 6.5, "kcal_per_hour": {"60kg": 410, "70kg": 478, "80kg": 546}},
    },
    "Gym Cardio": {
        "Treadmill - walking": {"MET": 3.3, "kcal_per_hour": {"60kg": 208, "70kg": 243, "80kg": 277}},
        "Treadmill - brisk walk (incline 3–5%)": {"MET": 4.8, "kcal_per_hour": {"60kg": 302, "70kg": 352, "80kg": 403}},
        "Treadmill - jog (8 km/h)": {"MET": 8.3, "kcal_per_hour": {"60kg": 523, "70kg": 610, "80kg": 697}},
        "Treadmill - run (10 km/h)": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Treadmill - sprint intervals": {"MET": 12.0, "kcal_per_hour": {"60kg": 756, "70kg": 882, "80kg": 1008}},
        "Stationary bike - easy": {"MET": 5.5, "kcal_per_hour": {"60kg": 347, "70kg": 405, "80kg": 462}},
        "Stationary bike - moderate": {"MET": 7.0, "kcal_per_hour": {"60kg": 441, "70kg": 515, "80kg": 588}},
        "Stationary bike - vigorous": {"MET": 9.0, "kcal_per_hour": {"60kg": 567, "70kg": 661, "80kg": 756}},
        "Stationary bike - HIIT": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Elliptical - moderate": {"MET": 5.0, "kcal_per_hour": {"60kg": 315, "70kg": 368, "80kg": 420}},
        "Elliptical - high resistance": {"MET": 7.0, "kcal_per_hour": {"60kg": 441, "70kg": 515, "80kg": 588}},
        "Stair climber / stepper": {"MET": 8.8, "kcal_per_hour": {"60kg": 554, "70kg": 647, "80kg": 739}},
        "Rowing machine - moderate": {"MET": 7.0, "kcal_per_hour": {"60kg": 441, "70kg": 515, "80kg": 588}},
        "Rowing machine - vigorous": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Assault bike / air bike": {"MET": 11.0, "kcal_per_hour": {"60kg": 693, "70kg": 808, "80kg": 924}},
        "Jump rope - moderate": {"MET": 10.0, "kcal_per_hour": {"60kg": 630, "70kg": 735, "80kg": 840}},
        "Jump rope - fast": {"MET": 12.0, "kcal_per_hour": {"60kg": 756, "70kg": 882, "80kg": 1008}},
        "Box step-ups": {"MET": 6.5, "kcal_per_hour": {"60kg": 410, "70kg": 478, "80kg": 546}},
        "Battle ropes": {"MET": 8.0, "kcal_per_hour": {"60kg": 504, "70kg": 588, "80kg": 672}},
    },
}


def build_exercise_db():
    """운동 데이터베이스를 Parquet 파일로 변환"""
    records = []
    
    for category, exercises in CALORIES_DB.items():
        for exercise_name, data in exercises.items():
            met = data.get("MET", 0)
            kcal_per_hour = data.get("kcal_per_hour", {})
            
            # 체중별 칼로리 데이터를 평균으로 계산하거나 보간
            weights = [60, 70, 80]
            kcals = [kcal_per_hour.get(f"{w}kg", 0) for w in weights]
            
            # 선형 보간을 위한 계수 계산
            # kcal = a * weight + b 형태로 근사
            if len([k for k in kcals if k > 0]) >= 2:
                # 최소 제곱법으로 선형 회귀
                valid_data = [(w, k) for w, k in zip(weights, kcals) if k > 0]
                if len(valid_data) >= 2:
                    weights_valid = [w for w, k in valid_data]
                    kcals_valid = [k for w, k in valid_data]
                    n = len(valid_data)
                    sum_w = sum(weights_valid)
                    sum_k = sum(kcals_valid)
                    sum_wk = sum(w * k for w, k in valid_data)
                    sum_w2 = sum(w * w for w in weights_valid)
                    
                    # y = ax + b 형태
                    # a = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - (sum(x))^2)
                    denominator = n * sum_w2 - sum_w * sum_w
                    if denominator != 0:
                        a = (n * sum_wk - sum_w * sum_k) / denominator
                        b = (sum_k - a * sum_w) / n
                    else:
                        # 단순 평균
                        a = (kcals_valid[-1] - kcals_valid[0]) / (weights_valid[-1] - weights_valid[0]) if len(weights_valid) > 1 else 0
                        b = kcals_valid[0] - a * weights_valid[0]
                else:
                    a = 0
                    b = kcals[0] if kcals[0] > 0 else 0
            else:
                # 데이터가 부족하면 MET 값으로 계산
                # MET * weight_kg * 0.0175 = kcal/min
                # kcal/hour = MET * weight_kg * 0.0175 * 60 = MET * weight_kg * 1.05
                a = met * 1.05
                b = 0
            
            records.append({
                "category": category,
                "exercise_name": exercise_name,
                "full_name": f"{category} - {exercise_name}",
                "met": met,
                "kcal_per_hour_60kg": kcal_per_hour.get("60kg", 0),
                "kcal_per_hour_70kg": kcal_per_hour.get("70kg", 0),
                "kcal_per_hour_80kg": kcal_per_hour.get("80kg", 0),
                "kcal_slope": a,  # 체중당 칼로리 증가율
                "kcal_intercept": b,  # 기본 칼로리
            })
    
    df = pd.DataFrame(records)
    
    # 출력 디렉토리 생성
    output_dir = backend_dir / "app" / "data" / "exercise_db"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Parquet 파일로 저장
    output_path = output_dir / "exercise_data.parquet"
    df.to_parquet(output_path, index=False, engine="pyarrow")
    
    print(f"✅ Created exercise database: {output_path}")
    print(f"   Total exercises: {len(df)}")
    print(f"   Categories: {df['category'].nunique()}")
    print(f"\nFirst 5 rows:")
    print(df.head().to_string())
    
    return output_path


if __name__ == "__main__":
    build_exercise_db()
