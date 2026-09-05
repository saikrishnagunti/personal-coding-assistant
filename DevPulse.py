import os
import re
import time
import shutil
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
# 1. Token Metrics & Memory State
# -------------------------------------------------------------
SESSION_TOTAL_PROMPT_TOKENS = 0
SESSION_TOTAL_CANDIDATE_TOKENS = 0
SESSION_TOTAL_TOKENS = 0

RUNNING_SUMMARY = "No prior history. Project session just started."
MAX_HISTORY_TURNS = 8
EVICT_CHUNK_SIZE = 4

def log_token_usage(response, label: str = "Turn") -> None:
    """Extracts and prints token usage metadata from the model response."""
    global SESSION_TOTAL_PROMPT_TOKENS, SESSION_TOTAL_CANDIDATE_TOKENS, SESSION_TOTAL_TOKENS

    usage = getattr(response, "usage_metadata", None)
    if usage:
        prompt_tokens = getattr(usage, "prompt_token_count", 0)
        candidate_tokens = getattr(usage, "candidates_token_count", 0)
        total_tokens = getattr(usage, "total_token_count", prompt_tokens + candidate_tokens)

        # Accumulate session totals
        SESSION_TOTAL_PROMPT_TOKENS += prompt_tokens
        SESSION_TOTAL_CANDIDATE_TOKENS += candidate_tokens
        SESSION_TOTAL_TOKENS += total_tokens

        print(f"📊 [TOKENS - {label}] Prompt: {prompt_tokens} | Generated: {candidate_tokens} | Turn Total: {total_tokens}")

def print_session_token_summary() -> None:
    """Displays cumulative token usage for the entire session."""
    print("\n" + "=" * 45)
    print("📈 CUMULATIVE SESSION TOKEN UTILIZATION")
    print(f"• Total Prompt Tokens    : {SESSION_TOTAL_PROMPT_TOKENS}")
    print(f"• Total Candidate Tokens : {SESSION_TOTAL_CANDIDATE_TOKENS}")
    print(f"• Total Consumed Tokens  : {SESSION_TOTAL_TOKENS}")
    print("=" * 45 + "\n")

# -------------------------------------------------------------
# 2. Summary-Assisted Memory Management
# -------------------------------------------------------------
def update_summary_from_pruned_turns(pruned_turns: list) -> None:
    global RUNNING_SUMMARY

    transcript_lines = []
    for turn in pruned_turns:
        role = getattr(turn, "role", "unknown")
        parts_text = []
        if hasattr(turn, "parts"):
            for p in turn.parts:
                if hasattr(p, "text") and p.text:
                    parts_text.append(p.text)
                elif hasattr(p, "function_call") and p.function_call:
                    parts_text.append(f"[Executed Tool: {p.function_call.name}]")
                elif hasattr(p, "function_response") and p.function_response:
                    parts_text.append("[Tool Result Output]")
        transcript_lines.append(f"{role.upper()}: {' '.join(parts_text)}")

    conversation_snippet = "\n".join(transcript_lines)

    summary_prompt = f"""
You are an executive memory consolidator for an autonomous coding agent.
Update the EXISTING SUMMARY using the NEW EVICTED TURNS.
Focus strictly on: files created/modified/deleted, core user preferences, and current project architecture.

EXISTING SUMMARY:
{RUNNING_SUMMARY}

NEW EVICTED TURNS:
{conversation_snippet}

Output ONLY the concise, updated bullet-point summary.
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=summary_prompt,
            config=types.GenerateContentConfig(temperature=0.2)
        )
        log_token_usage(response, label="Memory Summarizer")
        if response.text:
            RUNNING_SUMMARY = response.text.strip()
            print("📝 [MEMORY SUMMARIZER] Consolidated pruned turns into active summary.")
    except Exception as e:
        print(f"⚠️ [MEMORY SUMMARIZER ERROR] Could not summarize evicted turns: {e}")

def prune_and_summarize_history(chat):
    history = chat.get_history()
    if len(history) > MAX_HISTORY_TURNS:
        turns_to_prune = history[:EVICT_CHUNK_SIZE]
        retained_turns = history[EVICT_CHUNK_SIZE:]
        update_summary_from_pruned_turns(turns_to_prune)
        chat._history = retained_turns
        print(f"🧹 [MEMORY SLIDING WINDOW] Evicted {len(turns_to_prune)} turns; retained {len(retained_turns)} active turns.")

# -------------------------------------------------------------
# 3. Path Sanitization & HITL Guardrails
# -------------------------------------------------------------
def sanitize_path(target_path: str) -> Path:
    workspace_root = Path.cwd().resolve()
    target = Path(target_path)

    # If the user/model passed an absolute path, resolve directly; otherwise join with workspace
    if target.is_absolute():
        resolved_target = target.resolve()
    else:
        resolved_target = (workspace_root / target).resolve()

    # Block if target is outside workspace root
    if not (resolved_target == workspace_root or workspace_root in resolved_target.parents):
        raise PermissionError(f"Security Alert: Path traversal blocked. '{target_path}' is outside workspace.")

    return resolved_target

def request_hitl_approval(action_description: str) -> bool:
    print(f"\n⚠️  [HITL APPROVAL REQUIRED] {action_description}")
    try:
        approval = input("👉 Confirm execution? (y/N): ").strip().lower()
        return approval in ["y", "yes"]
    except (KeyboardInterrupt, EOFError):
        return False

# -------------------------------------------------------------
# 4. Rate-Limit Cooldown Handlers
# -------------------------------------------------------------
def format_time_duration(total_seconds: float) -> str:
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
    match = re.search(r"retry in ([\d\.]+)s", error_str, re.IGNORECASE)
    if match:
        return float(match.group(1))
    match = re.search(r"['\"]retryDelay['\"]\s*:\s*['\"](\d+)s?['\"]", error_str)
    if match:
        return float(match.group(1))
    return default_delay

def send_message_with_cooldown(chat, payload, max_retries: int = 5):
    for attempt in range(max_retries):
        try:
            return chat.send_message(payload)
        except Exception as e:
            err_text = str(e)
            if "429" in err_text or "RESOURCE_EXHAUSTED" in err_text:
                wait_seconds = parse_retry_delay(err_text, default_delay=30.0 * (attempt + 1))
                formatted_time = format_time_duration(wait_seconds)

                print(f"\n⏳ [RATE LIMIT] Cooldown required: {formatted_time} ({wait_seconds:.1f}s).")
                remaining = int(wait_seconds) + 1
                while remaining > 0:
                    time_display = format_time_duration(remaining)
                    print(f"\r⏳ Resuming in: {time_display}   ", end="", flush=True)
                    time.sleep(1)
                    remaining -= 1
                print("\r🚀 Resuming request execution...                         \n")
            else:
                raise e
    raise RuntimeError("Rate limit persisted across maximum retry attempts.")

# -------------------------------------------------------------
# 5. Local Tool Implementations (The "Hands")
# -------------------------------------------------------------
def look_inside_folder(folder_path: str = ".") -> list:
    try:
        target = sanitize_path(folder_path)
        if not target.exists():
            return [f"Error: Path '{folder_path}' does not exist."]
        items = os.listdir(target)
        print(f"📂 [TOOL] Listed {len(items)} items in '{folder_path}'")
        return items
    except Exception as e:
        return [f"Error accessing directory '{folder_path}': {e}"]

def read_file(file_name: str) -> str:
    try:
        target = sanitize_path(file_name)
        if not target.exists():
            return f"Error: File '{file_name}' does not exist."
        with open(target, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"📄 [TOOL] Read '{file_name}' ({len(content)} characters)")
        return content
    except Exception as e:
        return f"Error reading '{file_name}': {e}"

def create_folder(folder_name: str) -> str:
    try:
        target = sanitize_path(folder_name)
        target.mkdir(parents=True, exist_ok=True)
        print(f"📁 [TOOL] Created directory '{folder_name}'")
        return f"Directory '{folder_name}' created successfully."
    except Exception as e:
        return f"Error creating folder '{folder_name}': {e}"

def write_file(file_name: str, content: str) -> str:
    try:
        target = sanitize_path(file_name)
        if target.exists():
            approved = request_hitl_approval(f"The model wants to overwrite existing file '{file_name}'.")
            if not approved:
                print(f"🚫 [ACTION ABORTED] Overwrite of '{file_name}' was denied by user.")
                return f"Action cancelled: Developer denied permission to overwrite '{file_name}'."

        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"💾 [TOOL] Saved {len(content)} characters to '{file_name}'")
        return f"File '{file_name}' written successfully."
    except Exception as e:
        return f"Error writing file '{file_name}': {e}"

def delete_item(target_path: str) -> str:
    try:
        target = sanitize_path(target_path)
        if not target.exists():
            return f"Error: Cannot delete. Path '{target_path}' does not exist."

        item_type = "directory" if target.is_dir() else "file"
        approved = request_hitl_approval(f"The model wants to permanently delete {item_type} '{target_path}'.")
        if not approved:
            print(f"🚫 [ACTION ABORTED] Deletion of '{target_path}' was denied by user.")
            return f"Action cancelled: Developer denied permission to delete '{target_path}'."

        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()

        print(f"🗑️ [TOOL] Permanently deleted {item_type} '{target_path}'")
        return f"Successfully deleted {item_type} '{target_path}'."
    except Exception as e:
        return f"Error deleting '{target_path}': {e}"

# -------------------------------------------------------------
# 6. Tool Declarations
# -------------------------------------------------------------
tool_look_folder = types.FunctionDeclaration(
    name="look_inside_folder",
    description="Inspects workspace structure by listing files and subfolders. Always pass the exact folder path requested by the user. Defaults to '.' (root).",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "folder_path": types.Schema(type="STRING", description="Target folder path (relative or absolute) to inspect.")
        }
    )
)

tool_read_file = types.FunctionDeclaration(
    name="read_file",
    description="Reads full text content from an existing file.",
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
    description="Writes complete code or text to a file. Requires user approval if overwriting.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "file_name": types.Schema(type="STRING", description="Relative file path including extension."),
            "content": types.Schema(type="STRING", description="The full code or text to write.")
        },
        required=["file_name", "content"]
    )
)

tool_delete_item = types.FunctionDeclaration(
    name="delete_item",
    description="Permanently deletes a file or directory. Requires user approval.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "target_path": types.Schema(type="STRING", description="Relative path of item to delete.")
        },
        required=["target_path"]
    )
)

coding_tools = types.Tool(
    function_declarations=[
        tool_look_folder,
        tool_read_file,
        tool_create_folder,
        tool_write_file,
        tool_delete_item
    ]
)

def build_system_instruction() -> str:
    return f"""You are DevPulse, an autonomous terminal coding assistant.
You maintain working memory across sessions using summary consolidation.

[RUNNING SUMMARY OF PRIOR PRUNED SESSIONS]:
{RUNNING_SUMMARY}

OPERATING RULES:
1. Always verify existing workspace code using `look_inside_folder` or `read_file` before making modifications.
2. Always pass the user's exact requested path to tools. If a tool returns a PermissionError or Security Alert indicating a path is outside the workspace, report that error directly to the user. Never substitute with the current folder ('.').
3. Build components with `create_folder` and `write_file`. Clean up with `delete_item`.
4. If user denies HITL confirmation, gracefully offer alternative paths.
"""

# -------------------------------------------------------------
# 7. Interactive Session Execution Loop
# -------------------------------------------------------------
def run_assistant():
    chat = client.chats.create(
        model="gemini-3.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=build_system_instruction(),
            tools=[coding_tools],
            temperature=0.2
        )
    )

    print("=" * 65)
    print("⚡ DevPulse: Autonomous Assistant (with Live Token Utilization)")
    print("🧠 Memory: Sliding Window + Summary Consolidation")
    print("🛡️ Security: Path Sanitization + Human-in-the-Loop (HITL)")
    print(f"📂 Workspace: {Path.cwd()}")
    print("Commands: 'tokens' (view metrics), 'summary' (view memory), 'exit'")
    print("=" * 65)

    while True:
        try:
            user_input = input("\nYou > ").strip()
        except (KeyboardInterrupt, EOFError):
            print_session_token_summary()
            break

        if user_input.lower() in ["exit", "quit"]:
            print_session_token_summary()
            break
        if user_input.lower() == "summary":
            print(f"\n📋 [CURRENT CONSOLIDATED SUMMARY]:\n{RUNNING_SUMMARY}")
            continue
        if user_input.lower() == "tokens":
            print_session_token_summary()
            continue
        if not user_input:
            continue

        try:
            prune_and_summarize_history(chat)

            contextualized_prompt = f"[CONTEXT SUMMARY]: {RUNNING_SUMMARY}\n\nUSER PROMPT: {user_input}"
            response = send_message_with_cooldown(chat, contextualized_prompt)
            log_token_usage(response, label="Initial Prompt")

            # Inner ReAct tool execution loop
            step_count = 1
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
                    elif fn_name == "delete_item":
                        result = delete_item(args.get("target_path", ""))
                    else:
                        result = {"error": f"Unknown tool: {fn_name}"}

                    response = send_message_with_cooldown(
                        chat,
                        types.Part.from_function_response(
                            name=fn_name,
                            response={"result": result}
                        )
                    )
                    log_token_usage(response, label=f"Tool Step {step_count}")
                    step_count += 1

            print(f"\nDevPulse:\n{response.text}")

        except Exception as e:
            print(f"\nExecution error: {e}")

if __name__ == "__main__":
    run_assistant()