function imprimirRecibo() {
  const contenido = document.getElementById("productos-seleccionados").innerHTML;
  const codigo = document.getElementById("barcode").getAttribute("data-codigo");

  const ventanaImpresion = window.open('', '', 'height=600,width=400');

  if (!ventanaImpresion) {
    alert('La ventana de impresión fue bloqueada. Por favor habilita ventanas emergentes para este sitio.');
    return;
  }

  ventanaImpresion.document.write(`
    <html>
      <head>
        <title>Recibo</title>
        <link rel="stylesheet" href="/css/recibo.css">
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 10mm;
            }
            body {
              font-family: 'VT323', monospace;
              font-size: 12pt;
              margin: 0;
              padding: 0;
              background: white;
            }
            .print-button {
              display: none;
            }
            .receipt {
              width: 100%;
              max-width: 80mm;
              margin: 0 auto;
            }
            nav, header, footer {
              display: none;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        ${contenido}
        <script>
          window.onload = function() {
            JsBarcode("#barcode", "${codigo}", {
              format: "CODE128",
              lineColor: "#000",
              width: 2,
              height: 50,
              displayValue: true
            });
          };
        <\/script>
      </body>
    </html>
  `);

  ventanaImpresion.document.close();
  ventanaImpresion.focus();
  ventanaImpresion.print();
  ventanaImpresion.close();
}

document.addEventListener('DOMContentLoaded', () => {
  const printBtn = document.querySelector('.print-button');
  if (printBtn) {
    printBtn.addEventListener('click', imprimirRecibo);
  }
});
