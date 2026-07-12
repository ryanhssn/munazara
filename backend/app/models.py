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
