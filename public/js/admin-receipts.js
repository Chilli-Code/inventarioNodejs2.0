// Datos reales del servidor (se pasan desde el servidor)
const allReceipts = window.allReceipts || [];
const allUsers = window.allUsers || [];


let filteredReceipts = [...allReceipts];
let currentPage = 1;
let itemsPerPage = 24;

document.addEventListener('DOMContentLoaded', function () {
    renderReceipts();
    updateStats();
    updatePagination();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('userFilter').addEventListener('change', applyFilters);
    document.getElementById('medioFilter').addEventListener('change', applyFilters);
    document.getElementById('itemsPerPage').addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1;
        renderReceipts();
        updatePagination();
    });
    
    // Filtro por fechas
   document.getElementById('fechaDesde').addEventListener('change', applyFilters);
    document.getElementById('fechaHasta').addEventListener('change', applyFilters);


    // CAMBIAR: Buscador como el de usuario normal
    const adminSearchInput = document.getElementById('buscadorCodigoAdmin');
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', function() {
            const filtro = this.value.toLowerCase();
            const cards = document.querySelectorAll('.card[data-receipt-id]');
            const noResults = document.getElementById('noResultados');
            let visibles = 0;

            cards.forEach(card => {
                // Buscar en el texto contenido en la card
                const cardText = card.textContent.toLowerCase();
                if (cardText.includes(filtro)) {
                    card.style.display = '';
                    visibles++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Mostrar/ocultar mensaje de "no resultados"
            if (visibles === 0 && filtro !== '') {
                noResults.style.display = 'block';
            } else {
                noResults.style.display = 'none';
            }
        });
    }
    
    // Resto de event listeners...
}

// Y quitar la búsqueda de applyFilters()
function applyFilters() {
    const userFilter = document.getElementById('userFilter').value;
    const medioFilter = document.getElementById('medioFilter').value;
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    filteredReceipts = allReceipts.filter(receipt => {
        const matchesUser = !userFilter || (receipt.user && receipt.user._id && receipt.user._id.toString() === userFilter);
        const matchesMedio = !medioFilter || receipt.medio === medioFilter;
        
        // Filtro por fechas
        let matchesFecha = true;
        if (fechaDesde || fechaHasta) {
            // Convertir la fecha del recibo a formato Date
            const receiptDate = parsearFechaRecibo(receipt.fechaa);
            
            if (fechaDesde) {
                const desde = new Date(fechaDesde);
                matchesFecha = matchesFecha && receiptDate >= desde;
            }
            
            if (fechaHasta) {
                const hasta = new Date(fechaHasta);
                hasta.setHours(23, 59, 59, 999); // Incluir todo el día
                matchesFecha = matchesFecha && receiptDate <= hasta;
            }
        }

        return matchesUser && matchesMedio && matchesFecha;
    });

    currentPage = 1;
    renderReceipts();
    updateStats();
    updatePagination();
}

// Nueva función para convertir fecha del recibo
function parsearFechaRecibo(fechaString) {
    if (!fechaString) return new Date();
    
    // Formato esperado: "21/09/2025 - 22:12:08"
    const fecha = fechaString.split(' - ')[0]; // "21/09/2025"
    const [dia, mes, año] = fecha.split('/');
    
    // Crear objeto Date (mes-1 porque Date usa 0-11 para meses)
    return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
}

function renderReceipts() {
    const container = document.getElementById('receiptsContainer');
    const noResults = document.getElementById('noResultados');

    if (filteredReceipts.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    const startIndex = itemsPerPage === -1 ? 0 : (currentPage - 1) * itemsPerPage;
    const endIndex = itemsPerPage === -1 ? filteredReceipts.length : startIndex + itemsPerPage;
    const receiptsToShow = filteredReceipts.slice(startIndex, endIndex);

    console.log('Mostrando recibos:', receiptsToShow.length);

    container.innerHTML = receiptsToShow.map(receipt => {
        const partesFecha = receipt.fechaa ? receipt.fechaa.split(' - ') : ['', ''];
        const soloFecha = partesFecha[0] || '';
        const soloHora = partesFecha[1] || '';

        return `
            <div class="card cardAdmin" data-receipt-id="${receipt._id}">
            <div class="card-info-preview">
                <div>
                    <span class="medio">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="icon">
                            <path d="M760-400v-260L560-800 360-660v60h-80v-100l280-200 280 200v300h-80ZM560-800Zm20 160h40v-40h-40v40Zm-80 0h40v-40h-40v40Zm80 80h40v-40h-40v40Zm-80 0h40v-40h-40v40ZM280-220l278 76 238-74q-5-9-14.5-15.5T760-240H558q-27 0-43-2t-33-8l-93-31 22-78 81 27q17 5 40 8t68 4q0-11-6.5-21T578-354l-234-86h-64v220ZM40-80v-440h304q7 0 14 1.5t13 3.5l235 87q33 12 53.5 42t20.5 66h80q50 0 85 33t35 87v40L560-60l-280-78v58H40Zm80-80h80v-280h-80v280Z"/>
                        </svg>
                        Medio:
                    </span>
                    <p class="medio">${receipt.medio || 'No especificado'}</p>
                </div>
                <div>
                    <span class="vendedor-info">
                         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="icon">
                            <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/>
                        </svg>
                        Vendedor:
                    </span>
                    <p class="vendedor-info">${receipt.vendedor || 'No especificado'}</p>
                </div>
                <div>
                    <span class="cliente-info">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="icon">
                            <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm246-164q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q53 0 100-15.5t86-44.5q-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160Zm0-360q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0-60Zm0 360Z"/>
                        </svg>
                        Cliente:
                    </span>
                    <p class="cliente-info">${receipt.nombrecliente || 'Sin nombre'}</p>
                </div>
                <div class="fecha-container">
                    <span class="fecha-dia">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="icon">
                        <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v255l-80 80v-175H200v400h248l80 80H200Zm0-560h560v-80H200v80Zm0 0v-80 80ZM662-60 520-202l56-56 85 85 170-170 56 57L662-60Z"/>
                        </svg>
                        Fecha:
                    </span>
                    <span class="fecha-hora">${soloHora} - ${soloFecha}</span>
                </div>
                </div>
                <div style="text-align: center; margin: 15px 0;">
                    <svg class="barcode-admin" 
                         data-code="${receipt.codigo || ''}"
                         style="width: 100%; height: 50px;">
                    </svg>
                </div>
                <p class="total">Total: $${(receipt.total || 0).toLocaleString()} COP</p>

                                <div class="card-actions">
                    <button class="btn-action btn-view" onclick="viewReceipt('${receipt._id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="icon">
                        <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/>
                    </svg>                    
                    
                    </button>
                    <button class="btn-action btn-edit" onclick="editReceipt('${receipt._id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor" class="icon">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"></path>
              </svg>
                    
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteReceipt('${receipt._id}')">
                        <svg id="Layer_1" data-name="Layer 1" height="18px" fill="#fff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 105.16 122.88">
                <defs>
                  <style>
                    .cls-1 {
                      fill-rule: evenodd;
                    }
                  </style>
                </defs>
                <title>Eliminar</title>
                <path class="cls-1" d="M11.17,37.16H94.65a8.4,8.4,0,0,1,2,.16,5.93,5.93,0,0,1,2.88,1.56,5.43,5.43,0,0,1,1.64,3.34,7.65,7.65,0,0,1-.06,1.44L94,117.31v0l0,.13,0,.28v0a7.06,7.06,0,0,1-.2.9v0l0,.06v0a5.89,5.89,0,0,1-5.47,4.07H17.32a6.17,6.17,0,0,1-1.25-.19,6.17,6.17,0,0,1-1.16-.48h0a6.18,6.18,0,0,1-3.08-4.88l-7-73.49a7.69,7.69,0,0,1-.06-1.66,5.37,5.37,0,0,1,1.63-3.29,6,6,0,0,1,3-1.58,8.94,8.94,0,0,1,1.79-.13ZM5.65,8.8H37.12V6h0a2.44,2.44,0,0,1,0-.27,6,6,0,0,1,1.76-4h0A6,6,0,0,1,43.09,0H62.46l.3,0a6,6,0,0,1,5.7,6V6h0V8.8h32l.39,0a4.7,4.7,0,0,1,4.31,4.43c0,.18,0,.32,0,.5v9.86a2.59,2.59,0,0,1-2.59,2.59H2.59A2.59,2.59,0,0,1,0,23.62V13.53H0a1.56,1.56,0,0,1,0-.31v0A4.72,4.72,0,0,1,3.88,8.88,10.4,10.4,0,0,1,5.65,8.8Zm42.1,52.7a4.77,4.77,0,0,1,9.49,0v37a4.77,4.77,0,0,1-9.49,0v-37Zm23.73-.2a4.58,4.58,0,0,1,5-4.06,4.47,4.47,0,0,1,4.51,4.46l-2,37a4.57,4.57,0,0,1-5,4.06,4.47,4.47,0,0,1-4.51-4.46l2-37ZM25,61.7a4.46,4.46,0,0,1,4.5-4.46,4.58,4.58,0,0,1,5,4.06l2,37a4.47,4.47,0,0,1-4.51,4.46,4.57,4.57,0,0,1-5-4.06l-2-37Z">
                </path>
              </svg>
                    
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Generar códigos de barras después de insertar el HTML
    generateBarcodes();
}

// Nueva función para generar códigos de barras
function generateBarcodes() {
    const barcodes = document.querySelectorAll('.barcode-admin');
    barcodes.forEach((barcode, index) => {
        const code = barcode.getAttribute('data-code');
        if (code) {
            try {
                JsBarcode(barcode, code, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    textMargin: 0,
                    fontSize: 12
                });
            } catch (error) {
                console.error('Error generando código de barras:', error);
                barcode.innerHTML = `<small>Código: ${code}</small>`;
            }
        }
    });
}

function updateStats() {
    const totalReceipts = filteredReceipts.length;
    const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);
    const averageAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0;

    document.getElementById('totalReceipts').textContent = totalReceipts;
    document.getElementById('totalAmount').textContent = '$' + totalAmount.toLocaleString();
    document.getElementById('averageAmount').textContent = '$' + Math.round(averageAmount).toLocaleString();
}

function updatePagination() {
  const controls = document.getElementById('paginationControls');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');

  if (itemsPerPage === -1) {
    controls.style.display = 'none';
    return;
  } else {
    controls.style.display = 'flex';
  }

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  prev.disabled = currentPage <= 1;
  prev.onclick = () => changePage(-1);

  next.disabled = currentPage >= totalPages;
  next.onclick = () => changePage(1);

  // Crear contenedor para números si no existe
  let pageNumbersContainer = document.getElementById('pageNumbers');
  if (!pageNumbersContainer) {
    pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.id = 'pageNumbers';
    pageNumbersContainer.classList.add('pagination-info');  // Aquí agregamos la clase
    controls.insertBefore(pageNumbersContainer, next);
  }
  pageNumbersContainer.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = i === currentPage ? 'active-page' : '';
    btn.onclick = () => {
      currentPage = i;
      renderReceipts();
      updatePagination();
    };
    pageNumbersContainer.appendChild(btn);
  }
}



function changePage(direction) {
    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    currentPage += direction;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderReceipts();
    updatePagination();
}

function viewReceipt(receiptId) {
    window.location.href = `/receipt_page/${receiptId}`;
}

function editReceipt(receiptId) {
    const receipt = allReceipts.find(r => r._id === receiptId);
    if (!receipt) return;

    document.getElementById('editReceiptId').value = receipt._id;
    document.getElementById('editTotal').value = receipt.total || 0;
    document.getElementById('editMedio').value = receipt.medio || '';
    document.getElementById('editCliente').value = receipt.nombrecliente || '';

    document.getElementById('editModal').style.display = 'block';
}


function deleteReceipt(id) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esta acción eliminará el recibo permanentemente',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/admin/receipts/delete/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            Swal.fire({
              title: 'Recibo eliminado',
              html: '<div id="lottie-container" style="width:150px;height:150px;margin:0 auto;"></div>',
              showConfirmButton: false,
              allowOutsideClick: false,
              timer: 3000,
              didOpen: () => {
                lottie.loadAnimation({
                  container: document.getElementById('lottie-container'),
                  renderer: 'svg',
                  loop: true,
                  autoplay: true,
                  path: '/Lottie/delete.json'
                });
              }
            });

            setTimeout(() => {
              location.reload();
            }, 3000);

          } else {
            Swal.fire('Error', 'No se pudo eliminar el recibo', 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Hubo un problema al eliminar el recibo', 'error');
        });
    }
  });
}




function saveEdit(e) {
    e.preventDefault();

    const receiptId = document.getElementById('editReceiptId').value;
    const updatedData = {
        total: parseFloat(document.getElementById('editTotal').value),
        medio: document.getElementById('editMedio').value,
        nombrecliente: document.getElementById('editCliente').value
    };

    fetch(`/admin/receipts/${receiptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (response.ok) {
            // Actualizar en el array local
            const receipt = allReceipts.find(r => r._id === receiptId);
            if (receipt) Object.assign(receipt, updatedData);

            applyFilters(); // Re-renderizar tabla/lista sin recargar
            closeModal();

            // Mostrar SweetAlert con Lottie
            Swal.fire({
                title: 'Recibo actualizado correctamente',
                html: '<div id="lottie-container" style="width:150px;height:150px;margin:0 auto;"></div>',
                showConfirmButton: false,
                timer: 4000, // 4 segundos
                didOpen: () => {
                    lottie.loadAnimation({
                        container: document.getElementById('lottie-container'),
                        renderer: 'svg',
                        loop: false,
                        autoplay: true,
                        path: '/Lottie/update.json' // tu animación
                    });
                }
            });


        } else {
            Swal.fire('Error', 'Error al actualizar el recibo', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Swal.fire('Error', 'Error al actualizar el recibo', 'error');
    });
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

function limpiarFiltros() {
    document.getElementById('userFilter').value = '';
    document.getElementById('medioFilter').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    applyFilters();
}