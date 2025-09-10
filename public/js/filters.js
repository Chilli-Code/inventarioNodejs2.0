
  let filasOriginales = [];

  function parseFechaCustom(fechaStr) {
    const [fecha, hora] = fechaStr.split(" - ");
    const [dia, mes, año] = fecha.split("/");
    return new Date(`${año}-${mes}-${dia}T${hora}`);
  }

  function aplicarFiltro() {
    const inputBuscador = document.getElementById('buscador');
    const selectCategoria = document.getElementById('filtro-categoria');
    const selectEstado = document.getElementById('filtro-estado');
    const selectOrden = document.getElementById('filtro-orden');
    const noDataDiv = document.querySelector('.noData');

    const textoBuscado = inputBuscador.value.toLowerCase().trim();
    const categoria = selectCategoria.value.toLowerCase();
    const estado = selectEstado.value.toLowerCase();
    const orden = selectOrden.value;

    const filas = Array.from(document.querySelectorAll("#products-row tbody tr"));

    // Aplicar filtros visibles/ocultos
    filas.forEach(row => {
      const producto = row.querySelector(".busqueda")?.textContent.toLowerCase() || "";
      const cat = row.querySelector(".category")?.textContent.toLowerCase() || "";
      const est = row.querySelector(".status")?.textContent.toLowerCase() || "";

      const cumpleBuscador = producto.includes(textoBuscado);
      const cumpleCategoria = categoria === "" || cat.includes(categoria);
      const cumpleEstado = estado === "" || est.includes(estado);

      row.style.display = (cumpleBuscador && cumpleCategoria && cumpleEstado) ? "" : "none";
    });

    // Ordenar filas visibles
    let filasVisibles = filas.filter(row => row.style.display !== "none");

    if (orden !== "") {
      const [campo, direccion] = orden.split("-");

      filasVisibles.sort((a, b) => {
        let valA, valB;
        switch (campo) {
          case "ventas":
            valA = parseInt(a.querySelector(".sales")?.textContent || 0);
            valB = parseInt(b.querySelector(".sales")?.textContent || 0);
            break;
          case "cantidad":
            valA = parseInt(a.querySelector(".cantidad")?.textContent.replace(/\D/g, "") || 0);
            valB = parseInt(b.querySelector(".cantidad")?.textContent.replace(/\D/g, "") || 0);
            break;
          case "precio":
            valA = parseFloat((a.querySelector(".price")?.textContent || "0").replace(/[^\d.-]/g, ""));
            valB = parseFloat((b.querySelector(".price")?.textContent || "0").replace(/[^\d.-]/g, ""));
            break;
          case "hora":
            valA = parseFechaCustom(a.querySelector(".hora")?.textContent.replace("Hora:", "").trim() || "");
            valB = parseFechaCustom(b.querySelector(".hora")?.textContent.replace("Hora:", "").trim() || "");
            break;
          default:
            return 0;
        }
        return direccion === "asc" ? valA - valB : valB - valA;
      });

      const tbody = document.querySelector("#products-row tbody");
      filasVisibles.forEach(row => tbody.appendChild(row));
    }

    // Mostrar u ocultar mensaje "no hay datos"
    if (noDataDiv) {
      noDataDiv.style.display = filasVisibles.length > 0 ? 'none' : 'block';
    }
  }

  function resetFilters() {
    // Limpiar inputs
    document.getElementById('buscador').value = "";
    document.getElementById('filtro-categoria').value = "";
    document.getElementById('filtro-estado').value = "";
    document.getElementById('filtro-orden').value = "";

    // Restaurar filas originales en tbody
    const tbody = document.querySelector("#products-row tbody");
    tbody.innerHTML = "";
    filasOriginales.forEach(row => {
      const clonedRow = row.cloneNode(true);
      tbody.appendChild(clonedRow);
    });

    // Ocultar mensaje "no hay datos"
    const noDataDiv = document.querySelector('.noData');
    if (noDataDiv) noDataDiv.style.display = 'none';
  }

  document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.querySelector("#products-row tbody");
    // Guardar copia CLONADA de las filas originales al cargar la página
    filasOriginales = Array.from(tbody.querySelectorAll("tr")).map(row => row.cloneNode(true));
  });
