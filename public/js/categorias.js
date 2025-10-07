document.addEventListener('DOMContentLoaded', function () {
    const categorias = [
        'Papelería',
        'Tecnología',
        'Ropa',
        'Dulcería',
        'Heladería',
        'Juguetería',
        'Ferretería',
        'Electrodomésticos',
        'Farmacia',
        'Zapatería'
    ];

    const selects = document.querySelectorAll('.selectCategoria');

    selects.forEach(select => {
        // Limpiar y agregar opciones
        select.innerHTML = '';
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });

        // Activar select2 si está disponible
        if (window.$ && $(select).select2) {
            $(select).select2({
                placeholder: 'Selecciona una categoría',
                allowClear: true
            });
        }
    });
});
