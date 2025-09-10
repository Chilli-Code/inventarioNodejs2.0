document.addEventListener("keyup", e => {
  if (e.target.matches("#buscador")) {
    if (e.key === "Escape") e.target.value = "";

    const valorBuscado = e.target.value.toLowerCase();

    document.querySelectorAll(".busqueda").forEach(personaV => {
      const fila = personaV.closest("tr");
      if (personaV.textContent.toLowerCase().includes(valorBuscado)) {
        personaV.classList.remove("filtro");
        fila.style.display = ""; // Mostrar fila
      } else {
        personaV.classList.add("filtro");
        fila.style.display = "none"; // Ocultar fila
      }
    });

    // Para resaltar coincidencias (opcional)
    document.querySelectorAll(".busquedaExitosa").forEach(personaV => {
      personaV.textContent.toLowerCase().includes(valorBuscado) && valorBuscado !== ""
        ? personaV.classList.add("resaltadorFiltro")
        : personaV.classList.remove("resaltadorFiltro");
    });
  }
});
