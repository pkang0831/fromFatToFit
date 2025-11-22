import os
import json

def transcript_json_to_markdown(json_path, md_path):
    """
    Reads a translated transcript JSON (list of chunks with "text", "start", "duration").
    Writes a markdown file with the transcript (one line per chunk).
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    lines = []
    for chunk in data:
        chunk_text = chunk.get("text", "").strip()
        if chunk_text:
            lines.append(chunk_text)
    md_content = "\n\n".join(lines)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

def convert_all_translated_transcripts_to_markdown():
    basedir = os.path.dirname(__file__)
    transcripts_dir = os.path.join(basedir, "openai_direct_translated_transcripts")
    out_md_dir = os.path.join(basedir, "openai_transcripts_markdown")
    os.makedirs(out_md_dir, exist_ok=True)

    for fn in os.listdir(transcripts_dir):
        if fn.endswith("_en.json"):
            json_path = os.path.join(transcripts_dir, fn)
            base_name = fn.rsplit(".", 1)[0]
            md_fn = base_name + ".md"
            md_path = os.path.join(out_md_dir, md_fn)
            transcript_json_to_markdown(json_path, md_path)
            print(f"✓ Converted {fn} → {md_fn}")

if __name__ == "__main__":
    convert_all_translated_transcripts_to_markdown()
