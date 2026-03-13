// carrito.js
console.log("carrito.js cargado ✅");

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  panel.classList.toggle('open');
  overlay.classList.toggle('open');
}