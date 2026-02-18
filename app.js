const API_KEY = '961561dafcb3fa11e3054aaade05fe35';
const cityInput = document.getElementById('cityInput');
const suggestionsList = document.getElementById('suggestions');
const weatherResult = document.getElementById('weatherResult');

// 1. Autocompletado
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

// 2. Obtener Clima Actual y Pronóstico
async function getAllWeatherData(lat, lon) {
    try {
        // Llamada para clima actual
        const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`);
        const currentData = await currentRes.json();

        // Llamada para pronóstico
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`);
        const forecastData = await forecastRes.json();

        renderWeather(currentData, forecastData);
    } catch (error) {
        console.error("Error al obtener datos meteorológicos:", error);
    }
}

// 3. Renderizar resultados
function renderWeather(current, forecast) {
    const { name, main, weather, wind } = current;

    // Procesar forecast
    const dailyForecast = {};

    forecast.list.forEach(item => {
        // Obtener la fecha en formato YYYY-MM-DD
        const date = item.dt_txt.split(' ')[0];

        if (!dailyForecast[date]) {
            dailyForecast[date] = {
                dt: item.dt,
                min: item.main.temp_min,
                max: item.main.temp_max,
                weather: item.weather[0]
            };
        } else {
            // Actualizar min y max
            dailyForecast[date].min = Math.min(dailyForecast[date].min, item.main.temp_min);
            dailyForecast[date].max = Math.max(dailyForecast[date].max, item.main.temp_max);

            if (item.dt_txt.includes("12:00:00")) {
                dailyForecast[date].weather = item.weather[0];
            }
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const nextDays = Object.keys(dailyForecast)
        .filter(date => date !== today)
        .slice(0, 5) // Tomar los próximos 5 días
        .map(date => dailyForecast[date]);

    // Si nextDays está vacío, usamos los valores disponibles
    const daysToRender = nextDays.length > 0 ? nextDays : Object.values(dailyForecast).slice(0, 5);


    weatherResult.innerHTML = `
        <div class="current-weather">
            <h2>${name}</h2>
            <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png">
            <p class="temp">${Math.round(main.temp)}°C</p>
            <p>${weather[0].description.toUpperCase()}</p>
            
            <div class="stats">
                <p>Mín: ${Math.round(main.temp_min)}°C / Máx: ${Math.round(main.temp_max)}°C</p>
                <p>Sensación: ${Math.round(main.feels_like)}°C | Humedad: ${main.humidity}% | Viento: ${wind.speed} m/s</p>
            </div>
        </div>
        <h3>Pronóstico de los próximos días</h3>
        <div class="forecast-container">
            ${daysToRender.map(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
        return `
                    <div class="forecast-item">
                        <p><strong>${dayName}</strong></p>
                        <img src="https://openweathermap.org/img/wn/${day.weather.icon}.png">
                        <p>${Math.round(day.min)}° / ${Math.round(day.max)}°</p>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}