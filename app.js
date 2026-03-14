// Demet Toreo PWA - App principal

// i18n
var idiomaActual = 'es';
var traducciones = {
    es: {
        search_placeholder: 'Buscar edificio o local...',
        mi_ubicacion: 'Mi ubicación', satelite: 'Satélite', mapa: 'Mapa',
        lista: 'Lista', compartir: 'Compartir', como_llegar: 'Cómo llegar',
        directorio: 'Directorio', edificios: 'Edificios', piso: 'Piso',
        sin_directorio: 'No hay directorio disponible.', cercania: 'Cercanía',
        ubicacion_desactivada: 'Ubicación desactivada',
        obteniendo_ubicacion: 'Obteniendo ubicación...',
        no_ubicacion: 'No se pudo obtener tu ubicación',
        enlace_copiado: 'Enlace copiado', sin_geolocalizacion: 'Tu navegador no soporta geolocalización.',
        sin_coincidencia: 'Ningún edificio o local coincide.',
        puerta_cercana: 'Puerta más cercana', titulo_base: 'Buscador de Edificios - Demet Toreo',
        estas_aqui: 'Estás aquí', cerca_edificio: 'Estás cerca de', qr_titulo: 'QR para compartir'
    },
    en: {
        search_placeholder: 'Search building or business...',
        mi_ubicacion: 'My location', satelite: 'Satellite', mapa: 'Map',
        lista: 'List', compartir: 'Share', como_llegar: 'Directions',
        directorio: 'Directory', edificios: 'Buildings', piso: 'Floor',
        sin_directorio: 'No directory available.', cercania: 'Proximity',
        ubicacion_desactivada: 'Location disabled',
        obteniendo_ubicacion: 'Getting location...',
        no_ubicacion: 'Could not get your location',
        enlace_copiado: 'Link copied', sin_geolocalizacion: 'Your browser does not support geolocation.',
        sin_coincidencia: 'No building or business matches.',
        puerta_cercana: 'Nearest gate', titulo_base: 'Building Finder - Demet Toreo',
        estas_aqui: 'You are here', cerca_edificio: 'You are near', qr_titulo: 'QR to share'
    }
};
function t(clave) { return (traducciones[idiomaActual] && traducciones[idiomaActual][clave]) || clave; }

function toggleIdioma() {
    idiomaActual = (idiomaActual === 'es') ? 'en' : 'es';
    var label = document.getElementById('idioma-label');
    if (label) label.textContent = (idiomaActual === 'es') ? 'EN' : 'ES';
    aplicarTraducciones();
}
function aplicarTraducciones() {
    var el;
    el = document.getElementById('busqueda'); if (el) el.placeholder = t('search_placeholder');
    el = document.getElementById('btn-ubicacion'); if (el) el.lastChild.textContent = t('mi_ubicacion');
    el = document.getElementById('btn-capa'); if (el) el.lastChild.textContent = (capaActual === 'calles') ? t('satelite') : t('mapa');
    el = document.getElementById('btn-lista'); if (el) el.lastChild.textContent = t('lista');
    el = document.getElementById('btn-compartir'); if (el) el.lastChild.textContent = t('compartir');
    el = document.getElementById('btn-llegar'); if (el) el.lastChild.textContent = t('como_llegar');
    el = document.getElementById('btn-directorio'); if (el) el.lastChild.textContent = t('directorio');
    el = document.querySelector('.lista-titulo'); if (el) el.textContent = t('edificios');
    if (!edificioSeleccionado) document.title = t('titulo_base');
}

// 1. Configurar el mapa centrado en Lomas de Sotelo
var map = L.map('map', {
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    rotateControl: { closeOnZeroBearing: false, position: 'bottomright' },
    zoomControl: false,
}).setView([19.45711, -99.21237], 17);

L.control.zoom({ position: 'bottomright' }).addTo(map);

// 2. Capas: callejero y satélite
var mapaCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});
var mapaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri'
});

mapaCalles.addTo(map);
var capaActual = 'calles';

function toggleCapa() {
    var btn = document.getElementById('btn-capa');
    if (capaActual === 'calles') {
        map.removeLayer(mapaCalles);
        mapaSatelite.addTo(map);
        capaActual = 'satelite';
        if (btn) { btn.lastChild.textContent = t('mapa'); btn.title = t('mapa'); }
    } else {
        map.removeLayer(mapaSatelite);
        mapaCalles.addTo(map);
        capaActual = 'calles';
        if (btn) { btn.lastChild.textContent = t('satelite'); btn.title = t('satelite'); }
    }
}

// 3. Datos: edificios y puertas cargados desde datos.json
var edificios = [];
var markers = {};
var marcadorEdificioActual = null;
var edificioSeleccionado = null;
var puertaMarkers = [];
var puertasDatos = [];
var directorioDatos = {};
var lineaRuta = null;
var notificadoProximidad = false;

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

        puertasDatos = puertas;
        directorioDatos = data.directorio || {};
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

function actualizarVisibilidadPuertas() {
    var z = map.getZoom();
    var visible = z >= 17 && z <= 18;

    puertaMarkers.forEach(function(m) {
        if (visible) {
            if (!map.hasLayer(m)) m.addTo(map);
        } else {
            if (map.hasLayer(m)) map.removeLayer(m);
        }
    });
}

map.on('zoomend', actualizarVisibilidadPuertas);

actualizarVisibilidadPuertas();

// 4. Búsqueda y sugerencias (edificios + locales del directorio)
function buscarCoincidencias(texto) {
    var q = (texto || '').toLowerCase().trim();
    var resultados = [];
    if (!q) {
        edificios.forEach(function(e) { resultados.push({ tipo: 'edificio', nombre: e.nombre, edificio: e.nombre }); });
        return resultados;
    }
    edificios.forEach(function(e) {
        if (e.nombre.toLowerCase().indexOf(q) >= 0) {
            resultados.push({ tipo: 'edificio', nombre: e.nombre, edificio: e.nombre });
        }
    });
    Object.keys(directorioDatos).forEach(function(edif) {
        directorioDatos[edif].forEach(function(item) {
            if (item.local.toLowerCase().indexOf(q) >= 0) {
                resultados.push({ tipo: 'local', nombre: item.local, edificio: edif, piso: item.piso });
            }
        });
    });
    return resultados;
}

function mostrarSugerencias() {
    var input = document.getElementById('busqueda');
    var ul = document.getElementById('sugerencias');
    var resultados = buscarCoincidencias(input.value);
    ul.innerHTML = '';
    ul.classList.remove('visible');
    if (resultados.length === 0) return;
    resultados.slice(0, 12).forEach(function(r) {
        var li = document.createElement('li');
        if (r.tipo === 'local') {
            li.innerHTML = '<span style="opacity:0.5;font-size:0.75rem;">📍 ' + r.edificio + ' · ' + r.piso + '</span><br>' + r.nombre;
        } else {
            li.textContent = r.nombre;
        }
        li.onclick = function() {
            input.value = r.edificio;
            ul.classList.remove('visible');
            irAEdificio(r.edificio);
            if (r.tipo === 'local') {
                setTimeout(function() { mostrarDirectorio(); }, 600);
            }
        };
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
    map.flyTo(latlng, 19, { duration: 1.2 });

    edificioSeleccionado = nombre;
    notificadoProximidad = false;
    document.title = nombre + ' - Demet Toreo';
    var btnCompartir = document.getElementById('btn-compartir');
    var btnLlegar = document.getElementById('btn-llegar');
    var btnDirectorio = document.getElementById('btn-directorio');
    if (btnCompartir) btnCompartir.style.display = 'inline-flex';
    if (btnLlegar) btnLlegar.style.display = 'inline-flex';
    if (btnDirectorio) btnDirectorio.style.display = directorioDatos[nombre] ? 'inline-flex' : 'none';
    actualizarUrlEdificio(nombre);
    dibujarRuta();

    var cercana = puertaMasCercana(latlng.lat, latlng.lng);
    if (cercana) {
        mostrarToast('🚘 ' + t('puerta_cercana') + ': ' + cercana.puerta.nombre + ' (~' + cercana.distancia + 'm)');
    }
}

function limpiarEdificioSeleccionado() {
    if (marcadorEdificioActual && map.hasLayer(marcadorEdificioActual)) {
        map.removeLayer(marcadorEdificioActual);
        marcadorEdificioActual = null;
    }
    edificioSeleccionado = null;
    notificadoProximidad = false;
    document.title = t('titulo_base');
    var btnCompartir = document.getElementById('btn-compartir');
    var btnLlegar = document.getElementById('btn-llegar');
    var btnDirectorio = document.getElementById('btn-directorio');
    if (btnCompartir) btnCompartir.style.display = 'none';
    if (btnLlegar) btnLlegar.style.display = 'none';
    if (btnDirectorio) btnDirectorio.style.display = 'none';
    borrarRuta();
    cerrarDirectorio();
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
    } else {
        mostrarQR(url);
    }
}

function mostrarQR(url) {
    var existente = document.getElementById('qr-modal');
    if (existente) existente.remove();
    var modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    var card = document.createElement('div');
    card.style.cssText = 'background:rgba(20,28,55,0.95);backdrop-filter:blur(12px);border-radius:16px;padding:20px;text-align:center;max-width:280px;width:90%;';
    var titulo = document.createElement('div');
    titulo.style.cssText = 'color:#fff;font-weight:600;font-size:0.9rem;margin-bottom:12px;';
    titulo.textContent = t('qr_titulo');
    var img = document.createElement('img');
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
    img.alt = 'QR';
    img.style.cssText = 'width:200px;height:200px;border-radius:10px;background:#fff;padding:8px;';
    var urlText = document.createElement('div');
    urlText.style.cssText = 'color:rgba(255,255,255,0.5);font-size:0.7rem;margin-top:10px;word-break:break-all;';
    urlText.textContent = url;
    card.appendChild(titulo);
    card.appendChild(img);
    card.appendChild(urlText);
    modal.appendChild(card);
    document.body.appendChild(modal);
}

function comoLlegar() {
    if (!edificioSeleccionado) return;
    var key = edificioSeleccionado.toLowerCase();
    var baseMarker = markers[key];
    if (!baseMarker) return;
    var ll = baseMarker.getLatLng();
    var destino = ll.lat + ',' + ll.lng;
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var isPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isIOS) {
        location.href = 'maps://?daddr=' + destino + '&dirflg=d';
    } else if (isPWA) {
        location.href = 'https://www.google.com/maps/dir/?api=1&destination=' + destino + '&travelmode=driving';
    } else {
        window.open('https://www.google.com/maps/dir/?api=1&destination=' + destino + '&travelmode=driving', '_blank');
    }
}

function distanciaEntre(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function puertaMasCercana(lat, lng) {
    if (!puertasDatos || puertasDatos.length === 0) return null;
    var mejor = null;
    var mejorDist = Infinity;
    puertasDatos.forEach(function(p) {
        var d = distanciaEntre(lat, lng, p.lat, p.lng);
        if (d < mejorDist) {
            mejorDist = d;
            mejor = p;
        }
    });
    return mejor ? { puerta: mejor, distancia: Math.round(mejorDist) } : null;
}

function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function() {
            mostrarToast(t('enlace_copiado'));
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
        mostrarToast(t('enlace_copiado'));
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
    var resultados = buscarCoincidencias(query);
    document.getElementById('sugerencias').classList.remove('visible');
    if (resultados.length > 0) {
        irAEdificio(resultados[0].edificio);
        if (resultados[0].tipo === 'local') {
            setTimeout(function() { mostrarDirectorio(); }, 600);
        }
    } else {
        mostrarToast(t('sin_coincidencia'));
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

// 5. Ruta peatonal: línea desde ubicación al edificio
function dibujarRuta() {
    borrarRuta();
    if (!edificioSeleccionado || !marcadorUbicacion) return;
    var origen = marcadorUbicacion.getLatLng();
    var key = edificioSeleccionado.toLowerCase();
    var destMarker = markers[key];
    if (!destMarker) return;
    var destino = destMarker.getLatLng();
    lineaRuta = L.polyline([origen, destino], {
        color: '#2b7cff', weight: 4, opacity: 0.7,
        dashArray: '10, 8', lineCap: 'round'
    }).addTo(map);
}
function borrarRuta() {
    if (lineaRuta && map.hasLayer(lineaRuta)) { map.removeLayer(lineaRuta); lineaRuta = null; }
}
function actualizarRuta() {
    if (!lineaRuta || !marcadorUbicacion || !edificioSeleccionado) return;
    var origen = marcadorUbicacion.getLatLng();
    var key = edificioSeleccionado.toLowerCase();
    var destMarker = markers[key];
    if (!destMarker) return;
    lineaRuta.setLatLngs([origen, destMarker.getLatLng()]);
}

// 6. Directorio de locales del edificio
function mostrarDirectorio() {
    if (!edificioSeleccionado) return;
    var panel = document.getElementById('panel-directorio');
    var titulo = document.getElementById('directorio-titulo');
    var ul = document.getElementById('directorio-lista');
    var vacio = document.getElementById('directorio-vacio');
    if (!panel || !ul) return;

    titulo.textContent = edificioSeleccionado + ' — ' + t('directorio');
    ul.innerHTML = '';

    var locales = directorioDatos[edificioSeleccionado];
    if (locales && locales.length > 0) {
        if (vacio) vacio.style.display = 'none';
        locales.forEach(function(item) {
            var li = document.createElement('li');
            var piso = document.createElement('span');
            piso.className = 'directorio-piso';
            piso.textContent = item.piso === 'PB' ? 'PB' : (t('piso') + ' ' + item.piso);
            var local = document.createElement('span');
            local.className = 'directorio-local';
            local.textContent = item.local;
            li.appendChild(piso);
            li.appendChild(local);
            ul.appendChild(li);
        });
    } else {
        if (vacio) { vacio.textContent = t('sin_directorio'); vacio.style.display = ''; }
    }
    panel.style.display = '';
}
function cerrarDirectorio() {
    var panel = document.getElementById('panel-directorio');
    if (panel) panel.style.display = 'none';
}

// 7. Vista lista de edificios
var listaVisible = false;
var ordenLista = 'az';

function toggleLista() {
    listaVisible = !listaVisible;
    var panel = document.getElementById('panel-lista');
    var btn = document.getElementById('btn-lista');
    if (listaVisible) {
        renderizarLista();
        panel.style.display = '';
        if (btn) btn.classList.add('active');
    } else {
        panel.style.display = 'none';
        if (btn) btn.classList.remove('active');
    }
}
function toggleOrdenLista() {
    ordenLista = (ordenLista === 'az') ? 'dist' : 'az';
    var btnOrden = document.getElementById('btn-orden');
    if (btnOrden) btnOrden.lastChild.textContent = (ordenLista === 'az') ? 'A-Z' : t('cercania');
    renderizarLista();
}
function renderizarLista() {
    var ul = document.getElementById('lista-edificios');
    if (!ul) return;
    ul.innerHTML = '';
    var lista = edificios.slice();
    var ubicacion = marcadorUbicacion ? marcadorUbicacion.getLatLng() : null;

    if (ordenLista === 'dist' && ubicacion) {
        lista.sort(function(a, b) {
            return distanciaEntre(ubicacion.lat, ubicacion.lng, a.lat, a.lng)
                 - distanciaEntre(ubicacion.lat, ubicacion.lng, b.lat, b.lng);
        });
    } else {
        lista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
    }

    lista.forEach(function(edif) {
        var li = document.createElement('li');
        var nombre = document.createElement('span');
        nombre.textContent = edif.nombre;
        li.appendChild(nombre);
        if (ubicacion) {
            var d = Math.round(distanciaEntre(ubicacion.lat, ubicacion.lng, edif.lat, edif.lng));
            var dist = document.createElement('span');
            dist.className = 'lista-dist';
            dist.textContent = d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m';
            li.appendChild(dist);
        }
        li.onclick = function() { toggleLista(); irAEdificio(edif.nombre); };
        ul.appendChild(li);
    });
}

// 8. Notificación de proximidad
function verificarProximidad(latlng) {
    if (!edificioSeleccionado || notificadoProximidad) return;
    var key = edificioSeleccionado.toLowerCase();
    var destMarker = markers[key];
    if (!destMarker) return;
    var dest = destMarker.getLatLng();
    var dist = distanciaEntre(latlng.lat, latlng.lng, dest.lat, dest.lng);
    if (dist <= 50) {
        notificadoProximidad = true;
        mostrarToast('📍 ' + t('cerca_edificio') + ' ' + edificioSeleccionado + ' (~' + Math.round(dist) + 'm)');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
}

// 9. Geolocalización: marcador de "Mi ubicación" con seguimiento continuo
var marcadorUbicacion = null;
var circuloPrecision = null;
var ubicacionActiva = false;
var primerUbicacion = true;

function irAMiUbicacion() {
    if (!navigator.geolocation) {
        mostrarToast(t('sin_geolocalizacion'));
        return;
    }
    if (ubicacionActiva) {
        map.stopLocate();
        ubicacionActiva = false;
        primerUbicacion = true;
        if (marcadorUbicacion) { map.removeLayer(marcadorUbicacion); marcadorUbicacion = null; }
        if (circuloPrecision) { map.removeLayer(circuloPrecision); circuloPrecision = null; }
        borrarRuta();
        var btn = document.getElementById('btn-ubicacion');
        if (btn) btn.classList.remove('active');
        mostrarToast(t('ubicacion_desactivada'));
        return;
    }
    ubicacionActiva = true;
    primerUbicacion = true;
    var btn = document.getElementById('btn-ubicacion');
    if (btn) btn.classList.add('active');
    mostrarToast(t('obteniendo_ubicacion'));
    map.locate({ watch: true, maxZoom: 18, enableHighAccuracy: true });
}

map.on('locationfound', function(e) {
    var toast = document.getElementById('toast');
    if (toast) toast.remove();

    var radio = e.accuracy / 2;

    if (circuloPrecision) {
        circuloPrecision.setLatLng(e.latlng).setRadius(radio);
    } else {
        circuloPrecision = L.circle(e.latlng, {
            radius: radio,
            color: '#2b7cff',
            fillColor: '#2b7cff',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(map);
    }

    if (marcadorUbicacion) {
        marcadorUbicacion.setLatLng(e.latlng);
    } else {
        marcadorUbicacion = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'mi-ubicacion-marker',
                html: '<div style="background:#2b7cff;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            })
        }).addTo(map).bindPopup('<b>' + t('estas_aqui') + '</b>');
    }

    if (primerUbicacion) {
        map.setView(e.latlng, 18);
        primerUbicacion = false;
        if (edificioSeleccionado) dibujarRuta();
    }

    actualizarRuta();
    verificarProximidad(e.latlng);
});

map.on('locationerror', function() {
    var toast = document.getElementById('toast');
    if (toast) toast.remove();
    mostrarToast(t('no_ubicacion'));
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
