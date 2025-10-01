// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDs1JwzkJTkom0so8He085xLHjyaApKcKw",
  authDomain: "prospeccion-fm-canarias.firebaseapp.com",
  projectId: "prospeccion-fm-canarias",
  storageBucket: "prospeccion-fm-canarias.firebasestorage.app",
  messagingSenderId: "263977150427",
  appId: "1:263977150427:web:a0c0567a8a35c808f9e9fe",
  measurementId: "G-XZ4XVTQ2Q7"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- VARIABLES GLOBALES ---
let map;
let activeMarker;
let markers = {}; // Objeto para guardar las referencias a los marcadores del mapa.

// --- ELEMENTOS DEL DOM ---
const modal = document.getElementById('company-modal');
const closeModalBtn = document.querySelector('.close-btn');
const companyForm = document.getElementById('company-form');
const deleteBtn = document.getElementById('delete-btn');


// --- LÓGICA DEL MAPA ---

function initMap() {
    const canaryIslands = { lat: 28.291565, lng: -16.629130 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: canaryIslands,
    });

    // Cargar las empresas desde la base de datos al iniciar el mapa
    loadCompanies();

    // Evento para añadir nuevas empresas
    map.addListener('click', (e) => {
        openCompanyModal(null, e.latLng);
    });
}

// --- LÓGICA DE LA FICHA DE EMPRESA (MODAL) ---

function openCompanyModal(companyData = null, position = null) {
    companyForm.reset();
    
    // Si es una empresa existente (editando)
    if (companyData) {
        document.getElementById('company-id').value = companyData.id;
        document.getElementById('prospector').value = companyData.prospector || '';
        document.getElementById('centro-educativo').value = companyData.centroEducativo || '';
        document.getElementById('fecha-prospeccion').value = companyData.fechaProspeccion || '';
        document.getElementById('nombre-empresa').value = companyData.nombreEmpresa || '';
        document.getElementById('actividad-empresa').value = companyData.actividad || '';
        document.getElementById('actividades-formativas').value = companyData.actividadesFormativas || '';
        document.getElementById('maquinaria').value = companyData.maquinaria || '';
        document.getElementById('vacantes').value = companyData.vacantes || 0;
        document.getElementById('historial').value = companyData.historial || '';
        document.getElementById('color-status').value = companyData.color || 'rojo';

        // Checkboxes
        document.getElementById('acepta-practicas').checked = companyData.aceptaPracticas || false;
        document.getElementById('tiene-empleo').checked = companyData.tieneEmpleo || false;
        document.getElementById('convenio-firmado').checked = companyData.convenioFirmado || false;
        document.getElementById('solicita-retribucion-consejeria').checked = companyData.solicitaRetribucion || false;
        document.getElementById('da-retribucion-practicas').checked = companyData.daRetribucion || false;
        document.getElementById('entrega-epis').checked = companyData.entregaEpis || false;

        // El botón de eliminar siempre es visible al editar
        deleteBtn.style.display = 'block';

    } else { // Si es una nueva empresa
        document.getElementById('company-id').value = ''; 
        activeMarker = new google.maps.Marker({
            position: position,
            map: map
        });
        // Ocultar el botón de eliminar para empresas nuevas
        deleteBtn.style.display = 'none'; 
    }
    
    modal.style.display = 'block';
}

// Cerrar el modal
closeModalBtn.onclick = function() {
    modal.style.display = "none";
    if (activeMarker && !document.getElementById('company-id').value) {
        activeMarker.setMap(null); // Elimina el marcador temporal si se cierra sin guardar
    }
    activeMarker = null;
}

window.onclick = function(event) {
    if (event.target == modal) {
        closeModalBtn.onclick();
    }
}

// --- GUARDAR Y ACTUALIZAR DATOS EN FIRESTORE ---

companyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('company-id').value;
    
    const companyData = {
        prospector: document.getElementById('prospector').value,
        centroEducativo: document.getElementById('centro-educativo').value,
        fechaProspeccion: document.getElementById('fecha-prospeccion').value,
        nombreEmpresa: document.getElementById('nombre-empresa').value,
        actividad: document.getElementById('actividad-empresa').value,
        actividadesFormativas: document.getElementById('actividades-formativas').value,
        maquinaria: document.getElementById('maquinaria').value,
        vacantes: parseInt(document.getElementById('vacantes').value),
        historial: document.getElementById('historial').value,
        color: document.getElementById('color-status').value,
        aceptaPracticas: document.getElementById('acepta-practicas').checked,
        tieneEmpleo: document.getElementById('tiene-empleo').checked,
        convenioFirmado: document.getElementById('convenio-firmado').checked,
        solicitaRetribucion: document.getElementById('solicita-retribucion-consejeria').checked,
        daRetribucion: document.getElementById('da-retribucion-practicas').checked,
        entregaEpis: document.getElementById('entrega-epis').checked,
    };

    if (id) {
        // Actualizar empresa existente
        db.collection('empresas').doc(id).update(companyData)
            .then(() => {
                console.log("Empresa actualizada");
                modal.style.display = "none";
                loadCompanies(); 
            })
            .catch(error => console.error("Error al actualizar: ", error));
    } else {
        // Guardar nueva empresa
        companyData.lat = activeMarker.getPosition().lat();
        companyData.lng = activeMarker.getPosition().lng();
        
        db.collection('empresas').add(companyData)
            .then(() => {
                console.log("Empresa guardada");
                modal.style.display = "none";
                activeMarker.setMap(null); 
                activeMarker = null;
                loadCompanies();
            })
            .catch(error => console.error("Error al guardar: ", error));
    }
});

// --- CARGAR Y PINTAR EMPRESAS DESDE FIRESTORE ---

function loadCompanies() {
    // Limpiar marcadores existentes
    for (let markerId in markers) {
        markers[markerId].setMap(null);
    }
    markers = {};

    db.collection('empresas').onSnapshot((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const company = { id: doc.id, ...doc.data() };
            // Si ya existe un marcador para esta empresa, lo borramos antes de pintar el nuevo
            if (markers[company.id]) {
                markers[company.id].setMap(null);
            }
            addMarkerToMap(company);
        });
    });
}


function addMarkerToMap(company) {
    const colors = {
        rojo: 'red',
        amarillo: 'yellow',
        azul: 'blue',
        verde: 'green'
    };
    
    const marker = new google.maps.Marker({
        position: { lat: company.lat, lng: company.lng },
        map: map,
        title: company.nombreEmpresa,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colors[company.color] || 'grey',
            fillOpacity: 1,
            strokeWeight: 1,
        }
    });

    marker.addListener('click', () => {
        openCompanyModal(company);
    });
    
    markers[company.id] = marker;
}

// --- ELIMINAR EMPRESA ---

deleteBtn.addEventListener('click', () => {
    const id = document.getElementById('company-id').value;
    if (id && confirm("¿Estás seguro de que quieres eliminar esta empresa? Esta acción es irreversible.")) {
        
        // Borramos el marcador del mapa al instante
        if (markers[id]) {
            markers[id].setMap(null);
            delete markers[id];
        }

        db.collection('empresas').doc(id).delete()
            .then(() => {
                console.log("Empresa eliminada de la base de datos");
                modal.style.display = 'none';
            })
            .catch(error => console.error("Error al eliminar: ", error));
    }
});