const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const pool = require("./src/db");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get(
  "/api/stats",
  asyncHandler(async (_req, res) => {
    const [[books]] = await pool.query("SELECT COUNT(*) AS total FROM books");
    const [[available]] = await pool.query("SELECT COUNT(*) AS total FROM books WHERE status = 'Disponible'");
    const [[users]] = await pool.query("SELECT COUNT(*) AS total FROM users");
    const [[loans]] = await pool.query("SELECT COUNT(*) AS total FROM loans WHERE returned_at IS NULL");
    const [[late]] = await pool.query(
      "SELECT COUNT(*) AS total FROM loans WHERE returned_at IS NULL AND due_date < CURDATE()"
    );

    res.json({
      books: books.total,
      available: available.total,
      users: users.total,
      loans: loans.total,
      late: late.total,
    });
  })
);

app.get(
  "/api/books",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.author, b.isbn, b.status, b.created_at,
              l.id AS loan_id,
              u.full_name AS borrower_name,
              l.loan_date,
              l.due_date
       FROM books b
       LEFT JOIN loans l ON l.book_id = b.id AND l.returned_at IS NULL
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  })
);

app.post(
  "/api/books",
  asyncHandler(async (req, res) => {
    const { title, author, isbn = "", status = "Disponible" } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: "Título y autor son obligatorios." });
    }

    const [result] = await pool.query(
      "INSERT INTO books (title, author, isbn, status) VALUES (?, ?, ?, ?)",
      [title.trim(), author.trim(), isbn.trim(), status]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      author,
      isbn,
      status,
    });
  })
);

app.put(
  "/api/books/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, author, isbn = "", status = "Disponible" } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: "Título y autor son obligatorios." });
    }

    await pool.query(
      "UPDATE books SET title = ?, author = ?, isbn = ?, status = ? WHERE id = ?",
      [title.trim(), author.trim(), isbn.trim(), status, id]
    );

    res.json({ id: Number(id), title, author, isbn, status });
  })
);

app.delete(
  "/api/books/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM books WHERE id = ?", [id]);
    res.status(204).send();
  })
);

app.get(
  "/api/users",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT id, carnet, full_name, phone, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json(rows);
  })
);

app.post(
  "/api/users",
  asyncHandler(async (req, res) => {
    const { carnet = "", full_name, phone = "" } = req.body;
    const email = `${carnet.trim().replace(/\s+/g, "").toLowerCase()}@kennedy.ds3.local`;

    if (!carnet || !full_name) {
      return res.status(400).json({ message: "Carnet y nombre son obligatorios." });
    }

    const [result] = await pool.query(
      "INSERT INTO users (carnet, full_name, email, phone) VALUES (?, ?, ?, ?)",
      [carnet.trim(), full_name.trim(), email.trim(), phone.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      carnet,
      full_name,
      phone,
    });
  })
);

app.put(
  "/api/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { carnet = "", full_name, phone = "" } = req.body;
    const email = `${carnet.trim().replace(/\s+/g, "").toLowerCase()}@kennedy.ds3.local`;

    if (!carnet || !full_name) {
      return res.status(400).json({ message: "Carnet y nombre son obligatorios." });
    }

    await pool.query(
      "UPDATE users SET carnet = ?, full_name = ?, email = ?, phone = ? WHERE id = ?",
      [carnet.trim(), full_name.trim(), email.trim(), phone.trim(), id]
    );

    res.json({ id: Number(id), carnet, full_name, phone });
  })
);

app.delete(
  "/api/users/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.status(204).send();
  })
);

app.get(
  "/api/loans",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT l.id, l.loan_date, l.due_date, l.returned_at, l.notes,
              b.id AS book_id, b.title AS book_title,
              u.id AS user_id, u.full_name AS user_name
       FROM loans l
       INNER JOIN books b ON b.id = l.book_id
       INNER JOIN users u ON u.id = l.user_id
       ORDER BY l.loan_date DESC`
    );
    res.json(rows);
  })
);

app.post(
  "/api/loans",
  asyncHandler(async (req, res) => {
    const { book_id, user_id, loan_date, due_date, notes = "" } = req.body;

    if (!book_id || !user_id || !loan_date || !due_date) {
      return res.status(400).json({ message: "Libro, usuario, fecha de préstamo y vencimiento son obligatorios." });
    }

    const [result] = await pool.query(
      "INSERT INTO loans (book_id, user_id, loan_date, due_date, notes) VALUES (?, ?, ?, ?, ?)",
      [book_id, user_id, loan_date, due_date, notes.trim()]
    );

    await pool.query("UPDATE books SET status = 'Prestado' WHERE id = ?", [book_id]);

    res.status(201).json({
      id: result.insertId,
      book_id,
      user_id,
      loan_date,
      due_date,
      notes,
    });
  })
);

app.put(
  "/api/loans/:id/return",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [[loan]] = await pool.query("SELECT book_id FROM loans WHERE id = ?", [id]);
    const returnedAt = formatLocalDate();
    await pool.query("UPDATE loans SET returned_at = ? WHERE id = ?", [returnedAt, id]);
    if (loan) {
      await pool.query("UPDATE books SET status = 'Disponible' WHERE id = ?", [loan.book_id]);
    }
    res.json({ id: Number(id), returned_at: returnedAt });
  })
);

app.delete(
  "/api/loans/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [[loan]] = await pool.query("SELECT book_id, returned_at FROM loans WHERE id = ?", [id]);
    await pool.query("DELETE FROM loans WHERE id = ?", [id]);
    if (loan && !loan.returned_at) {
      await pool.query("UPDATE books SET status = 'Disponible' WHERE id = ?", [loan.book_id]);
    }
    res.status(204).send();
  })
);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor." });
});

app.listen(port, () => {
  console.log(`Servidor ejecutandose en http://localhost:${port}`);
});