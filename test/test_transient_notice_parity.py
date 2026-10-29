"""Guard: the gateway status-row notice tokens must match the frontend's table.

Every status row the chat gateway appends (the transient-5xx ladder, connection
lost, session busy, stalled turn or tool, session stuck, the empty-response and
model-fallback notices) carries a ``meta["notice"]`` wire token. The tokens are
``TRANSIENT_NOTICE_*`` in ``kiro_crew.dashboard.chat_utils`` and
``GATEWAY_NOTICE_*`` in ``kiro_crew.dashboard.gateway_notice``.
``NOTICE_FAMILIES`` in ``website/src/pages/chat/gatewayNotice.ts`` is the
frontend's copy of that list, keyed to pick which localized card a row renders
as, and ``COPY_KEY`` beside it names each token's catalog key. Nothing links the
two sides but the token string -- the same shape as the ``*_RECOVERY_PREFIX``
markers guarded by ``test_recovery_marker_parity.py`` -- so an edit on one side
silently drops the row back to raw English on the other. Discovered by regex
rather than listed, so a new token is caught automatically.

Rows persisted before their token existed carry only their English wording, so
the frontend's ``LEGACY`` table must still recognise every fallback text the
gateway writes today; that is pinned here too, by running the frontend's own
patterns against the Python constants.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from kiro_crew.messaging import empty_turn_copy

_REPO = Path(__file__).resolve().parents[1]
_CHAT_UTILS = _REPO / "src" / "kiro_crew" / "dashboard" / "chat_utils.py"
_GATEWAY = _REPO / "src" / "kiro_crew" / "dashboard" / "gateway_notice.py"
_FRONTEND = _REPO / "website" / "src" / "pages" / "chat" / "gatewayNotice.ts"
_EN_CATALOG = _REPO / "website" / "src" / "i18n" / "locales" / "en.json"

# `TRANSIENT_NOTICE_X = "..."` / `GATEWAY_NOTICE_X = "..."` at column 0, excluding
# the META_KEY / ARGS_KEY entries (which name meta fields, not tokens).
_BACKEND_RE = re.compile(
    r'^(?P<name>(?:TRANSIENT|GATEWAY)_NOTICE_(?!META_KEY|ARGS_KEY)[A-Z_]+)\s*=\s*"(?P<token>[^"]+)"',
    re.MULTILINE,
)
_META_KEY_RE = re.compile(
    r'^(?:TRANSIENT|GATEWAY)_NOTICE_META_KEY\s*=\s*"(?P<key>[^"]+)"', re.MULTILINE
)
# English fallback content: `TRANSIENT_X_TEXT = "..."` / `GATEWAY_X_TEXT = (...)`.
_TEXT_RE = re.compile(
    r'^(?P<name>(?:TRANSIENT|GATEWAY)_[A-Z_]+_TEXT)\s*=\s*\(?\s*"(?P<text>[^"]+)"', re.MULTILINE
)


def _table(name: str) -> str:
    match = re.search(
        rf"^const {name}\b[^=]*=\s*(?P<open>[\[{{])(?P<body>.*?)^(?P<close>[\]}}])",
        _FRONTEND.read_text(encoding="utf-8"),
        re.DOTALL | re.MULTILINE,
    )
    assert match, f"could not find the {name} table in gatewayNotice.ts"
    return match.group("body")


def _backend_tokens() -> dict[str, str]:
    found: dict[str, str] = {}
    for path in (_CHAT_UTILS, _GATEWAY):
        found.update(_BACKEND_RE.findall(path.read_text(encoding="utf-8")))
    assert found, "no TRANSIENT_NOTICE_* / GATEWAY_NOTICE_* token constants found"
    return found


def _frontend_families() -> dict[str, str]:
    entries = re.findall(
        r"^\s*(?P<token>[a-z_]+):\s*\{\s*role:\s*'(?P<role>error|notice)'",
        _table("NOTICE_FAMILIES"),
        re.MULTILINE,
    )
    assert entries, "NOTICE_FAMILIES parsed as empty"
    return dict(entries)


def _frontend_copy_keys() -> dict[str, str]:
    entries = re.findall(
        r"^\s*(?P<token>[a-z_]+):\s*'(?P<key>[a-zA-Z_.]+)'", _table("COPY_KEY"), re.MULTILINE
    )
    assert entries, "COPY_KEY parsed as empty"
    return dict(entries)


def _legacy_patterns() -> list[re.Pattern[str]]:
    # `re: /^...$/u` -> a Python pattern: JS named groups `(?<n>` become `(?P<n>`.
    sources = re.findall(r"re:\s*/(?P<src>\^.*?\$)/u", _table("LEGACY"))
    assert sources, "LEGACY parsed as empty"
    return [re.compile(src.replace("(?<", "(?P<")) for src in sources]


def _fallback_texts() -> dict[str, str]:
    texts: dict[str, str] = {}
    for path in (_CHAT_UTILS, _GATEWAY):
        texts.update(_TEXT_RE.findall(path.read_text(encoding="utf-8")))
    return texts


def test_backend_tokens_match_the_frontend_table() -> None:
    backend = set(_backend_tokens().values())
    frontend = set(_frontend_families())
    missing_in_frontend = backend - frontend
    missing_in_backend = frontend - backend
    assert not missing_in_frontend, (
        "backend token(s) the frontend cannot resolve, so their rows render as raw "
        f"English on every locale: {sorted(missing_in_frontend)}. Add them to "
        "NOTICE_FAMILIES in gatewayNotice.ts."
    )
    assert not missing_in_backend, (
        "frontend NOTICE_FAMILIES entr(ies) with no backend constant, so nothing emits "
        f"them: {sorted(missing_in_backend)}. Remove them, or add the constant to "
        "gateway_notice.py."
    )


def test_backend_token_values_are_unique() -> None:
    tokens = _backend_tokens()
    assert len(set(tokens.values())) == len(tokens), tokens


def test_every_token_names_catalog_copy() -> None:
    copy_keys = _frontend_copy_keys()
    assert set(copy_keys) == set(_frontend_families())
    catalog = json.loads(_EN_CATALOG.read_text(encoding="utf-8"))
    for token, key in copy_keys.items():
        node: object = catalog
        for part in key.split("."):
            assert isinstance(node, dict) and part in node, f"{token}: {key} not in en.json"
            node = node[part]
        assert isinstance(node, str) and node, f"{token}: {key} is not a string"


def test_frontend_reads_the_meta_field_the_backend_writes() -> None:
    keys = {
        m.group("key")
        for path in (_CHAT_UTILS, _GATEWAY)
        for m in _META_KEY_RE.finditer(path.read_text(encoding="utf-8"))
    }
    # One field for every family; the frontend reads `meta.notice` by property
    # name, so a renamed field on either side would make every token invisible.
    assert keys == {"notice"}
    assert "notice?: unknown" in _FRONTEND.read_text(encoding="utf-8")


def test_legacy_table_recognises_every_pre_token_wording() -> None:
    # The gateway texts below were written without a token before the token
    # existed, so history on disk carries them bare. The transient-5xx texts are
    # excluded: that wording has only ever been written with its token.
    patterns = _legacy_patterns()
    texts = {n: t for n, t in _fallback_texts().items() if n.startswith("GATEWAY_")}
    for name in (
        "EMPTY_TURN_NOTICE",
        "EMPTY_TURN_NOTICE_AFTER_RECOVERY",
        "EMPTY_TURN_NOTICE_AFTER_WORK",
    ):
        texts[name] = getattr(empty_turn_copy, name)
    assert len(texts) == 13
    unmatched = [n for n, t in texts.items() if not any(p.match(t) for p in patterns)]
    assert (
        not unmatched
    ), f"fallback text(s) no LEGACY pattern in gatewayNotice.ts recognises: {unmatched}"


def test_fallback_texts_avoid_internal_vocabulary() -> None:
    # A person reading the English fallback is not told about "backends" or
    # "hiccups". Pins the wording class, not the copy.
    texts = _fallback_texts()
    assert len(texts) == 13
    for name, text in texts.items():
        lowered = text.lower()
        assert "hiccup" not in lowered and "backend" not in lowered, (name, text)


def test_gateway_notice_meta_shape() -> None:
    from kiro_crew.dashboard import gateway_notice as gn

    # No args: only the token field, so a row's meta stays as small as before.
    assert gn.gateway_notice_meta(gn.GATEWAY_NOTICE_SESSION_STUCK) == {"notice": "session_stuck"}
    # Args ride beside it, under the field the frontend interpolates from.
    meta = gn.gateway_notice_meta(gn.GATEWAY_NOTICE_CONNECTION_LOST_GIVE_UP, exit_code=-9)
    assert meta == {"notice": "connection_lost_give_up", "notice_args": {"exit_code": -9}}
