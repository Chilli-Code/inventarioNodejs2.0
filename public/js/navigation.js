
$('.toggle').click(function() {
    $(this).toggleClass('active');
    $('.navegacion').toggleClass('active');
});
$('.toggleProductos').click(function() {
    $(this).toggleClass('active');
    $('.navegacion').toggleClass('active');
});


$(document).ready(function() {
  $('.puntos-perfil').click(function() {
    $('.puntos-perfil').toggleClass('is-active');
  });
});

 
 $(function () {
  $(".puntos-perfil").on("click", function (e) {
   $(".content-wrapper").addClass("overlay");
   e.stopPropagation();
  });
  $(document).on("click", function (e) {
   if ($(e.target).is(".puntos-perfil") === false) {
    $(".content-wrapper").removeClass("overlay");
   }
  });
  });


/*-------------------------------------------
botón de modo Dark
-------------------------------------------*/
var btn = document.getElementsByClassName("mode-switch");
  // Escucha el evento "click" del botón
for (var i = 0; i < btn.length; i++) {

    btn[i].addEventListener("click", function() {
    // Alterna la clase "dark-mode" del elemento body
    document.body.classList.toggle("light");

    // Almacena el estado del modo oscuro en el almacenamiento local

    if (document.body.classList.contains("light")) {
    localStorage.setItem("light", "enabled");
    } else {
    localStorage.removeItem("light");
    }
});
}
  // Aplica el estado del modo oscuro al cargar la página
if (localStorage.getItem("light") === "enabled") {
    document.body.classList.add("light");
}


