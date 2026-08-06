"""
Notification Service

Minimal notification dispatcher used by production service suites.
No external notification provider (email/SMS/push) is configured yet,
so delivery is logged rather than sent.
"""

from typing import Any, Dict, Optional

import structlog

logger = structlog.get_logger()


class NotificationService:
    """Dispatches notifications to patients/staff about AI processing events"""

    def __init__(self, **kwargs):
        self.config = kwargs

    async def notify(
        self,
        recipient_id: str,
        message: str,
        channel: str = "log",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send a notification. Currently only logs, no provider is configured."""
        logger.info(
            "Notification dispatched",
            recipient_id=recipient_id,
            message=message,
            channel=channel,
            metadata=metadata or {},
        )
        return True
