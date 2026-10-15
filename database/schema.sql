-- Кубик & Ко — ПР №3
-- СУБД: SQLite | не более двух таблиц

PRAGMA foreign_keys = ON;

-- 1. Пользователи (данные форм регистрации / авторизации)
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 2. Заказы (данные формы покупки, связаны с пользователем)
CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product    TEXT    NOT NULL,
    qty        INTEGER NOT NULL CHECK (qty >= 1),
    total      INTEGER NOT NULL,
    customer   TEXT    NOT NULL,
    phone      TEXT    NOT NULL,
    delivery   TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
