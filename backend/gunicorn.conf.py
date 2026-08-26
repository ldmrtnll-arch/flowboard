import os


def positive_integer_env(name: str, default: int) -> int:
    value = int(os.getenv(name, str(default)))
    if value < 1:
        raise RuntimeError(f"{name} must be greater than zero")
    return value


port = positive_integer_env("PORT", 8000)
bind = f"0.0.0.0:{port}"
workers = positive_integer_env("WEB_CONCURRENCY", 2)
threads = positive_integer_env("GUNICORN_THREADS", 2)
timeout = positive_integer_env("GUNICORN_TIMEOUT", 60)
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
capture_output = True
preload_app = False
control_socket_disable = True
