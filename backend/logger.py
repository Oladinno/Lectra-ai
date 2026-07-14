import os
import logging
from logging.handlers import RotatingFileHandler

# Resolve the log file path relative to this file
backend_dir = os.path.dirname(os.path.abspath(__file__))
log_file_path = os.path.join(backend_dir, "app.log")

# Create logger
logger = logging.getLogger("lecture_ai")
logger.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter(
    "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] - %(message)s"
)

# Avoid adding handlers multiple times if imported in different modules
if not logger.handlers:
    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler
    try:
        file_handler = RotatingFileHandler(
            log_file_path, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        # Fallback if log file cannot be created
        print(f"Failed to initialize file logger: {e}")
