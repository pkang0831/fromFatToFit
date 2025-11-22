# trnslate to english

# two tracks

# create video -> video generate and video edit with thumbnail and title

# enrich information for blog post -> image generate and title generate

# write a book

import os
import json
import time
from openai import OpenAI

# Try to load from .env file if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, skip

# Get API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError(
        "OPENAI_API_KEY environment variable is not set. "
        "Please set it using:\n"
        "  export OPENAI_API_KEY='your-api-key'\n"
        "or create a .env file with: OPENAI_API_KEY=your-api-key"
    )

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def openai_translate(
    text, 
    model="gpt-4o-mini", 
    system_prompt="Translate the following Korean text to natural, clear English without adding or omitting information. Output only the translation.", 
    max_tokens=2000):
    """Translate text using OpenAI API"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text}
    ]
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0,
            max_tokens=max_tokens,
        )
        translation = response.choices[0].message.content.strip()
        return translation
    except Exception as e:
        print(f"OpenAI translation error: {e}")
        return text  # Fallback to original if error

def translate_chunk(chunk, model="gpt-4o-mini", max_retries=3):
    """Translate a single chunk of text using OpenAI API with retry logic"""
    for attempt in range(max_retries):
        try:
            time.sleep(0.5)
            translated_text = openai_translate(chunk["text"], model=model)
            return {
                "text": translated_text,
                "start": chunk["start"],
                "duration": chunk["duration"]
            }
        except Exception as e:
            error_msg = str(e).lower()
            if "rate limit" in error_msg or "too many requests" in error_msg:
                if attempt < max_retries - 1:
                    wait_time = 2 * (attempt + 1)  # Exponential backoff: 2s, 4s, 6s
                    print(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Error translating chunk after {max_retries} retries: {e}")
            else:
                print(f"Error translating chunk: {e}")

            # Return original text on error
            return {
                "text": chunk["text"],
                "start": chunk["start"],
                "duration": chunk["duration"]
            }
    # Fallback: return original
    return {
        "text": chunk["text"],
        "start": chunk["start"],
        "duration": chunk["duration"]
    }

def translate_file(fn, transcripts_dir, translated_transcripts_dir, model="gpt-4o-mini"):
    """Translate a single transcript file using OpenAI API"""
    try:
        # Load the transcript file
        with open(os.path.join(transcripts_dir, fn), "r", encoding="utf-8") as f:
            korean_transcript = json.load(f)
        
        # Translate chunks sequentially
        translated_transcript = []
        total_chunks = len(korean_transcript)
        for idx, chunk in enumerate(korean_transcript, 1):
            result = translate_chunk(chunk, model=model)
            translated_transcript.append(result)
            print(f"  [{idx}/{total_chunks}] Translated chunk from {fn}")
        
        # Write the translated transcript
        out_fn = os.path.join(translated_transcripts_dir, fn.replace(".json", "_en.json"))
        with open(out_fn, "w", encoding="utf-8") as out_f:
            json.dump(translated_transcript, out_f, ensure_ascii=False, indent=2)
        
        print(f"✓ Translated {fn} to {out_fn}")
        return True
    except Exception as e:
        print(f"✗ Error processing {fn}: {e}")
        return False

def main():
    transcripts_dir = os.path.join(os.path.dirname(__file__), "transcripts")
    transcript_files = [f for f in os.listdir(transcripts_dir) if f.endswith(".json")]
    translated_transcripts_dir = os.path.join(os.path.dirname(__file__), "openai_direct_translated_transcripts")
    os.makedirs(translated_transcripts_dir, exist_ok=True)

    # Filter out already translated files
    existing_files = set(os.listdir(translated_transcripts_dir))
    files_to_translate = [
        fn for fn in transcript_files 
        if fn.replace(".json", "_en.json") not in existing_files
    ]
    
    print(f"Found {len(transcript_files)} transcript files")
    print(f"Already translated: {len(transcript_files) - len(files_to_translate)}")
    print(f"Remaining to translate: {len(files_to_translate)}")
    print(f"Processing sequentially with OpenAI (2 second delay between requests)...\n")
    
    # Process files sequentially
    model = "gpt-4o-mini"  # You can change this to "gpt-4", "gpt-3.5-turbo", etc.
    completed = 0
    for idx, fn in enumerate(files_to_translate, 1):
        print(f"\n[{idx}/{len(files_to_translate)}] Processing {fn}...")
        if translate_file(fn, transcripts_dir, translated_transcripts_dir, model=model):
            completed += 1
        print(f"Progress: {completed}/{len(files_to_translate)} files completed")
    
    print(f"\n✓ Translation complete! {completed}/{len(files_to_translate)} files translated successfully.")

if __name__ == "__main__":
    main()