# USD per token (input, output) — sources: Anthropic/Google/OpenAI pricing pages
COST_PER_TOKEN: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (1e-6,    5e-6),
    "claude-sonnet-5":           (3e-6,    15e-6),
    "claude-opus-4-8":           (5e-6,    25e-6),
    "gemini-2.5-flash":          (0.30e-6, 2.50e-6),
    "gemini-2.5-pro":            (1.25e-6, 10e-6),
    "gemini-3.1-pro-preview":    (1.25e-6, 10e-6),
    "gpt-4o-mini":               (0.15e-6, 0.60e-6),
    "gpt-4o":                    (2.5e-6,  10e-6),
}


def estimate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_PER_TOKEN.get(model_id, (0.0, 0.0))
    return input_tokens * rates[0] + output_tokens * rates[1]


MODELS: dict[str, dict[str, str]] = {
    "fast": {
        "debater_a": "claude-haiku-4-5-20251001",
        "debater_b": "gemini-2.5-flash",
        "judge_openai": "gpt-4o-mini",
        "judge_anthropic": "claude-haiku-4-5-20251001",
        "judge_google": "gemini-2.5-flash",
    },
    "balanced": {
        "debater_a": "claude-sonnet-5",
        "debater_b": "gemini-2.5-pro",
        "judge_openai": "gpt-4o",
        "judge_anthropic": "claude-sonnet-5",
        "judge_google": "gemini-2.5-pro",
    },
    "deep": {
        "debater_a": "claude-opus-4-8",
        "debater_b": "gemini-3.1-pro-preview",
        "judge_openai": "gpt-4o",
        "judge_anthropic": "claude-opus-4-8",
        "judge_google": "gemini-3.1-pro-preview",
    },
}


def get_debater_a_model(tier: str) -> str:
    return MODELS[tier]["debater_a"]


def get_debater_b_model(tier: str) -> str:
    return MODELS[tier]["debater_b"]


def get_judge_model(tier: str, vendor: str) -> str:
    return MODELS[tier][f"judge_{vendor}"]
