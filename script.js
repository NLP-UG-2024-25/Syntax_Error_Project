const toggle = document.getElementById('theme-toggle');

function updateIcon() {
  toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

toggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');

  if (document.body.classList.contains('dark')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }

  updateIcon();
});

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

updateIcon();

document.addEventListener("DOMContentLoaded", () => {
    getDeviceLocation();
});

function getDeviceLocation() {
    if (!navigator.geolocation) {
        console.error("Geolokalizacja nie jest wspierana przez tę przeglądarkę.");
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
}

function successCallback(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    
    console.log(`Pobrano lokalizację: ${latitude}, ${longitude}`);
    // Tutaj dodaj kod, który ma się wykonać po otrzymaniu współrzędnych
}

function errorCallback(error) {
    console.warn(`Błąd geolokalizacji (${error.code}): ${error.message}`);
}