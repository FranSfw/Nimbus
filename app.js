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
    let favContainer = document.getElementById('favoritesSection');
    if (!favContainer) {
        favContainer = document.createElement('div');
        favContainer.id = 'favoritesSection';
        document.querySelector('.search-section').appendChild(favContainer);
    }

    const favorites = getFavorites();
    favContainer.innerHTML = favorites.length > 0 ? `
        <p><small>★ Tus Favoritos:</small></p>
        <div class="list-buttons">
            ${favorites.map(city => `
                <button class="fav-btn" onclick="getAllWeatherData(${city.lat}, ${city.lon})">${city.name}</button>
            `).join('')}
        </div>
    ` : '';
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
    if (history.length > 5) history.pop(); // Límite de 5

    localStorage.setItem('nimbus_history', JSON.stringify(history));
    renderHistoryList();
}

function renderHistoryList() {
    let historyContainer = document.getElementById('historySection');
    if (!historyContainer) {
        historyContainer = document.createElement('div');
        historyContainer.id = 'historySection';
        document.querySelector('.search-section').insertBefore(historyContainer, document.getElementById('favoritesSection'));
    }

    const history = getHistory();
    historyContainer.innerHTML = history.length > 0 ? `
        <p><small>🕒 Recientes:</small></p>
        <div class="list-buttons">
            ${history.map(city => `
                <button class="hist-btn" onclick="getAllWeatherData(${city.lat}, ${city.lon})">${city.name}</button>
            `).join('')}
        </div>
    ` : '';
}

// Logica de Busqueda

cityInput.addEventListener('keyup', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        suggestionsList.innerHTML = '';
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
    cities.forEach(city => {
        const li = document.createElement('li');
        li.textContent = `${city.name}${city.state ? `, ${city.state}` : ''} (${city.country})`;
        li.addEventListener('click', () => {
            cityInput.value = city.name;
            suggestionsList.innerHTML = '';
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
        <div class="current-weather">
            <div class="header-card" style="display: flex; justify-content: space-between; align-items: center;">
                <h2>${name}</h2>
                <button id="favActionBtn" class="btn-fav">${isFav ? '★ Quitar' : '☆ Favorito'}</button>
            </div>
            <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png">
            <p class="temp">${Math.round(main.temp)}°C</p>
            <p>${weather[0].description.toUpperCase()}</p>
            <div class="recommendation-box">
                <p><strong>Nimbus recomienda:</strong> ${getRecommendation(weatherGroup)}</p>
            </div>
            <div class="stats">
                <p>Mín: ${Math.round(main.temp_min)}° / Máx: ${Math.round(main.temp_max)}°</p>
                <p>Sensación: ${Math.round(main.feels_like)}°C | Humedad: ${main.humidity}% | Viento: ${wind.speed} m/s</p>
            </div>
        </div>
        <div class="forecast-container" style="display: flex; gap: 15px; margin-top: 20px; overflow-x: auto;">
            ${daysToRender.map(day => `
                <div class="forecast-item" style="text-align: center; min-width: 80px;">
                    <p><strong>${new Date(day.dt * 1000).toLocaleDateString('es-ES', { weekday: 'short' })}</strong></p>
                    <img src="https://openweathermap.org/img/wn/${day.weather.icon}.png">
                    <p>${Math.round(day.min)}° / ${Math.round(day.max)}°</p>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('favActionBtn').onclick = () => {
        toggleFavorite({ name, lat: coord.lat, lon: coord.lon });
        renderWeather(current, forecast);
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