"""
WebSocket connection manager for CHAPAA-GUARD real-time SecOps event stream.
Broadcasts live smishing alerts, POS DTMF state transitions, and QoS sentinel telemetry.
"""

import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("chapaa.ws_manager")


class WebSocketManager:
    """Manages connected frontend clients and broadcasts SecOps telemetry in real-time."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept incoming client WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("SecOps Client connected. Active streams: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        """Remove disconnected client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("SecOps Client disconnected. Remaining: %d", len(self.active_connections))

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast serialized JSON payload to all connected SecOps screens."""
        if not self.active_connections:
            return

        payload = {
            "type": event_type,
            "data": data,
        }
        raw_message = json.dumps(payload, default=str)

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(raw_message)
            except Exception as e:
                logger.warning("Error pushing event to client: %s", str(e))
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_threat_intercepted(self, threat_data: Dict[str, Any]):
        """Triggered when an incoming SMS triggers Chapaa-Scan fraud heuristics."""
        await self.broadcast("THREAT_INTERCEPTED", threat_data)

    async def broadcast_pos_verified(self, pos_data: Dict[str, Any]):
        """Triggered when a merchant POS zero-trust handshake captures DTMF '1'."""
        await self.broadcast("TRANSACTION_VERIFIED", pos_data)

    async def broadcast_pos_state_changed(self, pos_data: Dict[str, Any]):
        """Triggered when transaction initiates, rings, or awaits customer PIN/keypad."""
        await self.broadcast("TRANSACTION_STATE_CHANGE", pos_data)

    async def broadcast_qos_telemetry(self, telemetry_data: Dict[str, Any]):
        """Triggered when Android hardware probes (Infinix, Samsung) ping signal stats."""
        await self.broadcast("QOS_TELEMETRY", telemetry_data)


# Global singleton instance
ws_manager = WebSocketManager()
