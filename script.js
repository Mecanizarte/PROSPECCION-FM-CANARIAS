let map;
let newMarker;
const companies = []; // Usaremos un array para simular la base de datos

// URLs para los iconos de colores de Google Maps
const icons = {
    green: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
    blue: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    yellow: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
    red: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
};

// Función principal que inicializa el mapa
function initMap() {
    const canaryIslands = { lat: 28.291565, lng: -16.629130 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: canaryIslands,
        zoom: 8,
    });

    // Añadir un listener para cuando el usuario haga clic en el mapa
    map.addListener('click', (e) => {
        showForm(e.latLng);
    });

    // En una aplicación real, aquí cargaríamos los datos de una base de datos.
    // loadCompaniesFromDatabase();
}

// Muestra el formulario para añadir una empresa
function showForm(position) {
    // Si ya hay un marcador temporal, lo eliminamos
    if (newMarker) {
        newMarker.setMap(null);
    }
    
    // Creamos un marcador temporal para que el usuario vea dónde está añadiendo la empresa
    newMarker = new google.maps.Marker({
        position: position,
        map: map,
    });

    const modal = document.getElementById('info-form');
    modal.classList.remove('modal-hidden');
    
    // Rellenamos las coordenadas en el formulario
    document.getElementById('lat').value = position.lat();
    document.getElementById('lng').value = position.lng();
}

// Oculta el formulario y limpia los campos
function hideForm() {
    const modal = document.getElementById('info-form');
    modal.classList.add('modal-hidden');
    document.getElementById('company-form').reset();
    
    // Si el usuario cancela, eliminamos el marcador temporal
    if (newMarker) {
        newMarker.setMap(null);
    }
}

// Event listener para el botón de cancelar
document.getElementById('cancel-button').addEventListener('click', hideForm);

// Event listener para el envío del formulario
document.getElementById('company-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Evita que la página se recargue

    const name = document.getElementById('name').value;
    const activity = document.getElementById('activity').value;
    const hasPractices = document.getElementById('has-practices').checked;
    const hasJob = document.getElementById('has-job').checked;
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);

    const companyData = {
        name,
        activity,
        hasPractices,
        hasJob,
        position: { lat, lng }
    };
    
    // En una aplicación real, aquí guardaríamos en la base de datos
    // saveCompanyToDatabase(companyData);
    
    // Simulamos el guardado añadiéndolo al mapa
    addCompanyMarker(companyData);
    
    // Eliminamos el marcador temporal una vez guardado el definitivo
    if (newMarker) {
        newMarker.setMap(null);
    }
    
    hideForm();
});


// Función para añadir un marcador de empresa al mapa
function addCompanyMarker(company) {
    let color;
    if (company.hasPractices && company.hasJob) {
        color = 'green';
    } else if (company.hasPractices) {
        color = 'blue';
    } else if (company.hasJob) {
        color = 'yellow';
    } else {
        color = 'red';
    }

    const marker = new google.maps.Marker({
        position: company.position,
        map: map,
        icon: icons[color],
        title: company.name
    });

    // Creamos la ventana de información que aparece al hacer clic
    const infoWindowContent = `
        <div>
            <h4>${company.name}</h4>
            <p><strong>Actividad:</strong> ${company.activity}</p>
            <p><strong>Prácticas:</strong> ${company.hasPractices ? 'Sí' : 'No'}</p>
            <p><strong>Empleo:</strong> ${company.hasJob ? 'Sí' : 'No'}</p>
        </div>
    `;
    const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContent
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });
}