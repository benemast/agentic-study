"""Bot detection utilities for filtering automated requests."""
from typing import Optional, Tuple

# Known bot user agent patterns
BOT_USER_AGENT_PATTERNS = [
    "headless",
    "bot",
    "crawler",
    "spider",
    "scraper",
    "curl",
    "wget",
    "python-requests",
    "puppeteer",
    "selenium",
    "phantomjs",
]

# Suspicious screen resolutions (too old/common for automation)
SUSPICIOUS_RESOLUTIONS = [
    "800x600",
    "640x480",
]


def is_bot_request(
    user_agent: Optional[str], 
    screen_resolution: Optional[str]
) -> Tuple[bool, Optional[str]]:
    """
    Detect if request is from an automated bot/tool.
    
    Args:
        user_agent: User-Agent header string
        screen_resolution: Screen resolution string (e.g., "1920x1080")
    
    Returns:
        Tuple of (is_bot, reason)
    """
    if not user_agent:
        return True, "Missing user agent"
    
    # Check user agent for bot patterns
    user_agent_lower = user_agent.lower()
    for pattern in BOT_USER_AGENT_PATTERNS:
        if pattern in user_agent_lower:
            return True, f"Bot pattern detected: {pattern}"
    
    # Check for suspicious screen resolution
    if screen_resolution and screen_resolution in SUSPICIOUS_RESOLUTIONS:
        return True, f"Suspicious resolution: {screen_resolution}"
    
    return False, None