// Variables globales
let vhsData = [];
let currentVHS = null;
let currentEvent = null;
let currentYouTubeURL = ''; // Guardar URL actual para fallback
let currentYouTubeStartTime = ''; // Guardar tiempo de inicio
let isEditingVHS = false;
let isEditingEvent = false;
let tags = []; // Array para almacenar tags personalizados
let nextTagId = 1; // Contador para generar IDs únicos de tags
let currentEditingTag = null; // Tag que se está editando actualmente

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    loadVHSData();
    setupEventListeners();
    setupSearch();
    setupViewMode();
    initializeTags(); // Inicializar sistema de tags
    renderTagsFilter(); // Renderizar filtro de tags
});

// Configuración de event listeners
function setupEventListeners() {
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// Configuración de búsqueda
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        applyFilters(); // Usar la nueva función de filtros combinados
    });
}

// Configuración de vista - Solo cuadrícula
function setupViewMode() {
    // Siempre usar vista cuadrícula
    const grid = document.getElementById('vhsGrid');
    if (grid) {
        grid.className = 'vhs-grid';
    }
}

// Cargar datos del JSON
function loadVHSData() {
    // Primero intentar usar los datos incrustados (EMBEDDED_DATA)
    if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA && EMBEDDED_DATA.videos) {
        console.log('Usando datos incrustados (EMBEDDED_DATA)...');
        parseJSONData(EMBEDDED_DATA);
        renderVHSGrid();
        updateSummary();
        return;
    }

    // Si no hay datos incrustados, intentar cargar desde el archivo JSON
    fetch('Lista_DVD.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('JSON cargado exitosamente. Videos:', data.videos ? data.videos.length : 0);
            parseJSONData(data);
            renderVHSGrid();
            updateSummary();
        })
        .catch(error => {
            console.error('Error cargando datos:', error);
            const grid = document.getElementById('vhsGrid');
            if (grid) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                        <h3>Error al cargar los datos</h3>
                        <p>No se pudo cargar el archivo Lista_DVD.json</p>
                        <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                            Error: ${error.message}
                        </p>
                    </div>
                `;
            }
            vhsData = [];
        });
}

// Parsear datos JSON
function parseJSONData(data) {
    vhsData = [];
    const vhsMap = new Map();

    data.videos.forEach(row => {
        const videoNombre = row.Nombre_de_la_cinta;

        if (!vhsMap.has(videoNombre)) {
            vhsMap.set(videoNombre, {
                video_nombre: videoNombre,
                video_duracion_total: row.Duracion_total_cinta,
                video_fecha_inicio: row.Fecha_inicio_grabacion,
                video_fecha_termino: row.Fecha_termino_grabacion,
                video_formato: row.Formato_cinta,
                video_velocidad: row.Velocidad_cinta,
                youtube_link: row.YouTube_Link || '',
                eventos: []
            });
        }

        if (row.Contenido && row.Contenido.trim() !== '') {
            // Procesar tags
            let eventoTags = [];
            if (row.Tags && row.Tags.trim() !== '') {
                eventoTags = row.Tags.split('|')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            }

            vhsMap.get(videoNombre).eventos.push({
                evento_fecha: row.Fecha_contenido || '',
                evento_contenido: row.Contenido,
                evento_inicio: row.Inicio || '',
                evento_termino: row.Termino || '',
                evento_duracion: row.Duracion_segmento || '',
                tags: eventoTags
            });
        }
    });

    vhsData = Array.from(vhsMap.values());
}

// Actualizar resumen de totales
function updateSummary() {
    // Total de cintas
    const totalCintas = vhsData.length;
    
    // Total de minutos (sumar duración de todas las cintas)
    let totalMinutos = 0;
    let totalEventos = 0;
    
    vhsData.forEach(vhs => {
        // Convertir duración total a minutos
        const duracion = vhs.video_duracion_total || '00:00:00';
        totalMinutos += convertTimeToSeconds(duracion) / 60;
        
        // Contar eventos
        totalEventos += vhs.eventos ? vhs.eventos.length : 0;
    });
    
    // Actualizar DOM
    const cintasEl = document.getElementById('totalCintas');
    const minutosEl = document.getElementById('totalMinutos');
    const eventosEl = document.getElementById('totalEventos');
    
    if (cintasEl) cintasEl.textContent = totalCintas.toLocaleString();
    if (minutosEl) minutosEl.textContent = Math.round(totalMinutos).toLocaleString();
    if (eventosEl) eventosEl.textContent = totalEventos.toLocaleString();
}

// Funciones de gestión de datos eliminadas - Aplicación en modo solo lectura




// Renderizar grid de VHS
function renderVHSGrid() {
    const grid = document.getElementById('vhsGrid');
    grid.innerHTML = '';
    
    if (vhsData.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <h3>No hay VHS registrados</h3>
                <p>Comienza agregando tu primer VHS familiar</p>
            </div>
        `;
        return;
    }
    
    vhsData.forEach(vhs => {
        const card = createVHSCard(vhs);
        grid.appendChild(card);
    });
}

function createVHSCard(vhs) {
    const card = document.createElement('div');
    card.className = 'vhs-card collapsed';
    card.dataset.vhsId = vhs.video_id;
    
    // Generar eventos con links de YouTube
    const eventsHtml = vhs.eventos.map(evento => {
        const youtubeBtn = vhs.youtube_link ? createYouTubeLinkForEvent(vhs.youtube_link, evento.evento_inicio, 'event-youtube-link-mini') : '';
        return `
            <div class="event-item">
                <div class="event-date">${formatDate(evento.evento_fecha)}</div>
                <div class="event-content">${evento.evento_contenido}</div>
                <div class="event-time">${formatTime(evento.evento_inicio)} - ${formatTime(evento.evento_termino)}</div>
                ${renderEventTags(evento)}
                ${youtubeBtn}
            </div>
        `;
    }).join('');
    
    card.innerHTML = `
        <div class="vhs-card-header">
            <div>
                <div class="vhs-title">
                    ${vhs.video_nombre}
                </div>
            </div>
            <div class="vhs-actions">
                ${vhs.youtube_link && vhs.youtube_link.trim() !== '' ? '<i class="fab fa-youtube youtube-icon" title="Tiene enlace de YouTube"></i>' : ''}
            </div>
        </div>
        <div class="vhs-meta">
            <div class="meta-item">
                <div class="meta-label">Duración</div>
                <div class="meta-value">${vhs.video_duracion_total}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Formato</div>
                <div class="meta-value">${vhs.video_formato}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Inicio</div>
                <div class="meta-value">${formatDate(vhs.video_fecha_inicio)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Término</div>
                <div class="meta-value">${formatDate(vhs.video_fecha_termino)}</div>
            </div>
        </div>
        <button class="expand-btn" onclick="event.stopPropagation(); toggleCardExpand(this)">
            <i class="fas fa-chevron-down"></i>
            <span>Ver ${vhs.eventos.length} eventos</span>
        </button>
        <div class="events-preview">
            <div class="events-list-preview">
                ${eventsHtml}
            </div>
        </div>
    `;
    
    // Agregar evento click en el header para expandir
    const header = card.querySelector('.vhs-card-header');
    header.style.cursor = 'pointer';
    header.onclick = () => toggleCardExpand(card.querySelector('.expand-btn'));
    
    return card;
}

// Función para expandir/colapsar tarjeta
function toggleCardExpand(button) {
    const card = button.closest('.vhs-card');
    const isCollapsed = card.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expandir esta tarjeta
        card.classList.remove('collapsed');
        button.innerHTML = '<i class="fas fa-chevron-up"></i><span>Ocultar eventos</span>';
    } else {
        // Colapsar
        card.classList.add('collapsed');
        const eventCount = card.querySelectorAll('.event-item').length;
        button.innerHTML = `<i class="fas fa-chevron-down"></i><span>Ver ${eventCount} eventos</span>`;
    }
}

// Crear tarjeta de resultado de búsqueda
// Función auxiliar para crear enlace de YouTube
function createYouTubeLinkForEvent(youtubeLink, startTime, cssClass = 'event-youtube-link-mini') {
    if (!youtubeLink || youtubeLink.trim() === '') {
        return '';
    }
    
    const videoId = extractYouTubeVideoId(youtubeLink);
    if (!videoId) {
        return `<a href="${youtubeLink}" target="_blank" onclick="event.stopPropagation();" class="${cssClass}" title="Ver en YouTube">
            <i class="fab fa-youtube"></i>
        </a>`;
    }
    
    const timeInSeconds = convertTimeToSeconds(startTime || '00:00:00');
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${timeInSeconds}s&autoplay=1`;
    
    return `<a href="${youtubeUrl}" target="_blank" onclick="event.stopPropagation();" class="${cssClass}" title="Ver en YouTube desde ${formatTime(startTime)}">
        <i class="fab fa-youtube"></i>
    </a>`;
}

function createSearchResultCard(vhs, searchTerm) {
    const card = document.createElement('div');
    card.className = 'vhs-card search-result-card collapsed';
    card.dataset.vhsId = vhs.video_id;
    
    // Generar HTML de eventos con links de YouTube
    const eventsHtml = vhs.eventos.map(evento => {
        const youtubeBtn = vhs.youtube_link ? createYouTubeLinkForEvent(vhs.youtube_link, evento.evento_inicio) : '';
        return `
            <div class="event-item search-highlight">
                <div class="event-date highlight-date">${formatDate(evento.evento_fecha)}</div>
                <div class="event-content">${highlightSearchTerm(evento.evento_contenido, searchTerm)}</div>
                ${renderEventTags(evento)}
                <div class="event-time highlight-time">
                    <span class="time-start">${formatTime(evento.evento_inicio)}</span>
                    <span class="time-separator">-</span>
                    <span class="time-end">${formatTime(evento.evento_termino)}</span>
                </div>
                ${youtubeBtn}
            </div>
        `;
    }).join('');
    
    card.innerHTML = `
        <div class="vhs-card-header">
            <div>
                <div class="vhs-title">${vhs.video_nombre}</div>
                <div class="search-result-info">
                    <span class="search-badge">
                        <i class="fas fa-search"></i> Resultado de búsqueda
                    </span>
                </div>
            </div>
            <div class="vhs-actions">
                ${vhs.youtube_link && vhs.youtube_link.trim() !== '' ? '<i class="fab fa-youtube youtube-icon" title="Tiene enlace de YouTube"></i>' : ''}
            </div>
        </div>
        <div class="vhs-meta">
            <div class="meta-item">
                <div class="meta-label">Duración</div>
                <div class="meta-value">${vhs.video_duracion_total}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Formato</div>
                <div class="meta-value">${vhs.video_formato}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Inicio</div>
                <div class="meta-value">${formatDate(vhs.video_fecha_inicio)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Término</div>
                <div class="meta-value">${formatDate(vhs.video_fecha_termino)}</div>
            </div>
        </div>
        <button class="expand-btn" onclick="event.stopPropagation(); toggleCardExpand(this)">
            <i class="fas fa-chevron-down"></i>
            <span>Ver ${vhs.eventos.length} eventos</span>
        </button>
        <div class="events-preview">
            <div class="events-list-preview">
                ${eventsHtml}
            </div>
        </div>
    `;
    
    // Agregar evento click en el header para expandir
    const header = card.querySelector('.vhs-card-header');
    header.style.cursor = 'pointer';
    header.onclick = () => toggleCardExpand(card.querySelector('.expand-btn'));
    
    return card;
}

// Filtrar VHS
function filterVHS(searchTerm) {
    if (!searchTerm.trim()) {
        renderVHSGrid();
        return;
    }
    
    const searchResults = [];
    
    vhsData.forEach(vhs => {
        const matchingEvents = vhs.eventos.filter(evento => 
            evento.evento_contenido.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingEvents.length > 0) {
            // Crear una copia del VHS con solo los eventos que coinciden
            const filteredVHS = {
                ...vhs,
                eventos: matchingEvents,
                searchHighlight: true
            };
            searchResults.push(filteredVHS);
        }
    });
    
    renderSearchResults(searchResults, searchTerm);
}

// Renderizar resultados de búsqueda
function renderSearchResults(searchResults, searchTerm) {
    const grid = document.getElementById('vhsGrid');
    grid.innerHTML = '';
    
    if (searchResults.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }
    
    // Calcular estadísticas
    const totalDuration = calculateTotalDuration(searchResults);
    const totalEvents = searchResults.reduce((sum, vhs) => sum + vhs.eventos.length, 0);
    
    // Agregar encabezado de búsqueda
    const searchHeader = document.createElement('div');
    searchHeader.className = 'search-results-header';
    searchHeader.innerHTML = `
        <div class="search-header-content">
            <h3>Resultados de búsqueda para: "${searchTerm}"</h3>
            <button class="btn btn-secondary btn-sm" onclick="clearSearch()">
                <i class="fas fa-times"></i> Limpiar búsqueda
            </button>
        </div>
        <div class="filter-stats">
            <div class="stat-item">
                <i class="fas fa-video"></i>
                <span class="stat-label">VHS:</span>
                <span class="stat-value">${searchResults.length}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-calendar-alt"></i>
                <span class="stat-label">Eventos:</span>
                <span class="stat-value">${totalEvents}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-clock"></i>
                <span class="stat-label">Duración total:</span>
                <span class="stat-value">${formatMinutesToReadable(totalDuration)}</span>
            </div>
        </div>
    `;
    grid.appendChild(searchHeader);
    
    searchResults.forEach(vhs => {
        const card = createSearchResultCard(vhs, searchTerm);
        grid.appendChild(card);
    });
}

// Limpiar búsqueda
function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderVHSGrid();
}

// Función para renderizar el filtro de tags
function renderTagsFilter() {
    const tagsFilter = document.getElementById('tagsFilter');
    if (!tagsFilter) return;
    
    tagsFilter.innerHTML = '';
    
    if (tags.length === 0) {
        tagsFilter.innerHTML = '<p style="color: #6b7280; font-style: italic;">No hay tags disponibles</p>';
        return;
    }
    
    // Ordenar tags por código numérico, luego alfabéticamente
    const sortedTags = [...tags].sort((a, b) => {
        const aCode = parseInt(a.code) || 0;
        const bCode = parseInt(b.code) || 0;
        if (aCode !== bCode) return aCode - bCode;
        return a.name.localeCompare(b.name);
    });
    
    sortedTags.forEach(tag => {
        const filterTag = document.createElement('div');
        filterTag.className = 'filter-tag';
        filterTag.dataset.tagCode = tag.code;
        filterTag.onclick = () => toggleTagFilter(tag.code);
        
        filterTag.innerHTML = `
            <div class="filter-tag-circle" style="background-color: ${tag.color}"></div>
            <span class="filter-tag-name">${tag.name}</span>
        `;
        
        tagsFilter.appendChild(filterTag);
    });
}

// Función para alternar la selección de un tag en el filtro
function toggleTagFilter(tagCode) {
    const filterTag = document.querySelector(`[data-tag-code="${tagCode}"]`);
    if (!filterTag) return;
    
    filterTag.classList.toggle('selected');
    applyFilters();
}

// Función para limpiar el filtro de tags
function clearTagsFilter() {
    const selectedTags = document.querySelectorAll('.filter-tag.selected');
    selectedTags.forEach(tag => tag.classList.remove('selected'));
    applyFilters();
}

// Función para aplicar filtros (texto + tags)
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedTagCodes = Array.from(document.querySelectorAll('.filter-tag.selected'))
        .map(tag => tag.dataset.tagCode);
    
    if (!searchTerm.trim() && selectedTagCodes.length === 0) {
        renderVHSGrid();
        return;
    }
    
    const filteredResults = [];
    
    vhsData.forEach(vhs => {
        const matchingEvents = vhs.eventos.filter(evento => {
            // Filtro por texto
            const textMatch = !searchTerm.trim() || 
                evento.evento_contenido.toLowerCase().includes(searchTerm) ||
                vhs.video_nombre.toLowerCase().includes(searchTerm);
            
            // Filtro por tags
            const tagMatch = selectedTagCodes.length === 0 || 
                selectedTagCodes.some(tagCode => evento.tags && evento.tags.includes(tagCode));
            
            return textMatch && tagMatch;
        });
        
        if (matchingEvents.length > 0) {
            const filteredVHS = {
                ...vhs,
                eventos: matchingEvents,
                searchHighlight: true
            };
            filteredResults.push(filteredVHS);
        }
    });
    
    if (filteredResults.length === 0) {
        renderEmptySearchResults(searchTerm, selectedTagCodes);
    } else {
        renderFilteredResults(filteredResults, searchTerm, selectedTagCodes);
    }
}

// Función para calcular la duración total en minutos de los videos encontrados
function calculateTotalDuration(filteredResults) {
    let totalMinutes = 0;
    
    filteredResults.forEach(vhs => {
        // Calcular duración de cada evento en el VHS
        vhs.eventos.forEach(evento => {
            if (evento.evento_duracion && evento.evento_duracion !== 'N/A' && evento.evento_duracion.trim() !== '') {
                const durationInMinutes = convertDurationToMinutes(evento.evento_duracion);
                totalMinutes += durationInMinutes;
            }
        });
    });
    
    return totalMinutes;
}

// Función para convertir duración HH:MM:SS a minutos
function convertDurationToMinutes(duration) {
    if (!duration || duration === 'N/A' || duration.trim() === '') {
        return 0;
    }
    
    try {
        const parts = duration.split(':').map(part => parseInt(part) || 0);
        
        if (parts.length === 3) {
            // Formato HH:MM:SS
            return parts[0] * 60 + parts[1] + (parts[2] / 60);
        } else if (parts.length === 2) {
            // Formato MM:SS
            return parts[0] + (parts[1] / 60);
        } else if (parts.length === 1) {
            // Formato SS
            return parts[0] / 60;
        }
        
        return 0;
    } catch (error) {
        console.error('Error al convertir duración a minutos:', error);
        return 0;
    }
}

// Función para formatear minutos a formato legible
function formatMinutesToReadable(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.floor(minutes % 60);
    const seconds = Math.floor((minutes % 1) * 60);
    
    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m ${seconds}s`;
    } else if (remainingMinutes > 0) {
        return `${remainingMinutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Función para renderizar resultados filtrados
function renderFilteredResults(filteredResults, searchTerm, selectedTagCodes) {
    const grid = document.getElementById('vhsGrid');
    grid.innerHTML = '';
    
    // Calcular estadísticas
    const totalDuration = calculateTotalDuration(filteredResults);
    const totalEvents = filteredResults.reduce((sum, vhs) => sum + vhs.eventos.length, 0);
    
    // Crear encabezado de filtros aplicados
    const filterHeader = document.createElement('div');
    filterHeader.className = 'filter-results-header';
    
    let filterDescription = '';
    if (searchTerm.trim()) {
        filterDescription += `Búsqueda: "${searchTerm}"`;
    }
    if (selectedTagCodes.length > 0) {
        if (filterDescription) filterDescription += ' + ';
        const tagNames = selectedTagCodes.map(code => {
            const tag = tags.find(t => t.code === code);
            return tag.name;
        });
        filterDescription += `Tags: ${tagNames.join(', ')}`;
    }
    
    filterHeader.innerHTML = `
        <div class="filter-header-content">
            <h3>Resultados filtrados</h3>
            <div class="filter-description">${filterDescription}</div>
            <button class="btn btn-secondary btn-sm" onclick="clearAllFilters()">
                <i class="fas fa-times"></i> Limpiar filtros
            </button>
        </div>
        <div class="filter-stats">
            <div class="stat-item">
                <i class="fas fa-video"></i>
                <span class="stat-label">VHS:</span>
                <span class="stat-value">${filteredResults.length}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-calendar-alt"></i>
                <span class="stat-label">Eventos:</span>
                <span class="stat-value">${totalEvents}</span>
            </div>
            <div class="stat-item">
                <i class="fas fa-clock"></i>
                <span class="stat-label">Duración total:</span>
                <span class="stat-value">${formatMinutesToReadable(totalDuration)}</span>
            </div>
        </div>
    `;
    grid.appendChild(filterHeader);
    
    filteredResults.forEach(vhs => {
        const card = createSearchResultCard(vhs, searchTerm);
        grid.appendChild(card);
    });
}

// Función para renderizar resultados vacíos
function renderEmptySearchResults(searchTerm, selectedTagCodes) {
    const grid = document.getElementById('vhsGrid');
    grid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <h3>No se encontraron resultados</h3>
            <p>Intenta con otros términos de búsqueda o tags</p>
            <button class="btn btn-secondary" onclick="clearAllFilters()">
                <i class="fas fa-times"></i> Limpiar filtros
            </button>
        </div>
    `;
}

// Función para limpiar todos los filtros
function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    clearTagsFilter();
    renderVHSGrid();
}

// Cerrar modal de información
function closeInfoModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function openInfoModal() {
    document.getElementById('infoModal').style.display = 'block';
}

function closeAllModals() {
    closeInfoModal();
}

// Utilidades
function formatDate(dateString) {
    if (!dateString || dateString === 'nan' || dateString === '00/00/00' || dateString.trim() === '') {
        return 'N/A';
    }
    
    try {
        // Si la fecha ya está en formato DD/MM/AAAA, mantenerla así
        if (dateString.includes('/') && dateString.split('/').length === 3) {
            const parts = dateString.split('/');
            const day = parts[0];
            const month = parts[1];
            const year = parts[2];
            
            // Validar que sea una fecha válida
            if (day && month && year && day !== '00' && month !== '00' && year !== '0000') {
                return dateString; // Mantener formato DD/MM/AAAA
            }
        }
        
        // Si no es formato DD/MM/AAAA válido, intentar convertir
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('es-ES');
        }
        
        return dateString;
    } catch (e) {
        return dateString;
    }
}

function formatDateForInput(dateString) {
    if (!dateString || dateString === 'nan' || dateString === '00/00/00' || dateString.trim() === '') {
        return '';
    }
    
    try {
        // Si la fecha ya está en formato DD/MM/AAAA, convertirla a formato ISO para el input
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parts[0];
                const month = parts[1];
                const year = parts[2];
                
                // Crear fecha en formato MM/DD/AAAA (formato que JavaScript entiende)
                const date = new Date(`${month}/${day}/${year}`);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
        }
        
        // Si no es formato DD/MM/AAAA, intentar con Date() normal
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        return '';
    } catch (e) {
        return '';
    }
}

// Función para formatear horas y manejar campos vacíos
function formatTime(timeString) {
    if (!timeString || timeString === 'nan' || timeString === '00:00:00' || timeString.trim() === '') {
        return 'N/A';
    }
    return timeString;
}

// Función para convertir fecha de formato ISO a DD/MM/AAAA
function formatDateToDDMMYYYY(dateString) {
    if (!dateString || dateString.trim() === '') {
        return '';
    }
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
}

// Función para resaltar el término de búsqueda
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight-text">$1</mark>');
}

// Función para crear URL de YouTube con timestamp
function createYouTubeTimestampedURL(youtubeURL, startTime) {
    try {
        // Convertir tiempo a segundos
        const timeInSeconds = convertTimeToSeconds(startTime);
        
        // Extraer ID del video de YouTube
        let videoId = '';
        
        // Patrones comunes de URLs de YouTube
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
            const match = youtubeURL.match(pattern);
            if (match) {
                videoId = match[1];
                break;
            }
        }
        
        if (!videoId) {
            console.warn('No se pudo extraer el ID del video de YouTube:', youtubeURL);
            return youtubeURL; // Devolver URL original si no se puede procesar
        }
        
        // Crear URL con timestamp
        return `https://www.youtube.com/watch?v=${videoId}&t=${timeInSeconds}`;
        
    } catch (error) {
        console.error('Error al crear URL con timestamp:', error);
        return youtubeURL; // Devolver URL original en caso de error
    }
}

// Función para calcular duración entre dos tiempos
function calculateDuration(startTime, endTime) {
    console.log('Calculando duración entre:', startTime, 'y', endTime);
    
    if (!startTime || !endTime || startTime === 'N/A' || endTime === 'N/A' || 
        startTime.trim() === '' || endTime.trim() === '') {
        console.log('Tiempos inválidos, retornando 00:00:00');
        return '00:00:00';
    }
    
    try {
        const startSeconds = convertTimeToSeconds(startTime);
        const endSeconds = convertTimeToSeconds(endTime);
        
        console.log('Segundos - Inicio:', startSeconds, 'Fin:', endSeconds);
        
        if (startSeconds === 0 || endSeconds === 0) {
            console.log('Uno de los tiempos es 0, retornando 00:00:00');
            return '00:00:00';
        }
        
        let durationSeconds = endSeconds - startSeconds;
        console.log('Duración en segundos:', durationSeconds);
        
        // Si la duración es negativa, asumir que es del día siguiente
        if (durationSeconds < 0) {
            durationSeconds += 24 * 3600; // Agregar 24 horas
            console.log('Duración negativa, ajustando a:', durationSeconds);
        }
        
        const result = convertSecondsToTime(durationSeconds);
        console.log('Duración final calculada:', result);
        return result;
        
    } catch (error) {
        console.error('Error al calcular duración:', error);
        return '00:00:00';
    }
}

// Función para convertir segundos a formato HH:MM:SS
function convertSecondsToTime(seconds) {
    if (seconds < 0) seconds = 0;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Función para convertir tiempo HH:MM:SS a segundos
function convertTimeToSeconds(timeString) {
    if (!timeString || timeString === 'N/A' || timeString.trim() === '') {
        return 0;
    }
    
    try {
        const parts = timeString.split(':').map(part => parseInt(part) || 0);
        
        if (parts.length === 3) {
            // Formato HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            // Formato MM:SS
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            // Formato SS
            return parts[0];
        }
        
        return 0;
    } catch (error) {
        console.error('Error al convertir tiempo a segundos:', error);
        return 0;
    }
}

// Función para actualizar el tiempo de inicio del siguiente evento
function updateNextEventStartTime(eventos, currentEventIndex, newEndTime) {
    console.log('=== ACTUALIZANDO SIGUIENTE EVENTO ===');
    console.log('Índice del evento actual:', currentEventIndex);
    console.log('Nuevo tiempo de término:', newEndTime);
    console.log('Total de eventos:', eventos.length);
    
    // Buscar el siguiente evento en la lista
    const nextEventIndex = currentEventIndex + 1;
    
    if (nextEventIndex < eventos.length) {
        const nextEvent = eventos[nextEventIndex];
        console.log('Siguiente evento encontrado:', nextEvent);
        
        const currentInicio = nextEvent.evento_inicio;
        const currentInicioSeconds = convertTimeToSeconds(currentInicio);
        const newEndSeconds = convertTimeToSeconds(newEndTime);
        
        console.log('Tiempo de inicio actual:', currentInicio, '(', currentInicioSeconds, 'segundos)');
        console.log('Nuevo tiempo de término:', newEndTime, '(', newEndSeconds, 'segundos)');
        
        // Siempre actualizar el tiempo de inicio del siguiente evento cuando se edita el evento actual
        console.log('Actualizando tiempo de inicio del siguiente evento...');
        nextEvent.evento_inicio = newEndTime;
        
        // Recalcular la duración del siguiente evento si tiene tiempo de término
        if (nextEvent.evento_termino && nextEvent.evento_termino !== 'N/A' && nextEvent.evento_termino.trim() !== '') {
            console.log('Recalculando duración del siguiente evento...');
            const nuevaDuracion = calculateDuration(nextEvent.evento_inicio, nextEvent.evento_termino);
            nextEvent.evento_duracion = nuevaDuracion;
            console.log('Nueva duración del siguiente evento:', nuevaDuracion);
        } else {
            console.log('El siguiente evento no tiene tiempo de término, no se recalcula duración');
        }
        
        console.log(`✅ Tiempo de inicio del siguiente evento actualizado a: ${newEndTime}`);
    } else {
        console.log('❌ No hay siguiente evento para actualizar');
    }
}







// ===== FUNCIONES PARA GESTIONAR TAGS =====
// Renderizar tags en eventos
function renderEventTags(evento) {
    if (!evento.tags || evento.tags.length === 0) {
        return '';
    }
    
    return evento.tags.map(tagCode => {
        const tag = tags.find(t => t.code === tagCode);
        if (!tag) return '';
        
        // Calcular color de texto basado en el fondo (blanco o negro)
        const textColor = getContrastColor(tag.color);
        
        return `<span class="event-tag" style="background-color: ${tag.color}; color: ${textColor};" title="${tag.name}">${tag.name}</span>`;
    }).join('');
}

// Función para determinar color de texto contrastante
function getContrastColor(hexColor) {
    // Convertir hex a RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calcular luminancia
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Retornar blanco o negro según luminancia
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Inicializar sistema de tags
function initializeTags() {
    // Usar tags de EMBEDDED_DATA si están disponibles
    if (typeof EMBEDDED_DATA !== 'undefined' && EMBEDDED_DATA && EMBEDDED_DATA.tags && EMBEDDED_DATA.tags.length > 0) {
        console.log('Usando tags incrustados (EMBEDDED_DATA)...');
        tags = EMBEDDED_DATA.tags;
        nextTagId = Math.max(...tags.map(t => t.id), 0) + 1;
    } else {
        // Crear tags por defecto
        createDefaultTags();
    }
    renderTagsFilter();
}

// Crear tags por defecto
function createDefaultTags() {
    const defaultTags = [
        { id: 1, name: 'Familia', color: '#667eea', code: '1' },
        { id: 2, name: 'Viaje', color: '#48bb78', code: '2' },
        { id: 3, name: 'Celebración', color: '#ed8936', code: '3' },
        { id: 4, name: 'Niños', color: '#9f7aea', code: '4' },
        { id: 5, name: 'Música', color: '#f56565', code: '5' },
        { id: 6, name: 'Playa', color: '#38b2ac', code: '6' },
        { id: 7, name: 'Padre Hurtado', color: '#ecc94b', code: '7' },
        { id: 8, name: 'Parral', color: '#a0aec0', code: '8' },
        { id: 9, name: 'Mall', color: '#fc8181', code: '9' },
        { id: 10, name: 'Lalo', color: '#b794f4', code: '10' },
        { id: 11, name: 'Clínica', color: '#4fd1c5', code: '11' },
        { id: 12, name: 'Abuela', color: '#f6ad55', code: '12' }
    ];

    tags = defaultTags;
    nextTagId = 13;
}

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registrado exitosamente:', registration.scope);
            })
            .catch(function(error) {
                console.log('Error al registrar ServiceWorker:', error);
            });
    });
}

// ===== FUNCIONES PARA ABRIR YOUTUBE EN NUEVA VENTANA =====
function openYouTubeModal(youtubeURL, startTime) {
    // Extraer video ID del URL
    const videoId = extractYouTubeVideoId(youtubeURL);
    if (!videoId) {
        // Si no se puede extraer, abrir en nueva pestaña sin modificaciones
        window.open(youtubeURL, '_blank');
        return;
    }
    
    // Convertir tiempo a segundos
    const timeInSeconds = convertTimeToSeconds(startTime || '00:00:00');
    
    // Crear URL de YouTube con timestamp y autoplay
    const urlWithTimestamp = `https://www.youtube.com/watch?v=${videoId}&t=${timeInSeconds}s&autoplay=1`;
    
    // Abrir en nueva ventana/pestaña
    window.open(urlWithTimestamp, '_blank');
}

function extractYouTubeVideoId(url) {
    if (!url) return null;
    
    // Patrones mejorados de URL de YouTube
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1] && match[1].length === 11) {
            return match[1];
        }
    }
    
    return null;
}
