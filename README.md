# ⚡ DevPulse - Autonomous Local Terminal Coding Assistant

DevPulse is a production-grade, autonomous CLI coding assistant powered by the **Google Gemini API** (`gemini-3.5-flash`). Built on an iterative **ReAct (Reasoning + Acting)** execution loop, DevPulse bridges remote model reasoning with local filesystem execution while enforcing strict security guardrails, memory summarization, and human-in-the-loop controls.

---

## 🛡️ Core Features

- **Dual-Loop ReAct Engine**: An interactive CLI session loop paired with a dynamic tool resolution loop that executes multi-hop filesystem operations autonomously.
- **Security & Path Sanitization**: Prevents directory traversal attacks (`../../`) by resolving canonical paths and asserting that all file operations remain strictly inside `Path.cwd()`.
- **Human-in-the-Loop (HITL) Gatekeeper**: Intercepts destructive actions (deleting files/directories or overwriting existing code) and requires explicit interactive confirmation (`[y/N]`) before proceeding.
- **Summary-Assisted Memory Optimization**: Uses a sliding window (last 8 turns) to bound context growth, while automatically summarizing evicted turns with Gemini to maintain persistent project context across long sessions.
- **Live Token Utilization**: Tracks prompt, candidate, and cumulative token counts across every turn and tool hop. Access metrics on demand via the `tokens` command.
- **Rate-Limit Backoff Engine**: Parses HTTP 429 quota exhaustion headers, displays a real-time countdown formatted in hours, minutes, and seconds, and safely resumes execution.

---

## 🧰 Local Tool Suite ("The Hands")

DevPulse registers five local filesystem tools via structured `google-genai` schemas:

1. `look_inside_folder`: Inspects workspace structure and subdirectories.
2. `read_file`: Reads source code and text files directly from disk.
3. `create_folder`: Scaffolds directories and nested paths safely.
4. `write_file`: Writes complete code to disk. Triggers HITL confirmation if an existing file would be overwritten.
5. `delete_item`: Permanently deletes files or directories. Guarded by mandatory HITL confirmation.

---

## 🌟 Built-in Showcase Projects

This repository contains fully functional applications scaffolded entirely by DevPulse from single-sentence prompts:

### 1. 🕹️ Retro Pac-Man Arcade (`/pacman`)
A complete, playable Pac-Man arcade game built using HTML5 Canvas, CSS3, and JavaScript.
- **Features**: 2D tile-grid maze, player navigation, ghost NPC movement, scoring, lives counter, and retro arcade styling.

### 2. 🧮 Minimalist Calculator (`/calculator`)
A modern, responsive calculator web application.
- **Features**: Inter font UI, arithmetic evaluation, percentage calculation, backspace, and keyboard event support.

---

## 🛠️ Prerequisites & Setup

1. **Prerequisites**: Python 3.9+ and a Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/)).
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt

Configure Environment Variables:
Create a .env file in the project root:

Code snippet
GEMINI_API_KEY=your_gemini_api_key_here

---

## 💻 Usage

Launch DevPulse from your project terminal:

Bash
python DevPulse.py
Interactive Commands
Type any coding task: "Create a folder named utils and add a helper script inside it."

summary: Inspect the current consolidated memory summary.

tokens: View cumulative prompt, generated, and total session token counts.

exit or quit: Display the final token report and terminate the session.

---

## 📂 Architecture Overview

```text
User Input ──► Outer Interactive Loop (Terminal Session)
                    │
                    ▼
         Gemini 3.6 Flash (Reasoning & Intent)
                    │
           Function Call Request
                    │
                    ▼
         Inner Tool Resolution Loop (ReAct)
   ┌──────────────────────────────────────────────┐
   │ • Path Sanitizer (Workspace Boundary Check)  │
   │ • HITL Gatekeeper (Destructive Action Guard) │
   │ • Tool Execution:                            │
   │   - look_inside_folder()                     │
   │   - read_file()                              │
   │   - create_folder()                          │
   │   - write_file()                             │
   │   - delete_item()                            │
   └──────────────────────────────────────────────┘
                    │
                    ▼
       Tool Response Fed Back to Gemini Context
```

---

## 📄 License

MIT License. Free for local development and personal coding workflows.

---