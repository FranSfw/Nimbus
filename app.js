const API_KEY = '961561dafcb3fa11e3054aaade05fe35';
const cityInputs = document.querySelectorAll('.city-input');
const suggestionsLists = document.querySelectorAll('.suggestions-list');
const weatherResult = document.getElementById('weatherResult');

// Recomendaciones por clima
const recommendations = {
    Thunderstorm: "Día de tormentas: Es mejor quedarse en casa y disfrutar de un buen libro.",
    Drizzle: "Llovizna ligera: Un café local o una visita a una librería serían ideales.",
    Rain: "Está lloviendo: Momento perfecto para visitar museos o galerías de arte.",
    Snow: "Día nevado: ¡Abrígate bien! Ideal para chocolate caliente.",
    Clear: "Cielo despejado: Perfecto para actividades al aire libre o un paseo por el parque.",
    Clouds: "Día nublado: Buen clima para caminar por la ciudad o hacer fotografía.",
    Atmosphere: "Condiciones especiales: Ten precaución al salir; mejor opta por interiores."
};

function getRecommendation(weatherGroup) {
    return recommendations[weatherGroup] || "¡Disfruta de tu día y consulta las precauciones locales!";
}

// --- Gestión de Favoritos ---
function getFavorites() {
    const favorites = localStorage.getItem('nimbus_favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function toggleFavorite(cityData) {
    let favorites = getFavorites();
    const index = favorites.findIndex(f => f.lat === cityData.lat && f.lon === cityData.lon);
    index === -1 ? favorites.push(cityData) : favorites.splice(index, 1);
    localStorage.setItem('nimbus_favorites', JSON.stringify(favorites));
    renderFavoritesList();
}

function renderFavoritesList() {
    const favContainer = document.getElementById('favoritesSection');
    if (!favContainer) return;
    const favorites = getFavorites();
    if (favorites.length === 0) { favContainer.innerHTML = ''; return; }

    favContainer.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">Favoritos</h4>
            <div class="flex flex-col gap-2">
                ${favorites.map(city => `
                    <button class="w-full text-left px-3 py-2 bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-gray-300 transition-all flex items-center justify-between group" 
                        onclick="getAllWeatherData(${city.lat}, ${city.lon})">
                        <span>${city.name}</span>
                        <span class="text-yellow-400"><i class="ph-fill ph-star"></i></span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// --- Gestión de Historial ---
function getHistory() {
    const history = localStorage.getItem('nimbus_history');
    return history ? JSON.parse(history) : [];
}

function addToHistory(cityData) {
    let history = getHistory();
    history = history.filter(h => h.lat !== cityData.lat || h.lon !== cityData.lon);
    history.unshift(cityData);
    if (history.length > 6) history.pop();
    localStorage.setItem('nimbus_history', JSON.stringify(history));
    renderHistoryList();
}

function renderHistoryList() {
    const historyContainer = document.getElementById('historySection');
    if (!historyContainer) return;
    const history = getHistory();
    if (history.length === 0) { historyContainer.innerHTML = ''; return; }

    historyContainer.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">Recientes</h4>
            <div class="flex flex-wrap gap-2">
                ${history.map(city => `
                    <button class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200 transition-colors" 
                        onclick="getAllWeatherData(${city.lat}, ${city.lon})">
                        ${city.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// --- Lógica de Búsqueda Multipantalla ---
cityInputs.forEach((input, index) => {
    input.addEventListener('keyup', async (e) => {
        const query = e.target.value;
        const currentList = suggestionsLists[index];

        if (query.length < 3) {
            currentList.innerHTML = '';
            currentList.classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
            const cities = await response.json();
            displaySuggestions(cities, currentList);
        } catch (error) {
            console.error("Error en geolocalización:", error);
        }
    });
});

function displaySuggestions(cities, targetList) {
    // Cerramos todas las listas primero para evitar ruidos visuales
    suggestionsLists.forEach(list => {
        list.innerHTML = '';
        list.classList.add('hidden');
    });

    if (cities.length === 0) return;

    // Mostramos solo la que corresponde al input que estamos usando
    targetList.classList.remove('hidden');

    cities.forEach(city => {
        const li = document.createElement('li');
        li.className = "px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between group";
        li.innerHTML = `
            <div class="flex flex-col">
                <span class="font-bold text-gray-800">${city.name}</span>
                <span class="text-xs text-gray-400">${city.state ? `${city.state}, ` : ''}${city.country}</span>
            </div>
            <i class="ph ph-caret-right text-gray-300 group-hover:text-blue-500"></i>
        `;

        // Usamos mousedown en lugar de click para evitar problemas de pérdida de foco en desktop
        li.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Evita que el input pierda el foco antes de procesar el click
            cityInputs.forEach(i => i.value = city.name);
            getAllWeatherData(city.lat, city.lon);

            // Limpieza total
            suggestionsLists.forEach(l => {
                l.innerHTML = '';
                l.classList.add('hidden');
            });
        });
        targetList.appendChild(li);
    });
}

// --- Obtención de Clima ---
async function getAllWeatherData(lat, lon) {
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`)
        ]);

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        localStorage.setItem('nimbus_last_search', JSON.stringify({ lat, lon }));
        addToHistory({ name: currentData.name, lat, lon });
        renderWeather(currentData, forecastData);
    } catch (error) {
        console.error("Error al obtener datos:", error);
    }
}

function renderWeather(current, forecast) {
    const { name, main, weather, wind, coord } = current;
    const weatherGroup = weather[0].main;
    const isFav = getFavorites().some(f => f.lat === coord.lat && f.lon === coord.lon);

    // Agrupar pronóstico por día
    const dailyForecast = {};
    forecast.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyForecast[date]) {
            dailyForecast[date] = { dt: item.dt, min: item.main.temp_min, max: item.main.temp_max, weather: item.weather[0] };
        } else {
            dailyForecast[date].min = Math.min(dailyForecast[date].min, item.main.temp_min);
            dailyForecast[date].max = Math.max(dailyForecast[date].max, item.main.temp_max);
            if (item.dt_txt.includes("12:00:00")) dailyForecast[date].weather = item.weather[0];
        }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const daysToRender = Object.keys(dailyForecast).filter(d => d !== todayStr).slice(0, 5).map(d => dailyForecast[d]);

    weatherResult.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 relative">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h2 class="text-4xl font-bold text-gray-900">${name}</h2>
                        <p class="text-lg text-gray-500 mt-1 first-letter:uppercase">${weather[0].description}</p>
                    </div>
                     <button id="favActionBtn" class="flex items-center gap-2 px-4 py-2 bg-white hover:shadow-md rounded-full border border-gray-200 transition-all">
                        <span class="${isFav ? 'text-yellow-500' : 'text-gray-300'} text-lg"><i class="ph-fill ph-star"></i></span>
                        <span class="text-gray-700">${isFav ? 'Guardado' : 'Guardar'}</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                    <div class="flex items-center">
                        <img src="https://openweathermap.org/img/wn/${weather[0].icon}@4x.png" class="w-24 h-24 -ml-4" alt="Icon">
                        <span class="text-6xl font-bold text-gray-900">${Math.round(main.temp)}°</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><p class="text-gray-400 uppercase text-xs">Sensación</p><p class="font-medium">${Math.round(main.feels_like)}°C</p></div>
                        <div><p class="text-gray-400 uppercase text-xs">Humedad</p><p class="font-medium">${main.humidity}%</p></div>
                        <div><p class="text-gray-400 uppercase text-xs">Viento</p><p class="font-medium">${wind.speed} m/s</p></div>
                        <div><p class="text-gray-400 uppercase text-xs">Min / Max</p><p class="font-medium">${Math.round(main.temp_min)}° / ${Math.round(main.temp_max)}°</p></div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
                 <div class="bg-white p-2 rounded-lg text-xl"><i style="color: #e4c200;" class="ph ph-smiley"></i></div>
                 <div>
                    <h4 class="text-sm font-bold text-blue-900">Recomendación del día</h4>
                    <p class="text-sm text-blue-800/80">${getRecommendation(weatherGroup)}</p>
                </div>
            </div>

            <div>
                 <h3 class="text-gray-400 font-semibold text-xs uppercase mb-4">Pronóstico 5 días</h3>
                 <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    ${daysToRender.map(day => `
                        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                            <p class="text-xs font-semibold text-gray-400 uppercase mb-2">${new Date(day.dt * 1000).toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                            <img src="https://openweathermap.org/img/wn/${day.weather.icon}.png" class="w-12 h-12">
                            <div class="flex gap-1">
                                <span class="font-bold text-gray-900">${Math.round(day.max)}°</span>
                                <span class="text-gray-400">${Math.round(day.min)}°</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('favActionBtn').onclick = () => toggleFavorite({ name, lat: coord.lat, lon: coord.lon });
}

window.onload = () => {
    renderFavoritesList();
    renderHistoryList();
    const lastSearch = localStorage.getItem('nimbus_last_search');
    if (lastSearch) {
        const { lat, lon } = JSON.parse(lastSearch);
        getAllWeatherData(lat, lon);
    }
};