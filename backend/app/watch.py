"""Live streaming watcher — shows tokens printing in real-time from the SSE endpoint."""
import json
import os
import sys

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.rule import Rule

load_dotenv()

AGENT_STYLE = {
    "debater_a": "bold cyan",
    "debater_b": "bold green",
    "judge": "bold yellow",
}

AGENT_LABEL = {
    "debater_a": "CLAUDE (A)",
    "debater_b": "GEMINI (B)",
    "judge": "JUDGE",
}

console = Console(highlight=False)


def _api_keys() -> dict:
    keys = {
        "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
        "google": os.getenv("GOOGLE_API_KEY", ""),
        "openai": os.getenv("OPENAI_API_KEY", ""),
    }
    missing = [k for k, v in keys.items() if not v]
    if missing:
        console.print(f"[red]Missing keys: {', '.join(missing)}[/red]")
        sys.exit(1)
    return keys


def watch(question: str, tier: str = "balanced", max_rounds: int = 3, judge_vendor: str = "anthropic"):
    payload = {
        "question": question,
        "tier": tier,
        "max_rounds": max_rounds,
        "judge_vendor": judge_vendor,
        "api_keys": _api_keys(),
    }

    console.print()
    console.print(Rule(f"[bold white]MUNAZARA[/bold white]  •  {question}", style="white"))
    console.print(f"[dim]tier={tier}  rounds={max_rounds}  judge={judge_vendor}[/dim]")
    console.print()

    current_event = None
    current_agent = None

    with httpx.Client(timeout=300) as client:
        with client.stream("POST", "http://localhost:8000/api/debate", json=payload) as resp:
            if resp.status_code != 200:
                console.print(f"[red]HTTP {resp.status_code}[/red]")
                return

            for raw_line in resp.iter_lines():
                line = raw_line.strip()
                if not line:
                    continue

                if line.startswith("event:"):
                    current_event = line.split(":", 1)[1].strip()

                elif line.startswith("data:") and current_event:
                    data = json.loads(line.split(":", 1)[1].strip())

                    if current_event == "round_start":
                        console.print()
                        console.print(Rule(f"[white]Round {data['round']}[/white]", style="dim"))
                        console.print()
                        current_agent = None

                    elif current_event == "token":
                        agent = data["agent"]
                        style = AGENT_STYLE.get(agent, "white")
                        label = AGENT_LABEL.get(agent, agent)

                        if agent != current_agent:
                            if current_agent is not None:
                                console.print()  # newline after previous agent's tokens
                            console.print(f"[{style}]{label}:[/{style}] ", end="")
                            current_agent = agent

                        console.print(data["text"], end="", style="white")

                    elif current_event == "turn_complete":
                        console.print()  # end token line
                        agent = data["agent"]
                        style = AGENT_STYLE.get(agent, "white")
                        disputes = data.get("disputes", [])
                        conf = data.get("confidence", 0)
                        console.print(
                            f"  [dim]{len(disputes)} dispute(s)  confidence {conf:.0%}[/dim]"
                        )
                        current_agent = None

                    elif current_event == "convergence":
                        console.print()
                        if data["converged"]:
                            console.print("[dim]✓ Converged — routing to judge[/dim]")
                        else:
                            console.print(f"[dim]→ {data['open_disputes']} dispute(s) remain — next round[/dim]")

                    elif current_event == "judge_start":
                        console.print()
                        console.print(Rule("[yellow]JUDGE[/yellow]", style="yellow"))
                        console.print()

                    elif current_event == "verdict":
                        console.print()
                        console.print(Rule("[yellow]VERDICT[/yellow]", style="yellow"))
                        console.print(f"[bold]Confidence:[/bold] {data['confidence']:.0%}")
                        if data.get("agreements"):
                            console.print("\n[bold]Agreements:[/bold]")
                            for a in data["agreements"]:
                                console.print(f"  • {a}")
                        if data.get("unresolved_disputes"):
                            console.print("\n[bold]Disputes:[/bold]")
                            for d in data["unresolved_disputes"]:
                                console.print(f"  [bold]{d['topic']}[/bold] → {d['ruling']}")
                        if data.get("dissent_notes"):
                            console.print(f"\n[dim]Dissent: {data['dissent_notes']}[/dim]")

                    elif current_event == "error":
                        console.print()
                        agent = data.get("agent", "system")
                        console.print(f"[red]ERROR ({agent}): {data['message']}[/red]")

                    elif current_event == "done":
                        console.print()
                        console.print(Rule("[dim]done[/dim]", style="dim"))

                    current_event = None


def main():
    if len(sys.argv) < 2:
        console.print("[yellow]Usage:[/yellow]  python -m app.watch 'Your question'")
        console.print("         python -m app.watch 'question' --tier fast --rounds 2")
        sys.exit(1)

    question = sys.argv[1]
    tier = "balanced"
    max_rounds = 3
    judge_vendor = "anthropic"

    args = sys.argv[2:]
    for i, arg in enumerate(args):
        if arg == "--tier" and i + 1 < len(args):
            tier = args[i + 1]
        elif arg == "--rounds" and i + 1 < len(args):
            max_rounds = int(args[i + 1])
        elif arg == "--judge" and i + 1 < len(args):
            judge_vendor = args[i + 1]

    watch(question, tier=tier, max_rounds=max_rounds, judge_vendor=judge_vendor)


if __name__ == "__main__":
    main()
