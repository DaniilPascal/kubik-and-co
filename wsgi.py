"""
Точка входа для хостинга (Gunicorn / PythonAnywhere / Render).
"""
from server import app

# PythonAnywhere ищет переменную application
application = app
