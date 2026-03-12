document.querySelectorAll('nav a:not(.external-link)').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 70,
        behavior: 'smooth'
      });
    }
  });
});
document.getElementById('contactForm').addEventListener('submit', function(e) {
e.preventDefault();
alert('¡Gracias por tu mensaje! Te contactaremos pronto.');
this.reset();

});

document.querySelector('.logo').addEventListener('click', function(e) {
  e.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});