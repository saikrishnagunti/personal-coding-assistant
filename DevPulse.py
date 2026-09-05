import os
import re
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY missing from environment or .env file.")

client = genai.Client(api_key=api_key)

# -------------------------------------------------------------
# 1. Cooldown & Time Formatting Helpers
# -------------------------------------------------------------
def format_time_duration(total_seconds: float) -> str:
    """Formats raw seconds into human-readable hours, minutes, and seconds."""
    seconds_int = int(total_seconds)
    hours = seconds_int // 3600
    minutes = (seconds_int % 3600) // 60
    secs = seconds_int % 60

    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0 or hours > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{secs}s")

    return " ".join(parts)

def parse_retry_delay(error_str: str, default_delay: float = 35.0) -> float:
    """
    Extracts retry delay in seconds from the Gemini 429 quota error payload.
    Matches patterns like 'retry in 41.92s', 'retryDelay': '41s', etc.
    """
    # Check for 'retry in XX.XXs'
    match = re.search(r"retry in ([\d\.]+)s", error_str, re.IGNORECASE)
    if match:
        return float(match.group(1))

    # Check for "'retryDelay': 'XXs'"
    match = re.search(r"['\"]retryDelay['\"]\s*:\s*['\"](\d+)s?['\"]", error_str)
    if match:
        return float(match.group(1))

    return default_delay

def send_message_with_cooldown(chat, payload, max_retries: int = 5):
    """
    Executes chat.send_message with automatic quota tracking.
    Parses rate-limit responses and displays countdowns in hours, minutes, and seconds.
    """
    for attempt in range(max_retries):
        try:
            return chat.send_message(payload)
        except Exception as e:
            err_text = str(e)
            if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text:
                wait_seconds = parse_retry_delay(err_text, default_delay=30.0 * (attempt + 1))
                formatted_time = format_time_duration(wait_seconds)

                print(f"\n⏳ [RATE LIMIT] Cooldown period required: {formatted_time} ({wait_seconds:.1f} total seconds).")
                print(f"🔄 Waiting for quota reset before retry (Attempt {attempt + 1}/{max_retries})...")

                # Live second-by-second countdown in terminal
                remaining = int(wait_seconds) + 1
                while remaining > 0:
                    time_display = format_time_duration(remaining)
                    print(f"\r⏳ Resuming in: {time_display}   ", end="", flush=True)
                    time.sleep(1)
                    remaining -= 1

                print("\r🚀 Resuming request execution...                         \n")
            else:
                # Re-raise authentication or non-quota exceptions
                raise e

    raise RuntimeError("Rate limit persisted across maximum retry attempts. Please retry later.")

# -------------------------------------------------------------
# 2. Local Tool Implementations (The "Hands")
# -------------------------------------------------------------
def look_inside_folder(folder_path: str = ".") -> list:
    """Lists files and folders inside the targeted directory path."""
    try:
        target = Path.cwd() / folder_path
        if not target.exists():
            return [f"Error: Path '{folder_path}' does not exist."]
        items = os.listdir(target)
        print(f"📂 [TOOL] Listed {len(items)} items in '{folder_path}'")
        return items
    except Exception as e:
        return [f"Error accessing directory '{folder_path}': {e}"]

def read_file(file_name: str) -> str:
    """Reads and returns text from a file."""
    try:
        target = Path.cwd() / file_name
        if not target.exists():
            return f"Error: File '{file_name}' does not exist."
        with open(target, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"📄 [TOOL] Read '{file_name}' ({len(content)} characters)")
        return content
    except Exception as e:
        return f"Error reading '{file_name}': {e}"

def create_folder(folder_name: str) -> str:
    """Creates a new folder at the specified path."""
    try:
        target = Path.cwd() / folder_name
        target.mkdir(parents=True, exist_ok=True)
        print(f"📁 [TOOL] Created directory '{folder_name}'")
        return f"Directory '{folder_name}' created successfully."
    except Exception as e:
        return f"Error creating folder '{folder_name}': {e}"

def write_file(file_name: str, content: str) -> str:
    """Creates or overwrites a file with new content."""
    try:
        target = Path.cwd() / file_name
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"💾 [TOOL] Saved {len(content)} characters to '{file_name}'")
        return f"File '{file_name}' written successfully."
    except Exception as e:
        return f"Error writing file '{file_name}': {e}"

# -------------------------------------------------------------
# 3. Tool Declarations (Function Schemas)
# -------------------------------------------------------------
tool_look_folder = types.FunctionDeclaration(
    name="look_inside_folder",
    description="Inspects workspace structure by listing files and subfolders. Defaults to '.' (root).",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "folder_path": types.Schema(type="STRING", description="Relative directory path to list.")
        }
    )
)

tool_read_file = types.FunctionDeclaration(
    name="read_file",
    description="Reads full text content from an existing file. Must include extension (e.g. main.py).",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_name": types.Schema(type="STRING", description="Relative path and filename to read.")
        },
        required=["file_name"]
    )
)

tool_create_folder = types.FunctionDeclaration(
    name="create_folder",
    description="Creates a directory or nested directories at the specified path.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "folder_name": types.Schema(type="STRING", description="Directory path to create.")
        },
        required=["folder_name"]
    )
)

tool_write_file = types.FunctionDeclaration(
    name="write_file",
    description="Writes complete code or text to a file. Overwrites if it already exists.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_name": types.Schema(type="STRING", description="Relative file path including extension."),
            "content": types.Schema(type="STRING", description="The full code or text to write.")
        },
        required=["file_name", "content"]
    )
)

coding_tools = types.Tool(
    function_declarations=[tool_look_folder, tool_read_file, tool_create_folder, tool_write_file]
)

SYSTEM_INSTRUCTION = """
You are DevPulse, an autonomous local terminal coding assistant.
1. When asked to review, modify, or explain code, use `look_inside_folder` and `read_file` first to verify the code directly. Never guess file implementations.
2. When creating new components or projects, use `create_folder` and `write_file`.
3. Keep confirmations concise and state the modifications performed clearly.
"""

# -------------------------------------------------------------
# 4. Interactive Execution Loop
# -------------------------------------------------------------
def run_assistant():
    chat = client.chats.create(
        model="gemini-3.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[coding_tools],
            temperature=0.2
        )
    )

    print("=" * 60)
    print("⚡ DevPulse: Autonomous Terminal Coding Assistant Ready")
    print(f"📂 Workspace: {Path.cwd()}")
    print("Type 'exit' or 'quit' to terminate.")
    print("=" * 60)

    # OUTER LOOP: User interactive session
    while True:
        try:
            user_input = input("\nYou > ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nSession ended.")
            break

        if user_input.lower() in ["exit", "quit"]:
            print("Session ended.")
            break
        if not user_input:
            continue

        try:
            # First turn: Send user prompt through the cooldown retry wrapper
            response = send_message_with_cooldown(chat, user_input)

            # INNER LOOP: Resolves chained function calls with cooldown protection
            while response.function_calls:
                for call in response.function_calls:
                    fn_name = call.name
                    args = call.args

                    if fn_name == "look_inside_folder":
                        result = look_inside_folder(args.get("folder_path", "."))
                    elif fn_name == "read_file":
                        result = read_file(args.get("file_name", ""))
                    elif fn_name == "create_folder":
                        result = create_folder(args.get("folder_name", ""))
                    elif fn_name == "write_file":
                        result = write_file(args.get("file_name", ""), args.get("content", ""))
                    else:
                        result = {"error": f"Unknown tool: {fn_name}"}

                    # Feed tool response back using cooldown wrapper
                    response = send_message_with_cooldown(
                        chat,
                        types.Part.from_function_response(
                            name=fn_name,
                            response={"result": result}
                        )
                    )

            print(f"\nDevPulse:\n{response.text}")

        except Exception as e:
            print(f"\nExecution error: {e}")

if __name__ == "__main__":
    run_assistant()