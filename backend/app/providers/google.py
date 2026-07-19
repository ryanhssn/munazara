from langchain_google_genai import ChatGoogleGenerativeAI


def get_model(model_id: str, api_key: str, max_tokens: int | None = None) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=model_id, google_api_key=api_key, max_output_tokens=max_tokens)
