"""Verify _with_retry converts TimeoutError into a retried then raised error."""
import asyncio
import pytest
from unittest.mock import patch, AsyncMock

from app.nodes.debater import _with_retry, LLM_CALL_TIMEOUT


@pytest.mark.asyncio
async def test_timeout_is_retryable_then_raises():
    """Hung call should be retried, then raise TimeoutError after max attempts."""
    call_count = 0

    async def always_hangs():
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(9999)

    # Patch the timeout to near-zero so the test runs fast
    with patch("app.nodes.debater.LLM_CALL_TIMEOUT", 0.01):
        with pytest.raises(asyncio.TimeoutError):
            await _with_retry(always_hangs, max_attempts=3)

    assert call_count == 3  # retried all attempts before giving up


@pytest.mark.asyncio
async def test_timeout_env_var_respected():
    """LLM_CALL_TIMEOUT constant is read from env at import; check it's an int."""
    assert isinstance(LLM_CALL_TIMEOUT, int)
    assert LLM_CALL_TIMEOUT > 0


@pytest.mark.asyncio
async def test_fast_call_succeeds_within_timeout():
    """Normal fast call passes through unaffected."""
    async def fast():
        return "ok"

    result = await _with_retry(fast)
    assert result == "ok"
