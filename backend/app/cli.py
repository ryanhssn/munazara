import asyncio
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

# Vendor → display name, so panel labels stay correct when debaters are swapped.
_VENDOR_LABEL = {"anthropic": "CLAUDE", "google": "GEMINI", "openai": "GPT"}


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


async def run_debate(
    question: str,
    tier: str = "balanced",
    max_rounds: int = 3,
    judge_vendor: str = "anthropic",
    debater_a_vendor: str = "anthropic",
    debater_b_vendor: str = "google",
    enable_rag: bool = False,
) -> dict:
    # Mirror app/streaming.py:_build_initial_state — the graph expects every
    # DebateState field to be present, not just the Phase-1 subset.
    initial_state: DebateState = {
        "question": question,
        "images": [],
        "round_count": 0,
        "max_rounds": max_rounds,
        "transcript": [],
        "agreements": [],
        "open_disputes": [],
        "verdict": None,
        "exhibit_card": None,
        "tier": tier,
        "judge_vendor": judge_vendor,
        "debater_a_vendor": debater_a_vendor,
        "debater_b_vendor": debater_b_vendor,
        "last_a_disputes": [],
        "last_b_disputes": [],
        "last_a_confidence": 0.5,
        "last_b_confidence": 0.5,
        "enable_rag": enable_rag,
        "api_keys": _get_api_keys(),
    }

    if judge_vendor in (debater_a_vendor, debater_b_vendor):
        console.print(f"[yellow]Note:[/yellow] judge vendor '{judge_vendor}' is also debating — verdict may be biased.")

    console.print(Panel(
        f"[bold]{question}[/bold]\n\nTier: {tier}  |  Max rounds: {max_rounds}",
        title="[cyan]MUNAZARA[/cyan]",
        border_style="cyan",
    ))

    # Nodes are async (they await LLM calls), so the graph must be driven via
    # the async API — graph.invoke() raises "No synchronous function provided".
    with console.status("[bold green]Debate in progress...[/bold green]"):
        result = await graph.ainvoke(initial_state)

    a_label = f"{_VENDOR_LABEL.get(debater_a_vendor, debater_a_vendor.upper())} (A)"
    b_label = f"{_VENDOR_LABEL.get(debater_b_vendor, debater_b_vendor.upper())} (B)"
    for turn in result["transcript"]:
        is_a = turn["agent"] == "debater_a"
        color = "blue" if is_a else "green"
        label = a_label if is_a else b_label
        body = turn["content"]
        if turn.get("concessions"):
            body += f"\n\n[dim]Concedes: {'; '.join(turn['concessions'])}[/dim]"
        if turn.get("disputes"):
            body += f"\n[dim]{len(turn['disputes'])} dispute(s) open[/dim]"
        body += f"\n[dim]Confidence: {turn['confidence']:.0%}[/dim]"

        console.print(Panel(body, title=f"[{color}]{label} — Round {turn['round']}[/{color}]", border_style=color))

    verdict = result.get("verdict")
    if verdict:
        # Verdict schema nests the headline under `tldr`; overall confidence is
        # top-level. (See app/schemas.py:Verdict / TldrBlock.)
        tldr = verdict.get("tldr") or {}
        body = f"[bold]Recommendation:[/bold] {tldr.get('recommendation', '')}\n"
        if tldr.get("why"):
            body += f"[dim]{tldr['why']}[/dim]\n"
        body += f"[bold]Confidence:[/bold] {verdict.get('confidence', 0.0):.0%}"
        body += f"   [bold]Winner:[/bold] {verdict.get('winner', 'tie')}"
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
        console.print("         python -m app.cli 'question' --tier fast --rounds 2 --judge anthropic")
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

    asyncio.run(run_debate(question, tier=tier, max_rounds=max_rounds, judge_vendor=judge_vendor))


if __name__ == "__main__":
    main()
