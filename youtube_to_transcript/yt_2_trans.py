from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import os, json

video_ids_path = os.path.join(os.path.dirname(__file__), "list.txt")
with open(video_ids_path, "r") as f:
    video_ids = [i[:-1] for i in f.readlines()]

transcripts_dir = os.path.join(os.path.dirname(__file__), "transcripts")
if os.path.exists(transcripts_dir):
    transcript_files = os.listdir(transcripts_dir)
    transcript_names = [fn[:-5] for fn in transcript_files if fn.endswith(".json")]
else:
    transcript_names = []
# print(len(transcript_names))
print(len(video_ids))
for video_id in video_ids:
    if video_id in transcript_names:
        print(f"이미 존재하는 트랜스크립트: {video_id}")
        continue
    try:

        ytt_api = YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username="rmzneczx",
                proxy_password="e5f0dyxohuda",
            )
        )
        
        fetched_transcript = ytt_api.fetch(video_id, languages=["ko"])
        transcripted_data = fetched_transcript.to_raw_data()

        os.makedirs(transcripts_dir, exist_ok=True)

        with open(os.path.join(transcripts_dir, f"{video_id}.json"), "w") as f:
            json.dump(transcripted_data, f, ensure_ascii=False, indent=4)
    except Exception as e:
        print(f"에러 발생 ({video_id}): {str(e)}")
        continue