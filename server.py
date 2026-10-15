#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Кубик & Ко — ПР №3–4
СУБД SQLite + Flask API для авторизации и заказов.

Локально:  python3 server.py
Прод:      gunicorn -b 0.0.0.0:$PORT wsgi:app
"""

import hashlib
import os
import sqlite3

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "kubik.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "database", "schema.sql")

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
CORS(app)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "kubik-and-co-variant-28")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = f.read()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def user_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "created_at": row["created_at"],
    }


# —— Статика сайта ——
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR, path)


# —— API: регистрация ——
@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if len(name) < 2:
        return jsonify({"ok": False, "error": "Укажите имя (минимум 2 символа)"}), 400
    if "@" not in email or "." not in email:
        return jsonify({"ok": False, "error": "Введите корректный email"}), 400
    if len(password) < 4:
        return jsonify({"ok": False, "error": "Пароль не короче 4 символов"}), 400

    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (name, email, hash_password(password)),
        )
        db.commit()
        row = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify({"ok": True, "user": user_to_dict(row)}), 201
    except sqlite3.IntegrityError:
        return jsonify({"ok": False, "error": "Такой email уже зарегистрирован"}), 409


# —— API: вход ——
@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"ok": False, "error": "Заполните email и пароль"}), 400

    row = get_db().execute(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        (email, hash_password(password)),
    ).fetchone()

    if not row:
        return jsonify({"ok": False, "error": "Неверный email или пароль"}), 401

    return jsonify({"ok": True, "user": user_to_dict(row)})


# —— API: текущий пользователь ——
@app.get("/api/users/<int:user_id>")
def get_user(user_id):
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return jsonify({"ok": False, "error": "Пользователь не найден"}), 404
    return jsonify({"ok": True, "user": user_to_dict(row)})


# —— API: список пользователей (для демонстрации БД) ——
@app.get("/api/users")
def list_users():
    rows = get_db().execute(
        "SELECT id, name, email, created_at FROM users ORDER BY id"
    ).fetchall()
    return jsonify({"ok": True, "users": [dict(r) for r in rows]})


# —— API: создать заказ ——
@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    product = (data.get("product") or "").strip()
    customer = (data.get("customer") or "").strip()
    phone = (data.get("phone") or "").strip()
    delivery = (data.get("delivery") or "").strip()
    try:
        qty = int(data.get("qty") or 0)
        total = int(data.get("total") or 0)
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "Некорректные qty/total"}), 400

    if not user_id:
        return jsonify({"ok": False, "error": "Нужна авторизация"}), 401
    if len(customer) < 2:
        return jsonify({"ok": False, "error": "Укажите имя получателя"}), 400
    if len(phone) < 10:
        return jsonify({"ok": False, "error": "Введите корректный телефон"}), 400
    if qty < 1 or not product:
        return jsonify({"ok": False, "error": "Некорректные данные заказа"}), 400

    db = get_db()
    user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return jsonify({"ok": False, "error": "Пользователь не найден в БД"}), 401

    cur = db.execute(
        """
        INSERT INTO orders (user_id, product, qty, total, customer, phone, delivery)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, product, qty, total, customer, phone, delivery),
    )
    db.commit()
    row = db.execute("SELECT * FROM orders WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"ok": True, "order": dict(row)}), 201


# —— API: заказы пользователя ——
@app.get("/api/orders")
def list_orders():
    user_id = request.args.get("user_id")
    db = get_db()
    if user_id:
        rows = db.execute(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    else:
        rows = db.execute(
            """
            SELECT o.*, u.email AS user_email, u.name AS user_name
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.id DESC
            """
        ).fetchall()
    return jsonify({"ok": True, "orders": [dict(r) for r in rows]})


# —— Служебная: статус БД ——
@app.get("/api/db-status")
def db_status():
    db = get_db()
    users_count = db.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    orders_count = db.execute("SELECT COUNT(*) AS c FROM orders").fetchone()["c"]
    tables = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return jsonify(
        {
            "ok": True,
            "db": "SQLite",
            "path": DB_PATH,
            "tables": [t["name"] for t in tables],
            "users": users_count,
            "orders": orders_count,
        }
    )


# Инициализация схемы при старте (локально и на хостинге)
init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print("SQLite БД:", DB_PATH)
    print("Откройте сайт: http://127.0.0.1:%s/" % port)
    app.run(host="0.0.0.0", port=port, debug=debug)
