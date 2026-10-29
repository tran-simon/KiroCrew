"""Wire tokens for the status rows the chat gateway appends to a transcript.

A gateway status row (a recovery ``error`` card, an empty-turn ``notice``, a
model-fallback ``notice``) keeps its English sentence as ``content``: channel
mirrors, SSE readers, an older frontend and the model itself read that text
verbatim. The dashboard does not. It reads ``meta["notice"]`` and renders
localized copy keyed on the token (``website/src/pages/chat/gatewayNotice.ts``),
and ``meta["notice_args"]`` carries the values that copy interpolates (a model
id, an exit code, a recovery count).

One namespace covers every family. The transient-5xx tokens
(``TRANSIENT_NOTICE_*`` in ``chat_utils``) ride the same ``meta["notice"]`` field
and join the same frontend table. ``test/test_transient_notice_parity.py``
discovers every ``*_NOTICE_*`` token in both modules and pins it against that
table, so a token added on one side only fails there rather than silently
rendering raw English. The compaction cards' own ``meta["notice"]`` markers
(``session_recycled``, ``stuck_turn``) ride the same field on assistant rows and
are drawn by the compaction card instead, so they are not in this table.

A row appended with literal English and no token is copy the dashboard cannot
localize. Give it a token here and a row in the frontend table.
"""

from __future__ import annotations

#: The row ``meta`` field the token rides in. Equal to
#: ``chat_utils.TRANSIENT_NOTICE_META_KEY``: one field for every family.
GATEWAY_NOTICE_META_KEY = "notice"
#: The row ``meta`` field holding the values the localized copy interpolates.
GATEWAY_NOTICE_ARGS_KEY = "notice_args"

# Recovery ``error`` rows. A ``*_retrying`` / ``*_recovering`` row is a pending
# link (the gateway already re-queued the turn); every other token is terminal.
GATEWAY_NOTICE_CONNECTION_LOST_RETRYING = "connection_lost_retrying"
GATEWAY_NOTICE_CONNECTION_LOST_GIVE_UP = "connection_lost_give_up"
GATEWAY_NOTICE_SESSION_BUSY_RETRYING = "session_busy_retrying"
GATEWAY_NOTICE_SESSION_BUSY_GIVE_UP = "session_busy_give_up"
GATEWAY_NOTICE_TURN_STALLED_RECOVERING = "turn_stalled_recovering"
GATEWAY_NOTICE_TURN_STALLED_GIVE_UP = "turn_stalled_give_up"
GATEWAY_NOTICE_TOOL_STALLED_RECOVERING = "tool_stalled_recovering"
GATEWAY_NOTICE_TOOL_STALLED_GIVE_UP = "tool_stalled_give_up"
GATEWAY_NOTICE_SESSION_STUCK = "session_stuck"
GATEWAY_NOTICE_SHARED_RUNTIME_RESTARTING = "shared_runtime_restarting"

# Empty-response ``notice`` rows. Their English text is
# ``messaging.empty_turn_copy``, shared with the channel driver.
GATEWAY_NOTICE_EMPTY_TURN = "empty_turn_give_up"
GATEWAY_NOTICE_EMPTY_TURN_AFTER_RECOVERY = "empty_turn_after_recovery"
GATEWAY_NOTICE_EMPTY_TURN_AFTER_WORK = "empty_turn_after_work"
GATEWAY_NOTICE_EMPTY_TURN_CONTINUING = "empty_turn_continuing"
GATEWAY_NOTICE_EMPTY_TURN_CONTINUING_AFTER_WORK = "empty_turn_continuing_after_work"
GATEWAY_NOTICE_COMPACTION_CONTINUING = "compaction_continuing"

# Model-fallback ``notice`` rows.
GATEWAY_NOTICE_MODEL_ACCESS_FALLBACK = "model_access_fallback"
GATEWAY_NOTICE_MODEL_UNAVAILABLE = "model_unavailable"

#: English fallback ``content`` for the recovery rows above. Plain language: no
#: "backend", no "hiccup" (the parity test lints every ``GATEWAY_*_TEXT``).
GATEWAY_CONNECTION_LOST_RETRYING_TEXT = "⟳ Connection lost — retrying…"
GATEWAY_CONNECTION_LOST_GIVE_UP_TEXT = "⟳ Connection lost — please retry."
GATEWAY_SESSION_BUSY_RETRYING_TEXT = "⟳ Session busy — retrying…"
GATEWAY_SESSION_BUSY_GIVE_UP_TEXT = "⟳ Session busy — please retry."
GATEWAY_TURN_STALLED_RECOVERING_TEXT = "⟳ Recovering a stalled turn…"
GATEWAY_TURN_STALLED_GIVE_UP_TEXT = "⟳ Turn stalled — please retry."
GATEWAY_TOOL_STALLED_RECOVERING_TEXT = "⟳ Tool appeared stalled — recovering…"
GATEWAY_TOOL_STALLED_GIVE_UP_TEXT = "⟳ Tool appeared stalled — please retry."
GATEWAY_SESSION_STUCK_TEXT = "Session stuck — please start a new chat."
GATEWAY_SHARED_RUNTIME_RESTARTING_TEXT = (
    "The agent process this chat shares kept restarting — please retry."
)


def gateway_notice_meta(token: str, **args: str | int) -> dict[str, object]:
    """The row ``meta`` that names *token*, plus its interpolation values.

    Merge it into a row's other meta (``{"kind": ..., **gateway_notice_meta(...)}``).
    Values are plain strings or ints; the frontend interpolates them as text.
    """
    meta: dict[str, object] = {GATEWAY_NOTICE_META_KEY: token}
    if args:
        meta[GATEWAY_NOTICE_ARGS_KEY] = dict(args)
    return meta
