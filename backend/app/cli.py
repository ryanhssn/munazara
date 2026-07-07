import sys
import os
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

load_dotenv()

from app.graph import graph
from app.schemas import DebateState

console = Console()


def _get_api_keys() -> dict:
    keys = {
        "anthropic": os.getenv("ANTHROPIC_API_KEY", ""),
        "google": os.getenv("GOOGLE_API_KEY", ""),
        "openai": os.getenv("OPENAI_API_KEY", ""),
    }
    missing = [k for k, v in keys.items() if not v]
    if missing:
        console.print(f"[red]Missing API keys: {', '.join(missing)}[/red]")
        console.print("Copy .env.example → .env and fill in your keys.")
        sys.exit(1)
    return keys


def run_debate(question: str, tier: str = "balanced", max_rounds: int = 3, judge_vendor: str = "anthropic") -> dict:
    initial_state: DebateState = {
        "question": question,
        "images": [],
        "round_count": 0,
        "max_rounds": max_rounds,
        "transcript": [],
        "agreements": [],
        "open_disputes": [],
        "verdict": None,
        "tier": tier,
        "judge_vendor": judge_vendor,
        "api_keys": _get_api_keys(),
        "last_a_disputes": [],
        "last_b_disputes": [],
    }

    console.print(Panel(
        f"[bold]{question}[/bold]\n\nTier: {tier}  |  Max rounds: {max_rounds}",
        title="[cyan]MUNAZARA[/cyan]",
        border_style="cyan",
    ))

    with console.status("[bold green]Debate in progress...[/bold green]"):
        result = graph.invoke(initial_state)

    for turn in result["transcript"]:
        color = "blue" if turn["agent"] == "debater_a" else "green"
        label = "CLAUDE (A)" if turn["agent"] == "debater_a" else "GEMINI (B)"
        body = turn["content"]
        if turn.get("concessions"):
            body += f"\n\n[dim]Concedes: {'; '.join(turn['concessions'])}[/dim]"
        if turn.get("disputes"):
            body += f"\n[dim]{len(turn['disputes'])} dispute(s) open[/dim]"
        body += f"\n[dim]Confidence: {turn['confidence']:.0%}[/dim]"

        console.print(Panel(body, title=f"[{color}]{label} — Round {turn['round']}[/{color}]", border_style=color))

    verdict = result.get("verdict")
    if verdict:
        body = f"[bold]Recommendation:[/bold] {verdict['recommendation']}\n"
        body += f"[bold]Confidence:[/bold] {verdict['confidence']:.0%}"
        if verdict.get("agreements"):
            body += "\n\n[bold]Agreements:[/bold]\n" + "\n".join(f"• {a}" for a in verdict["agreements"])
        if verdict.get("dissent_notes"):
            body += f"\n\n[bold]Dissent:[/bold] {verdict['dissent_notes']}"

        console.print(Panel(body, title="[yellow]JUDGE VERDICT[/yellow]", border_style="yellow"))

        if verdict.get("unresolved_disputes"):
            table = Table(title="Rulings on Disputed Points", border_style="yellow", show_lines=True)
            table.add_column("Topic", style="bold", max_width=25)
            table.add_column("Ruling", max_width=20)
            table.add_column("Reasoning")
            for d in verdict["unresolved_disputes"]:
                table.add_row(d["topic"], d["ruling"], d["reasoning"])
            console.print(table)

    return result


def main():
    if len(sys.argv) < 2:
        console.print("[yellow]Usage:[/yellow]  python -m app.cli 'Your question here'")
        console.print("         python -m app.cli 'question' --tier fast --rounds 2")
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

    run_debate(question, tier=tier, max_rounds=max_rounds, judge_vendor=judge_vendor)


if __name__ == "__main__":
    main()
