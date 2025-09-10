function updateTime() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    month = (month < 10) ? "0" + month : month;
    day = (day < 10) ? "0" + day : day;

    var today = day + "/" + month + "/" + year;
    var time = hours + ":" + minutes + ":" + seconds;

    document.getElementById("clock").value = today + " - " + time;
}

setInterval(updateTime, 1000); // Actualiza la hora cada segundo