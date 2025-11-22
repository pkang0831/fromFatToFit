from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
import os, json, time
import random

video_ids_path = os.path.join(os.path.dirname(__file__), "list.txt")
with open(video_ids_path, "r") as f:
    video_ids = [i[:-1] for i in f.readlines()]

# 프록시 리스트 읽기
proxy_list_path = os.path.join(os.path.dirname(__file__), "proxyList.txt")
with open(proxy_list_path, "r") as f:
    proxies = [line.strip() for line in f.readlines() if line.strip()]

print(f"로드된 프록시 개수: {len(proxies)}")

transcripts_dir = os.path.join(os.path.dirname(__file__), "transcripts")
if os.path.exists(transcripts_dir):
    transcript_files = os.listdir(transcripts_dir)
    transcript_names = [fn[:-5] for fn in transcript_files if fn.endswith(".json")]
else:
    transcript_names = []


for video_id in video_ids:
    if video_id in transcript_names:
        print(f"이미 존재하는 트랜스크립트: {video_id}")
        continue
    
    # 프록시 실패 시 재시도 (최대 3번)
    max_retries = 3
    success = False
    
    for attempt in range(max_retries):
        # 프록시를 랜덤하게 선택
        proxy_url = random.choice(proxies)
        print(f"[시도 {attempt + 1}/{max_retries}] 프록시: {proxy_url} - 비디오: {video_id}")
        
        # 프록시 설정으로 API 인스턴스 생성
        try:
            ytt_api = YouTubeTranscriptApi(
                proxy_config=GenericProxyConfig(
                    http_url=proxy_url,
                    https_url=proxy_url,
                )
            )
            
            fetched_transcript = ytt_api.fetch(video_id, languages=["ko"])
            transcripted_data = fetched_transcript.to_raw_data()

            os.makedirs(transcripts_dir, exist_ok=True)

            with open(os.path.join(transcripts_dir, f"{video_id}.json"), "w") as f:
                json.dump(transcripted_data, f, ensure_ascii=False, indent=4)
            
            print(f"✓ 성공: {video_id}")
            success = True
            time.sleep(5)
            break
            
        except Exception as e:
            print(f"✗ 실패 ({video_id}): {str(e)}")
            if attempt < max_retries - 1:
                print(f"다른 프록시로 재시도...")
                time.sleep(2)
            else:
                print(f"최대 재시도 횟수 초과. 다음 비디오로 이동.")
    
    if not success:
        print(f"경고: {video_id} 처리 실패 (모든 프록시 시도 실패)")

