"""
Import side-effect helper — call from main after app creation:
    from main_network_hook import attach
    attach(app)
"""
from __future__ import annotations

import logging

log = logging.getLogger("aksi.network")


def attach(app) -> None:
    try:
        from network_api import register_network_routes

        register_network_routes(app)
        log.info("network routes attached")
    except Exception as e:
        log.warning("network routes failed: %s", e)
