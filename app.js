const API_KEY = '961561dafcb3fa11e3054aaade05fe35';
const cityInput = document.getElementById('cityInput');
const suggestionsList = document.getElementById('suggestions');
const weatherResult = document.getElementById('weatherResult');

// Recomendaciones
const recommendations = {
    Thunderstorm: "Día de tormentas: Es mejor quedarse en casa y disfrutar de un buen libro o una película.",
    Drizzle: "Llovizna ligera: Un café local o una visita a una librería serían ideales.",
    Rain: "Está lloviendo: Momento perfecto para visitar museos, galerías de arte o centros comerciales.",
    Snow: "Día nevado: ¡Abrígate bien! Ideal para chocolate caliente o deportes de invierno.",
    Clear: "Cielo despejado: Perfecto para actividades al aire libre, un paseo por el parque o ir a la playa.",
    Clouds: "Día nublado: Buen clima para caminar por la ciudad o hacer fotografía urbana.",
    Atmosphere: "Condiciones especiales: Ten precaución al salir; mejor opta por actividades en interiores."
};

function getRecommendation(weatherGroup) {
    return recommendations[weatherGroup] || "¡Disfruta de tu día y consulta las precauciones locales!";
}

// Favoritos
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

    if (favorites.length === 0) {
        favContainer.innerHTML = '';
        return;
    }

    favContainer.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">Favoritos</h4>
            <div class="flex flex-col gap-2">
                ${favorites.map(city => `
                    <button class="w-full text-left px-3 py-2 bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-between group" onclick="getAllWeatherData(${city.lat}, ${city.lon})">
                        <span>${city.name}</span>
                        <span class="text-yellow-400"><i class="ph-fill ph-star"></i></span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// Historial
function getHistory() {
    const history = localStorage.getItem('nimbus_history');
    return history ? JSON.parse(history) : [];
}

function addToHistory(cityData) {
    let history = getHistory();
    // Evitar duplicados y subir al inicio
    history = history.filter(h => h.lat !== cityData.lat || h.lon !== cityData.lon);
    history.unshift(cityData);
    if (history.length > 6) history.pop(); // Límite de 6

    localStorage.setItem('nimbus_history', JSON.stringify(history));
    renderHistoryList();
}

function renderHistoryList() {
    const historyContainer = document.getElementById('historySection');
    if (!historyContainer) return;

    const history = getHistory();

    if (history.length === 0) {
        historyContainer.innerHTML = '';
        return;
    }

    historyContainer.innerHTML = `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">Recientes</h4>
            <div class="flex flex-wrap gap-2">
                ${history.map(city => `
                    <button class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs rounded-full border border-gray-200 transition-colors" onclick="getAllWeatherData(${city.lat}, ${city.lon})">
                        ${city.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// Logica de Busqueda

cityInput.addEventListener('keyup', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        suggestionsList.innerHTML = '';
        suggestionsList.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
        const cities = await response.json();
        displaySuggestions(cities);
    } catch (error) {
        console.error("Error en geolocalización:", error);
    }
});

function displaySuggestions(cities) {
    suggestionsList.innerHTML = '';

    if (cities.length > 0) {
        suggestionsList.classList.remove('hidden');
    } else {
        suggestionsList.classList.add('hidden');
    }

    cities.forEach(city => {
        const li = document.createElement('li');
        li.className = "px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between group";
        li.innerHTML = `
            <span class="font-medium text-gray-800">${city.name}</span>
            <span class="text-xs text-gray-400 group-hover:text-gray-500">${city.state ? `${city.state}, ` : ''}${city.country}</span>
        `;
        li.addEventListener('click', () => {
            cityInput.value = city.name;
            suggestionsList.innerHTML = '';
            suggestionsList.classList.add('hidden');
            getAllWeatherData(city.lat, city.lon);
        });
        suggestionsList.appendChild(li);
    });
}

async function getAllWeatherData(lat, lon) {
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`)
        ]);

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        console.log(currentData);
        console.log(forecastData);

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

    // Forecast 5 días 
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
            <!-- Main Weather Card -->
            <div class="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 relative overflow-hidden">
                <div class="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h2 class="text-4xl font-bold text-gray-900 tracking-tight">${name}</h2>
                        <p class="text-lg text-gray-500 mt-1 first-letter:uppercase">${weather[0].description}</p>
                    </div>
                     <button id="favActionBtn" class="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white text-sm font-medium rounded-full border border-gray-200/60 backdrop-blur-sm transition-all hover:shadow-md cursor-pointer">
                        <span class="${isFav ? 'text-yellow-500' : 'text-gray-300'} text-lg"><i class="ph-fill ph-star"></i></span>
                        <span class="text-gray-700">${isFav ? 'Guardado' : 'Guardar'}</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-end relative z-10">
                    <div class="flex items-center">
                        <img src="https://openweathermap.org/img/wn/${weather[0].icon}@4x.png" class="w-24 h-24 -ml-4 filter drop-shadow-sm" alt="Weather Icon">
                         <div class="flex flex-col">
                            <span class="text-6xl font-bold text-gray-900 tracking-tighter">${Math.round(main.temp)}°</span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                         <div class="space-y-1">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sensación</p>
                            <p class="text-gray-900 font-medium text-base">${Math.round(main.feels_like)}°C</p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Humedad</p>
                            <p class="text-gray-900 font-medium text-base">${main.humidity}%</p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Viento</p>
                            <p class="text-gray-900 font-medium text-base">${wind.speed} m/s</p>
                        </div>
                         <div class="space-y-1">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Min / Max</p>
                            <p class="text-gray-900 font-medium text-base">${Math.round(main.temp_min)}° / ${Math.round(main.temp_max)}°</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recommendation Card -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-100/50 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                 <div class="bg-white p-2 rounded-lg shadow-sm text-xl shrink-0"><i style="color: #e4c200ff;" class="ph ph-smiley"></i></div>
                 <div>
                    <h4 class="text-sm font-bold text-blue-900 mb-1">Recomendación del día</h4>
                    <p class="text-sm text-blue-800/80 leading-relaxed">${getRecommendation(weatherGroup)}</p>
                </div>
            </div>

            <!-- Forecast Grid -->
            <div>
                 <h3 class="text-gray-400 font-semibold text-xs uppercase tracking-widest mb-4 ml-1">Pronóstico 5 días</h3>
                 <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    ${daysToRender.map(day => `
                        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md transition-all group">
                            <p class="text-xs font-semibold text-gray-400 uppercase mb-2 bg-gray-50 px-2 py-0.5 rounded-full">${new Date(day.dt * 1000).toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                            <img src="https://openweathermap.org/img/wn/${day.weather.icon}.png" class="w-12 h-12 mb-2 group-hover:scale-110 transition-transform">
                            <div class="flex items-baseline justify-center gap-1">
                                <span class="font-bold text-gray-900 text-lg">${Math.round(day.max)}°</span>
                                <span class="text-xs text-gray-400">${Math.round(day.min)}°</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const favBtn = document.getElementById('favActionBtn');
    favBtn.onclick = () => {
        toggleFavorite({ name, lat: coord.lat, lon: coord.lon });

        const isNowFav = getFavorites().some(f => f.lat === coord.lat && f.lon === coord.lon);
        favBtn.querySelector('span:nth-child(1)').className = `${isNowFav ? 'text-yellow-500' : 'text-gray-300'} text-lg`;
        favBtn.querySelector('span:nth-child(2)').textContent = isNowFav ? 'Guardado' : 'Guardar';
    };
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