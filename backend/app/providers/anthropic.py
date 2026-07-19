from langchain_anthropic import ChatAnthropic


def get_model(model_id: str, api_key: str, max_tokens: int = 2048) -> ChatAnthropic:
    return ChatAnthropic(model=model_id, api_key=api_key, max_tokens=max_tokens)
