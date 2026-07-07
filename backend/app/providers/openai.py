from langchain_openai import ChatOpenAI


def get_model(model_id: str, api_key: str) -> ChatOpenAI:
    return ChatOpenAI(model=model_id, api_key=api_key)
