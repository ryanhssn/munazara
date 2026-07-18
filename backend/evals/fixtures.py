"""Fixed question set for offline evaluation.

Each fixture has a question + expected properties of a good verdict.
Actual LLM calls are mocked in the runner — we're evaluating structure,
cost, and convergence behaviour, not LLM quality.
"""

FIXTURES = [
    {
        "id": "tech_decision",
        "question": "Should we migrate our monolith to microservices?",
        "tier": "fast",
        "max_rounds": 2,
        "expect": {
            "min_rounds": 1,
            "verdict_has_disputes": True,
            "max_cost_usd": 0.10,
        },
    },
    {
        "id": "quick_convergence",
        "question": "Is Python a good language for scripting?",
        "tier": "fast",
        "max_rounds": 3,
        "expect": {
            "min_rounds": 1,
            "verdict_has_disputes": False,  # obvious question, expect agreement
            "max_cost_usd": 0.10,
        },
    },
    {
        "id": "multiround_debate",
        "question": "Should AI companies be required to open-source their models?",
        "tier": "fast",
        "max_rounds": 3,
        "expect": {
            "min_rounds": 2,
            "verdict_has_disputes": True,
            "max_cost_usd": 0.20,
        },
    },
]
