"""The one Feature Preview switch for remote dispatch (rfc-conductor-remote-dispatch).

Every behaviour that RFC adds sits behind ``work_ledger.remote_dispatch``, off by
default. It is a server config value, not a per-device preview flag, because the
behaviour it gates is a gateway's own routes: a browser's localStorage cannot
switch off what a peer serves to a hub.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def preview_enabled() -> bool:
    """Whether this gateway has the remote-dispatch Feature Preview turned on.

    Read from config on every call, so a change applies without a restart. A
    config that cannot be read reads as off: the preview fails closed.
    """
    from kiro_crew.config import KiroCrewConfig

    try:
        cfg = KiroCrewConfig.load()
    except Exception:
        logger.warning("remote dispatch: config unreadable; the preview reads as off")
        return False
    return getattr(getattr(cfg, "work_ledger", None), "remote_dispatch", False) is True
