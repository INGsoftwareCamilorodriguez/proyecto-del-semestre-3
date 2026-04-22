const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'incio pagina', 'apartado principal')));
app.use(express.static(path.join(__dirname, 'incio pagina')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'incio pagina', 'apartado principal', 'inicio.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});