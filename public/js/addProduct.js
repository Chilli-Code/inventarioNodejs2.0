$(".jsFilter").click(function () {
  $(".filter-menu").toggleClass("active");
});


$(".filter-product").click(function () {
  $(".filter-agregar-from").toggleClass("active");
});

$(".grid").click(function () {
  $(".list").removeClass("active");
  $(".grid").addClass("active");
  $(".products-area-wrapper").addClass("gridView");
  $(".products-area-wrapper").removeClass("tableView");
});

$(".list").click(function () {
  $(".list").addClass("active");
  $(".grid").removeClass("active");
  $(".products-area-wrapper").removeClass("gridView");
  $(".products-area-wrapper").addClass("tableView");
});


$(function () {
  $(".del-btn:not(.open)").on("click", function (e) {
   $(".overlay-app").addClass("is-active");
  });
  $(".pop-up .close").click(function () {
   $(".overlay-app").removeClass("is-active");
  });
 });
  $(".pop-up .close").click(function () {
   $(".overlay-app").removeClass("is-active");
  });
 
 
 $(".del-btn:not(.open)").click(function () {
  $(".pop-up").addClass("visible");
 });
 
 $(".pop-up .close").click(function () {
  $(".pop-up").removeClass("visible");
 });


// $(document).ready(function() {
//   $('.del-btn').on('click', function() {
//     $('.overlay-app').addClass('is-active');
//     $('.pop-up').addClass('is-active');
//   });

//   $('.close').on('click', function() {
//     $('.overlay-app').removeClass('is-active');
//     $('.pop-up').removeClass('is-active');
//   });
// });
