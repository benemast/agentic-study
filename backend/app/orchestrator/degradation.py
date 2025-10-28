# backend/app/orchestrator/degradation.py
"""
Graceful Degradation Manager

Automatically adjusts system behavior based on error rates and service health.
Ensures the platform remains functional even when components fail.

Degradation Levels:
- FULL: All features enabled (normal operation)
- REDUCED: Some optimizations disabled (e.g., no streaming)
- MINIMAL: Only essential features (rule-based fallbacks)
- EMERGENCY: Read-only mode, no new executions
"""
import logging
import time
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class DegradationLevel(Enum):
    """System degradation levels"""
    FULL = "full"              # Normal operation
    REDUCED = "reduced"        # Minor degradation
    MINIMAL = "minimal"        # Major degradation
    EMERGENCY = "emergency"    # Critical - read-only


@dataclass
class DegradationConfig:
    """Configuration for each degradation level"""
    level: DegradationLevel
    
    # LLM settings
    streaming_enabled: bool
    llm_decisions_enabled: bool
    llm_batch_size: int
    llm_timeout_multiplier: float
    
    # Tool settings
    tool_timeout_multiplier: float
    parallel_execution_enabled: bool
    
    # Communication
    websocket_updates_enabled: bool
    update_throttle_ms: int
    
    # Execution limits
    max_concurrent_executions: int
    max_steps_per_execution: int
    
    # User-facing
    user_message: str
    show_degradation_banner: bool


# Degradation level configurations
DEGRADATION_CONFIGS = {
    DegradationLevel.FULL: DegradationConfig(
        level=DegradationLevel.FULL,
        streaming_enabled=True,
        llm_decisions_enabled=True,
        llm_batch_size=10,
        llm_timeout_multiplier=1.0,
        tool_timeout_multiplier=1.0,
        parallel_execution_enabled=True,
        websocket_updates_enabled=True,
        update_throttle_ms=50,
        max_concurrent_executions=50,
        max_steps_per_execution=20,
        user_message="",
        show_degradation_banner=False
    ),
    
    DegradationLevel.REDUCED: DegradationConfig(
        level=DegradationLevel.REDUCED,
        streaming_enabled=False,  # Disable streaming to reduce load
        llm_decisions_enabled=True,
        llm_batch_size=5,  # Smaller batches
        llm_timeout_multiplier=1.5,  # More lenient timeouts
        tool_timeout_multiplier=1.5,
        parallel_execution_enabled=True,
        websocket_updates_enabled=True,
        update_throttle_ms=200,  # Less frequent updates
        max_concurrent_executions=25,
        max_steps_per_execution=15,
        user_message="System is experiencing high load. Some features may be slower than usual.",
        show_degradation_banner=True
    ),
    
    DegradationLevel.MINIMAL: DegradationConfig(
        level=DegradationLevel.MINIMAL,
        streaming_enabled=False,
        llm_decisions_enabled=False,  # Use rule-based fallbacks
        llm_batch_size=3,
        llm_timeout_multiplier=2.0,
        tool_timeout_multiplier=2.0,
        parallel_execution_enabled=False,  # Sequential only
        websocket_updates_enabled=False,  # No real-time updates
        update_throttle_ms=1000,
        max_concurrent_executions=10,
        max_steps_per_execution=10,
        user_message="System is operating in reduced mode. AI features are limited. Your work is still being saved.",
        show_degradation_banner=True
    ),
    
    DegradationLevel.EMERGENCY: DegradationConfig(
        level=DegradationLevel.EMERGENCY,
        streaming_enabled=False,
        llm_decisions_enabled=False,
        llm_batch_size=1,
        llm_timeout_multiplier=3.0,
        tool_timeout_multiplier=3.0,
        parallel_execution_enabled=False,
        websocket_updates_enabled=False,
        update_throttle_ms=5000,
        max_concurrent_executions=0,  # No new executions
        max_steps_per_execution=5,
        user_message="System is experiencing critical issues. New tasks cannot be started. Existing work is preserved.",
        show_degradation_banner=True
    )
}


class GracefulDegradation:
    """
    Manages system-wide graceful degradation
    
    Features:
    - Automatic degradation based on error rates
    - Manual degradation control
    - Health monitoring
    - Recovery detection
    
    Usage:
        degradation = GracefulDegradation()
        
        # Report errors
        degradation.report_error('llm_timeout')
        degradation.report_error('tool_failure')
        
        # Get current config
        config = degradation.get_config()
        
        if config.streaming_enabled:
            # Use streaming
            pass
    """
    
    def __init__(
        self,
        error_window_seconds: int = 300,  # 5 minutes
        reduced_threshold: int = 10,      # Errors to trigger REDUCED
        minimal_threshold: int = 25,      # Errors to trigger MINIMAL
        emergency_threshold: int = 50,    # Errors to trigger EMERGENCY
        recovery_success_threshold: int = 5  # Successes needed to recover
    ):
        """
        Initialize degradation manager
        
        Args:
            error_window_seconds: Time window for error counting
            reduced_threshold: Errors in window to trigger REDUCED
            minimal_threshold: Errors in window to trigger MINIMAL
            emergency_threshold: Errors in window to trigger EMERGENCY
            recovery_success_threshold: Consecutive successes to recover
        """
        self.error_window = error_window_seconds
        self.reduced_threshold = reduced_threshold
        self.minimal_threshold = minimal_threshold
        self.emergency_threshold = emergency_threshold
        self.recovery_success_threshold = recovery_success_threshold
        
        # Current state
        self.current_level = DegradationLevel.FULL
        self.manual_override = None  # Manual degradation level
        
        # Error tracking
        self.errors = []  # List of (timestamp, error_type)
        self.consecutive_successes = 0
        
        # Metrics
        self.total_errors = 0
        self.total_successes = 0
        self.degradation_changes = []  # History of level changes
        self.last_check_time = time.time()
        
        logger.info(
            f"Graceful degradation initialized: "
            f"window={error_window_seconds}s, "
            f"thresholds=({reduced_threshold}/{minimal_threshold}/{emergency_threshold})"
        )
    
    def report_error(
        self,
        error_type: str,
        severity: str = 'normal'  # 'low', 'normal', 'high', 'critical'
    ):
        """
        Report an error and update degradation level
        
        Args:
            error_type: Type of error (e.g., 'llm_timeout', 'tool_failure')
            severity: Error severity (affects weight)
        """
        # Weight errors by severity
        weight = {
            'low': 0.5,
            'normal': 1.0,
            'high': 2.0,
            'critical': 5.0
        }.get(severity, 1.0)
        
        current_time = time.time()
        
        # Add weighted errors
        for _ in range(int(weight)):
            self.errors.append((current_time, error_type))
        
        self.total_errors += 1
        self.consecutive_successes = 0
        
        # Check if degradation needed
        self._update_degradation_level()
        
        logger.warning(
            f"Error reported: {error_type} (severity={severity}, weight={weight}), "
            f"level={self.current_level.value}"
        )
    
    def report_success(self):
        """Report a successful operation"""
        self.total_successes += 1
        self.consecutive_successes += 1
        
        # Check if we can recover
        if self.consecutive_successes >= self.recovery_success_threshold:
            self._attempt_recovery()
    
    def _update_degradation_level(self):
        """Update degradation level based on recent errors"""
        # Skip if manual override
        if self.manual_override:
            return
        
        # Clean old errors
        self._clean_old_errors()
        
        # Count recent errors
        recent_errors = len(self.errors)
        
        # Determine appropriate level
        old_level = self.current_level
        
        if recent_errors >= self.emergency_threshold:
            new_level = DegradationLevel.EMERGENCY
        elif recent_errors >= self.minimal_threshold:
            new_level = DegradationLevel.MINIMAL
        elif recent_errors >= self.reduced_threshold:
            new_level = DegradationLevel.REDUCED
        else:
            new_level = DegradationLevel.FULL
        
        # Update if changed
        if new_level != old_level:
            self._transition_to(new_level, reason='error_threshold')
    
    def _attempt_recovery(self):
        """Attempt to recover to better degradation level"""
        # Skip if manual override or already at FULL
        if self.manual_override or self.current_level == DegradationLevel.FULL:
            return
        
        # Clean old errors
        self._clean_old_errors()
        
        # Try to improve level if errors are low enough
        recent_errors = len(self.errors)
        old_level = self.current_level
        
        # Recovery logic (more conservative than degradation)
        if self.current_level == DegradationLevel.EMERGENCY:
            if recent_errors < self.minimal_threshold:
                self._transition_to(DegradationLevel.MINIMAL, reason='recovery')
        
        elif self.current_level == DegradationLevel.MINIMAL:
            if recent_errors < self.reduced_threshold:
                self._transition_to(DegradationLevel.REDUCED, reason='recovery')
        
        elif self.current_level == DegradationLevel.REDUCED:
            if recent_errors < self.reduced_threshold // 2:
                self._transition_to(DegradationLevel.FULL, reason='recovery')
    
    def _clean_old_errors(self):
        """Remove errors outside the time window"""
        current_time = time.time()
        cutoff_time = current_time - self.error_window
        
        self.errors = [
            (ts, err_type) for ts, err_type in self.errors
            if ts > cutoff_time
        ]
    
    def _transition_to(self, new_level: DegradationLevel, reason: str):
        """Transition to new degradation level"""
        old_level = self.current_level
        self.current_level = new_level
        self.consecutive_successes = 0
        
        # Record transition
        transition = {
            'timestamp': datetime.utcnow(),
            'from_level': old_level.value,
            'to_level': new_level.value,
            'reason': reason,
            'recent_errors': len(self.errors)
        }
        self.degradation_changes.append(transition)
        
        # Log transition
        if new_level.value > old_level.value:
            # Degrading
            logger.error(
                f"🔴 System degraded: {old_level.value} → {new_level.value} "
                f"(reason: {reason}, errors: {len(self.errors)})"
            )
        else:
            # Recovering
            logger.info(
                f"🟢 System recovered: {old_level.value} → {new_level.value} "
                f"(reason: {reason}, errors: {len(self.errors)})"
            )
    
    def set_manual_override(self, level: Optional[DegradationLevel]):
        """
        Manually set degradation level
        
        Args:
            level: Degradation level or None to clear override
        """
        if level:
            old_level = self.current_level
            self.manual_override = level
            self.current_level = level
            
            logger.warning(
                f"⚠️  Manual override: {old_level.value} → {level.value}"
            )
        else:
            self.manual_override = None
            logger.info("Manual override cleared")
            self._update_degradation_level()
    
    def get_config(self) -> DegradationConfig:
        """Get current degradation configuration"""
        return DEGRADATION_CONFIGS[self.current_level]
    
    def get_state(self) -> Dict[str, Any]:
        """Get current degradation state"""
        self._clean_old_errors()
        
        config = self.get_config()
        
        return {
            'level': self.current_level.value,
            'manual_override': self.manual_override.value if self.manual_override else None,
            'recent_errors': len(self.errors),
            'consecutive_successes': self.consecutive_successes,
            'total_errors': self.total_errors,
            'total_successes': self.total_successes,
            'config': {
                'streaming_enabled': config.streaming_enabled,
                'llm_decisions_enabled': config.llm_decisions_enabled,
                'websocket_updates_enabled': config.websocket_updates_enabled,
                'max_concurrent_executions': config.max_concurrent_executions,
                'user_message': config.user_message,
                'show_banner': config.show_degradation_banner
            },
            'thresholds': {
                'reduced': self.reduced_threshold,
                'minimal': self.minimal_threshold,
                'emergency': self.emergency_threshold
            },
            'recent_transitions': self.degradation_changes[-5:]  # Last 5
        }
    
    def get_error_breakdown(self) -> Dict[str, int]:
        """Get breakdown of recent errors by type"""
        self._clean_old_errors()
        
        breakdown = {}
        for _, error_type in self.errors:
            breakdown[error_type] = breakdown.get(error_type, 0) + 1
        
        return breakdown
    
    def should_allow_execution(self) -> tuple[bool, Optional[str]]:
        """
        Check if new executions should be allowed
        
        Returns:
            (allowed, reason_if_not)
        """
        config = self.get_config()
        
        if self.current_level == DegradationLevel.EMERGENCY:
            return False, "System is in emergency mode - new tasks not allowed"
        
        return True, None
    
    def get_timeout_multiplier(self, operation: str = 'tool') -> float:
        """
        Get timeout multiplier for current degradation level
        
        Args:
            operation: 'tool' or 'llm'
            
        Returns:
            Timeout multiplier (1.0 = normal, >1.0 = more lenient)
        """
        config = self.get_config()
        
        if operation == 'llm':
            return config.llm_timeout_multiplier
        else:
            return config.tool_timeout_multiplier
    
    def __repr__(self) -> str:
        return (
            f"GracefulDegradation(level={self.current_level.value}, "
            f"errors={len(self.errors)}, "
            f"successes={self.consecutive_successes})"
        )


# Global degradation manager instance
graceful_degradation = GracefulDegradation()