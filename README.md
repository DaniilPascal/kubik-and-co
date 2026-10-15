# Кубик & Ко

Интернет-магазин настольных игр. Учебный проект, **вариант 28** (тема вне базового перечня).

**Слоган:** «Собери стол — собери компанию»

🌐 Репозиторий: [github.com/DaniilPascal/kubik-and-co](https://github.com/DaniilPascal/kubik-and-co)

---

## Стек

| Слой | Технологии |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Flask |
| БД | SQLite (2 таблицы: `users`, `orders`) |
| API | Leaflet / OpenStreetMap, Open-Meteo |

---

## Практики

| № | Содержание |
|---|---|
| **ПР1** | Вёрстка: главная, карточка товара, контакты, логотип, абсолютное позиционирование изображений |
| **ПР2** | Динамика JS: формы входа/регистрации и заказа, карта магазина, погода |
| **ПР3** | SQLite + Flask API, сохранение пользователей и заказов |
| **ПР4** | Развёртывание на хостинге (Render) |

Техническое задание: [ТЗ.md](ТЗ.md)

---

## Структура проекта

```
web/
├── index.html          # Главная
├── product.html        # Карточка «Каркассон» + форма заказа
├── contacts.html       # Контакты + карта
├── db.html             # Просмотр таблиц БД
├── Style.css
├── js/
│   ├── app.js          # Авторизация, заказ, UI
│   └── map.js          # Leaflet + Open-Meteo
├── images/
├── database/
│   ├── schema.sql
│   └── kubik.db
├── server.py           # Flask API
├── wsgi.py             # Вход для хостинга
├── requirements.txt
└── Procfile
```

---

## Локальный запуск

Нужны Python 3.8+ и pip.

```bash
cd web
pip3 install -r requirements.txt
python3 server.py
```

### Быстрая проверка

1. **Войти** → регистрация → имя появится в шапке  
2. **Каталог** → оформить заказ  
3. **/db.html** → увидеть записи в `users` и `orders`  
4. **Контакты** → карта и погода  

---

## Деплой (ПР №4)

Сайт развёрнут на Render: **https://kubik-and-co.onrender.com**

Start Command: `gunicorn -b 0.0.0.0:$PORT wsgi:app`

---

## API (локально)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/register` | Регистрация |
| POST | `/api/login` | Вход |
| POST | `/api/orders` | Создать заказ |
| GET | `/api/users` | Список пользователей |
| GET | `/api/orders` | Список заказов |
| GET | `/api/db-status` | Статус БД |

---

## Автор

Машичев Даниил Сергеевич Н252Б28
