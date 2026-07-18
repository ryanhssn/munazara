# USD per token (input, output) — sources: Anthropic/Google/OpenAI pricing pages
COST_PER_TOKEN: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (1e-6,    5e-6),
    "claude-sonnet-5":           (3e-6,    15e-6),
    "claude-opus-4-8":           (5e-6,    25e-6),
    "gemini-2.5-flash":          (0.30e-6, 2.50e-6),
    "gemini-2.5-pro":            (1.25e-6, 10e-6),
    "gemini-3.1-pro-preview":    (1.25e-6, 10e-6),
    "gemini-3.5-flash":          (1.00e-6,  4.00e-6),
    "gpt-4o-mini":               (0.15e-6, 0.60e-6),
    "gpt-4o":                    (2.5e-6,  10e-6),
    "o3":                        (10e-6,   40e-6),
}


def estimate_cost(model_id: str, input_tokens: int, output_tokens: int) -> float:
    rates = COST_PER_TOKEN.get(model_id, (0.0, 0.0))
    return input_tokens * rates[0] + output_tokens * rates[1]


# Model per vendor per tier — used for both debaters and judges
VENDOR_MODELS: dict[str, dict[str, str]] = {
    "anthropic": {
        "fast":     "claude-haiku-4-5-20251001",
        "balanced": "claude-sonnet-5",
        "deep":     "claude-opus-4-8",
    },
    "google": {
        "fast":     "gemini-2.5-flash",
        "balanced": "gemini-3.1-pro-preview",
        "deep":     "gemini-3.5-flash",
    },
    "openai": {
        "fast":     "gpt-4o-mini",
        "balanced": "gpt-4o",
        "deep":     "o3",
    },
}


def get_model_for_vendor(tier: str, vendor: str) -> str:
    return VENDOR_MODELS[vendor][tier]


_JUDGE_TIER: dict[str, str] = {"fast": "balanced", "balanced": "deep", "deep": "deep"}

def get_judge_model(tier: str, vendor: str) -> str:
    return VENDOR_MODELS[vendor][_JUDGE_TIER[tier]]
