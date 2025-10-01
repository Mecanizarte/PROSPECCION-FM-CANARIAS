import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// --- CONFIGURACIÓN DE FIREBASE ---
// Pega aquí la configuración que obtuviste en el Paso 1B.
const firebaseConfig = {
   apiKey: "AIzaSyA2UBcOhxwLETt6L5rLM1PJjFbT779JJXI",
  authDomain: "prospeccion-fm-canarias-fb2d9.firebaseapp.com",
  projectId: "prospeccion-fm-canarias-fb2d9",
  storageBucket: "prospeccion-fm-canarias-fb2d9.firebasestorage.app",
  messagingSenderId: "797546982609",
  appId: "1:797546982609:web:49a6cd962208af781b69f0",
  measurementId: "G-T5FCKDBECG"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- VARIABLES GLOBALES ---
let map;
let activeMarker;
let markers = {}; // Objeto para guardar las referencias a los marcadores del mapa.
const ADMIN_EMAIL = "mecanizarte@gmail.com"; // ¡IMPORTANTE! Cambia esto por el email del administrador.

// --- ELEMENTOS DEL DOM ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const userEmailSpan = document.getElementById('user-email');
const modal = document.getElementById('company-modal');
const closeModalBtn = document.querySelector('.close-btn');
const companyForm = document.getElementById('company-form');
const deleteBtn = document.getElementById('delete-btn');

// --- AUTENTICACIÓN ---

// Escuchar cambios en el estado de autenticación
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuario ha iniciado sesión
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userEmailSpan.textContent = user.email;
        if (user.email === ADMIN_EMAIL) {
            userEmailSpan.textContent += " (Admin)";
        }
        loadCompanies();
    } else {
        // Usuario ha cerrado sesión
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

// Evento de Login
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            loginError.textContent = "Error: " + error.message;
        });
});

// Evento de Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- LÓGICA DEL MAPA ---

function initMap() {
    const canaryIslands = { lat: 28.291565, lng: -16.629130 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: canaryIslands,
    });

    // Evento para añadir nuevas empresas
    map.addListener('click', (e) => {
        // Solo permite crear si hay un usuario logueado
        if (auth.currentUser) {
            openCompanyModal(null, e.latLng);
        } else {
            alert("Debes iniciar sesión para añadir una empresa.");
        }
    });
}

// --- LÓGICA DE LA FICHA DE EMPRESA (MODAL) ---

// Abrir el modal
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

        // Mostrar botón de eliminar solo para el admin
        if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
            deleteBtn.style.display = 'block';
        }
    } 
    // Si es una nueva empresa
    else {
        document.getElementById('company-id').value = ''; // Limpiar ID
        activeMarker = new google.maps.Marker({
            position: position,
            map: map
        });
        deleteBtn.style.display = 'none'; // Ocultar botón eliminar para nuevas
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
                loadCompanies(); // Recargar todo para mantener consistencia
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
                activeMarker.setMap(null); // Quitar el marcador temporal
                activeMarker = null;
                loadCompanies(); // Recargar todo
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

    db.collection('empresas').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const company = { id: doc.id, ...doc.data() };
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
    if (id && confirm("¿Estás seguro de que quieres eliminar esta empresa?")) {
        db.collection('empresas').doc(id).delete()
            .then(() => {
                console.log("Empresa eliminada");
                modal.style.display = 'none';
                loadCompanies(); // Recargar
            })
            .catch(error => console.error("Error al eliminar: ", error));
    }
});