# backend/app/configs/logging_config.py
"""
Comprehensive logging configuration for the application

Features:
- File-based logging with rotation
- Separate logs for app, database, and errors
- Slow query detection
- Clean console output
- Production-ready configuration
"""

import logging
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
import os
from pathlib import Path
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine

# ============================================================
# CONFIGURATION
# ============================================================

# Log levels
CONSOLE_LEVEL = logging.INFO
FILE_LEVEL = logging.DEBUG
DB_LEVEL = logging.INFO
ERROR_LEVEL = logging.ERROR

# File sizes and rotation
MAX_BYTES = 10_000_000  # 10MB per file
BACKUP_COUNT = 5  # Keep 5 backup files

# Slow query threshold
SLOW_QUERY_THRESHOLD_MS = 1000  # Log queries taking longer than 1 second


# ============================================================
# LOGGING SETUP
# ============================================================

def setup_logging(debug: bool = False):
    """
    Configure application logging with file handlers
    
    Creates separate log files for:
    - app.log: General application logs
    - database.log: Database queries
    - errors.log: Errors only
    - slow_queries.log: Slow database queries
    
    Args:
        debug: If True, enable DEBUG level and more verbose console output
    """
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Clear any existing handlers (important for reload scenarios)
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # ============================================================
    # ROOT LOGGER - General application logs
    # ============================================================
    root_logger.setLevel(logging.DEBUG)  # Capture everything, filter at handler level
    
    # Console handler - Clean, minimal output
    console_handler = logging.StreamHandler()
    console_handler.setLevel(CONSOLE_LEVEL if not debug else logging.DEBUG)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d:%(funcName)s] - %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler - Everything goes here
    app_file_handler = RotatingFileHandler(
        log_dir / "app.log",
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding='utf-8'
    )
    app_file_handler.setLevel(FILE_LEVEL)
    app_file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    app_file_handler.setFormatter(app_file_formatter)
    root_logger.addHandler(app_file_handler)
    
    # ============================================================
    # SQLALCHEMY LOGGER - Database queries
    # ============================================================
    db_logger = logging.getLogger('sqlalchemy.engine')
    db_logger.setLevel(DB_LEVEL)
    db_logger.propagate = False  # Don't send to root logger (avoid duplication)
    
    # Database query file handler
    db_file_handler = RotatingFileHandler(
        log_dir / "database.log",
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding='utf-8'
    )
    db_file_handler.setLevel(DB_LEVEL)
    db_file_formatter = logging.Formatter(
        '%(asctime)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    db_file_handler.setFormatter(db_file_formatter)
    db_logger.addHandler(db_file_handler)
    
    # In debug mode, also show DB warnings in console
    if debug:
        db_console = logging.StreamHandler()
        db_console.setLevel(logging.WARNING)
        db_console.setFormatter(logging.Formatter(
            '%(levelname)s - DB - %(message)s'
        ))
        db_logger.addHandler(db_console)
    
    # ============================================================
    # ERROR LOGGER - Errors only with full context
    # ============================================================
    error_handler = RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT * 2,  # Keep more error logs
        encoding='utf-8'
    )
    error_handler.setLevel(ERROR_LEVEL)
    error_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s\n'
        'Location: %(pathname)s:%(lineno)d in %(funcName)s\n'
        'Message: %(message)s\n'
        '----------------------------------------\n',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    error_handler.setFormatter(error_formatter)
    root_logger.addHandler(error_handler)
    
    # ============================================================
    # SLOW QUERY LOGGER - Performance monitoring
    # ============================================================
    slow_query_logger = logging.getLogger('slow_queries')
    slow_query_logger.setLevel(logging.WARNING)
    slow_query_logger.propagate = False
    
    slow_query_handler = RotatingFileHandler(
        log_dir / "slow_queries.log",
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding='utf-8'
    )
    slow_query_handler.setLevel(logging.WARNING)
    slow_query_formatter = logging.Formatter(
        '%(asctime)s - [%(levelname)s] - Duration: %(duration)s ms\n'
        'Query: %(query)s\n'
        'Parameters: %(params)s\n'
        '----------------------------------------\n',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    slow_query_handler.setFormatter(slow_query_formatter)
    slow_query_logger.addHandler(slow_query_handler)
    
    # ============================================================
    # REDUCE NOISE FROM VERBOSE LOGGERS
    # ============================================================
    
    # Sentry SDK (reduce debug spam)
    logging.getLogger('sentry_sdk').setLevel(logging.WARNING)
    logging.getLogger('sentry_sdk.errors').setLevel(logging.WARNING)
    
    # SQLAlchemy internals (reduce noise)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.dialects').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.orm').setLevel(logging.WARNING)
    
    # HTTP clients (only errors)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    # OpenAI SDK (reduce noise)
    logging.getLogger('openai').setLevel(logging.WARNING)
    logging.getLogger('httpx._client').setLevel(logging.WARNING)
    
    # LangChain/LangGraph (can be verbose)
    logging.getLogger('langchain').setLevel(logging.INFO)
    logging.getLogger('langgraph').setLevel(logging.INFO)
    
    # Uvicorn access logs (optional - comment out to see HTTP requests)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    
    # Log configuration completion
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("Logging configured successfully")
    logger.info(f"   Log directory: {log_dir.absolute()}")
    logger.info(f"   app.log: General application logs (Level: {logging.getLevelName(FILE_LEVEL)})")
    logger.info(f"   database.log: Database queries (Level: {logging.getLevelName(DB_LEVEL)})")
    logger.info(f"   errors.log: Errors only (Level: {logging.getLevelName(ERROR_LEVEL)})")
    logger.info(f"   low_queries.log: Queries > {SLOW_QUERY_THRESHOLD_MS}ms")
    logger.info(f"   Console output: {logging.getLevelName(CONSOLE_LEVEL if not debug else logging.DEBUG)}")
    logger.info(f"   Debug mode: {'ENABLED' if debug else 'DISABLED'}")
    logger.info("=" * 60)


# ============================================================
# SLOW QUERY MONITORING
# ============================================================

def setup_slow_query_logging(engine: Engine, threshold_ms: int = SLOW_QUERY_THRESHOLD_MS):
    """
    Set up automatic logging for slow database queries
    
    Uses SQLAlchemy events to track query execution time and log
    queries that exceed the threshold.
    
    Args:
        engine: SQLAlchemy engine instance
        threshold_ms: Threshold in milliseconds (default: 1000ms = 1 second)
    """
    
    slow_query_logger = logging.getLogger('slow_queries')
    
    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Store query start time"""
        conn.info.setdefault('query_start_time', []).append(time.time())
    
    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Check query execution time and log if slow"""
        total_time = time.time() - conn.info['query_start_time'].pop(-1)
        total_ms = total_time * 1000
        
        if total_ms > threshold_ms:
            # Truncate long queries and parameters for readability
            query_preview = statement[:500] + ('...' if len(statement) > 500 else '')
            params_str = str(parameters)[:200] + ('...' if len(str(parameters)) > 200 else '')
            
            slow_query_logger.warning(
                "Slow query detected",
                extra={
                    'duration': f"{total_ms:.2f}",
                    'query': query_preview,
                    'params': params_str
                }
            )
    
    logger = logging.getLogger(__name__)
    logger.info(f"Slow query logging enabled (threshold: {threshold_ms}ms)")


# ============================================================
# LOG ROTATION UTILITIES
# ============================================================

def rotate_logs():
    """
    Manually trigger log rotation for all handlers
    
    Useful for scheduled maintenance or deployment
    """
    for handler in logging.getLogger().handlers:
        if isinstance(handler, (RotatingFileHandler, TimedRotatingFileHandler)):
            handler.doRollover()
    
    logging.info("📦 Log rotation completed")


def get_log_stats():
    """
    Get statistics about current log files
    
    Returns:
        dict: Log file sizes and counts
    """
    log_dir = Path("logs")
    if not log_dir.exists():
        return {}
    
    stats = {}
    for log_file in log_dir.glob("*.log*"):
        stats[log_file.name] = {
            'size_mb': log_file.stat().st_size / (1024 * 1024),
            'modified': log_file.stat().st_mtime
        }
    
    return stats


def clean_old_logs(days: int = 30):
    """
    Clean up log files older than specified days
    
    Args:
        days: Number of days to keep (default: 30)
    """
    log_dir = Path("logs")
    if not log_dir.exists():
        return
    
    import time
    cutoff = time.time() - (days * 86400)
    
    removed = []
    for log_file in log_dir.glob("*.log.*"):  # Only backup files
        if log_file.stat().st_mtime < cutoff:
            log_file.unlink()
            removed.append(log_file.name)
    
    if removed:
        logging.info(f"🗑️  Cleaned up {len(removed)} old log files")
        return removed
    
    return []


# ============================================================
# CONTEXT MANAGERS
# ============================================================

class LogContext:
    """
    Context manager for temporary logging configuration
    
    Usage:
        with LogContext(logger_name='myapp', level=logging.DEBUG):
            # Temporarily set DEBUG level
            logger.debug("This will be logged")
    """
    
    def __init__(self, logger_name: str = None, level: int = None):
        self.logger_name = logger_name
        self.new_level = level
        self.old_level = None
        self.logger = logging.getLogger(logger_name) if logger_name else logging.getLogger()
    
    def __enter__(self):
        if self.new_level is not None:
            self.old_level = self.logger.level
            self.logger.setLevel(self.new_level)
        return self.logger
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.old_level is not None:
            self.logger.setLevel(self.old_level)


# ============================================================
# EXPORTS
# ============================================================

__all__ = [
    'setup_logging',
    'setup_slow_query_logging',
    'rotate_logs',
    'get_log_stats',
    'clean_old_logs',
    'LogContext',
]