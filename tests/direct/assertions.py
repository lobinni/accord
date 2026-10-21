"""Small contract-refusal assertion used by direct-mode tests.

The GenVM harness surfaces public method refusals as exceptions. The helper
checks that the contract's own sentence survives the harness boundary — the
exact behavior the interface relies on when it explains why an act was
refused.
"""

from __future__ import annotations

from contextlib import contextmanager


@contextmanager
def user_error(fragment: str):
    try:
        yield
    except Exception as exc:
        message = str(getattr(exc, "message", "") or exc)
        if fragment.lower() not in message.lower():
            raise AssertionError(
                f"contract refused, but not with {fragment!r}; received: {message}"
            ) from exc
    else:
        raise AssertionError(f"expected the contract to refuse with {fragment!r}")
