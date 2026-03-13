// Demet Toreo PWA - App principal

// 1. Configurar el mapa centrado en Lomas de Sotelo
var map = L.map('map', {
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    rotateControl: { closeOnZeroBearing: false },
}).setView([19.45711, -99.21237], 17);

// 2. Capas: callejero y satélite
var mapaCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});
var mapaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
});

mapaCalles.addTo(map);

L.control.layers(
    { 'Mapa': mapaCalles, 'Satélite': mapaSatelite },
    null,
    { collapsed: false }
).addTo(map);

// 3. Datos: edificios y puertas cargados desde datos.json
var edificios = [];
var markers = {};
var marcadorEdificioActual = null;
var edificioSeleccionado = null;
var puertaMarkers = [];
var mostrarPuertas = false;

function crearIconoEdificio(nombre) {
    var safeName = nombre.replace(/"/g, '&quot;');
    return L.divIcon({
        className: '',
        html: '<div class="edificio-marker"><div class="edificio-label">' + safeName + '</div><div class="edificio-arrow">⬇</div></div>',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
}

function crearPuertaMarker(p) {
    var partes = p.nombre.split(' - ');
    var linea1 = partes[0] || '';
    var linea2 = partes[1] || '';
    var esToreoI = (linea2 || '').toLowerCase().trim() === 'toreo i';
    var badgeTexto = esToreoI ? 'Toreo I' : 'Toreo II';
    var badgeColor = esToreoI ? '#1a73e8' : '#34a853';
    var carIcon = L.divIcon({
        className: '',
        html: '<div class="puerta-car-marker"><span class="emoji">🚘</span><div class="puerta-car-label"><span>' + linea1 + '</span><span class="puerta-badge" style="background:' + badgeColor + ';">' + badgeTexto + '</span></div></div>',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
    });
    var m = L.marker([p.lat, p.lng], { icon: carIcon }).addTo(map);
    puertaMarkers.push(m);
}

function ocultarSplash() {
    var splash = document.getElementById('splash');
    if (splash) {
        splash.classList.add('fade-out');
        setTimeout(function() { splash.remove(); }, 500);
    }
}

// Cargar datos desde datos.json
fetch('datos.json')
    .then(function(res) { return res.json(); })
    .then(function(data) {
        edificios = data.edificios || [];
        var puertas = data.puertas || [];

        edificios.forEach(function(edif) {
            var marker = L.marker([edif.lat, edif.lng]);
            markers[edif.nombre.toLowerCase()] = marker;
        });

        puertas.forEach(crearPuertaMarker);
        actualizarVisibilidadPuertas();

        // Si la URL tiene ?edificio=Nombre, ir a ese edificio
        var params = new URLSearchParams(window.location.search);
        var q = params.get('edificio');
        if (q) {
            var nombreBuscado = q.trim().toLowerCase();
            var ed = edificios.find(function(e) { return e.nombre.toLowerCase() === nombreBuscado; });
            if (ed) {
                map.whenReady(function() { irAEdificio(ed.nombre); });
            }
        }

        ocultarSplash();
    })
    .catch(function(err) {
        console.warn('Error cargando datos.json:', err);
        ocultarSplash();
    });

// Mostrar/ocultar puertas según el nivel de zoom y el toggle del usuario
function actualizarVisibilidadPuertas() {
    var z = map.getZoom();
    var visible = mostrarPuertas && z >= 17 && z <= 18;

    puertaMarkers.forEach(function(m) {
        if (visible) {
            if (!map.hasLayer(m)) m.addTo(map);
        } else {
            if (map.hasLayer(m)) map.removeLayer(m);
        }
    });
    var btn = document.getElementById('toggle-puertas-btn');
    if (btn) btn.style.display = (z >= 17 && z <= 18) ? '' : 'none';
}

function togglePuertas() {
    mostrarPuertas = !mostrarPuertas;
    var btn = document.getElementById('toggle-puertas-btn');
    if (btn) {
        btn.textContent = mostrarPuertas ? '🚘 Ocultar Acceso' : '🚘 Mostrar Acceso';
    }
    actualizarVisibilidadPuertas();
}

map.on('zoomend', actualizarVisibilidadPuertas);
map.on('baselayerchange', function() {
    requestAnimationFrame(actualizarVisibilidadPuertas);
});
actualizarVisibilidadPuertas();

// 4. Búsqueda y sugerencias
function edificiosCoincidentes(texto) {
    var t = (texto || '').toLowerCase().trim();
    if (!t) return edificios.map(function(e) { return e.nombre; });
    return edificios
        .filter(function(e) { return e.nombre.toLowerCase().indexOf(t) >= 0; })
        .map(function(e) { return e.nombre; });
}

function mostrarSugerencias() {
    var input = document.getElementById('busqueda');
    var ul = document.getElementById('sugerencias');
    var nombres = edificiosCoincidentes(input.value);
    ul.innerHTML = '';
    ul.classList.remove('visible');
    if (nombres.length === 0) return;
    nombres.slice(0, 12).forEach(function(nombre) {
        var li = document.createElement('li');
        li.textContent = nombre;
        li.onclick = function() { input.value = nombre; ul.classList.remove('visible'); irAEdificio(nombre); };
        ul.appendChild(li);
    });
    ul.classList.add('visible');
}

function teclaBusqueda(e) {
    var ul = document.getElementById('sugerencias');
    var items = ul.querySelectorAll('li');
    if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0 && document.activeElement && document.activeElement.id === 'busqueda') {
            var first = items[0].textContent;
            document.getElementById('busqueda').value = first;
            ul.classList.remove('visible');
            irAEdificio(first);
        } else {
            buscar();
        }
        return;
    }
    if (e.key === 'Escape') {
        ul.classList.remove('visible');
        document.getElementById('busqueda').blur();
        limpiarEdificioSeleccionado();
    }
}

function irAEdificio(nombre) {
    var key = nombre.toLowerCase();
    var baseMarker = markers[key];
    if (!baseMarker) return;

    if (marcadorEdificioActual && map.hasLayer(marcadorEdificioActual)) {
        map.removeLayer(marcadorEdificioActual);
    }

    var latlng = baseMarker.getLatLng();
    marcadorEdificioActual = L.marker(latlng, { icon: crearIconoEdificio(nombre) }).addTo(map);
    map.setView(latlng, 19);

    edificioSeleccionado = nombre;
    document.title = nombre + ' - Demet Toreo';
    var btnCompartir = document.getElementById('btn-compartir');
    var btnLlegar = document.getElementById('btn-llegar');
    if (btnCompartir) btnCompartir.style.display = 'inline-flex';
    if (btnLlegar) btnLlegar.style.display = 'inline-flex';
    actualizarUrlEdificio(nombre);
}

function limpiarEdificioSeleccionado() {
    if (marcadorEdificioActual && map.hasLayer(marcadorEdificioActual)) {
        map.removeLayer(marcadorEdificioActual);
        marcadorEdificioActual = null;
    }
    edificioSeleccionado = null;
    document.title = 'Buscador de Edificios - Demet Toreo';
    var btnCompartir = document.getElementById('btn-compartir');
    var btnLlegar = document.getElementById('btn-llegar');
    if (btnCompartir) btnCompartir.style.display = 'none';
    if (btnLlegar) btnLlegar.style.display = 'none';
    actualizarUrlEdificio(null);
}

function actualizarUrlEdificio(nombre) {
    var url = new URL(window.location.href);
    if (nombre) {
        url.searchParams.set('edificio', nombre);
    } else {
        url.searchParams.delete('edificio');
    }
    var nuevaUrl = url.pathname + url.search;
    window.history.replaceState({}, '', nuevaUrl);
}

function compartirEdificio() {
    if (!edificioSeleccionado) return;
    var url = window.location.origin + window.location.pathname + '?edificio=' + encodeURIComponent(edificioSeleccionado);

    copiarAlPortapapeles(url);

    if (navigator.share && navigator.canShare && navigator.canShare({ url: url })) {
        navigator.share({
            title: edificioSeleccionado + ' - Demet Toreo',
            text: 'Ver edificio en el mapa',
            url: url
        }).catch(function() {});
    }
}

function comoLlegar() {
    if (!edificioSeleccionado) return;
    var key = edificioSeleccionado.toLowerCase();
    var baseMarker = markers[key];
    if (!baseMarker) return;
    var ll = baseMarker.getLatLng();
    var destino = ll.lat + ',' + ll.lng;
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        window.open('https://maps.apple.com/?daddr=' + destino + '&dirflg=d', '_blank');
    } else {
        window.open('https://www.google.com/maps/dir/?api=1&destination=' + destino + '&travelmode=driving', '_blank');
    }
}

function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function() {
            mostrarToast('Enlace copiado');
        }).catch(function() { fallbackCopiar(texto); });
    } else {
        fallbackCopiar(texto);
    }
}

function fallbackCopiar(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        mostrarToast('Enlace copiado');
    } catch (e) {}
    document.body.removeChild(ta);
}

function mostrarToast(mensaje) {
    var t = document.getElementById('toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'toast';
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 16px;border-radius:8px;font-size:0.9rem;z-index:10000;animation:fadeIn 0.2s ease;';
    t.textContent = mensaje;
    document.body.appendChild(t);
    setTimeout(function() { t.style.animation = 'fadeOut 0.2s ease forwards'; setTimeout(function() { t.remove(); }, 200); }, 2000);
}

function buscar() {
    var query = document.getElementById('busqueda').value.trim();
    var nombres = edificiosCoincidentes(query);
    document.getElementById('sugerencias').classList.remove('visible');
    if (nombres.length > 0) {
        irAEdificio(nombres[0]);
    } else {
        alert('Ningún edificio coincide. Escribe parte del nombre o elige de la lista.');
    }
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('#search-container')) {
        document.getElementById('sugerencias').classList.remove('visible');
    }
});

// Atajos de teclado globales
document.addEventListener('keydown', function(e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    var enInput = (e.target && (e.target.id === 'busqueda' || tag === 'input' || tag === 'textarea'));
    if (!enInput) {
        if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
            e.preventDefault();
            document.getElementById('busqueda').focus();
        }
    }
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        irAMiUbicacion();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        if (edificioSeleccionado) compartirEdificio();
    }
});

// 5. Geolocalización: marcador de "Mi ubicación"
var marcadorUbicacion = null;
var circuloPrecision = null;

function irAMiUbicacion() {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización.');
        return;
    }
    mostrarToast('Obteniendo ubicación...');
    map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
}

map.on('locationfound', function(e) {
    var toast = document.getElementById('toast');
    if (toast) toast.remove();

    var radio = e.accuracy / 2;

    if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
    if (circuloPrecision) map.removeLayer(circuloPrecision);

    circuloPrecision = L.circle(e.latlng, {
        radius: radio,
        color: '#2b7cff',
        fillColor: '#2b7cff',
        fillOpacity: 0.15,
        weight: 2
    }).addTo(map);

    marcadorUbicacion = L.marker(e.latlng, {
        icon: L.divIcon({
            className: 'mi-ubicacion-marker',
            html: '<div style="background:#2b7cff;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        })
    }).addTo(map).bindPopup('<b>Estás aquí</b>');
});

map.on('locationerror', function() {
    var toast = document.getElementById('toast');
    if (toast) toast.remove();
    mostrarToast('No se pudo obtener tu ubicación');
});

// PWA: registrar Service Worker para uso offline y mostrar versión
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function(reg) {
        console.log('SW registrado:', reg.scope);
        function pedirVersion(sw) {
            sw.postMessage({ type: 'GET_VERSION' });
        }
        if (navigator.serviceWorker.controller) {
            pedirVersion(navigator.serviceWorker.controller);
        }
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            if (navigator.serviceWorker.controller) pedirVersion(navigator.serviceWorker.controller);
        });
    }).catch(function(err) {
        console.warn('SW no registrado:', err);
    });
    navigator.serviceWorker.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'VERSION') {
            var badge = document.getElementById('version-badge');
            if (badge) badge.textContent = 'v' + event.data.version;
        }
    });
}
