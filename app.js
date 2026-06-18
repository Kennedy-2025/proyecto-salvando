function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

const today = formatLocalDate();

const state = {
  books: [],
  users: [],
  loans: [],
  stats: { books: 0, available: 0, users: 0, loans: 0, late: 0 },
  editingBookId: null,
  editingUserId: null,
  loading: false,
};

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  refreshBtn: document.getElementById("refreshBtn"),
  navItems: document.querySelectorAll(".nav-item"),
  sections: document.querySelectorAll(".section"),
  countBooks: document.getElementById("countBooks"),
  countAvailable: document.getElementById("countAvailable"),
  countUsers: document.getElementById("countUsers"),
  countLoans: document.getElementById("countLoans"),
  countLate: document.getElementById("countLate"),
  booksTable: document.getElementById("booksTable"),
  loansTable: document.getElementById("loansTable"),
  loanForm: document.getElementById("loanForm"),
  loanBook: document.getElementById("loanBook"),
  loanUser: document.getElementById("loanUser"),
  loanDate: document.getElementById("loanDate"),
  loanDueDate: document.getElementById("loanDueDate"),
  loanNotes: document.getElementById("loanNotes"),
  userForm: document.getElementById("userForm"),
  userId: document.getElementById("userId"),
  userCarnet: document.getElementById("userCarnet"),
  userName: document.getElementById("userName"),
  userPhone: document.getElementById("userPhone"),
  usersTable: document.getElementById("usersTable"),
  openBookModal: document.getElementById("openBookModal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  closeModal: document.getElementById("closeModal"),
  cancelBook: document.getElementById("cancelBook"),
  bookForm: document.getElementById("bookForm"),
  modalTitle: document.getElementById("modalTitle"),
  bookId: document.getElementById("bookId"),
  bookTitle: document.getElementById("bookTitle"),
  bookAuthor: document.getElementById("bookAuthor"),
  bookIsbn: document.getElementById("bookIsbn"),
  bookStatus: document.getElementById("bookStatus"),
};

elements.loanDate.value = today;
elements.loanDueDate.value = today;

function setSection(sectionId) {
  elements.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
  });

  elements.sections.forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });

  elements.pageTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
}

function openModal(book = null) {
  state.editingBookId = book?.id ?? null;
  elements.modalTitle.textContent = book ? "Editar libro" : "Nuevo libro";
  elements.bookId.value = book?.id ?? "";
  elements.bookTitle.value = book?.title ?? "";
  elements.bookAuthor.value = book?.author ?? "";
  elements.bookIsbn.value = book?.isbn ?? "";
  elements.bookStatus.value = book?.status ?? "Disponible";
  elements.modalBackdrop.classList.remove("hidden");
  elements.bookTitle.focus();
}

function openUserEdit(user) {
  state.editingUserId = user?.id ?? null;
  elements.userId.value = user?.id ?? "";
  elements.userCarnet.value = user?.carnet ?? "";
  elements.userName.value = user?.full_name ?? "";
  elements.userPhone.value = user?.phone ?? "";
  setSection("users");
}

function closeModal() {
  elements.modalBackdrop.classList.add("hidden");
  elements.bookForm.reset();
  state.editingBookId = null;
}

function badgeClass(status) {
  return status === "Prestado" ? "badge warn" : "badge";
}

function loanStatus(loan) {
  return loan.returned_at ? "Devuelto" : new Date(loan.due_date) < new Date(today) ? "Vencido" : "Activo";
}

function loanStatusClass(status) {
  if (status === "Devuelto") return "badge";
  if (status === "Vencido") return "badge warn";
  return "badge";
}

function setLoading(isLoading) {
  state.loading = isLoading;
  elements.refreshBtn.disabled = isLoading;
  elements.openBookModal.disabled = isLoading;
  elements.refreshBtn.style.opacity = isLoading ? "0.7" : "1";
}

function renderBooks() {
  if (!state.books.length) {
    elements.booksTable.innerHTML = `
      <tr>
        <td colspan="6">No hay libros registrados todavía.</td>
      </tr>
    `;
    return;
  }

  elements.booksTable.innerHTML = state.books
    .map(
      (book) => `
        <tr>
          <td data-label="Título">${book.title}</td>
          <td data-label="Autor">${book.author}</td>
          <td data-label="ISBN">${book.isbn || "-"}</td>
          <td data-label="Estado"><span class="${badgeClass(book.status)}">${book.status}</span></td>
          <td data-label="Prestado a">${book.borrower_name ? `${book.borrower_name}${book.due_date ? ` (vence ${formatDate(book.due_date)})` : ""}` : "-"}</td>
          <td data-label="Acciones">
            <div class="row-actions">
              <button class="edit" data-action="edit" data-id="${book.id}">Editar</button>
              <button class="delete" data-action="delete" data-id="${book.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderLoanOptions() {
  const availableBooks = state.books.filter((book) => book.status === "Disponible");

  elements.loanBook.innerHTML = availableBooks.length
    ? `<option value="">Selecciona un libro</option>` +
      availableBooks.map((book) => `<option value="${book.id}">${book.title} - ${book.author}</option>`).join("")
    : `<option value="">No hay libros disponibles</option>`;

  elements.loanUser.innerHTML = state.users.length
    ? `<option value="">Selecciona un usuario</option>` +
      state.users.map((user) => `<option value="${user.id}">${user.carnet} - ${user.full_name}</option>`).join("")
    : `<option value="">No hay usuarios registrados</option>`;
}

function renderUsers() {
  if (!state.users.length) {
    elements.usersTable.innerHTML = `
      <tr>
        <td colspan="4">No hay usuarios registrados todavía.</td>
      </tr>
    `;
    return;
  }

  elements.usersTable.innerHTML = state.users
    .map(
      (user) => `
        <tr>
          <td data-label="Carnet">${user.carnet}</td>
          <td data-label="Nombre">${user.full_name}</td>
          <td data-label="Teléfono">${user.phone || "-"}</td>
          <td data-label="Acciones">
            <div class="row-actions">
              <button class="edit" data-action="edit-user" data-id="${user.id}">Editar</button>
              <button class="delete" data-action="delete-user" data-id="${user.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderLoans() {
  if (!state.loans.length) {
    elements.loansTable.innerHTML = `
      <tr>
        <td colspan="7">No hay préstamos registrados todavía.</td>
      </tr>
    `;
    return;
  }

  elements.loansTable.innerHTML = state.loans
    .map((loan) => {
      const status = loanStatus(loan);
      return `
        <tr>
          <td data-label="Libro">${loan.book_title}</td>
          <td data-label="Usuario">${loan.user_name}</td>
          <td data-label="Prestado">${formatDate(loan.loan_date)}</td>
          <td data-label="Vence">${formatDate(loan.due_date)}</td>
          <td data-label="Observaciones">${loan.notes ? loan.notes : "-"}</td>
          <td data-label="Estado"><span class="${loanStatusClass(status)}">${status}</span></td>
          <td data-label="Acciones">
            <div class="row-actions">
              ${
                loan.returned_at
                  ? `<span class="badge">Devuelto ${formatDate(loan.returned_at)}</span>`
                  : `<button class="edit" data-action="return" data-id="${loan.id}">Marcar devuelto</button>`
              }
              <button class="delete" data-action="delete-loan" data-id="${loan.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || "No se pudo completar la operación.";
    throw new Error(message);
  }

  return data;
}

async function loadStats() {
  const data = await requestJson("/api/stats");
  state.stats = data;
  elements.countBooks.textContent = data.books;
  elements.countAvailable.textContent = data.available;
  elements.countUsers.textContent = data.users;
  elements.countLoans.textContent = data.loans;
  elements.countLate.textContent = data.late;
}

async function loadBooks() {
  const data = await requestJson("/api/books");
  state.books = data;
  renderBooks();
  renderLoanOptions();
}

async function loadUsers() {
  const data = await requestJson("/api/users");
  state.users = data;
  renderLoanOptions();
  renderUsers();
}

async function loadLoans() {
  const data = await requestJson("/api/loans");
  state.loans = data;
  renderLoans();
}

async function refreshAll() {
  setLoading(true);
  try {
    await Promise.all([loadStats(), loadBooks(), loadUsers(), loadLoans()]);
  } catch (error) {
    elements.booksTable.innerHTML = `
      <tr>
        <td colspan="6">${error.message}</td>
      </tr>
    `;
    elements.loansTable.innerHTML = `
      <tr>
        <td colspan="7">${error.message}</td>
      </tr>
    `;
  } finally {
    setLoading(false);
  }
}

elements.navItems.forEach((button) => {
  button.addEventListener("click", () => setSection(button.dataset.section));
});

elements.refreshBtn.addEventListener("click", refreshAll);
elements.openBookModal.addEventListener("click", () => openModal());
elements.closeModal.addEventListener("click", closeModal);
elements.cancelBook.addEventListener("click", closeModal);
elements.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === elements.modalBackdrop) closeModal();
});

elements.booksTable.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const id = Number(event.target.dataset.id);

  if (!action || !id) return;

  const book = state.books.find((item) => item.id === id);

  if (action === "edit" && book) {
    openModal(book);
  }

  if (action === "delete") {
    const confirmed = window.confirm("¿Eliminar este libro?");
    if (!confirmed) return;

    try {
      await requestJson(`/api/books/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  }
});

elements.usersTable.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const id = Number(event.target.dataset.id);

  if (!action || !id) return;

  const user = state.users.find((item) => item.id === id);

  if (action === "edit-user" && user) {
    openUserEdit(user);
  }

  if (action === "delete-user") {
    const confirmed = window.confirm("¿Eliminar este usuario?");
    if (!confirmed) return;

    try {
      await requestJson(`/api/users/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  }
});

elements.loanForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    book_id: Number(elements.loanBook.value),
    user_id: Number(elements.loanUser.value),
    loan_date: elements.loanDate.value,
    due_date: elements.loanDueDate.value,
    notes: elements.loanNotes.value.trim(),
  };

  if (!payload.book_id || !payload.user_id || !payload.loan_date || !payload.due_date) {
    alert("Completa libro, usuario y fechas.");
    return;
  }

  try {
    await requestJson("/api/loans", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    elements.loanForm.reset();
    elements.loanDate.value = today;
    elements.loanDueDate.value = today;
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

elements.userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    carnet: elements.userCarnet.value.trim(),
    full_name: elements.userName.value.trim(),
    phone: elements.userPhone.value.trim(),
  };

  if (!payload.carnet || !payload.full_name) {
    alert("Carnet y nombre son obligatorios.");
    return;
  }

  const method = state.editingUserId ? "PUT" : "POST";
  const url = state.editingUserId ? `/api/users/${state.editingUserId}` : "/api/users";

  try {
    await requestJson(url, {
      method,
      body: JSON.stringify(payload),
    });

    state.editingUserId = null;
    elements.userForm.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

elements.loansTable.addEventListener("click", async (event) => {
  const action = event.target.dataset.action;
  const id = Number(event.target.dataset.id);

  if (!action || !id) return;

  try {
    if (action === "return") {
      await requestJson(`/api/loans/${id}/return`, { method: "PUT" });
      await refreshAll();
    }

    if (action === "delete-loan") {
      const confirmed = window.confirm("¿Eliminar este préstamo?");
      if (!confirmed) return;
      await requestJson(`/api/loans/${id}`, { method: "DELETE" });
      await refreshAll();
    }
  } catch (error) {
    alert(error.message);
  }
});

elements.bookForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: elements.bookTitle.value.trim(),
    author: elements.bookAuthor.value.trim(),
    isbn: elements.bookIsbn.value.trim(),
    status: elements.bookStatus.value,
  };

  if (!payload.title || !payload.author) {
    alert("Título y autor son obligatorios.");
    return;
  }

  const method = state.editingBookId ? "PUT" : "POST";
  const url = state.editingBookId ? `/api/books/${state.editingBookId}` : "/api/books";

  try {
    await requestJson(url, {
      method,
      body: JSON.stringify(payload),
    });

    closeModal();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
});

refreshAll();