/**
 * Кубик & Ко — ПР №2 + ПР №3
 * Динамика, авторизация через SQLite API, формы, уведомления
 */
(function () {
  "use strict";

  const STORAGE_SESSION = "kubik_session";
  // Один origin с сайтом (Render / localhost). localhost только если открыли HTML как файл.
  const API =
    window.location.protocol === "file:" ? "http://127.0.0.1:5000" : "";

  /* —— API helpers —— */
  async function api(path, options) {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json", ...(options && options.headers) },
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { ok: false, error: "Сервер вернул не JSON. Запущен ли python3 server.py?" };
    }
    return { res, data };
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
    } catch {
      return null;
    }
  }

  function setSession(user) {
    if (user) {
      localStorage.setItem(
        STORAGE_SESSION,
        JSON.stringify({ id: user.id, email: user.email, name: user.name })
      );
    } else {
      localStorage.removeItem(STORAGE_SESSION);
    }
    updateAuthUI();
  }

  function toast(message, type) {
    let box = document.querySelector(".toast-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "toast-box";
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast toast--" + (type || "info");
    el.textContent = message;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  function updateAuthUI() {
    const slot = document.getElementById("auth-slot");
    if (!slot) return;
    const session = getSession();
    if (session) {
      slot.innerHTML =
        '<span class="user-chip" title="' +
        session.email +
        '">👤 ' +
        escapeHtml(session.name) +
        '</span><button type="button" class="btn-auth btn-auth--out" id="btn-logout">Выйти</button>';
      document.getElementById("btn-logout")?.addEventListener("click", () => {
        setSession(null);
        toast("Вы вышли из аккаунта", "info");
      });
    } else {
      slot.innerHTML =
        '<button type="button" class="btn-auth" id="btn-open-auth">Войти</button>';
      document.getElementById("btn-open-auth")?.addEventListener("click", () =>
        openAuthModal("login")
      );
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureAuthModal() {
    if (document.getElementById("auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "auth-modal";
    modal.className = "modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal__backdrop" data-close-modal></div>
      <div class="modal__dialog" role="dialog" aria-labelledby="auth-title" aria-modal="true">
        <button type="button" class="modal__close" data-close-modal aria-label="Закрыть">×</button>
        <div class="auth-tabs">
          <button type="button" class="auth-tab is-active" data-tab="login">Вход</button>
          <button type="button" class="auth-tab" data-tab="register">Регистрация</button>
        </div>

        <form id="form-login" class="auth-form is-active" novalidate>
          <h2 id="auth-title">Вход в аккаунт</h2>
          <p class="form-db-hint">Данные проверяются в SQLite (таблица users)</p>
          <label>Email
            <input type="email" name="email" required placeholder="you@mail.ru" autocomplete="email">
          </label>
          <label>Пароль
            <input type="password" name="password" required minlength="4" placeholder="••••••••" autocomplete="current-password">
          </label>
          <p class="form-error" hidden></p>
          <button type="submit" class="btn btn-primary btn-block">Войти</button>
        </form>

        <form id="form-register" class="auth-form" novalidate>
          <h2>Регистрация</h2>
          <p class="form-db-hint">Новый пользователь сохраняется в БД SQLite</p>
          <label>Имя
            <input type="text" name="name" required minlength="2" placeholder="Как к вам обращаться" autocomplete="name">
          </label>
          <label>Email
            <input type="email" name="email" required placeholder="you@mail.ru" autocomplete="email">
          </label>
          <label>Пароль
            <input type="password" name="password" required minlength="4" placeholder="минимум 4 символа" autocomplete="new-password">
          </label>
          <label>Повтор пароля
            <input type="password" name="password2" required minlength="4" placeholder="повторите пароль" autocomplete="new-password">
          </label>
          <p class="form-error" hidden></p>
          <button type="submit" class="btn btn-primary btn-block">Создать аккаунт</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeAuthModal);
    });

    modal.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.dataset.tab;
        modal.querySelectorAll(".auth-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
        modal.querySelector("#form-login").classList.toggle("is-active", name === "login");
        modal.querySelector("#form-register").classList.toggle("is-active", name === "register");
        clearFormErrors(modal);
      });
    });

    document.getElementById("form-login").addEventListener("submit", onLogin);
    document.getElementById("form-register").addEventListener("submit", onRegister);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeAuthModal();
    });
  }

  function clearFormErrors(root) {
    root.querySelectorAll(".form-error").forEach((el) => {
      el.hidden = true;
      el.textContent = "";
    });
  }

  function showFormError(form, message) {
    const err = form.querySelector(".form-error");
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
  }

  function openAuthModal(tab) {
    ensureAuthModal();
    const modal = document.getElementById("auth-modal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const target = tab || "login";
    modal.querySelectorAll(".auth-tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.tab === target);
    });
    modal.querySelector("#form-login").classList.toggle("is-active", target === "login");
    modal.querySelector("#form-register").classList.toggle("is-active", target === "register");
    clearFormErrors(modal);
  }

  function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  async function onLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    clearFormErrors(form);

    if (!email || !password) {
      showFormError(form, "Заполните email и пароль");
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const { res, data } = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok || !data.ok) {
        showFormError(form, data.error || "Ошибка входа");
        form.classList.add("shake");
        setTimeout(() => form.classList.remove("shake"), 400);
        return;
      }
      setSession(data.user);
      closeAuthModal();
      toast("Вход из БД: " + data.user.name, "success");
    } catch (err) {
      showFormError(
        form,
        "Нет связи с сервером. Запустите: python3 server.py"
      );
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const password2 = form.password2.value;
    clearFormErrors(form);

    if (name.length < 2) {
      showFormError(form, "Укажите имя (минимум 2 символа)");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormError(form, "Введите корректный email");
      return;
    }
    if (password.length < 4) {
      showFormError(form, "Пароль не короче 4 символов");
      return;
    }
    if (password !== password2) {
      showFormError(form, "Пароли не совпадают");
      return;
    }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const { res, data } = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok || !data.ok) {
        showFormError(form, data.error || "Ошибка регистрации");
        return;
      }
      setSession(data.user);
      closeAuthModal();
      toast("Сохранено в SQLite: " + name, "success");
    } catch (err) {
      showFormError(
        form,
        "Нет связи с сервером. Запустите: python3 server.py"
      );
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  }

  function initOrderForm() {
    const form = document.getElementById("form-order");
    if (!form) return;

    const qtyInput = form.querySelector('[name="qty"]');
    const totalEl = document.getElementById("order-total");
    const unitPrice = Number(form.dataset.price || 2490);

    function refreshTotal() {
      const qty = Math.max(1, Number(qtyInput.value) || 1);
      qtyInput.value = qty;
      if (totalEl) {
        totalEl.textContent = (unitPrice * qty).toLocaleString("ru-RU") + " ₽";
      }
    }

    qtyInput?.addEventListener("input", refreshTotal);
    form.querySelectorAll("[data-qty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = Number(btn.dataset.qty);
        qtyInput.value = Math.max(1, (Number(qtyInput.value) || 1) + delta);
        refreshTotal();
      });
    });
    refreshTotal();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const session = getSession();
      if (!session || !session.id) {
        toast("Сначала войдите — заказ пишется в БД", "error");
        openAuthModal("login");
        return;
      }

      const name = form.customer.value.trim();
      const phone = form.phone.value.trim();
      const delivery = form.delivery.value;
      const qty = Number(qtyInput.value) || 1;
      const err = form.querySelector(".form-error");

      if (err) {
        err.hidden = true;
        err.textContent = "";
      }

      if (name.length < 2) {
        if (err) {
          err.textContent = "Укажите имя получателя";
          err.hidden = false;
        }
        return;
      }
      if (!/^[\d\s+\-()]{10,}$/.test(phone)) {
        if (err) {
          err.textContent = "Введите корректный телефон";
          err.hidden = false;
        }
        return;
      }

      const payload = {
        user_id: session.id,
        product: form.dataset.product || "Каркассон",
        qty,
        total: unitPrice * qty,
        customer: name,
        phone,
        delivery,
      };

      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        const { res, data } = await api("/api/orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok || !data.ok) {
          if (err) {
            err.textContent = data.error || "Ошибка сохранения заказа";
            err.hidden = false;
          }
          return;
        }

        form.reset();
        qtyInput.value = 1;
        refreshTotal();

        const success = document.getElementById("order-success");
        if (success) {
          success.hidden = false;
          success.innerHTML =
            "<strong>Заказ #" +
            data.order.id +
            " записан в таблицу orders</strong><br>Мы свяжемся по телефону " +
            escapeHtml(phone) +
            ".";
          success.classList.add("is-visible");
        }
        toast("Заказ сохранён в SQLite (#" + data.order.id + ")", "success");
      } catch (ex) {
        if (err) {
          err.textContent = "Нет связи с сервером. Запустите python3 server.py";
          err.hidden = false;
        }
        console.error(ex);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  }

  function initCollageMotion() {
    const collage = document.querySelector(".collage");
    if (!collage) return;
    collage.addEventListener("mousemove", (e) => {
      const rect = collage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      collage.querySelectorAll("img").forEach((img, i) => {
        const depth = (i + 1) * 4;
        img.style.translate = x * depth + "px " + y * depth + "px";
      });
    });
    collage.addEventListener("mouseleave", () => {
      collage.querySelectorAll("img").forEach((img) => {
        img.style.translate = "0 0";
      });
    });
  }

  window.KubikApp = {
    openAuthModal,
    closeAuthModal,
    getSession,
    toast,
    api,
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureAuthModal();
    updateAuthUI();
    initOrderForm();
    initReveal();
    initCollageMotion();

    document.querySelectorAll("[data-open-auth]").forEach((btn) => {
      btn.addEventListener("click", () => openAuthModal(btn.dataset.openAuth || "login"));
    });
  });
})();
