from langchain_openai import ChatOpenAI


def get_model(model_id: str, api_key: str, max_tokens: int | None = None) -> ChatOpenAI:
    return ChatOpenAI(model=model_id, api_key=api_key, max_tokens=max_tokens)
