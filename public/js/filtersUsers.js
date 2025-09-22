
  const inputSearch = document.getElementById('searchUsers');
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroOrden = document.getElementById('filtro-orden');

  function aplicarFiltrosCompletos() {
    const searchValue = inputSearch.value.toLowerCase();
    const estadoValue = filtroEstado.value;
    const ordenValue = filtroOrden.value;

    const filas = Array.from(document.querySelectorAll('tbody tr'));
    const tbody = document.querySelector('tbody');

    filas.forEach(row => {
      const estadoCelda = row.querySelector('.status').textContent.trim().toLowerCase();
      const nombre = row.querySelector('.nombre')?.textContent.toLowerCase() || '';
      const correo = row.querySelector('.correo')?.textContent.toLowerCase() || '';

      const coincideBusqueda =
        searchValue === '' ||
        nombre.includes(searchValue) ||
        correo.includes(searchValue);

      const coincideEstado =
        estadoValue === '' || estadoCelda === estadoValue.toLowerCase();

      row.style.display = (coincideBusqueda && coincideEstado) ? '' : 'none';
    });

    if (ordenValue !== '') {
      const visibles = filas.filter(row => row.style.display !== 'none');

      visibles.sort((a, b) => {
        const prodA = parseInt(a.children[4].textContent.trim()) || 0;
        const prodB = parseInt(b.children[4].textContent.trim()) || 0;

        if (ordenValue === 'product-asc') return prodA - prodB;
        if (ordenValue === 'product-desc') return prodB - prodA;
        return 0;
      });

      visibles.forEach(row => tbody.appendChild(row));
    }
  }

  function resetFilters() {
    inputSearch.value = '';
    filtroEstado.value = '';
    filtroOrden.value = '';
    document.querySelectorAll('tbody tr').forEach(row => row.style.display = '');
  }

  inputSearch.addEventListener('keyup', aplicarFiltrosCompletos);

